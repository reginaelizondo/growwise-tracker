import { supabase } from "@/integrations/supabase/client";
import { KINEDU_API_BASE_URL } from "@/config/kinedu";

// ─── Cookie helpers ───────────────────────────────────────────

/** Read a browser cookie by name. */
export function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

/** Read _fbp cookie (set automatically by Meta Pixel SDK). */
export function getFbp(): string | null {
  return getCookie('_fbp');
}

/** Read _fbc cookie (only set when URL contains ?fbclid=). */
export function getFbc(): string | null {
  return getCookie('_fbc');
}

// ─── fb_event_id ──────────────────────────────────────────────

/** Get or create a persistent fb_event_id (UUID) in localStorage. */
export function getFbEventId(): string {
  const STORAGE_KEY = 'fb_event_id';
  let eventId = localStorage.getItem(STORAGE_KEY);
  if (!eventId) {
    eventId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, eventId);
  }
  return eventId;
}

// ─── Kinedu auth token singleton ──────────────────────────────

const AUTH_TOKEN_KEY = 'kinedu_auth_token';

/** Module-level cache (fastest). Falls back to localStorage for cross-page persistence. */
let _cachedAuthToken: string | null = null;

/** Get the cached Kinedu auth token (memory → localStorage). */
export function getKineduAuthToken(): string | null {
  if (_cachedAuthToken) return _cachedAuthToken;
  const stored = localStorage.getItem(AUTH_TOKEN_KEY);
  if (stored) {
    _cachedAuthToken = stored;
    return stored;
  }
  return null;
}

/** Save a Kinedu auth token to both memory and localStorage. */
function setKineduAuthToken(token: string): void {
  _cachedAuthToken = token;
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

/**
 * Initialize the Kinedu auth token singleton.
 * Calls send-kinedu-event with "quiz_start" as the first event.
 * The edge function creates the token if not provided and returns it.
 * Should be called ONCE at the beginning of the flow (BabyForm mount).
 */
export async function initKineduSession(eventData?: Record<string, unknown>): Promise<string | null> {
  // Already have a token? Just fire the event with it and return.
  const existing = getKineduAuthToken();

  const { fbp, fbc, fb_event_id } = getMetaPixelData();

  try {
    const { data, error } = await supabase.functions.invoke("send-kinedu-event", {
      body: {
        event_name: "quiz_start",
        event_data: eventData || { source: "baby_form" },
        fbp,
        fbc,
        fb_event_id,
        kinedu_api_base_url: KINEDU_API_BASE_URL,
        auth_token: existing, // null on first call → edge function creates one
      },
    });

    if (error) {
      console.warn("initKineduSession error:", error);
      return existing;
    }

    // Cache the token returned by the edge function
    const token = data?.auth_token;
    if (token) {
      setKineduAuthToken(token);
      return token;
    }

    return existing;
  } catch (err) {
    console.warn("initKineduSession failed:", err);
    return existing;
  }
}

// ─── Aggregated data helpers ──────────────────────────────────

/** Get all FB-related data + cached auth token in one call. */
export function getMetaPixelData(): {
  fbp: string | null;
  fbc: string | null;
  fb_event_id: string;
  auth_token?: string | null;
} {
  return {
    fbp: getFbp(),
    fbc: getFbc(),
    fb_event_id: getFbEventId(),
    auth_token: getKineduAuthToken(),
  };
}

// ─── Meta Pixel client-side events ───────────────────────────

/** Fire a Meta Pixel standard event (safe wrapper for window.fbq). */
export function trackPixelEvent(
  eventName: string,
  params?: Record<string, unknown>
): void {
  if (typeof window !== 'undefined' && typeof (window as any).fbq === 'function') {
    if (params) {
      (window as any).fbq('track', eventName, params);
    } else {
      (window as any).fbq('track', eventName);
    }
  }
}

/** Fire a Meta Pixel PageView from SPA route transitions. */
export function trackPixelPageView(): void {
  trackPixelEvent('PageView');
}

// ─── Kinedu send_event (fire-and-forget) ─────────────────────

/**
 * Fire a send_event call to Kinedu API via Supabase edge function.
 * Reuses the singleton auth token. Fire-and-forget.
 */
export function sendKineduEvent(
  eventName: string,
  eventData?: Record<string, unknown>
): void {
  const { fbp, fbc, fb_event_id, auth_token } = getMetaPixelData();

  supabase.functions
    .invoke("send-kinedu-event", {
      body: {
        event_name: eventName,
        event_data: eventData || {},
        fbp,
        fbc,
        fb_event_id,
        kinedu_api_base_url: KINEDU_API_BASE_URL,
        auth_token, // reuse singleton — edge function skips create_auth_token
      },
    })
    .then(({ data, error }) => {
      if (error) {
        console.warn(`send-kinedu-event [${eventName}] error:`, error);
        return;
      }
      // If for some reason a new token was created, cache it
      if (data?.token_created && data?.auth_token) {
        setKineduAuthToken(data.auth_token);
      }
    })
    .catch((err) => console.warn(`send-kinedu-event [${eventName}] failed:`, err));
}
