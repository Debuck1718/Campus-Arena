-- Fix matches insert policy to allow tournament bracket generation
-- This ensures authenticated tournament participants can insert match rows
-- during bracket creation, even when they are not the row's player1/player2.

alter table matches enable row level security;

-- Replace existing insert policies with tournament-aware checks.
drop policy if exists matches_insert_auth on matches;
create policy matches_insert_auth on matches
for insert with check (
  auth.uid() is not null
  and (
    auth.uid() = player1_id
    or auth.uid() = player2_id
    or exists (
      select 1 from tournament_players tp
      where tp.tournament_id = tournament_id
        and tp.profile_id = auth.uid()
    )
  )
);

drop policy if exists matches_insert_tournament_player on matches;
create policy matches_insert_tournament_player on matches
for insert with check (
  auth.uid() is not null
  and exists (
    select 1 from tournament_players tp
    where tp.tournament_id = tournament_id
      and tp.profile_id = auth.uid()
  )
);
