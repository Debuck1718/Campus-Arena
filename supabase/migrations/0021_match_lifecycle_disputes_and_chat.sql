-- 0021: Match lifecycle, dispute reopening, and chat close-on-approval.
--
-- Implements three product requirements:
--   1. When a submitted evidence is APPROVED (confirmed) by an admin, the match
--      chat channel is closed and both players are notified that the evidence
--      was approved. The chat becomes read-only and shows an "approved" banner.
--   2. When a challenge is ACCEPTED, the challenger is notified immediately so
--      the shared message box opens for BOTH players (not just the acceptor).
--   3. A disputed match ends the flow: it is frozen for further edits, and an
--      opponent can raise a dispute even after evidence was approved, so an
--      admin can UN-approve (reopen) a previously approved evidence.

BEGIN;

-------------------------------------------------
-- 1. CHAT LIFECYCLE COLUMNS
-------------------------------------------------
ALTER TABLE public.chats
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_reason text;

CREATE INDEX IF NOT EXISTS idx_chats_match_open
  ON public.chats(match_id)
  WHERE closed_at IS NULL;

-------------------------------------------------
-- 2. DISPUTE LINK TO THE CONTESTED RESULT
-------------------------------------------------
ALTER TABLE public.disputes
  ADD COLUMN IF NOT EXISTS disputed_result_id uuid REFERENCES public.match_results(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolution text,
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

-- The UI raises disputes for score_mismatch / invalid_screenshot / cheating /
-- no_show / other. Production already constrains category, so extend safely.
DO $$
BEGIN
  ALTER TABLE public.disputes DROP CONSTRAINT IF EXISTS disputes_category_check;
  ALTER TABLE public.disputes
    ADD CONSTRAINT disputes_category_check
    CHECK (category IN (
      'score_mismatch','cheating','invalid_screenshot','no_show','other',
      'match_dispute','harassment','account'
    ));
EXCEPTION WHEN undefined_table THEN NULL;
END;
$$;

-------------------------------------------------
-- 3. CLOSE MATCH CHAT WHEN EVIDENCE IS APPROVED
-------------------------------------------------
CREATE OR REPLACE FUNCTION public.close_match_chat_for_approved_result()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Only fires on the pending -> confirmed transition.
  IF NEW.status = 'confirmed' AND OLD.status IS DISTINCT FROM 'confirmed' THEN
    UPDATE public.chats
    SET closed_at = COALESCE(closed_at, now()),
        closed_reason = 'evidence_approved'
    WHERE scope = 'match'
      AND match_id = NEW.match_id
      AND closed_at IS NULL;

    -- Tell both players the outcome is now official so the message box can show
    -- the approved state and stop accepting new transmissions.
    PERFORM public.notify_match_event(
      NEW.match_id,
      'evidence_approved',
      jsonb_build_object(
        'match_id', NEW.match_id,
        'result_id', NEW.id,
        'score_p1', NEW.score_player1,
        'score_p2', NEW.score_player2,
        'tiebreak_score_p1', NEW.tiebreak_score_player1,
        'tiebreak_score_p2', NEW.tiebreak_score_player2
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS close_match_chat_on_approval_trg ON public.match_results;
CREATE TRIGGER close_match_chat_on_approval_trg
AFTER UPDATE ON public.match_results
FOR EACH ROW
WHEN (NEW.status = 'confirmed' AND OLD.status IS DISTINCT FROM 'confirmed')
EXECUTE FUNCTION public.close_match_chat_for_approved_result();

-------------------------------------------------
-- 4. FREEZE DISPUTED MATCHES
-- A disputed match ends the flow. The match status is set to 'disputed' and the
-- chat channel is locked while admins review the reopened evidence.
-------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_match_disputed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'disputed' AND OLD.status IS DISTINCT FROM 'disputed' THEN
    UPDATE public.matches
    SET status = 'disputed'
    WHERE id = NEW.match_id
      AND status <> 'disputed';

    UPDATE public.chats
    SET closed_at = COALESCE(closed_at, now()),
        closed_reason = 'disputed'
    WHERE scope = 'match'
      AND match_id = NEW.match_id
      AND closed_at IS NULL;

    PERFORM public.notify_match_event(
      NEW.match_id,
      'match_disputed',
      jsonb_build_object('match_id', NEW.match_id, 'result_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mark_match_disputed_trg ON public.match_results;
CREATE TRIGGER mark_match_disputed_trg
AFTER UPDATE ON public.match_results
FOR EACH ROW
WHEN (NEW.status = 'disputed' AND OLD.status IS DISTINCT FROM 'disputed')
EXECUTE FUNCTION public.mark_match_disputed();

-------------------------------------------------
-- 5. ADMIN UN-APPROVE (REOPEN) AN APPROVED EVIDENCE
-- Admin-only. Moves a confirmed result back to 'disputed' so the evidence must
-- be re-reviewed, and reopens the match + chat for the dispute conversation.
-------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_unapprove_match_result(
  p_result_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_match_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an administrator can un-approve a match result';
  END IF;

  SELECT match_id INTO v_match_id
  FROM public.match_results
  WHERE id = p_result_id;

  IF v_match_id IS NULL THEN
    RAISE EXCEPTION 'Match result not found';
  END IF;

  UPDATE public.match_results
  SET status = 'disputed',
      proof_meta = COALESCE(proof_meta, '{}'::jsonb)
        || jsonb_build_object('unapproved_reason', p_reason, 'unapproved_at', now())
  WHERE id = p_result_id;

  -- Roll the match back so it is no longer treated as a final result.
  UPDATE public.matches
  SET winner_id = NULL,
      status = 'disputed'
  WHERE id = v_match_id;

  -- Reopen the chat so both players can coordinate while the case is reviewed.
  UPDATE public.chats
  SET closed_at = NULL,
      closed_reason = NULL
  WHERE scope = 'match'
    AND match_id = v_match_id;

  PERFORM public.notify_match_event(
    v_match_id,
    'evidence_unapproved',
    jsonb_build_object(
      'match_id', v_match_id,
      'result_id', p_result_id,
      'reason', p_reason
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_unapprove_match_result(uuid, text)
  TO authenticated, service_role;

-------------------------------------------------
-- 6. PLAYER-RAISED DISPUTE THAT REOPENS AN APPROVED RESULT
-- A player (either participant) can contest a confirmed result. This reopens
-- the evidence for admin review and flags the match as disputed.
-------------------------------------------------
CREATE OR REPLACE FUNCTION public.raise_match_dispute(
  p_match_id uuid,
  p_category text,
  p_description text DEFAULT NULL,
  p_evidence_urls text[] DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  m public.matches%ROWTYPE;
  v_result_id uuid;
  v_dispute_id uuid;
  v_uid uuid := auth.uid();
BEGIN
  SELECT * INTO m FROM public.matches WHERE id = p_match_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF v_uid IS NULL OR (v_uid <> m.player1_id AND v_uid <> m.player2_id) THEN
    RAISE EXCEPTION 'Only involved players can raise a dispute for this match';
  END IF;

  -- Target the most recent confirmed or pending evidence row, if any.
  SELECT id INTO v_result_id
  FROM public.match_results
  WHERE match_id = p_match_id
    AND status IN ('confirmed', 'pending', 'disputed')
  ORDER BY (status = 'confirmed') DESC, created_at DESC
  LIMIT 1;

  INSERT INTO public.disputes (
    match_id, raised_by, category, description, evidence_urls,
    status, disputed_result_id
  )
  VALUES (
    p_match_id, v_uid, p_category, p_description, p_evidence_urls,
    'open', v_result_id
  )
  RETURNING id INTO v_dispute_id;

  -- A disputed match ends the normal flow: freeze the match, reopen the
  -- contested evidence so admins can re-review, and lock the chat.
  UPDATE public.matches
  SET status = 'disputed',
      winner_id = NULL
  WHERE id = p_match_id;

  IF v_result_id IS NOT NULL THEN
    UPDATE public.match_results
    SET status = 'disputed'
    WHERE id = v_result_id
      AND status = 'confirmed';
  END IF;

  UPDATE public.chats
  SET closed_at = COALESCE(closed_at, now()),
      closed_reason = 'disputed'
  WHERE scope = 'match'
    AND match_id = p_match_id
    AND closed_at IS NULL;

  PERFORM public.notify_match_event(
    p_match_id,
    'dispute_raised',
    jsonb_build_object(
      'match_id', p_match_id,
      'dispute_id', v_dispute_id,
      'raised_by', v_uid,
      'category', p_category
    )
  );

  RETURN v_dispute_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.raise_match_dispute(uuid, text, text, text[])
  TO authenticated, service_role;

-------------------------------------------------
-- 7. NOTIFY THE CHALLENGER THE MOMENT A CHALLENGE IS ACCEPTED
-- Previously only the acceptor was told "the message box is ready". The
-- challenger now gets a matching, actionable notification immediately, so both
-- sides open the same shared message box without one waiting on the other.
-------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_challenger_on_accept()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.player2_id IS NULL AND NEW.player2_id IS NOT NULL THEN
    INSERT INTO public.notifications (profile_id, type, payload)
    VALUES (
      NEW.player1_id,
      'challenge_accepted',
      jsonb_build_object(
        'match_id', NEW.id,
        'by', NEW.player2_id,
        'accepted_by', NEW.player2_id,
        'open_chat', true,
        'message', 'Your challenge was accepted — the message box is now open.'
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_challenger_on_accept_trg ON public.matches;
CREATE TRIGGER notify_challenger_on_accept_trg
AFTER UPDATE ON public.matches
FOR EACH ROW
WHEN (OLD.player2_id IS NULL AND NEW.player2_id IS NOT NULL)
EXECUTE FUNCTION public.notify_challenger_on_accept();

-------------------------------------------------
-- 8. BACKFILL: close chats for already-approved matches
-------------------------------------------------
UPDATE public.chats c
SET closed_at = COALESCE(c.closed_at, now()),
    closed_reason = COALESCE(c.closed_reason, 'evidence_approved')
WHERE c.scope = 'match'
  AND c.closed_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.match_results mr
    WHERE mr.match_id = c.match_id
      AND mr.status = 'confirmed'
  );

COMMIT;
