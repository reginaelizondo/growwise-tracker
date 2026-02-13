
# Baby Profile Form -- Visual Upgrade

## Current Issues
- The form looks plain and utilitarian
- The header icon is small and generic
- Input fields lack visual warmth
- The gestational weeks field is always visible, adding unnecessary complexity for most users
- No visual feedback or delight when interacting
- The consent section feels disconnected

## Proposed Improvements

### 1. Enhanced Header
- Replace the small Baby icon with a larger, more welcoming illustration area using a soft gradient circle with a bigger icon
- Add a friendly subtitle like "Tell us about your little one" below "Baby Profile"
- Use a more prominent gradient treatment

### 2. Better Form Field Styling
- Add subtle focus ring animations to inputs
- Use rounded-xl instead of default border radius for a softer feel
- Add icons inside input fields (user icon for name, calendar for date)
- Increase spacing between form groups for breathing room

### 3. Collapsible Gestational Weeks
- Hide gestational weeks behind an expandable "Advanced options" or "Born premature?" toggle
- Most parents have full-term babies, so this reduces visual clutter
- When expanded, show with a smooth animation

### 4. Progress Indicator
- Add a subtle step indicator at the top showing "Step 1 of 2" to set expectations that the assessment follows

### 5. Visual Polish
- Add a soft decorative element (subtle dots pattern or gradient blob) in the background of the card
- Make the "Continue to Assessment" button more prominent with an arrow icon
- Add a subtle animation when the form loads (stagger the form fields appearing)

### 6. Consent Redesign
- Move consent text to be more compact and inline
- Use a cleaner toggle-style presentation

## Technical Details

### Files to Modify
- `src/pages/BabyForm.tsx` -- Main form restructuring with:
  - Step indicator component at top
  - Redesigned header with subtitle
  - Collapsible "Born premature?" section wrapping gestational weeks
  - ArrowRight icon added to CTA button
  - Staggered fade-in animations via Tailwind classes
  - Input fields with updated styling (rounded-xl, icon prefixes)

### No New Dependencies Required
All changes use existing Tailwind classes and Lucide icons already installed.

### No Database Changes
This is purely a UI/UX improvement.
