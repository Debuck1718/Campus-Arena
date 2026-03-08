-- Ops and progression utilities for CampusArena

create extension if not exists "pgcrypto";

-------------------------------------------------
-- TOURNAMENT OPS RPCS
-------------------------------------------------
create or replace function tournament_open(p_id uuid)
returns void language plpgsql as $$
begin
  update tournaments
  set status = 'open'
  where id = p_id and status = 'draft';
end$$;

create or replace function tournament_lock(p_id uuid)
returns void language plpgsql as $$
begin
  update tournaments
  set status = 'locked'
  where id = p_id and status in ('draft','open');
end$$;

create or replace function tournament_start_single_elim(p_id uuid)
returns void language plpgsql as $$
begin
  perform lock_and_generate_single_elim(p_id);
end$$;

create or replace function tournament_complete(p_id uuid)
returns void language plpgsql as $$
begin
  update tournaments
  set status = 'completed', completed_at = now()
  where id = p_id and status = 'ongoing';
end$$;

-------------------------------------------------
-- PROGRESSION: CREATE NEXT ROUND WHEN POSSIBLE (SINGLE ELIM)
-------------------------------------------------
create or replace function ensure_next_round_match(t_id uuid, r int, mnum int)
returns void language plpgsql as $$
declare
  next_round int := r + 1;
  next_mnum int := ceil(mnum::numeric / 2.0);
  p1 uuid;
  p2 uuid;
begin
  -- determine p1 and p2 from winners of two feeder matches
  select winner_id into p1
  from matches
  where tournament_id = t_id and round_number = r and match_number = (next_mnum - 1) * 2 + 1;

  select winner_id into p2
  from matches
  where tournament_id = t_id and round_number = r and match_number = (next_mnum - 1) * 2 + 2;

  if p1 is null or p2 is null then
    return; -- not ready
  end if;

  -- upsert next round match
  insert into matches (tournament_id, round_number, match_number, player1_id, player2_id, status)
  values (t_id, next_round, next_mnum, p1, p2, 'pending')
  on conflict (tournament_id, round_number, match_number) do update
  set player1_id = excluded.player1_id,
      player2_id = excluded.player2_id;
end$$;

create or replace function progress_bracket_on_match_complete()
returns trigger language plpgsql as $$
declare
  m matches;
begin
  -- only act when a winner_id is set and status is completed
  if new.winner_id is null then
    return new;
  end if;

  select * into m from matches where id = new.id;

  -- Progress to next round based on deterministic pairing
  perform ensure_next_round_match(m.tournament_id, m.round_number, m.match_number);

  return new;
end$$;

drop trigger if exists progress_bracket_on_match_complete_trg on matches;
create trigger progress_bracket_on_match_complete_trg
after update of winner_id, status on matches
for each row
when (new.status = 'completed' and new.winner_id is not null)
execute procedure progress_bracket_on_match_complete();

-------------------------------------------------
-- COMPLETE RLS FOR NEW TABLES
-------------------------------------------------
-- Notifications: own read/write
do $$
begin
  if not exists (select 1 from pg_policies where tablename='notifications' and policyname='notifications_select_own') then
    create policy notifications_select_own on notifications for select using (profile_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename='notifications' and policyname='notifications_insert_own') then
    create policy notifications_insert_own on notifications for insert with check (profile_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename='notifications' and policyname='notifications_update_own') then
    create policy notifications_update_own on notifications for update using (profile_id = auth.uid());
  end if;
end$$;

-- Chats/messages: public read, authenticated post
do $$
begin
  if not exists (select 1 from pg_policies where tablename='chats' and policyname='chats_select_public') then
    create policy chats_select_public on chats for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='chat_messages' and policyname='chat_messages_select_public') then
    create policy chat_messages_select_public on chat_messages for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='chat_messages' and policyname='chat_messages_insert_auth') then
    create policy chat_messages_insert_auth on chat_messages for insert with check (auth.uid() is not null);
  end if;
end$$;

-- Disputes: involved can read/insert; admins can update
do $$
begin
  if not exists (select 1 from pg_policies where tablename='disputes' and policyname='disputes_select_involved') then
    create policy disputes_select_involved on disputes
    for select using (
      exists (select 1 from matches m where m.id = disputes.match_id and (m.player1_id = auth.uid() or m.player2_id = auth.uid()))
      or is_admin()
    );
  end if;
  if not exists (select 1 from pg_policies where tablename='disputes' and policyname='disputes_insert_involved') then
    create policy disputes_insert_involved on disputes
    for insert with check (
      exists (select 1 from matches m where m.id = disputes.match_id and (m.player1_id = auth.uid() or m.player2_id = auth.uid()))
      or is_admin()
    );
  end if;
  if not exists (select 1 from pg_policies where tablename='disputes' and policyname='disputes_update_admin') then
    create policy disputes_update_admin on disputes for update using (is_admin());
  end if;
end$$;

-- Prizes and tournament_prizes: public read; admin manage
do $$
begin
  if not exists (select 1 from pg_policies where tablename='prizes' and policyname='prizes_select_public') then
    create policy prizes_select_public on prizes for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='prizes' and policyname='prizes_admin_write') then
    create policy prizes_admin_write on prizes for all using (is_admin()) with check (is_admin());
  end if;

  if not exists (select 1 from pg_policies where tablename='tournament_prizes' and policyname='tprizes_select_public') then
    create policy tprizes_select_public on tournament_prizes for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='tournament_prizes' and policyname='tprizes_admin_write') then
    create policy tprizes_admin_write on tournament_prizes for all using (is_admin()) with check (is_admin());
  end if;
end$$;

-- Seasons and season_members: public read seasons; self manage membership
do $$
begin
  if not exists (select 1 from pg_policies where tablename='seasons' and policyname='seasons_select_public') then
    create policy seasons_select_public on seasons for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='season_members' and policyname='sm_select_own') then
    create policy sm_select_own on season_members for select using (profile_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename='season_members' and policyname='sm_insert_own') then
    create policy sm_insert_own on season_members for insert with check (profile_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename='season_members' and policyname='sm_delete_own') then
    create policy sm_delete_own on season_members for delete using (profile_id = auth.uid());
  end if;
end$$;

-- Webhooks/admin audit logs: admin only
do $$
begin
  if not exists (select 1 from pg_policies where tablename='webhooks' and policyname='webhooks_admin') then
    create policy webhooks_admin on webhooks for all using (is_admin()) with check (is_admin());
  end if;
  if not exists (select 1 from pg_policies where tablename='admin_audit_logs' and policyname='audit_admin') then
    create policy audit_admin on admin_audit_logs for select using (is_admin());
  end if;
end$$;