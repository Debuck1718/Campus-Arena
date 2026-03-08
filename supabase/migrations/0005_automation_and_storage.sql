-- Automation (no-show, auto-resolve) and storage policies

create extension if not exists "pgcrypto";

-------------------------------------------------
-- NO-SHOW REPORTING
-------------------------------------------------
create table if not exists no_show_reports (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  reporter_id uuid not null references profiles(id) on delete cascade,
  reported_user_id uuid not null references profiles(id) on delete cascade,
  reason text,
  status text not null default 'pending' check (status in ('pending','grace','auto_win','rejected','resolved')),
  created_at timestamptz default now(),
  grace_until timestamptz
);
create index if not exists idx_no_show_match on no_show_reports(match_id);

alter table if exists no_show_reports enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename='no_show_reports' and policyname='ns_select_involved') then
    create policy ns_select_involved on no_show_reports
    for select using (
      exists (select 1 from matches m where m.id = no_show_reports.match_id and (m.player1_id = auth.uid() or m.player2_id = auth.uid()))
      or is_admin()
    );
  end if;
  if not exists (select 1 from pg_policies where tablename='no_show_reports' and policyname='ns_insert_involved') then
    create policy ns_insert_involved on no_show_reports
    for insert with check (
      exists (select 1 from matches m where m.id = no_show_reports.match_id and (m.player1_id = auth.uid() or m.player2_id = auth.uid()))
      or is_admin()
    );
  end if;
  if not exists (select 1 from pg_policies where tablename='no_show_reports' and policyname='ns_update_admin') then
    create policy ns_update_admin on no_show_reports for update using (is_admin());
  end if;
end$$;

create or replace function report_no_show(p_match uuid, p_reporter uuid, p_reason text default null, p_grace_hours int default 12)
returns uuid language plpgsql as $$
declare
  m matches;
  other uuid;
  rec_id uuid;
begin
  select * into m from matches where id = p_match;
  if m.id is null then raise exception 'Match not found'; end if;
  if p_reporter <> m.player1_id and p_reporter <> m.player2_id then
    raise exception 'Only involved players can report no-show';
  end if;
  other := case when p_reporter = m.player1_id then m.player2_id else m.player1_id end;

  insert into no_show_reports (match_id, reporter_id, reported_user_id, reason, status, grace_until)
  values (p_match, p_reporter, other, p_reason, 'grace', now() + make_interval(hours => p_grace_hours))
  returning id into rec_id;

  perform notify_match_event(p_match, 'no_show_reported', jsonb_build_object('report_id', rec_id));

  return rec_id;
end$$;

-------------------------------------------------
-- NOTIFICATION HELPER
-------------------------------------------------
create or replace function notify_match_event(p_match uuid, p_type text, p_payload jsonb default '{}'::jsonb)
returns void language plpgsql as $$
declare
  m matches;
begin
  select * into m from matches where id = p_match;
  if m.player1_id is not null then
    insert into notifications (profile_id, type, payload) values (m.player1_id, p_type, p_payload);
  end if;
  if m.player2_id is not null then
    insert into notifications (profile_id, type, payload) values (m.player2_id, p_type, p_payload);
  end if;
end$$;

-------------------------------------------------
-- AUTO-RESOLVE PENDING RESULTS
-- Confirms results with screenshot if opponent hasn't responded by grace window
-------------------------------------------------
create or replace function auto_resolve_pending_results(p_hours int default 12)
returns int language plpgsql as $$
declare
  cnt int := 0;
begin
  update match_results mr
  set status = 'confirmed'
  from matches m
  where mr.match_id = m.id
    and mr.status = 'pending'
    and mr.screenshot_url is not null
    and mr.created_at <= now() - make_interval(hours => p_hours)
    and not exists (
      select 1 from match_results mr2
      where mr2.match_id = mr.match_id and mr2.reported_by <> mr.reported_by and mr2.status in ('disputed','confirmed')
    );

  get diagnostics cnt = row_count;
  return cnt;
end$$;

-------------------------------------------------
-- STORAGE: Bucket policies (documented for dashboard)
-- Note: Supabase Storage RLS is managed separately; we document expected bucket:
--   bucket: match-screenshots (private), signed URL access only
-- For reference, create via Supabase dashboard and set upload guard in app logic.
-------------------------------------------------
-- No direct SQL changes required here; see SECURITY.md for guidance.