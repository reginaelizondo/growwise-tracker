import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getSessionId } from './useSessionId';

interface SaveData {
  assessmentId: string | undefined;
  areas: Array<{ area_id: number; skills: Array<{ milestones: Array<{ milestone_id: number }> }> }>;
  responses: { [key: number]: string };
  viewState: { type: string; areaIndex?: number; skillIndex?: number };
}

export const useAbandonedSessionSave = ({ assessmentId, areas, responses, viewState }: SaveData) => {
  const lastSaveRef = useRef<string>('');

  const calculateProgress = useCallback(() => {
    if (!areas.length) return 24;
    const totalSkills = areas.reduce((sum, a) => sum + a.skills.length, 0);
    const areaIndex = viewState.type === 'skill' || viewState.type === 'areaSummary' 
      ? (viewState.areaIndex ?? 0) : 0;
    const skillIndex = viewState.type === 'skill' ? (viewState.skillIndex ?? 0) : 0;
    const completedSkills = areas.slice(0, areaIndex).reduce((sum, a) => sum + a.skills.length, 0) + skillIndex;
    return Math.round(22 + (completedSkills / totalSkills) * 78);
  }, [areas, viewState]);

  const getCompletedAreas = useCallback(() => {
    if (viewState.type !== 'skill' && viewState.type !== 'areaSummary') return [];
    const areaIndex = viewState.areaIndex ?? 0;
    return areas.slice(0, areaIndex).map(a => a.area_id);
  }, [areas, viewState]);

  const saveProgress = useCallback(async () => {
    if (!assessmentId || !areas.length) return;

    const sessionId = getSessionId();
    const areaIndex = (viewState.type === 'skill' || viewState.type === 'areaSummary') 
      ? (viewState.areaIndex ?? 0) : 0;
    const skillIndex = viewState.type === 'skill' ? (viewState.skillIndex ?? 0) : 0;
    const currentArea = areas[areaIndex];

    const payload = {
      current_area_id: currentArea?.area_id ?? 2,
      current_skill_index: skillIndex,
      milestone_answers: responses,
      progress_percentage: calculateProgress(),
      completed_areas: getCompletedAreas(),
      abandoned_at: new Date().toISOString(),
    };

    const key = JSON.stringify(payload);
    if (key === lastSaveRef.current) return;
    lastSaveRef.current = key;

    try {
      await (supabase.from('abandoned_sessions' as any) as any)
        .update(payload)
        .eq('session_id', sessionId)
        .eq('assessment_id', assessmentId);
    } catch (err) {
      console.error('Error saving abandoned session:', err);
    }
  }, [assessmentId, areas, responses, viewState, calculateProgress, getCompletedAreas]);

  // Save on page unload / visibility change
  useEffect(() => {
    if (!assessmentId) return;

    const handleBeforeUnload = () => {
      const sessionId = getSessionId();
      const areaIndex = (viewState.type === 'skill' || viewState.type === 'areaSummary')
        ? (viewState.areaIndex ?? 0) : 0;
      const skillIndex = viewState.type === 'skill' ? (viewState.skillIndex ?? 0) : 0;
      const currentArea = areas[areaIndex];

      const payload = {
        current_area_id: currentArea?.area_id ?? 2,
        current_skill_index: skillIndex,
        milestone_answers: responses,
        progress_percentage: calculateProgress(),
        completed_areas: getCompletedAreas(),
        abandoned_at: new Date().toISOString(),
      };

      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/abandoned_sessions?session_id=eq.${sessionId}&assessment_id=eq.${assessmentId}`;
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      
      // sendBeacon needs PATCH but only supports POST, so we use fetch with keepalive
      fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveProgress();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [assessmentId, areas, responses, viewState, saveProgress, calculateProgress, getCompletedAreas]);

  return { saveProgress };
};
