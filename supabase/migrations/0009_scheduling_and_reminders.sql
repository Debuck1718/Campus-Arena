-- Scheduling and reminders for matches

create extension if not exists "pgcrypto";

-------------------------------------------------
-- INDEXES FOR SCHEDULING QUERIES
-------------------------------------------------
create index if not exists idx_matches_scheduled_at on matches(scheduled_at);
create index if not exists idx_matches_deadline_at on matches(deadline_at);

-------------------------------------------------
-- SCHEDULE MATCH DEADLINE
-- Sets scheduled_at/deadline_at and creates a reminder notification record window_hours before deadline
-------------------------------------------------
create or replace function schedule_match_deadline(p_match uuid, p_scheduled_at timestamptz, p_deadline_at timestamptz, p_window_hours int default 24)
returns void language plpgsql as $$
declare
  win interval := make_interval(hours => p_window_hours);
begin
  if p_deadline_at <= p_scheduled_at then
    raise exception 'deadline_at must be after scheduled_at';
  end if;

  update matches
  set scheduled_at = p_scheduled_at,
      deadline_at = p_deadline_at,
      status = case when status = 'pending' then 'scheduled' else status end
  where id = p_match;

  -- Immediately notify players that match has been scheduled
  perform notify_match_event(p_match, 'match_scheduled', jsonb_build_object('scheduled_at', p_scheduled_at, 'deadline_at', p_deadline_at));

  -- Create a reminder notification placeholder (processed by cron via remind_upcoming_deadlines)
  -- We store a notification with future read_at as a marker; or rely on cron function only. We'll rely on cron.
end$$;

-------------------------------------------------
-- REMIND UPCOMING DEADLINES
-- Send in-app notifications to both players when deadline is within window and status not completed
-------------------------------------------------
create or replace function remind_upcoming_deadlines(p_window_hours int default 24)
returns int language plpgsql as $$
declare
  cnt int := 0;
begin
  with due as (
    select id
    from matches
    where status in ('pending','scheduled')
      and deadline_at is not null
      and deadline_at <= now() + make_interval(hours => p_window_hours)
      and deadline_at > now()
  )
  select count(*) into cnt from due;

  -- insert notifications for each due match
  insert into notifications (profile_id, type, payload)
  select m.player1_id, 'deadline_near', jsonb_build_object('match_id', m.id, 'deadline_at', m.deadline_at)
  from matches m
  where m.id in (select id from due) and m.player1_id is not null;

  insert into notifications (profile_id, type, payload)
  select m.player2_id, 'deadline_near', jsonb_build_object('match_id', m.id, 'deadline_at', m.deadline_at)
  from matches m
  where m.id in (select id from due) and m.player2_id is not null;

  return cnt;
end$$;

-------------------------------------------------
-- OPTIONAL: seed webhook events for reminders (if webhooks configured)
-------------------------------------------------
insert into webhooks (event, target_url, is_active)
select 'deadline_near', 'https://example.com/webhooks/deadline', false
where not exists (select 1 from webhooks where event = 'deadline_near')
on conflict do nothing;