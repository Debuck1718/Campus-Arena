-- RPC to atomically claim or create a quick match
create extension if not exists "pgcrypto";

create or replace function claim_quick_match(p_uid uuid)
returns uuid language plpgsql as $$
declare
  candidate record;
  matched_id uuid;
begin
  -- Try to find a waiting open challenge and lock it
  with c as (
    select id
    from matches
    where tournament_id is null
      and player2_id is null
      and status = 'pending'
      and player1_id <> p_uid
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
  insert into matches (player1_id, player2_id, status, round_number, match_number)
  values (
    p_uid,
    null,
    'pending',
    1,
    coalesce((select max(match_number) from matches where tournament_id is null and round_number = 1), 0) + 1
  )
  returning id into matched_id;
  return matched_id;
end$$;
