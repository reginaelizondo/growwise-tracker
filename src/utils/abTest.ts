/**
 * Simple A/B test utility
 * Assigns a variant on first visit, persists in localStorage
 */

export type ABVariant = 'A' | 'B';

const AB_STORAGE_KEY = 'ab_landing_variant';

/**
 * Get or assign a variant for the landing page A/B test.
 * 50/50 split. Persists across sessions.
 */
export function getLandingVariant(): ABVariant {
  try {
    const stored = localStorage.getItem(AB_STORAGE_KEY);
    if (stored === 'A' || stored === 'B') return stored;

    // Assign randomly (50/50)
    const variant: ABVariant = Math.random() < 0.5 ? 'A' : 'B';
    localStorage.setItem(AB_STORAGE_KEY, variant);
    return variant;
  } catch {
    return 'A'; // Default to control on error
  }
}

/**
 * Force a specific variant (useful for testing via URL param ?variant=B)
 */
export function setLandingVariant(variant: ABVariant): void {
  localStorage.setItem(AB_STORAGE_KEY, variant);
}

/**
 * Reset variant assignment (for debugging)
 */
export function resetLandingVariant(): void {
  localStorage.removeItem(AB_STORAGE_KEY);
}
