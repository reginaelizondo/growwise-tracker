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
    superwallUrl: 'https://kinedu.superwall.app/ia-report-test',
  },
  production: {
    apiBaseUrl: 'https://kinedu.com/api/v6',
    signupUrl: 'https://app.kinedu.com/ia-signuppage/?swc=ia-report',
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

interface KineduRedirectParams {
  email?: string;
  token?: string;
  locale?: string; // 'en' | 'es' | 'pt'
}

/** Build the Superwall redirect URL with all required params */
export const getKineduRedirectUrl = (params: KineduRedirectParams = {}): string => {
  const baseUrl = KINEDU_SUPERWALL_URL;
  const separator = baseUrl.includes('?') ? '&' : '?';
  const qp = new URLSearchParams();
  if (params.token) qp.set('tokenAccess', params.token);
  if (params.email) qp.set('email', params.email);
  qp.set('isExternalFlow', 'true');
  qp.set('LanguageValue', params.locale || 'en');
  qp.set('premium', 'true');
  return `${baseUrl}${separator}${qp.toString()}`;
};
