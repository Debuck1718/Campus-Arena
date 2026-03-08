-- Tournament RPCs, indexes, and dashboard view

create extension if not exists "pgcrypto";

-------------------------------------------------
-- PERFORMANCE INDEXES
-------------------------------------------------
create index if not exists idx_tournaments_game on tournaments(game_id);
create index if not exists idx_tournaments_status on tournaments(status);
create index if not exists idx_tournament_players_tournament on tournament_players(tournament_id);
create index if not exists idx_tournament_players_profile on tournament_players(profile_id);
create index if not exists idx_matches_tournament_round on matches(tournament_id, round_number, match_number);
create index if not exists idx_matches_status on matches(status);
create index if not exists idx_match_results_match on match_results(match_id);
create index if not exists idx_rankings_composite on rankings(profile_id, season_id, game_id);
create index if not exists idx_disputes_match on disputes(match_id);
create index if not exists idx_notifications_profile on notifications(profile_id);
create index if not exists idx_groups_tournament on groups(tournament_id);

-------------------------------------------------
-- CREATE TOURNAMENT RPC
-------------------------------------------------
create or replace function create_tournament(
  p_name text,
  p_slug text,
  p_game_id uuid,
  p_platform text,
  p_format text default 'single_elim',
  p_max_players int default 16,
  p_visibility text default 'public',
  p_rules text default null,
  p_season_id uuid default null
) returns uuid
language plpgsql
as $$
declare
  tid uuid;
  creator uuid := auth.uid();
begin
  if creator is null then
    raise exception 'Must be authenticated';
  end if;

  if p_platform not in ('PlayStation','Xbox','PC','Mobile') then
    raise exception 'Invalid platform';
  end if;

  if p_format not in ('single_elim','double_elim','round_robin') then
    raise exception 'Invalid format';
  end if;

  if p_max_players < 2 or p_max_players > 256 then
    raise exception 'Invalid max_players';
  end if;

  insert into tournaments (name, slug, game_id, platform, format, max_players, status, created_by, visibility, rules, season_id)
  values (p_name, p_slug, p_game_id, p_platform, p_format, p_max_players, 'draft', creator, p_visibility, p_rules, p_season_id)
  returning id into tid;

  insert into admin_audit_logs (actor_id, action, entity_type, entity_id, details)
  values (creator, 'create_tournament', 'tournament', tid, jsonb_build_object('name', p_name, 'slug', p_slug));

  return tid;
end
$$;

-------------------------------------------------
-- JOIN/LEAVE TOURNAMENT RPCS
-------------------------------------------------
create or replace function join_tournament(p_tournament uuid)
returns void
language plpgsql
as $$
declare
  uid uuid := auth.uid();
  st text;
  cap int;
  cnt int;
begin
  if uid is null then
    raise exception 'Must be authenticated';
  end if;

  select status, max_players into st, cap from tournaments where id = p_tournament;

  if st is null then
    raise exception 'Tournament not found';
  end if;

  if st not in ('draft','open') then
    raise exception 'Tournament is not open for joining';
  end if;

  select count(*) into cnt from tournament_players where tournament_id = p_tournament;

  if cnt >= cap then
    raise exception 'Tournament is full';
  end if;

  insert into tournament_players(tournament_id, profile_id)
  values (p_tournament, uid)
  on conflict do nothing;

  insert into admin_audit_logs (actor_id, action, entity_type, entity_id, details)
  values (uid, 'join_tournament', 'tournament', p_tournament, jsonb_build_object('profile_id', uid));
end
$$;

create or replace function leave_tournament(p_tournament uuid)
returns void
language plpgsql
as $$
declare
  uid uuid := auth.uid();
  st text;
begin
  if uid is null then
    raise exception 'Must be authenticated';
  end if;

  select status into st from tournaments where id = p_tournament;

  if st not in ('draft','open') then
    raise exception 'Cannot leave a locked/started tournament';
  end if;

  delete from tournament_players
  where tournament_id = p_tournament and profile_id = uid;

  insert into admin_audit_logs (actor_id, action, entity_type, entity_id, details)
  values (uid, 'leave_tournament', 'tournament', p_tournament, jsonb_build_object('profile_id', uid));
end
$$;

-------------------------------------------------
-- UPCOMING MATCHES VIEW FOR DASHBOARD
-------------------------------------------------
create or replace view v_user_upcoming_matches as
select
  m.id as match_id,
  m.tournament_id,
  t.name as tournament_name,
  t.game_id,
  m.round_number,
  m.match_number,
  m.player1_id,
  m.player2_id,
  m.status,
  m.scheduled_at,
  m.deadline_at
from matches m
join tournaments t on t.id = m.tournament_id
where m.status in ('pending','scheduled');

-- Note: apply RLS via underlying tables; the view inherits access.