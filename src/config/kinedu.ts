/**
 * Kinedu Environment Configuration
 *
 * Controls which Kinedu environment (QA or Production) the quiz connects to.
 * Set VITE_KINEDU_ENV in your .env file:
 *   - "qa"         → QA/testing (default)
 *   - "production"  → Production/live
 *
 * QA: https://qa.kinedu.com/api/v6
 * Production: https://kinedu.com/api/v6
 */

type KineduEnv = 'qa' | 'production';

const env: KineduEnv =
  (import.meta.env.VITE_KINEDU_ENV as KineduEnv) || 'qa';

const config = {
  qa: {
    apiBaseUrl: 'https://qa.kinedu.com/api/v6',
    signupUrl: 'https://app.kinedu.com/ia-signuppage/?swc=ia-report',
    // Superwall URLs — update when QA paywall URLs are confirmed
    superwallUrl: 'https://kinedu.superwall.app/ia-report',
  },
  production: {
    apiBaseUrl: 'https://kinedu.com/api/v6',
    signupUrl: 'https://app.kinedu.com/ia-signuppage/?swc=ia-report',
    // Superwall URLs — update when Production paywall URLs are confirmed
    superwallUrl: 'https://kinedu.superwall.app/ia-report',
  },
} as const;

const current = config[env];

/** Current environment: "qa" or "production" */
export const KINEDU_ENV = env;

/** Kinedu API base URL for the current environment */
export const KINEDU_API_BASE_URL = current.apiBaseUrl;

/** Kinedu signup page URL (for new/unregistered users) */
export const KINEDU_SIGNUP_URL = current.signupUrl;

/** Kinedu Superwall paywall URL (for registered users) */
export const KINEDU_SUPERWALL_URL = current.superwallUrl;

/** Helper: get the correct redirect URL based on registration status */
export const getKineduRedirectUrl = (kineduRegistered: boolean, email?: string): string => {
  const baseUrl = kineduRegistered ? KINEDU_SUPERWALL_URL : KINEDU_SIGNUP_URL;
  if (email) {
    return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}email=${encodeURIComponent(email)}`;
  }
  return baseUrl;
};
