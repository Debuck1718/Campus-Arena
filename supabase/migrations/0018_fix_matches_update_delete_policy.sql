-- Fix matches update/delete policies for tournament bracket generation
-- This allows authenticated tournament participants to manage matches
-- during bracket creation and progression.

alter table matches enable row level security;

drop policy if exists matches_update_accept on matches;
create policy matches_update_accept on matches
for update using (
  auth.uid() is not null
  and (
    auth.uid() = player1_id
    or auth.uid() = player2_id
    or exists (
      select 1 from tournament_players tp
      where tp.tournament_id = matches.tournament_id
        and tp.profile_id = auth.uid()
    )
    or is_admin()
  )
) with check (
  auth.uid() is not null
  and (
    auth.uid() = player1_id
    or auth.uid() = player2_id
    or exists (
      select 1 from tournament_players tp
      where tp.tournament_id = matches.tournament_id
        and tp.profile_id = auth.uid()
    )
    or is_admin()
  )
);

drop policy if exists matches_delete_tournament_player on matches;
create policy matches_delete_tournament_player on matches
for delete using (
  auth.uid() is not null
  and (
    auth.uid() = player1_id
    or auth.uid() = player2_id
    or exists (
      select 1 from tournament_players tp
      where tp.tournament_id = matches.tournament_id
        and tp.profile_id = auth.uid()
    )
    or is_admin()
  )
);
