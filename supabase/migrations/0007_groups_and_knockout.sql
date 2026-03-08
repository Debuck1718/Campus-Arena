-- Groups (Round Robin) and advancement to Knockout

create extension if not exists "pgcrypto";

-------------------------------------------------
-- GROUPS AND STANDINGS
-------------------------------------------------
create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  name text not null, -- e.g., "Group A"
  created_at timestamptz default now(),
  unique (tournament_id, name)
);

create table if not exists group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  unique (group_id, profile_id)
);

-- Standings denormalized for speed with standard tiebreakers
create table if not exists group_standings (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  played int default 0,
  wins int default 0,
  draws int default 0,
  losses int default 0,
  goals_for int default 0,
  goals_against int default 0,
  goal_diff int generated always as (goals_for - goals_against) stored,
  points int default 0, -- win=3, draw=1
  updated_at timestamptz default now(),
  unique (group_id, profile_id)
);

create table if not exists group_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  group_id uuid not null references groups(id) on delete cascade,
  round_number int not null,
  match_number int not null,
  home_id uuid not null references profiles(id),
  away_id uuid not null references profiles(id),
  home_score int,
  away_score int,
  status text not null default 'pending' check (status in ('pending','scheduled','completed','disputed')),
  scheduled_at timestamptz,
  deadline_at timestamptz,
  created_at timestamptz default now(),
  unique (group_id, round_number, match_number)
);

create index if not exists idx_group_matches_group_round on group_matches(group_id, round_number);
create index if not exists idx_group_members_group on group_members(group_id);
create index if not exists idx_group_standings_group on group_standings(group_id);

-------------------------------------------------
-- RLS
-------------------------------------------------
alter table if exists groups enable row level security;
alter table if exists group_members enable row level security;
alter table if exists group_standings enable row level security;
alter table if exists group_matches enable row level security;

-- Public read for now; later restrict writes to admins/organizers
do $$
begin
  if not exists (select 1 from pg_policies where tablename='groups' and policyname='groups_select_public') then
    create policy groups_select_public on groups for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='group_members' and policyname='group_members_select_public') then
    create policy group_members_select_public on group_members for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='group_standings' and policyname='group_standings_select_public') then
    create policy group_standings_select_public on group_standings for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='group_matches' and policyname='group_matches_select_public') then
    create policy group_matches_select_public on group_matches for select using (true);
  end if;
end$$;

-------------------------------------------------
-- FIXTURE GENERATOR (SINGLE ROUND ROBIN)
-------------------------------------------------
create or replace function generate_groups(p_tournament uuid, p_group_count int, p_advance_per_group int)
returns void language plpgsql as $$
declare
  players uuid[];
  total int;
  i int;
  grp int;
  base_name text := 'Group ';
  gid uuid;
  idx int := 1;
  per_group int;
  member uuid;
begin
  if p_group_count < 1 then raise exception 'group_count must be >= 1'; end if;
  if p_advance_per_group < 1 then raise exception 'advance_per_group must be >= 1'; end if;

  select array_agg(profile_id order by random()) into players
  from tournament_players where tournament_id = p_tournament;

  total := coalesce(array_length(players,1), 0);
  if total < 2 then raise exception 'Not enough players for groups'; end if;

  -- simple even split; last group may have extra
  per_group := ceil(total::numeric / p_group_count);

  -- clear previous grouping for idempotency (safe before matches are played)
  delete from group_matches where tournament_id = p_tournament;
  delete from group_standings using groups g where g.id = group_standings.group_id and g.tournament_id = p_tournament;
  delete from group_members using groups g where g.id = group_members.group_id and g.tournament_id = p_tournament;
  delete from groups where tournament_id = p_tournament;

  -- create groups and distribute members
  for grp in 1..p_group_count loop
    insert into groups (tournament_id, name) values (p_tournament, base_name || chr(64 + grp)) returning id into gid;

    i := 1;
    while i <= per_group and idx <= total loop
      member := players[idx];
      insert into group_members (group_id, profile_id) values (gid, member)
      on conflict do nothing;

      insert into group_standings (group_id, profile_id) values (gid, member)
      on conflict do nothing;

      idx := idx + 1;
      i := i + 1;
    end loop;

    -- generate round-robin fixtures for this group (circle method simplified)
    perform generate_group_fixtures(gid, p_tournament);
  end loop;
end$$;

-- Helper: create fixtures for a single group (single round robin)
create or replace function generate_group_fixtures(p_group uuid, p_tournament uuid)
returns void language plpgsql as $$
declare
  members uuid[];
  n int;
  rounds int;
  r int;
  m int;
  a int;
  b int;
  match_no int := 1;
