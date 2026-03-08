-- Follow-up automation: process no-shows, finalize matches on confirm, and rebuild helper

create extension if not exists "pgcrypto";

-------------------------------------------------
-- PROCESS EXPIRED NO-SHOWS: grant WO win to reporter
-------------------------------------------------
create or replace function process_expired_no_shows()
returns int language plpgsql as $$
declare
  cnt int := 0;
begin
  with due as (
    select ns.id, ns.match_id, ns.reporter_id
    from no_show_reports ns
    join matches m on m.id = ns.match_id
    where ns.status = 'grace'
      and ns.grace_until is not null
      and ns.grace_until < now()
      and m.winner_id is null
  ),
  upd_ns as (
    update no_show_reports ns
    set status = 'auto_win'
    from due d
    where ns.id = d.id
    returning ns.*
  ),
  upd_matches as (
    update matches m
    set winner_id = d.reporter_id, status = 'completed'
    from due d
    where m.id = d.match_id
    returning m.*
  )
  select count(*) into cnt from upd_matches;

  return cnt;
end$$;

-------------------------------------------------
-- FIX ADVANCE_WINNER: also mark match completed and notify players
-------------------------------------------------
create or replace function advance_winner()
returns trigger as $$
declare
  m matches;
  winner uuid;
begin
  select * into m from matches where id = new.match_id;

  if new.score_player1 is null or new.score_player2 is null then
    return new;
  end if;

  winner := case when new.score_player1 > new.score_player2 then m.player1_id else m.player2_id end;

  update matches
  set winner_id = winner,
      status = 'completed'
  where id = new.match_id;

  perform notify_match_event(new.match_id, 'result_confirmed', jsonb_build_object('winner_id', winner, 'score_p1', new.score_player1, 'score_p2', new.score_player2));

  return new;
end;
$$ language plpgsql;

-- Recreate trigger to ensure our updated function is bound
drop trigger if exists match_result_confirm_trigger on match_results;
create trigger match_result_confirm_trigger
after update of status on match_results
for each row
when (new.status = 'confirmed')
execute function advance_winner();

-------------------------------------------------
-- REBUILD SINGLE-ELIM ROUND FROM CURRENT WINNERS (MAINTENANCE)
-------------------------------------------------
create or replace function rebuild_single_elim_round(p_tournament uuid, p_round int)
returns void language plpgsql as $$
declare
  winners uuid[];
  i int;
  match_no int := 1;
begin
  if p_round < 1 then
    raise exception 'Round must be >= 1';
  end if;

  -- collect winners from previous round (or initial players if round=1)
  if p_round = 1 then
    select array_agg(profile_id order by random())
    into winners
    from tournament_players
    where tournament_id = p_tournament;
  else
    select array_agg(winner_id order by random())
    into winners
    from matches
    where tournament_id = p_tournament and round_number = p_round - 1 and winner_id is not null;
  end if;

  if winners is null or array_length(winners,1) is null or array_length(winners,1) < 2 then
    raise exception 'Not enough participants/winners to rebuild round %', p_round;
  end if;

  delete from matches where tournament_id = p_tournament and round_number = p_round;

  i := 1;
  while i <= array_length(winners,1) loop
    insert into matches (tournament_id, round_number, match_number, player1_id, player2_id, status)
    values (p_tournament, p_round, match_no, winners[i], winners[i+1], 'pending');
    match_no := match_no + 1;
    i := i + 2;
  end loop;
end$$;