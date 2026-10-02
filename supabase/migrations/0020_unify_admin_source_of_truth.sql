DROP POLICY IF EXISTS "Players can send match chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Players can view match chat messages" ON public.chat_messages;

BEGIN;

-- Preserve regulation scores separately from a decisive knockout tiebreak.
ALTER TABLE public.match_results
  ADD COLUMN IF NOT EXISTS tiebreak_score_player1 integer,
  ADD COLUMN IF NOT EXISTS tiebreak_score_player2 integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.match_results'::regclass
      AND conname = 'match_results_tiebreak_pair_check'
  ) THEN
    ALTER TABLE public.match_results
      ADD CONSTRAINT match_results_tiebreak_pair_check
      CHECK (
        (tiebreak_score_player1 IS NULL AND tiebreak_score_player2 IS NULL)
        OR
        (tiebreak_score_player1 IS NOT NULL AND tiebreak_score_player2 IS NOT NULL
         AND tiebreak_score_player1 >= 0 AND tiebreak_score_player2 >= 0)
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.match_results'::regclass
      AND conname = 'match_results_tiebreak_only_on_draw_check'
  ) THEN
    ALTER TABLE public.match_results
      ADD CONSTRAINT match_results_tiebreak_only_on_draw_check
      CHECK (
        (tiebreak_score_player1 IS NULL AND tiebreak_score_player2 IS NULL)
        OR
        (score_player1 IS NOT NULL AND score_player1 = score_player2)
      );
  END IF;
END;
$$;