begin
  select array_agg(profile_id order by profile_id) into members from group_members where group_id = p_group;
  n := coalesce(array_length(members,1), 0);
  if n < 2 then return; end if;

  -- If odd, add a bye (null) - we skip generating matches where bye occurs
  if mod(n, 2) = 1 then
    members := members || null;
    n := n + 1;
  end if;

  rounds := n - 1;

  for r in 1..rounds loop
    for m in 1..(n/2) loop
      a := m;
      b := n - m + 1;

      if members[a] is not null and members[b] is not null then
        insert into group_matches (tournament_id, group_id, round_number, match_number, home_id, away_id, status)
        values (p_tournament, p_group, r, match_no, members[a], members[b], 'pending');
        match_no := match_no + 1;
      end if;
    end loop;

    -- rotate members except the first (circle method)
    members := array[members[1]] || array[members[n]] || members[2:n-1];
  end loop;
end$$;

-------------------------------------------------
-- UPDATE STANDINGS ON GROUP MATCH COMPLETION
-------------------------------------------------
create or replace function update_group_standings_on_complete()
returns trigger language plpgsql as $$
declare
  home_wins boolean;
  draw boolean;
begin
  if new.status <> 'completed' or new.home_score is null or new.away_score is null then
    return new;
  end if;

  home_wins := new.home_score > new.away_score;
  draw := new.home_score = new.away_score;

  -- Home
  update group_standings
  set
    played = coalesce(played,0) + 1,
    wins = coalesce(wins,0) + case when home_wins then 1 else 0 end,
    draws = coalesce(draws,0) + case when draw then 1 else 0 end,
    losses = coalesce(losses,0) + case when not home_wins and not draw then 1 else 0 end,
    goals_for = coalesce(goals_for,0) + new.home_score,
    goals_against = coalesce(goals_against,0) + new.away_score,
    points = coalesce(points,0) + case when home_wins then 3 when draw then 1 else 0 end,
    updated_at = now()
  where group_id = new.group_id and profile_id = new.home_id;

  -- Away
  update group_standings
  set
    played = coalesce(played,0) + 1,
    wins = coalesce(wins,0) + case when not home_wins and not draw then 1 else 0 end,
    draws = coalesce(draws,0) + case when draw then 1 else 0 end,
    losses = coalesce(losses,0) + case when home_wins then 1 else 0 end,
    goals_for = coalesce(goals_for,0) + new.away_score,
    goals_against = coalesce(goals_against,0) + new.home_score,
    points = coalesce(points,0) + case when not home_wins and not draw then 3 when draw then 1 else 0 end,
    updated_at = now()
  where group_id = new.group_id and profile_id = new.away_id;

  return new;
end$$;

drop trigger if exists trg_update_group_standings on group_matches;
create trigger trg_update_group_standings
after update of status, home_score, away_score on group_matches
for each row
when (new.status = 'completed' and new.home_score is not null and new.away_score is not null)
execute procedure update_group_standings_on_complete();

-------------------------------------------------
-- ADVANCE TOP N FROM EACH GROUP TO KNOCKOUT (ROUND 1)
-------------------------------------------------
create or replace function advance_groups_to_knockout(p_tournament uuid, p_advance_per_group int)
returns void language plpgsql as $$
declare
  g record;
  adv_ids uuid[];
  i int;
  seed int := 1;
  players uuid[];
  match_no int := 1;
begin
  if p_advance_per_group < 1 then raise exception 'advance_per_group must be >= 1'; end if;

  -- Collect qualifiers from each group ordered by points, goal_diff, goals_for
  players := array[]::uuid[];

  for g in
    select id from groups where tournament_id = p_tournament order by name
  loop
    select array_agg(profile_id order by points desc, goal_diff desc, goals_for desc, updated_at desc)
    into adv_ids
    from group_standings
    where group_id = g.id
    limit p_advance_per_group;

    if adv_ids is not null then
      players := players || adv_ids;
    end if;
  end loop;

  if array_length(players,1) is null or array_length(players,1) < 2 then
    raise exception 'Not enough qualifiers to create knockout bracket';
  end if;

  -- Clear any existing knockout round 1
  delete from matches where tournament_id = p_tournament and stage = 'knockout' and round_number = 1;

  -- Seed players into knockout bracket round 1 (pair sequentially; later: cross-group seeding)
  i := 1;
  while i <= array_length(players,1) loop
    insert into matches (tournament_id, stage, round_number, match_number, player1_id, player2_id, status)
    values (p_tournament, 'knockout', 1, match_no, players[i], players[i+1], 'pending');
    match_no := match_no + 1;
    i := i + 2;
  end loop;

  -- Move tournament to ongoing if not already
  update tournaments
  set status = case when status in ('draft','open','locked') then 'ongoing' else status end,
      started_at = coalesce(started_at, now())
  where id = p_tournament;
end$$;