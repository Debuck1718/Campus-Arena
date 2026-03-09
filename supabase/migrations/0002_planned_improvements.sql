-- Planned improvements migration: seasons, notifications, chat, disputes, prizes, ELO updates, and more

-- Extensions (if needed)
create extension if not exists "pgcrypto";

-------------------------------------------------
-- SEASONS
-------------------------------------------------
create table if not exists seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz default now(),
  check (ends_at > starts_at)
);

create table if not exists season_members (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  unique (season_id, profile_id)
);

-------------------------------------------------
-- TOURNAMENT ENHANCEMENTS
-------------------------------------------------
alter table if exists tournaments
  add column if not exists season_id uuid references seasons(id),
  add column if not exists rules text,
  add column if not exists visibility text default 'public' check (visibility in ('public','unlisted','private')),
  add column if not exists allow_screenshot boolean default true;

-------------------------------------------------
-- MATCH/RESULT ENHANCEMENTS
-------------------------------------------------
alter table if exists matches
  add column if not exists best_of int default 1 check (best_of in (1,3,5,7)),
  add column if not exists game_meta jsonb default '{}'::jsonb;

alter table if exists match_results
  add column if not exists proof_meta jsonb default '{}'::jsonb;

-------------------------------------------------
-- NOTIFICATIONS
-------------------------------------------------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  type text not null, -- e.g., match_ready, result_requested, deadline_near
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_notifications_profile_created on notifications(profile_id, created_at desc);

-------------------------------------------------
-- CHAT (per-match and per-tournament)
-------------------------------------------------
create table if not exists chats (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('match','tournament')),
  match_id uuid references matches(id) on delete cascade,
  tournament_id uuid references tournaments(id) on delete cascade,
  created_at timestamptz default now(),
  check (
    (scope = 'match' and match_id is not null and tournament_id is null)
    or (scope = 'tournament' and tournament_id is not null and match_id is null)
  )
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references chats(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  message text not null check (char_length(message) > 0 and char_length(message) <= 2000),
  created_at timestamptz default now()
);
create index if not exists idx_chat_messages_chat_created on chat_messages(chat_id, created_at);

-------------------------------------------------
-- DISPUTES
-------------------------------------------------
create table if not exists disputes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  raised_by uuid not null references profiles(id) on delete cascade,
  category text not null check (category in ('score_mismatch','cheating','invalid_screenshot','no_show','other')),
  description text,
  evidence_urls text[],
  status text not null default 'open' check (status in ('open','under_review','resolved','rejected')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-------------------------------------------------
-- PRIZES
-------------------------------------------------
create table if not exists prizes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  sponsor text,
  value_cents int check (value_cents is null or value_cents >= 0),
  created_at timestamptz default now()
);

create table if not exists tournament_prizes (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  prize_id uuid not null references prizes(id) on delete cascade,
  placement int not null check (placement >= 1), -- 1=Champion, 2=Runner-up, etc.
  unique (tournament_id, placement),
  created_at timestamptz default now()
);

