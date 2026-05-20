-- Fix quick match RPC, add online status, and ensure PES game exists
create extension if not exists "pgcrypto";

-------------------------------------------------
-- Add online status tracking to profiles
-------------------------------------------------
alter table if exists profiles
  add column if not exists last_seen_at timestamptz default now(),
  add column if not exists is_online boolean default false;

-------------------------------------------------
-- Update match creation trigger to auto-set game_id if needed for quick matches
-------------------------------------------------
alter table if exists matches
  add column if not exists game_id uuid references games(id);

-------------------------------------------------
-- Ensure PES/In-Person game exists
-------------------------------------------------
insert into games (name, slug, platform_support)
values ('PES / In-Person', 'pes-in-person', '{"In-Person"}')
on conflict (slug) do nothing;

insert into games (name, slug, platform_support)
values ('FIFA', 'fifa', '{"PlayStation","Xbox","PC"}')
on conflict (slug) do nothing;

insert into games (name, slug, platform_support)
values ('2K Basketball', '2k-basketball', '{"PlayStation","Xbox","PC"}')
on conflict (slug) do nothing;

insert into games (name, slug, platform_support)
values ('Madden', 'madden', '{"PlayStation","Xbox","PC"}')
on conflict (slug) do nothing;

-------------------------------------------------
-- DROP and recreate the quick match RPC to handle game_id properly
-------------------------------------------------
drop function if exists claim_quick_match(uuid);

create or replace function claim_quick_match(p_uid uuid, p_game_id uuid default null)
returns uuid language plpgsql as $$
declare
  candidate record;
  matched_id uuid;
  default_game_id uuid;
begin
  -- Use provided game_id or default to PES
  if p_game_id is null then
    select id into default_game_id from games where slug = 'pes-in-person' limit 1;
  else
    default_game_id := p_game_id;
  end if;

  -- Try to find a waiting open challenge for the same game and lock it
  with c as (
    select id
    from matches
    where tournament_id is null
      and player2_id is null
      and status = 'pending'
      and player1_id <> p_uid
      and (game_id = default_game_id or (default_game_id is null))
    order by created_at asc
    for update skip locked
    limit 1
  )
  update matches m
  set player2_id = p_uid
  from c
  where m.id = c.id
  returning m.id into matched_id;

  if matched_id is not null then
    return matched_id;
  end if;

  -- No open challenge found: create a new open match with player1 = caller
  insert into matches (player1_id, player2_id, status, round_number, match_number, game_id)
  values (
    p_uid,
    null,
    'pending',
    1,
    coalesce((select max(match_number) from matches where tournament_id is null and round_number = 1), 0) + 1,
    default_game_id
  )
  returning id into matched_id;
  return matched_id;
end$$;

-------------------------------------------------
-- Create a function to update last_seen_at on user activity
-------------------------------------------------
create or replace function update_user_last_seen()
returns trigger as $$
begin
  update profiles set last_seen_at = now(), is_online = true
  where id = new.profile_id or id = new.user_id or id = new.uid;
  return new;
end;
$$ language plpgsql;

create index if not exists idx_profiles_online on profiles(is_online, last_seen_at);
create index if not exists idx_matches_game on matches(game_id) where tournament_id is null;
