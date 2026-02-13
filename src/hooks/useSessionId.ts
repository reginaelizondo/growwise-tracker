/**
 * Session ID management for analytics tracking.
 * Creates a persistent session_id in localStorage that connects
 * page_events (landing clicks, profile clicks) with assessment_events.
 */

export const getSessionId = (): string => {
  let sessionId = localStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
};

export const resetSessionId = (): string => {
  const sessionId = crypto.randomUUID();
  localStorage.setItem('analytics_session_id', sessionId);
  return sessionId;
};
