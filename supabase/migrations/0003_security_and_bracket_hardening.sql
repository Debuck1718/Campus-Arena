-- Security and bracket hardening

-- Ensure pgcrypto exists
create extension if not exists "pgcrypto";

-------------------------------------------------
-- ADMIN ROLES AND HELPER
-------------------------------------------------
create table if not exists admin_roles (
  profile_id uuid primary key references profiles(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin','moderator')),
  created_at timestamptz default now()
);

create or replace function is_admin(p uuid default auth.uid())
returns boolean language sql stable as $$
  select exists (select 1 from admin_roles ar where ar.profile_id = p)
$$;

-------------------------------------------------
-- ENABLE RLS ON CORE TABLES (if not already)
-------------------------------------------------
alter table if exists profiles enable row level security;
alter table if exists games enable row level security;
alter table if exists tournaments enable row level security;
alter table if exists tournament_players enable row level security;
alter table if exists matches enable row level security;
alter table if exists match_results enable row level security;
alter table if exists rankings enable row level security;

-------------------------------------------------
-- PROFILES POLICIES
-------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_select_all') then
    create policy profiles_select_all on profiles for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_insert_self') then
    create policy profiles_insert_self on profiles for insert with check (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_update_self') then
    create policy profiles_update_self on profiles for update using (auth.uid() = id);
  end if;
end$$;

-------------------------------------------------
-- GAMES POLICIES (read-only)
-------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='games' and policyname='games_select_all') then
    create policy games_select_all on games for select using (true);
  end if;
end$$;

-------------------------------------------------
-- TOURNAMENTS POLICIES
-------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='tournaments' and policyname='tournaments_select_all') then
    create policy tournaments_select_all on tournaments for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='tournaments' and policyname='tournaments_insert_auth') then
    create policy tournaments_insert_auth on tournaments for insert with check (auth.uid() is not null);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='tournaments' and policyname='tournaments_update_creator_or_admin') then
    create policy tournaments_update_creator_or_admin on tournaments
    for update using (auth.uid() = created_by or is_admin());
  end if;
end$$;

-------------------------------------------------
-- TOURNAMENT PLAYERS POLICIES
-------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='tournament_players' and policyname='tp_select_public') then
    create policy tp_select_public on tournament_players for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='tournament_players' and policyname='tp_insert_self') then
    create policy tp_insert_self on tournament_players for insert with check (auth.uid() = profile_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='tournament_players' and policyname='tp_delete_self_before_lock') then
    create policy tp_delete_self_before_lock on tournament_players
    for delete using (
      auth.uid() = profile_id and
      exists (select 1 from tournaments t where t.id = tournament_id and t.status in ('draft','open'))
    );
  end if;
end$$;

-------------------------------------------------
-- MATCHES POLICIES
-------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='matches' and policyname='matches_select_all') then
    create policy matches_select_all on matches for select using (true);
  end if;
end$$;

-------------------------------------------------
-- MATCH RESULTS POLICIES
-------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='match_results' and policyname='mr_select_involved') then
    create policy mr_select_involved on match_results
    for select using (
      exists (select 1 from matches m where m.id = match_results.match_id and (m.player1_id = auth.uid() or m.player2_id = auth.uid()))
      or is_admin()
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='match_results' and policyname='mr_insert_involved') then
    create policy mr_insert_involved on match_results
    for insert with check (
      exists (select 1 from matches m where m.id = match_results.match_id and (m.player1_id = auth.uid() or m.player2_id = auth.uid()))
      or is_admin()
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='match_results' and policyname='mr_update_admin_only') then
    create policy mr_update_admin_only on match_results
    for update using (is_admin());
  end if;
end$$;

-------------------------------------------------
-- RANKINGS POLICIES
-------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='rankings' and policyname='rankings_select_all') then
    create policy rankings_select_all on rankings for select using (true);
  end if;
end$$;

-------------------------------------------------
-- PREVENT JOINS AFTER LOCK (GUARD)
-------------------------------------------------
create or replace function ensure_tournament_open()
returns trigger as $$
declare
  st text;
begin
  select status into st from tournaments where id = new.tournament_id;
  if st is null or st not in ('draft','open') then
    raise exception 'Tournament is not open for joining';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists tournament_open_guard on tournament_players;
create trigger tournament_open_guard
before insert on tournament_players
for each row execute function ensure_tournament_open();

-------------------------------------------------
-- LOCK AND GENERATE BRACKET ATOMICALLY WITH BYES
-------------------------------------------------
create or replace function lock_and_generate_single_elim(t_id uuid)
returns void as $$
declare
  players uuid[];
  total int;
  pow2 int;
  i int;
  match_no int := 1;
  bye_player uuid;
begin
  -- lock tournament for updates
  perform 1 from tournaments where id = t_id for update;
  -- fetch players randomized
  select array_agg(profile_id order by random()) into players
  from tournament_players where tournament_id = t_id;

  total := coalesce(array_length(players,1), 0);
  if total < 2 then
    raise exception 'Not enough players to start';
  end if;

  -- compute next power of two
  pow2 := 1;
  while pow2 < total loop
    pow2 := pow2 * 2;
  end loop;

  -- set tournament to locked/ongoing and started_at
  update tournaments
  set status = case when status = 'open' then 'locked' else status end,
      started_at = coalesce(started_at, now()),
      format = coalesce(format, 'single_elim')
  where id = t_id;

  -- clear any existing round 1 matches to allow re-run before start
  delete from matches where tournament_id = t_id and round_number = 1;

  -- If players < pow2, assign byes by pairing null opponents; we’ll advance them on confirm or via job later
  i := 1;
  while i <= total loop
    insert into matches (tournament_id, round_number, match_number, player1_id, player2_id, status)
    values (t_id, 1, match_no, players[i], case when i+1 <= total then players[i+1] else null end, 'pending');
    match_no := match_no + 1;
    i := i + 2;
  end loop;

  -- If odd, we created a bye with player2 null. Immediately set winner for those with null opponents.
  update matches
  set winner_id = player1_id, status = 'completed'
  where tournament_id = t_id and round_number = 1 and player2_id is null;

end;
$$ language plpgsql;

-------------------------------------------------
-- STARTED_AT SAFETY: ensure set when first match created
-------------------------------------------------
create or replace function set_started_at_on_first_match()
returns trigger as $$
begin
  update tournaments
  set started_at = coalesce(started_at, now()),
      status = case when status in ('locked','open','draft') then 'ongoing' else status end
  where id = new.tournament_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_started_at_on_first_match_trigger on matches;
create trigger set_started_at_on_first_match_trigger
after insert on matches
for each row execute function set_started_at_on_first_match();