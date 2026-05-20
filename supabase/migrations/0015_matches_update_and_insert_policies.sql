-- Add missing match insert and update policies for authenticated users

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'matches'
      and policyname = 'matches_insert_auth'
  ) then
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
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'matches'
      and policyname = 'matches_insert_tournament_player'
  ) then
    create policy matches_insert_tournament_player on matches
    for insert with check (
      auth.uid() is not null
      and exists (
        select 1 from tournament_players tp
        where tp.tournament_id = tournament_id
          and tp.profile_id = auth.uid()
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'matches'
      and policyname = 'matches_update_accept'
  ) then
    create policy matches_update_accept on matches
    for update using (
      (player2_id is null and auth.uid() is not null)
      or auth.uid() = player2_id
      or is_admin()
    ) with check (
      auth.uid() = player2_id
      or is_admin()
    );
  end if;
end$$;
