import { supabase } from './supabaseClient';
import { useToast } from './components/Toast';

/**
 * Example hook to wrap common Supabase mutations with toast feedback.
 * Use inside components: const api = useApi();
 */
export function useApi() {
  const toast = useToast();

  return {
    async joinTournament(tournamentId: string) {
      const { error } = await supabase.rpc('join_tournament', { p_tournament: tournamentId });
      if (error) {
        toast(error.message, 'error');
        throw error;
      }
      toast('Joined tournament', 'success');
    },
    async leaveTournament(tournamentId: string) {
      const { error } = await supabase.rpc('leave_tournament', { p_tournament: tournamentId });
      if (error) {
        toast(error.message, 'error');
        throw error;
      }
      toast('Left tournament', 'success');
    },
    async startSingleElim(tournamentId: string) {
      const { error } = await supabase.rpc('tournament_start_single_elim', { p_id: tournamentId });
      if (error) {
        toast(error.message, 'error');
        throw error;
      }
      toast('Bracket generated', 'success');
    }
  };
}