import { supabase } from "@/integrations/supabase/client";
import { KINEDU_API_BASE_URL } from "@/config/kinedu";

/**
 * Read a browser cookie by name.
 */
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

/**
 * Get or create a persistent fb_event_id (UUID) in localStorage.
 */
export function getFbEventId(): string {
  const STORAGE_KEY = 'fb_event_id';
  let eventId = localStorage.getItem(STORAGE_KEY);
  if (!eventId) {
    eventId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, eventId);
  }
  return eventId;
}

/**
 * Get all FB-related data in one call.
 */
export function getMetaPixelData(): {
  fbp: string | null;
  fbc: string | null;
  fb_event_id: string;
} {
  return {
    fbp: getFbp(),
    fbc: getFbc(),
    fb_event_id: getFbEventId(),
  };
}

/**
 * Fire a Meta Pixel standard event (safe wrapper for window.fbq).
 */
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

/**
 * Fire a send_event call to Kinedu API via Supabase edge function.
 * Fire-and-forget — errors are logged but never block the UI.
 */
export function sendKineduEvent(
  eventName: string,
  eventData?: Record<string, unknown>
): void {
  const { fbp, fbc, fb_event_id } = getMetaPixelData();

  supabase.functions
    .invoke("send-kinedu-event", {
      body: {
        event_name: eventName,
        event_data: eventData || {},
        fbp,
        fbc,
        fb_event_id,
        kinedu_api_base_url: KINEDU_API_BASE_URL,
      },
    })
    .then(({ error }) => {
      if (error) console.warn(`send-kinedu-event [${eventName}] error:`, error);
    })
    .catch((err) => console.warn(`send-kinedu-event [${eventName}] failed:`, err));
}
