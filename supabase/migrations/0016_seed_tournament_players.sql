-- Seed tournament players for the latest open/draft tournament
-- This helps ensure there are enough participants for E2E bracket start tests.

with selected_tournament as (
  select
    t.id,
    t.max_players,
    coalesce(count(tp.*), 0) as existing_players
  from tournaments t
  left join tournament_players tp on tp.tournament_id = t.id
  where t.status in ('draft', 'open')
  group by t.id, t.max_players
  order by t.created_at desc
  limit 1
),
profile_candidates as (
  select id, row_number() over (order by created_at asc) as rn
  from profiles
)
insert into tournament_players (tournament_id, profile_id)
select
  t.id,
  p.id
from selected_tournament t
join profile_candidates p on p.rn <= greatest(0, t.max_players - t.existing_players)
where p.id not in (
  select profile_id from tournament_players tp where tp.tournament_id = t.id
)
on conflict do nothing;