-- Recompute standings from completed group fixtures rather than incrementing.
-- This makes edits, retries, and corrections idempotent while retaining 3/1/0 points.
CREATE OR REPLACE FUNCTION public.recompute_group_standings(p_group_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tournament_id uuid;
BEGIN
  SELECT g.tournament_id INTO v_tournament_id
  FROM public.groups g
  WHERE g.id = p_group_id;
  IF NOT FOUND THEN RETURN; END IF;

  INSERT INTO public.group_standings (group_id, profile_id)
  SELECT p_group_id, participants.profile_id
  FROM (
    SELECT gm.profile_id
    FROM public.group_members gm
    WHERE gm.group_id = p_group_id
    UNION
    SELECT gmatch.home_id
    FROM public.group_matches gmatch
    WHERE gmatch.group_id = p_group_id
    UNION
    SELECT gmatch.away_id
    FROM public.group_matches gmatch
    WHERE gmatch.group_id = p_group_id
  ) participants
  ON CONFLICT (group_id, profile_id) DO NOTHING;

  WITH appearances AS (
    SELECT gm.home_id AS profile_id,
           gm.home_score AS goals_for,
           gm.away_score AS goals_against
    FROM public.group_matches gm
    WHERE gm.group_id = p_group_id
      AND gm.status = 'completed'
      AND gm.home_score IS NOT NULL
      AND gm.away_score IS NOT NULL
    UNION ALL
    SELECT gm.away_id AS profile_id,
           gm.away_score AS goals_for,
           gm.home_score AS goals_against
    FROM public.group_matches gm
    WHERE gm.group_id = p_group_id
      AND gm.status = 'completed'
      AND gm.home_score IS NOT NULL
      AND gm.away_score IS NOT NULL
  ), stats AS (
    SELECT a.profile_id,
           count(*)::integer AS played,
           count(*) FILTER (WHERE a.goals_for > a.goals_against)::integer AS wins,
           count(*) FILTER (WHERE a.goals_for = a.goals_against)::integer AS draws,
           count(*) FILTER (WHERE a.goals_for < a.goals_against)::integer AS losses,
           COALESCE(sum(a.goals_for), 0)::integer AS goals_for,
           COALESCE(sum(a.goals_against), 0)::integer AS goals_against,
           COALESCE(sum(CASE
             WHEN a.goals_for > a.goals_against THEN 3
             WHEN a.goals_for = a.goals_against THEN 1
             ELSE 0
           END), 0)::integer AS points
    FROM appearances a
    GROUP BY a.profile_id
  )
  UPDATE public.group_standings gs
  SET played = COALESCE(s.played, 0),
      wins = COALESCE(s.wins, 0),
      draws = COALESCE(s.draws, 0),
      losses = COALESCE(s.losses, 0),
      goals_for = COALESCE(s.goals_for, 0),
      goals_against = COALESCE(s.goals_against, 0),
      points = COALESCE(s.points, 0),
      updated_at = now()
  FROM public.group_standings existing
  LEFT JOIN stats s ON s.profile_id = existing.profile_id
  WHERE gs.id = existing.id
    AND existing.group_id = p_group_id;

  PERFORM public.refresh_tournament_winner(v_tournament_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_group_match_result()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_group_tournament_id uuid;
BEGIN
  IF NEW.home_id = NEW.away_id THEN
    RAISE EXCEPTION 'A group match must have two different participants';
  END IF;
  IF NEW.home_score < 0 OR NEW.away_score < 0 THEN
    RAISE EXCEPTION 'Group match scores cannot be negative';
  END IF;
  IF NEW.status = 'completed'
     AND (NEW.home_score IS NULL OR NEW.away_score IS NULL) THEN
    RAISE EXCEPTION 'A completed group match requires both scores';
  END IF;

  SELECT g.tournament_id INTO v_group_tournament_id
  FROM public.groups g
  WHERE g.id = NEW.group_id;
  IF NOT FOUND OR v_group_tournament_id IS DISTINCT FROM NEW.tournament_id THEN
    RAISE EXCEPTION 'Group match tournament_id must match its group';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS validate_group_match_result_trg ON public.group_matches;
CREATE TRIGGER validate_group_match_result_trg
BEFORE INSERT OR UPDATE ON public.group_matches
FOR EACH ROW EXECUTE FUNCTION public.validate_group_match_result();

CREATE OR REPLACE FUNCTION public.update_group_standings_on_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_group_standings(OLD.group_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.group_id IS DISTINCT FROM NEW.group_id THEN
    PERFORM public.recompute_group_standings(OLD.group_id);
  END IF;
  PERFORM public.recompute_group_standings(NEW.group_id);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_update_group_standings ON public.group_matches;
CREATE TRIGGER trg_update_group_standings
AFTER INSERT OR UPDATE OR DELETE ON public.group_matches
FOR EACH ROW EXECUTE FUNCTION public.update_group_standings_on_complete();

-- Only crown a round-robin winner when fixtures are present and all are completed.
CREATE OR REPLACE FUNCTION public.refresh_tournament_winner(p_tournament_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status text;
  v_format text;
  v_round integer;
  v_match_number integer;
  v_champion uuid := NULL;
BEGIN
  SELECT t.status, t.format::text INTO v_status, v_format
  FROM public.tournaments t
  WHERE t.id = p_tournament_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF v_status = 'completed' THEN
    SELECT max(m.round_number) INTO v_round
    FROM public.matches m
    WHERE m.tournament_id = p_tournament_id AND m.stage = 'knockout';

    IF v_round IS NOT NULL THEN
      SELECT max(m.match_number) INTO v_match_number
      FROM public.matches m
      WHERE m.tournament_id = p_tournament_id
        AND m.stage = 'knockout'
        AND m.round_number = v_round;
      SELECT m.winner_id INTO v_champion
      FROM public.matches m
      WHERE m.tournament_id = p_tournament_id
        AND m.stage = 'knockout'
        AND m.round_number = v_round
        AND m.match_number = v_match_number
        AND m.status = 'completed'
        AND m.winner_id IS NOT NULL
      ORDER BY m.id
      LIMIT 1;
    ELSIF v_format = 'round_robin'
      AND EXISTS (
        SELECT 1 FROM public.group_matches gm
        WHERE gm.tournament_id = p_tournament_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.group_matches gm
        WHERE gm.tournament_id = p_tournament_id
          AND (gm.status <> 'completed'
               OR gm.home_score IS NULL OR gm.away_score IS NULL)
      ) THEN
      WITH standings AS (
        SELECT gs.profile_id,
               COALESCE(sum(gs.points), 0) AS points,
               COALESCE(sum(gs.goal_diff), 0) AS goal_diff,
               COALESCE(sum(gs.goals_for), 0) AS goals_for
        FROM public.group_standings gs
        JOIN public.groups g ON g.id = gs.group_id
        WHERE g.tournament_id = p_tournament_id
        GROUP BY gs.profile_id
      ), main_ranked AS (
        SELECT s.*, dense_rank() OVER (
          ORDER BY points DESC, goal_diff DESC, goals_for DESC
        ) AS main_rank
        FROM standings s
      ), candidates AS (
        SELECT profile_id FROM main_ranked WHERE main_rank = 1
      ), head_to_head AS (
        SELECT c.profile_id,
               COALESCE(sum(CASE
                 WHEN gm.home_id = c.profile_id AND gm.home_score > gm.away_score THEN 3
                 WHEN gm.away_id = c.profile_id AND gm.away_score > gm.home_score THEN 3
                 WHEN gm.home_score = gm.away_score THEN 1
                 ELSE 0
               END), 0) AS h2h_points
        FROM candidates c
        LEFT JOIN public.group_matches gm
          ON gm.group_id IN (
            SELECT g.id FROM public.groups g WHERE g.tournament_id = p_tournament_id
          )
          AND gm.status = 'completed'
          AND gm.home_score IS NOT NULL AND gm.away_score IS NOT NULL
          AND gm.home_id IN (SELECT profile_id FROM candidates)
          AND gm.away_id IN (SELECT profile_id FROM candidates)
          AND c.profile_id IN (gm.home_id, gm.away_id)
        GROUP BY c.profile_id
      ), h2h_ranked AS (
        SELECT profile_id,
               dense_rank() OVER (ORDER BY h2h_points DESC) AS h2h_rank
        FROM head_to_head
      )
      SELECT (array_agg(profile_id))[1] INTO v_champion
      FROM h2h_ranked
      WHERE h2h_rank = 1
      HAVING count(*) = 1;
    END IF;
  END IF;

  UPDATE public.tournaments
  SET winner_id = v_champion
  WHERE id = p_tournament_id
    AND winner_id IS DISTINCT FROM v_champion;
END;
$$;

-- Tied knockout regulation scores require a separate, decisive tiebreak score.
CREATE OR REPLACE FUNCTION public.advance_winner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  m public.matches%ROWTYPE;
  v_winner uuid;
  v_loser uuid;
BEGIN
  SELECT * INTO m FROM public.matches WHERE id = NEW.match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match does not exist'; END IF;
  IF NEW.score_player1 IS NULL OR NEW.score_player2 IS NULL THEN
    RAISE EXCEPTION 'A confirmed result requires both scores';
  END IF;
  IF m.status = 'completed' OR m.winner_id IS NOT NULL THEN
    RAISE EXCEPTION 'This match has already been finalized';
  END IF;
  IF m.player1_id IS NULL OR m.player2_id IS NULL THEN
    RAISE EXCEPTION 'Both match participants must be set before confirmation';
  END IF;

  IF NEW.score_player1 = NEW.score_player2 THEN
    IF m.stage = 'knockout' THEN
      IF NEW.tiebreak_score_player1 IS NULL
         OR NEW.tiebreak_score_player2 IS NULL
         OR NEW.tiebreak_score_player1 = NEW.tiebreak_score_player2 THEN
        RAISE EXCEPTION 'A tied knockout result requires unequal tiebreak scores';
      END IF;
      IF NEW.tiebreak_score_player1 > NEW.tiebreak_score_player2 THEN
        v_winner := m.player1_id;
        v_loser := m.player2_id;
      ELSE
        v_winner := m.player2_id;
        v_loser := m.player1_id;
      END IF;
    ELSE
      v_winner := NULL;
      v_loser := NULL;
    END IF;
  ELSIF NEW.score_player1 > NEW.score_player2 THEN
    v_winner := m.player1_id;
    v_loser := m.player2_id;
  ELSE
    v_winner := m.player2_id;
    v_loser := m.player1_id;
  END IF;

  UPDATE public.matches
  SET winner_id = v_winner, status = 'completed'
  WHERE id = NEW.match_id;

  IF v_winner IS NULL THEN
    INSERT INTO public.rankings (profile_id, points, wins, losses, matches_played, elo_rating, last_played_at, game_id)
    VALUES (m.player1_id, 1, 0, 0, 1, 1200, now(), m.game_id)
    ON CONFLICT (profile_id) DO UPDATE SET
      points = COALESCE(public.rankings.points, 0) + 1,
      matches_played = COALESCE(public.rankings.matches_played, 0) + 1,
      last_played_at = now();
    INSERT INTO public.rankings (profile_id, points, wins, losses, matches_played, elo_rating, last_played_at, game_id)
    VALUES (m.player2_id, 1, 0, 0, 1, 1200, now(), m.game_id)
    ON CONFLICT (profile_id) DO UPDATE SET
      points = COALESCE(public.rankings.points, 0) + 1,
      matches_played = COALESCE(public.rankings.matches_played, 0) + 1,
      last_played_at = now();
  ELSE
    INSERT INTO public.rankings (profile_id, points, wins, losses, matches_played, elo_rating, last_played_at, game_id)
    VALUES (v_winner, 3, 1, 0, 1, 1200, now(), m.game_id)
    ON CONFLICT (profile_id) DO UPDATE SET
      points = COALESCE(public.rankings.points, 0) + 3,
      wins = COALESCE(public.rankings.wins, 0) + 1,
      matches_played = COALESCE(public.rankings.matches_played, 0) + 1,
      last_played_at = now();
    INSERT INTO public.rankings (profile_id, points, wins, losses, matches_played, elo_rating, last_played_at, game_id)
    VALUES (v_loser, 0, 0, 1, 1, 1200, now(), m.game_id)
    ON CONFLICT (profile_id) DO UPDATE SET
      losses = COALESCE(public.rankings.losses, 0) + 1,
      matches_played = COALESCE(public.rankings.matches_played, 0) + 1,
      last_played_at = now();
  END IF;

  PERFORM public.notify_match_event(
    NEW.match_id, 'result_confirmed',
    jsonb_build_object(
      'winner_id', v_winner,
      'score_p1', NEW.score_player1,
      'score_p2', NEW.score_player2,
      'tiebreak_score_p1', NEW.tiebreak_score_player1,
      'tiebreak_score_p2', NEW.tiebreak_score_player2
    )
  );
  RETURN NEW;
END;
$$;

COMMIT;
-- Preserve regulation scores separately from a decisive knockout tiebreak.
ALTER TABLE public.match_results