-------------------------------------------------
-- WEBHOOKS (optional for reminders/integrations)
-------------------------------------------------
create table if not exists webhooks (
  id uuid primary key default gen_random_uuid(),
  event text not null, -- e.g., match_created, result_confirmed
  target_url text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-------------------------------------------------
-- RANKINGS ENHANCEMENTS: season-scoped and per-game elo
-------------------------------------------------
alter table if exists rankings
  add column if not exists season_id uuid references seasons(id),
  add column if not exists game_id uuid references games(id),
  add column if not exists matches_played int default 0;

do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'rankings_unique_composite'
  ) then
    create unique index rankings_unique_composite
      on rankings (profile_id, coalesce(season_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(game_id, '00000000-0000-0000-0000-000000000000'::uuid));
  end if;
end$$;

-------------------------------------------------
-- ELO UPDATE FUNCTION AND TRIGGER
-------------------------------------------------
create or replace function update_rankings_on_confirm()
returns trigger as $$
declare
  m matches;
  p1 record;
  p2 record;
  k_factor int := 32;
  g_id uuid;
  season uuid;
  p1_score int;
  p2_score int;
  p1_win boolean;
  expected1 numeric;
  expected2 numeric;
  new_elo1 int;
  new_elo2 int;
begin
  if new.status <> 'confirmed' then
    return new;
  end if;

  select * into m from matches where id = new.match_id;
  if m.tournament_id is null then
    return new;
  end if;

  select game_id, season_id into g_id, season from tournaments where id = m.tournament_id;

  insert into rankings (profile_id, season_id, game_id)
  values (m.player1_id, season, g_id)
  on conflict (profile_id) do nothing;

  insert into rankings (profile_id, season_id, game_id)
  values (m.player2_id, season, g_id)
  on conflict (profile_id) do nothing;

  select r.points, r.elo_rating into p1 from rankings r where r.profile_id = m.player1_id and (r.season_id is not distinct from season) and (r.game_id is not distinct from g_id);
  select r.points, r.elo_rating into p2 from rankings r where r.profile_id = m.player2_id and (r.season_id is not distinct from season) and (r.game_id is not distinct from g_id);

  if p1.elo_rating is null then p1.elo_rating := 1200; end if;
  if p2.elo_rating is null then p2.elo_rating := 1200; end if;

  p1_score := coalesce(new.score_player1, 0);
  p2_score := coalesce(new.score_player2, 0);
  p1_win := p1_score > p2_score;

  expected1 := 1.0 / (1.0 + pow(10.0, ((p2.elo_rating - p1.elo_rating)::numeric / 400.0)));
  expected2 := 1.0 / (1.0 + pow(10.0, ((p1.elo_rating - p2.elo_rating)::numeric / 400.0)));

  if p1_win then
    new_elo1 := round(p1.elo_rating + k_factor * (1 - expected1));
    new_elo2 := round(p2.elo_rating + k_factor * (0 - expected2));
  else
    new_elo1 := round(p1.elo_rating + k_factor * (0 - expected1));
    new_elo2 := round(p2.elo_rating + k_factor * (1 - expected2));
  end if;

  update rankings
  set
    elo_rating = new_elo1,
    points = coalesce(points,0) + case when p1_win then 3 else 0 end,
    wins = coalesce(wins,0) + case when p1_win then 1 else 0 end,
    losses = coalesce(losses,0) + case when p1_win then 0 else 1 end,
    matches_played = coalesce(matches_played,0) + 1,
    last_played_at = now()
  where profile_id = m.player1_id and (season_id is not distinct from season) and (game_id is not distinct from g_id);

  update rankings
  set
    elo_rating = new_elo2,
    points = coalesce(points,0) + case when p1_win then 0 else 3 end,
    wins = coalesce(wins,0) + case when p1_win then 0 else 1 end,
    losses = coalesce(losses,0) + case when p1_win then 1 else 0 end,
    matches_played = coalesce(matches_played,0) + 1,
    last_played_at = now()
  where profile_id = m.player2_id and (season_id is not distinct from season) and (game_id is not distinct from g_id);

  return new;
end;
$$ language plpgsql;

drop trigger if exists match_result_confirm_trigger on match_results;
create trigger match_result_confirm_trigger
after update of status on match_results
for each row
when (new.status = 'confirmed')
execute procedure advance_winner();

drop trigger if exists match_result_ranking_trigger on match_results;
create trigger match_result_ranking_trigger
after update of status on match_results
for each row
when (new.status = 'confirmed')
execute procedure update_rankings_on_confirm();

-------------------------------------------------
-- ADMIN AUDIT LOGS
-------------------------------------------------
create table if not exists admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-------------------------------------------------
-- BASIC RLS & POLICIES (Fixes Syntax Error 42601)
-------------------------------------------------
alter table if exists notifications enable row level security;
alter table if exists chats enable row level security;
alter table if exists chat_messages enable row level security;
alter table if exists disputes enable row level security;
alter table if exists prizes enable row level security;
alter table if exists tournament_prizes enable row level security;
alter table if exists webhooks enable row level security;
alter table if exists seasons enable row level security;
alter table if exists season_members enable row level security;
alter table if exists admin_audit_logs enable row level security;

-- Notifications
drop policy if exists notifications_read_own on notifications;
create policy notifications_read_own on notifications for select using (profile_id = auth.uid());
drop policy if exists notifications_insert_own on notifications;
create policy notifications_insert_own on notifications for insert with check (profile_id = auth.uid());

-- Chats
drop policy if exists chats_read_public on chats;
create policy chats_read_public on chats for select using (true);

-- Chat Messages
drop policy if exists chat_messages_read_public on chat_messages;
create policy chat_messages_read_public on chat_messages for select using (true);
drop policy if exists chat_messages_insert_authenticated on chat_messages;
create policy chat_messages_insert_authenticated on chat_messages for insert with check (auth.uid() is not null);

-- Disputes
drop policy if exists disputes_read_involved on disputes;
create policy disputes_read_involved on disputes for select using (
  exists (select 1 from matches m where m.id = disputes.match_id and (m.player1_id = auth.uid() or m.player2_id = auth.uid()))
);
drop policy if exists disputes_insert_involved on disputes;
create policy disputes_insert_involved on disputes for insert with check (
  exists (select 1 from matches m where m.id = disputes.match_id and (m.player1_id = auth.uid() or m.player2_id = auth.uid()))
);

-- Seasons
drop policy if exists seasons_read_public on seasons;
create policy seasons_read_public on seasons for select using (true);
drop policy if exists season_members_read_own on season_members;
create policy season_members_read_own on season_members for select using (profile_id = auth.uid());
drop policy if exists season_members_insert_own on season_members;
create policy season_members_insert_own on season_members for insert with check (profile_id = auth.uid());

-- Prizes
drop policy if exists prizes_read_public on prizes;
create policy prizes_read_public on prizes for select using (true);
drop policy if exists tournament_prizes_read_public on tournament_prizes;
create policy tournament_prizes_read_public on tournament_prizes for select using (true);

-- Admin Audit Logs
drop policy if exists admin_audit_logs_none on admin_audit_logs;
create policy admin_audit_logs_none on admin_audit_logs for select using (false);

-------------------------------------------------
-- DEFAULT SEASON SEED
-------------------------------------------------
insert into seasons (name, slug, starts_at, ends_at)
values ('Season 1', 'season-1', date_trunc('day', now()), date_trunc('day', now()) + interval '90 days')
on conflict (name) do nothing;