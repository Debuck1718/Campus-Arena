-- Enable required extensions
create extension if not exists "pgcrypto";

-------------------------------------------------
-- PROFILES
-------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 24),
  platform text check (platform in ('PlayStation','Xbox','PC','Mobile')),
  avatar_url text,
  bio text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-------------------------------------------------
-- GAMES
-------------------------------------------------
create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug text unique not null,
  platform_support text[] not null,
  created_at timestamptz default now()
);

-------------------------------------------------
-- TOURNAMENTS
-------------------------------------------------
create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  game_id uuid references games(id),
  platform text check (platform in ('PlayStation','Xbox','PC','Mobile')),
  format text check (format in ('single_elim','double_elim','round_robin')),
  max_players int check (max_players between 2 and 256),
  status text default 'draft'
    check (status in ('draft','open','locked','ongoing','completed')),
  created_by uuid references profiles(id),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-------------------------------------------------
-- TOURNAMENT PLAYERS
-------------------------------------------------
create table if not exists tournament_players (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references tournaments(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  seed int,
  joined_at timestamptz default now(),
  unique(tournament_id, profile_id)
);

-------------------------------------------------
-- MATCHES
-------------------------------------------------
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references tournaments(id) on delete cascade,
  stage text default 'knockout'
    check (stage in ('group','knockout')),
  round_number int not null,
  match_number int not null,
  player1_id uuid references profiles(id),
  player2_id uuid references profiles(id),
  winner_id uuid references profiles(id),
  status text default 'pending'
    check (status in ('pending','scheduled','completed','disputed')),
  scheduled_at timestamptz,
  deadline_at timestamptz,
  feeder1_match_id uuid,
  feeder1_from text default 'winner'
    check (feeder1_from in ('winner','loser')),
  feeder2_match_id uuid,
  feeder2_from text default 'winner'
    check (feeder2_from in ('winner','loser')),
  created_at timestamptz default now(),
  unique(tournament_id, round_number, match_number),
  check (
    winner_id is null
    or winner_id = player1_id
    or winner_id = player2_id
  )
);

-------------------------------------------------
-- MATCH RESULTS
-------------------------------------------------
create table if not exists match_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id) on delete cascade,
  reported_by uuid references profiles(id),
  score_player1 int check (score_player1 >= 0),
  score_player2 int check (score_player2 >= 0),
  screenshot_url text,
  status text default 'pending'
    check (status in ('pending','confirmed','disputed','rejected')),
  created_at timestamptz default now(),
  unique(match_id, reported_by)
);

-------------------------------------------------
-- RANKINGS
-------------------------------------------------
create table if not exists rankings (
  profile_id uuid primary key references profiles(id) on delete cascade,
  points int default 0,
  wins int default 0,
  losses int default 0,
  elo_rating int default 1200,
  last_played_at timestamptz
);

-------------------------------------------------
-- TOURNAMENT CAPACITY CHECK
-------------------------------------------------
create or replace function check_tournament_capacity()
returns trigger as $$
begin
  if (
    select count(*) from tournament_players
    where tournament_id = new.tournament_id
  ) >= (
    select max_players from tournaments
    where id = new.tournament_id
  ) then
    raise exception 'Tournament is full';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger tournament_capacity_trigger
before insert on tournament_players
for each row execute function check_tournament_capacity();

-------------------------------------------------
-- SINGLE ELIMINATION BRACKET GENERATOR
-------------------------------------------------
create or replace function generate_single_elim_bracket(t_id uuid)
returns void as $$
declare
  players uuid[];
  total_players int;
  rounds int;
  match_counter int := 1;
  i int;
begin
  select array_agg(profile_id)
  into players
  from tournament_players
  where tournament_id = t_id
  order by random();

  total_players := array_length(players,1);
  rounds := ceil(log(total_players)/log(2));

  for i in 1..total_players by 2 loop
    insert into matches(
      tournament_id,
      round_number,
      match_number,
      player1_id,
      player2_id,
      status
    )
    values(
      t_id,
      1,
      match_counter,
      players[i],
      players[i+1],
      'pending'
    );
    match_counter := match_counter + 1;
  end loop;
end;
$$ language plpgsql;

-------------------------------------------------
-- WINNER ADVANCEMENT FUNCTION
-------------------------------------------------
create or replace function advance_winner()
returns trigger as $$
declare
  next_match matches;
begin
  update matches
  set winner_id = case
      when new.score_player1 > new.score_player2
      then m.player1_id
      else m.player2_id
  end
  from matches m
  where m.id = new.match_id;

  return new;
end;
$$ language plpgsql;

create trigger match_result_confirm_trigger
after update of status on match_results
for each row
when (new.status = 'confirmed')
execute function advance_winner();

-------------------------------------------------
-- SEED GAMES
-------------------------------------------------
insert into games(name,slug,platform_support)
values
('EA Sports FC 24','fc24',array['PlayStation','Xbox','PC']),
('Dream League Soccer','dream-league',array['Mobile']),
('NBA 2K24','nba2k24',array['PlayStation','Xbox','PC'])
on conflict do nothing;