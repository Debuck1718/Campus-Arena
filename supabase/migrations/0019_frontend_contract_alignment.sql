BEGIN;

-- Canonical administrator checks: retain verified admin_roles rows; never promote from profiles.role.
CREATE OR REPLACE FUNCTION public.is_admin(p uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p IS NOT NULL AND p = auth.uid() AND EXISTS (
    SELECT 1 FROM public.admin_roles ar WHERE ar.profile_id = p
  );
$$;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon, authenticated, service_role;

ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_roles FROM anon, authenticated;
DO $$
DECLARE v_policy record;
BEGIN
  FOR v_policy IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'admin_roles'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.admin_roles', v_policy.policyname);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_profile_role_from_admin_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_profile_id uuid;
BEGIN
  v_profile_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.profile_id ELSE NEW.profile_id END;
  UPDATE public.profiles p
  SET role = CASE WHEN EXISTS (
    SELECT 1 FROM public.admin_roles ar WHERE ar.profile_id = v_profile_id
  ) THEN 'admin' ELSE 'user' END
  WHERE p.id = v_profile_id
    AND p.role IS DISTINCT FROM CASE WHEN EXISTS (
      SELECT 1 FROM public.admin_roles ar WHERE ar.profile_id = v_profile_id
    ) THEN 'admin' ELSE 'user' END;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS sync_profile_role_from_admin_roles_trg ON public.admin_roles;
CREATE TRIGGER sync_profile_role_from_admin_roles_trg
AFTER INSERT OR UPDATE OR DELETE ON public.admin_roles
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_role_from_admin_roles();

CREATE OR REPLACE FUNCTION public.set_admin_role(p_profile_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an administrator can manage administrator roles';
  END IF;
  IF p_profile_id IS NULL OR p_role IS NULL OR p_role NOT IN ('admin', 'moderator', 'player') THEN
    RAISE EXCEPTION 'Invalid profile or role';
  END IF;
  IF p_profile_id = auth.uid() AND p_role = 'player' THEN
    RAISE EXCEPTION 'Administrators cannot revoke their own access';
  END IF;

  IF p_role = 'player' THEN
    DELETE FROM public.admin_roles WHERE profile_id = p_profile_id;
  ELSE
    INSERT INTO public.admin_roles (profile_id, role)
    VALUES (p_profile_id, p_role)
    ON CONFLICT (profile_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.set_admin_role(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_admin_role(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.guard_profile_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND current_user NOT IN ('postgres', 'supabase_admin', 'service_role') THEN
    RAISE EXCEPTION 'Profile roles must be changed through the administrator-role workflow';
  END IF;
  IF NEW.banned IS DISTINCT FROM OLD.banned
     AND current_user NOT IN ('postgres', 'supabase_admin', 'service_role')
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an administrator can change ban status';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_profile_privileged_fields_trg ON public.profiles;
CREATE TRIGGER guard_profile_privileged_fields_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileged_fields();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_admin_update ON public.profiles;
DROP POLICY IF EXISTS profiles_update_admin ON public.profiles;
CREATE POLICY profiles_update_self ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update_admin ON public.profiles
FOR UPDATE TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

UPDATE public.profiles p
SET role = CASE WHEN EXISTS (
  SELECT 1 FROM public.admin_roles ar WHERE ar.profile_id = p.id
) THEN 'admin' ELSE 'user' END
WHERE p.role IS DISTINCT FROM CASE WHEN EXISTS (
  SELECT 1 FROM public.admin_roles ar WHERE ar.profile_id = p.id
) THEN 'admin' ELSE 'user' END;

-- Direct challenges name their target; only that target can accept through the RPC.
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS challenged_user_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.matches'::regclass
      AND conname = 'matches_challenged_user_id_fkey'
  ) THEN
    ALTER TABLE public.matches
      ADD CONSTRAINT matches_challenged_user_id_fkey
      FOREIGN KEY (challenged_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END;
$$;
UPDATE public.matches
SET challenged_user_id = player2_id
WHERE challenged_user_id IS NULL AND player2_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.accept_match_challenge(p_match_id uuid, p_scheduled_at timestamptz DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_match public.matches%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_match
  FROM public.matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND
     OR v_match.status <> 'pending'
     OR v_match.player2_id IS NOT NULL
     OR v_match.challenged_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Challenge is unavailable or is not addressed to this user';
  END IF;

  UPDATE public.matches
  SET player2_id = auth.uid(),
      status = 'scheduled',
      scheduled_at = COALESCE(p_scheduled_at, scheduled_at)
  WHERE id = p_match_id;
END;
$$;
REVOKE ALL ON FUNCTION public.accept_match_challenge(uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_match_challenge(uuid, timestamptz) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.guard_match_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user IN ('postgres', 'supabase_admin', 'service_role') OR public.is_admin() THEN
    RETURN NEW;
  END IF;
  IF NEW.player1_id IS DISTINCT FROM OLD.player1_id
     OR NEW.player2_id IS DISTINCT FROM OLD.player2_id
     OR NEW.challenged_user_id IS DISTINCT FROM OLD.challenged_user_id
     OR NEW.tournament_id IS DISTINCT FROM OLD.tournament_id
     OR NEW.stage IS DISTINCT FROM OLD.stage
     OR NEW.round_number IS DISTINCT FROM OLD.round_number
     OR NEW.match_number IS DISTINCT FROM OLD.match_number
     OR NEW.winner_id IS DISTINCT FROM OLD.winner_id
     OR NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Match participants, bracket fields, status, and winner are server-controlled';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_match_privileged_fields_trg ON public.matches;
CREATE TRIGGER guard_match_privileged_fields_trg
BEFORE UPDATE ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.guard_match_privileged_fields();

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow users to create matches as player1" ON public.matches;
DROP POLICY IF EXISTS matches_insert_auth ON public.matches;
DROP POLICY IF EXISTS matches_insert_tournament_player ON public.matches;
DROP POLICY IF EXISTS "Allow users to update matches they're in" ON public.matches;
DROP POLICY IF EXISTS matches_update_accept ON public.matches;
DROP POLICY IF EXISTS matches_update_self ON public.matches;
DROP POLICY IF EXISTS "Admins can update matches" ON public.matches;
DROP POLICY IF EXISTS matches_update_admin ON public.matches;
DROP POLICY IF EXISTS matches_insert_targeted_challenge ON public.matches;
DROP POLICY IF EXISTS matches_delete_tournament_player ON public.matches;
CREATE POLICY matches_insert_targeted_challenge ON public.matches
FOR INSERT TO authenticated
WITH CHECK (
  player1_id = auth.uid()
  AND challenged_user_id IS NOT NULL
  AND challenged_user_id <> auth.uid()
  AND player2_id IS NULL
  AND tournament_id IS NULL
  AND status = 'pending'
  AND winner_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = challenged_user_id AND COALESCE(p.banned, false) = false
  )
);
CREATE POLICY matches_update_admin ON public.matches
FOR UPDATE TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.can_access_chat(p_chat_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.chats c
      JOIN public.matches m ON m.id = c.match_id
      WHERE c.id = p_chat_id
        AND c.scope = 'match'
        AND auth.uid() IN (m.player1_id, m.player2_id)
        AND m.status IN ('scheduled', 'ongoing', 'completed', 'disputed')
    )
    OR EXISTS (
      SELECT 1
      FROM public.chats c
      JOIN public.tournament_players tp ON tp.tournament_id = c.tournament_id
      WHERE c.id = p_chat_id
        AND c.scope = 'tournament'
        AND tp.profile_id = auth.uid()
    )
  );
$$;
REVOKE ALL ON FUNCTION public.can_access_chat(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_chat(uuid) TO authenticated, service_role;

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Players can view their match chats" ON public.chats;
DROP POLICY IF EXISTS chats_insert_auth ON public.chats;
DROP POLICY IF EXISTS chats_read_public ON public.chats;
DROP POLICY IF EXISTS chats_select_public ON public.chats;
DROP POLICY IF EXISTS chats_select_scoped ON public.chats;
DROP POLICY IF EXISTS chats_insert_scoped ON public.chats;
CREATE POLICY chats_select_scoped ON public.chats
FOR SELECT TO authenticated USING (public.can_access_chat(id));
CREATE POLICY chats_insert_scoped ON public.chats
FOR INSERT TO authenticated
WITH CHECK (
  (scope = 'match' AND EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_id
      AND auth.uid() IN (m.player1_id, m.challenged_user_id, m.player2_id)
  ))
  OR
  (scope = 'tournament' AND EXISTS (
    SELECT 1 FROM public.tournament_players tp
    WHERE tp.tournament_id = chats.tournament_id AND tp.profile_id = auth.uid()
  ))
);
DROP POLICY IF EXISTS "Allow authenticated chat transmissions" ON public.chat_messages;
DROP POLICY IF EXISTS "Players can send messages in their chats" ON public.chat_messages;
DROP POLICY IF EXISTS "Players can view messages in their chats" ON public.chat_messages;
DROP POLICY IF EXISTS chat_messages_insert_auth ON public.chat_messages;
DROP POLICY IF EXISTS chat_messages_insert_authenticated ON public.chat_messages;
DROP POLICY IF EXISTS chat_messages_read_public ON public.chat_messages;
DROP POLICY IF EXISTS chat_messages_select_public ON public.chat_messages;
DROP POLICY IF EXISTS chat_messages_select_scoped ON public.chat_messages;
DROP POLICY IF EXISTS chat_messages_insert_scoped ON public.chat_messages;
CREATE POLICY chat_messages_select_scoped ON public.chat_messages
FOR SELECT TO authenticated USING (public.can_access_chat(chat_id));
CREATE POLICY chat_messages_insert_scoped ON public.chat_messages
FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() AND public.can_access_chat(chat_id));

ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mr_insert_involved ON public.match_results;
DROP POLICY IF EXISTS mr_select_involved ON public.match_results;
DROP POLICY IF EXISTS mr_update_admin_only ON public.match_results;
DROP POLICY IF EXISTS "Admins can update match results" ON public.match_results;
DROP POLICY IF EXISTS match_results_insert_participant ON public.match_results;
DROP POLICY IF EXISTS match_results_select_participant ON public.match_results;
DROP POLICY IF EXISTS match_results_update_admin ON public.match_results;
CREATE POLICY match_results_select_participant ON public.match_results
FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_id AND auth.uid() IN (m.player1_id, m.player2_id)
  )
);
CREATE POLICY match_results_insert_participant ON public.match_results
FOR INSERT TO authenticated
WITH CHECK (
  reported_by = auth.uid()
  AND status = 'pending'
  AND score_player1 >= 0 AND score_player2 >= 0
  AND EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_id
      AND auth.uid() IN (m.player1_id, m.player2_id)
      AND m.status IN ('scheduled', 'ongoing', 'disputed')
  )
);
CREATE POLICY match_results_update_admin ON public.match_results
FOR UPDATE TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS match_result_ranking_trigger ON public.match_results;
DROP TRIGGER IF EXISTS match_result_confirm_trigger ON public.match_results;
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
  IF NEW.score_player1 = NEW.score_player2 AND m.stage = 'knockout' THEN
    RAISE EXCEPTION 'A knockout match cannot be confirmed as a draw';
  END IF;

  IF NEW.score_player1 = NEW.score_player2 THEN
    v_winner := NULL;
    v_loser := NULL;
  ELSIF NEW.score_player1 > NEW.score_player2 THEN
    v_winner := m.player1_id;
    v_loser := m.player2_id;
  ELSE
    v_winner := m.player2_id;
    v_loser := m.player1_id;
  END IF;

  UPDATE public.matches SET winner_id = v_winner, status = 'completed' WHERE id = NEW.match_id;

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
    jsonb_build_object('winner_id', v_winner, 'score_p1', NEW.score_player1, 'score_p2', NEW.score_player2)
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER match_result_confirm_trigger
AFTER UPDATE OF status ON public.match_results
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'confirmed')
EXECUTE FUNCTION public.advance_winner();

ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS winner_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.tournaments'::regclass
      AND conname = 'tournaments_winner_id_fkey'
  ) THEN
    ALTER TABLE public.tournaments
      ADD CONSTRAINT tournaments_winner_id_fkey
      FOREIGN KEY (winner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END;
$$;
CREATE OR REPLACE FUNCTION public.guard_tournament_winner()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.winner_id IS DISTINCT FROM OLD.winner_id
     AND current_user NOT IN ('postgres', 'supabase_admin', 'service_role')
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Tournament winners are set by final results or an administrator';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_tournament_winner_trg ON public.tournaments;
CREATE TRIGGER guard_tournament_winner_trg
BEFORE UPDATE OF winner_id ON public.tournaments
FOR EACH ROW EXECUTE FUNCTION public.guard_tournament_winner();

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
  v_champion uuid;
BEGIN
  SELECT status, format::text INTO v_status, v_format
  FROM public.tournaments WHERE id = p_tournament_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF v_status = 'completed' THEN
    SELECT max(round_number) INTO v_round
    FROM public.matches
    WHERE tournament_id = p_tournament_id AND stage = 'knockout';

    IF v_round IS NOT NULL THEN
      SELECT max(match_number) INTO v_match_number
      FROM public.matches
      WHERE tournament_id = p_tournament_id
        AND stage = 'knockout' AND round_number = v_round;
      SELECT winner_id INTO v_champion
      FROM public.matches
      WHERE tournament_id = p_tournament_id
        AND stage = 'knockout'
        AND round_number = v_round
        AND match_number = v_match_number
        AND status = 'completed'
        AND winner_id IS NOT NULL
      ORDER BY id
      LIMIT 1;
    ELSIF v_format = 'round_robin' THEN
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
  WHERE id = p_tournament_id AND winner_id IS DISTINCT FROM v_champion;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_tournament_winner_from_tournament()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.refresh_tournament_winner(NEW.id);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS refresh_tournament_winner_from_tournament_trg ON public.tournaments;
CREATE TRIGGER refresh_tournament_winner_from_tournament_trg
AFTER UPDATE OF status ON public.tournaments
FOR EACH ROW WHEN (NEW.status IS DISTINCT FROM OLD.status)
EXECUTE FUNCTION public.refresh_tournament_winner_from_tournament();

CREATE OR REPLACE FUNCTION public.refresh_tournament_winner_from_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.tournament_id IS NOT NULL THEN
    PERFORM public.refresh_tournament_winner(NEW.tournament_id);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS refresh_tournament_winner_from_match_trg ON public.matches;
CREATE TRIGGER refresh_tournament_winner_from_match_trg
AFTER UPDATE OF status, winner_id ON public.matches
FOR EACH ROW
WHEN (
  NEW.status = 'completed'
  AND (NEW.status IS DISTINCT FROM OLD.status OR NEW.winner_id IS DISTINCT FROM OLD.winner_id)
)
EXECUTE FUNCTION public.refresh_tournament_winner_from_match();

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS achievements_insert_any ON public.achievements;
DROP POLICY IF EXISTS achievements_insert_own ON public.achievements;
DROP POLICY IF EXISTS achievements_select_all ON public.achievements;
DROP POLICY IF EXISTS achievements_select_public ON public.achievements;
CREATE POLICY achievements_select_public ON public.achievements
FOR SELECT TO anon, authenticated USING (true);

COMMIT;