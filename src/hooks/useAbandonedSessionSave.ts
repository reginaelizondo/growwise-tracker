import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getSessionId } from './useSessionId';

interface SaveData {
  assessmentId: string | undefined;
  babyName?: string;
  areas: Array<{ area_id: number; skills: Array<{ milestones: Array<{ milestone_id: number }> }> }>;
  responses: { [key: number]: string };
  viewState: { type: string; areaIndex?: number; skillIndex?: number };
}

interface SaveOverrides {
  areaIndex?: number;
  skillIndex?: number;
  responses?: { [key: number]: string };
}

export const useAbandonedSessionSave = ({ assessmentId, babyName, areas, responses, viewState }: SaveData) => {
  const lastSaveRef = useRef<string>('');
  // Keep refs for latest values so beforeunload always has fresh data
  const latestRef = useRef({ areas, responses, viewState, babyName });
  latestRef.current = { areas, responses, viewState, babyName };

  const buildPayload = useCallback((overrides?: SaveOverrides) => {
    const currentAreas = latestRef.current.areas;
    const currentResponses = overrides?.responses ?? latestRef.current.responses;
    const currentViewState = latestRef.current.viewState;

    if (!currentAreas.length) return null;

    const areaIndex = overrides?.areaIndex ??
      ((currentViewState.type === 'skill' || currentViewState.type === 'areaSummary')
        ? (currentViewState.areaIndex ?? 0) : 0);
    const skillIndex = overrides?.skillIndex ??
      (currentViewState.type === 'skill' ? (currentViewState.skillIndex ?? 0) : 0);

    // Calculate progress from actual responses vs total milestones
    const totalMilestones = currentAreas.reduce((sum, a) => sum + a.skills.reduce((s, sk) => s + sk.milestones.length, 0), 0);
    const answeredCount = Object.keys(currentResponses).length;
    const progress = totalMilestones > 0
      ? Math.round(22 + (answeredCount / totalMilestones) * 78)
      : 22;

    // Determine completed areas based on whether all milestones in an area are answered
    const completedAreas: number[] = [];
    for (let i = 0; i < currentAreas.length; i++) {
      const area = currentAreas[i];
      const areaMilestoneIds = area.skills.flatMap(s => s.milestones.map(m => m.milestone_id));
      const allAnswered = areaMilestoneIds.every(id => currentResponses[id] !== undefined);
      if (allAnswered && areaMilestoneIds.length > 0) {
        completedAreas.push(area.area_id);
      }
    }
    const currentArea = currentAreas[areaIndex];

    return {
      current_area_id: currentArea?.area_id ?? 2,
      current_skill_index: skillIndex,
      milestone_answers: currentResponses,
      progress_percentage: progress,
      completed_areas: completedAreas,
      abandoned_at: new Date().toISOString(),
    };
  }, []);

  const saveProgress = useCallback(async (overrides?: SaveOverrides) => {
    if (!assessmentId || !latestRef.current.areas.length) return;

    const payload = buildPayload(overrides);
    if (!payload) return;

    const key = JSON.stringify(payload);
    if (key === lastSaveRef.current) return;
    lastSaveRef.current = key;

    const sessionId = getSessionId();
    try {
      await (supabase.from('abandoned_sessions' as any) as any)
        .update(payload)
        .eq('session_id', sessionId)
        .eq('assessment_id', assessmentId);

      // Save localStorage recovery record for landing page resume banner
      try {
        localStorage.setItem('assessment_recovery', JSON.stringify({
          assessment_id: assessmentId,
          session_id: sessionId,
          baby_name: latestRef.current.babyName || 'Baby',
          progress_percentage: payload.progress_percentage,
          timestamp: new Date().toISOString(),
        }));
      } catch (_) {}
    } catch (err) {
      console.error('Error saving abandoned session:', err);
    }
  }, [assessmentId, buildPayload]);

  // Save on page unload / visibility change
  useEffect(() => {
    if (!assessmentId) return;

    const handleBeforeUnload = () => {
      const payload = buildPayload();
      if (!payload) return;

      const sessionId = getSessionId();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/abandoned_sessions?session_id=eq.${sessionId}&assessment_id=eq.${assessmentId}`;

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

      // Also save to localStorage for recovery banner (synchronous, always works)
      try {
        localStorage.setItem('assessment_recovery', JSON.stringify({
          assessment_id: assessmentId,
          session_id: sessionId,
          baby_name: latestRef.current.babyName || 'Baby',
          progress_percentage: payload.progress_percentage,
          timestamp: new Date().toISOString(),
        }));
      } catch (_) {}
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
  }, [assessmentId, saveProgress, buildPayload]);

  // Periodic auto-save every 30 seconds
  useEffect(() => {
    if (!assessmentId) return;

    const intervalId = setInterval(() => {
      saveProgress();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [assessmentId, saveProgress]);

  return { saveProgress };
};
