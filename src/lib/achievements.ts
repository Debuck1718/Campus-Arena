import { supabase } from '../supabaseClient';

/**
 * Achievement awarding is a SERVER-side responsibility.
 *
 * Previously the frontend inserted rows straight into `achievements`, which
 * let any authenticated user award themselves (or any other player) an
 * arbitrary badge just by opening a completed tournament page. Verified
 * 2026-10-02; migration 0019 removes client INSERT access.
 *
 * Badges are now granted by database triggers / admin RPCs. The app reads
 * achievements but never writes them.
 */
export type BadgeType = 'tournament_champion' | 'first_win' | 'power_user' | string;

export interface Achievement {
  id: string;
  player_id: string;
  badge_type: BadgeType;
  earned_at?: string | null;
}

/** Read-only: which badges a player has earned. */
export async function getAchievements(playerId: string): Promise<Achievement[]> {
  const { data, error } = await supabase
    .from('achievements')
    .select('id, player_id, badge_type, earned_at')
    .eq('player_id', playerId)
    .order('earned_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Achievement[];
}