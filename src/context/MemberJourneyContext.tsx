import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { careerPaths } from '../features/career-pathing/careerPathing';

type Journey = { userId: string; selectedPath: string | null; loading: boolean; error: string };
type JourneyValue = Journey & { refresh: () => Promise<void>; selectPath: (slug: string) => Promise<void> };
const Context = createContext<JourneyValue | null>(null);

export function MemberJourneyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id || '';
  const [state, setState] = useState<Journey>({ userId: '', selectedPath: null, loading: true, error: '' });
  const refresh = useCallback(async () => {
    if (!userId || !supabase) return;
    setState({ userId, selectedPath: null, loading: true, error: '' });
    try {
      const { data, error } = await supabase.from('member_career_selections').select('career_path_slug').eq('student_id', userId).maybeSingle();
      if (error) throw error;
      setState({ userId, selectedPath: careerPaths.some((path) => path.id === data?.career_path_slug) ? data?.career_path_slug || null : null, loading: false, error: '' });
    } catch {
      setState({ userId, selectedPath: null, loading: false, error: 'We could not load your Career Path. Please retry or contact JPAC staff.' });
    }
  }, [userId]);
  useEffect(() => { void refresh(); }, [refresh]);
  async function selectPath(slug: string) {
    if (!userId || !supabase || !careerPaths.some((path) => path.id === slug)) throw new Error('Choose a valid Career Path while signed in.');
    const { data, error } = await supabase.from('member_career_selections').upsert({ student_id: userId, career_path_slug: slug }, { onConflict: 'student_id' }).select('career_path_slug').single();
    if (error || data?.career_path_slug !== slug) throw new Error('Your Career Path could not be saved. Please try again.');
    setState({ userId, selectedPath: slug, loading: false, error: '' });
  }
  // A previous account's selection must never satisfy the next account's gate.
  return <Context.Provider value={{ ...state, loading: state.loading || state.userId !== userId, refresh, selectPath }}>{children}</Context.Provider>;
}

export function useMemberJourney() {
  const value = useContext(Context);
  if (!value) throw new Error('MemberJourneyProvider is required');
  return value;
}
