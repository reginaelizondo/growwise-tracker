import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getSessionId } from './useSessionId';

interface AnalyticsEvent {
  event_type: string;
  milestone_id?: number;
  skill_id?: number;
  area_id?: number;
  question_index?: number;
  event_data?: Record<string, any>;
}

export const useAssessmentAnalytics = (
  assessmentId: string | undefined,
  babyId: string | undefined
) => {
  // Use persistent session_id from localStorage to connect with page_events
  const sessionIdRef = useRef(getSessionId());
  const questionStartTimeRef = useRef<number>(Date.now());
  const currentQuestionRef = useRef<number | null>(null);

  // Track question view
  const trackQuestionView = async (
    questionIndex: number,
    milestone_id: number,
    skill_id: number,
    area_id: number
  ) => {
    if (!assessmentId || !babyId) return;

    // If there's a previous question, track the time spent on it
    if (currentQuestionRef.current !== null) {
      const timeSpent = Date.now() - questionStartTimeRef.current;
      await trackEvent({
        event_type: 'question_duration',
        milestone_id: currentQuestionRef.current,
        question_index: currentQuestionRef.current,
        event_data: { duration_ms: timeSpent }
      });
    }

    // Track new question
    currentQuestionRef.current = milestone_id;
    questionStartTimeRef.current = Date.now();

    await trackEvent({
      event_type: 'question_view',
      milestone_id,
      skill_id,
      area_id,
      question_index: questionIndex
    });
  };

  // Track answer
  const trackAnswer = async (
    milestone_id: number,
    answer: string,
    questionIndex: number
  ) => {
    if (!assessmentId || !babyId) return;

    const timeSpent = Date.now() - questionStartTimeRef.current;
    
    await trackEvent({
      event_type: 'answer',
      milestone_id,
      question_index: questionIndex,
      event_data: { 
        answer, 
        time_to_answer_ms: timeSpent 
      }
    });
  };

  // Track helper/info opened
  const trackHelperOpen = async (milestone_id: number) => {
    if (!assessmentId || !babyId) return;

    await trackEvent({
      event_type: 'helper_open',
      milestone_id,
      question_index: currentQuestionRef.current || 0
    });
  };

  // Track skip/back navigation
  const trackNavigation = async (direction: 'skip' | 'back') => {
    if (!assessmentId || !babyId) return;

    await trackEvent({
      event_type: direction,
      question_index: currentQuestionRef.current || 0
    });
  };

  // Track exit/abandonment
  const trackExit = async (reason?: string) => {
    if (!assessmentId || !babyId) return;

    await trackEvent({
      event_type: 'exit',
      question_index: currentQuestionRef.current || 0,
      event_data: { reason }
    });
  };

  // Core tracking function
  const trackEvent = async (event: AnalyticsEvent) => {
    if (!assessmentId || !babyId) return;

    try {
      await supabase.from('assessment_events').insert({
        assessment_id: assessmentId,
        baby_id: babyId,
        session_id: sessionIdRef.current,
        user_agent: navigator.userAgent,
        ...event
      });
    } catch (error) {
      console.error('Analytics tracking error:', error);
      // Fail silently - don't affect UX
    }
  };

  // Track page unload (abandono)
  useEffect(() => {
    if (!assessmentId || !babyId) return;

    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable exit tracking
      const payload = {
        assessment_id: assessmentId,
        baby_id: babyId,
        event_type: 'exit',
        question_index: currentQuestionRef.current,
        session_id: sessionIdRef.current,
        user_agent: navigator.userAgent,
        created_at: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      
      navigator.sendBeacon(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/assessment_events`,
        blob
      );
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [assessmentId, babyId]);

  return {
    trackQuestionView,
    trackAnswer,
    trackHelperOpen,
    trackNavigation,
    trackExit
  };
};
