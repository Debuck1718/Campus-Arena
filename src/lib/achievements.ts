import { supabase } from '../supabaseClient';

export async function awardBadge(playerId: string, badgeType: string) {
  const { error } = await supabase
    .from('achievements')
    .insert({ player_id: playerId, badge_type: badgeType });
  
  if (error && error.code !== '23505') { // Ignore unique constraint errors (already earned)
    console.error('Error awarding badge:', error);
  }
}