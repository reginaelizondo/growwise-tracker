
# Post-Assessment Results Page - Two Paths

## Overview
Replace the current behavior (redirect to Kinedu signup after assessment) with a new results page that shows assessment results and maximizes email capture + trial conversion. Two paths based on whether the user provided email at registration.

## Current Behavior
- Assessment completion in `AssessmentNew.tsx` redirects directly to `https://app.kinedu.com/ia-signuppage/?swc=ia-report`
- The existing `Report.tsx` page is a detailed report accessible via `/report/:id`

## New Behavior
- Assessment completion navigates to `/report/:id` instead of redirecting externally
- The Report page is completely redesigned with two paths

---

## Path A: User HAS email (baby.email exists)

Single scrollable page with:

1. **Celebration header** - Party emoji, "Great job completing [Name]'s assessment!", "We've sent the full report to your email" (email fires automatically)
2. **4 Area Cards (2x2 grid)** - Each card: area icon + name + percentage + pace gauge + progress bar + milestone count. Colors: Physical #00A3E0, Cognitive #00C853, Language #FF8A00, Social #F06292
3. **Strengths and Focus Areas** - Green card for top strengths, yellow/amber card for areas needing support (skills sorted by score)
4. **Timeline "How Kinedu helps [Name] grow"** - Step 1: checkmark "Take the assessment - Done!", Step 2: "Get personalized daily activities", Step 3: "Track progress as [Name] develops"
5. **Sticky bottom CTA** - "Start [Name]'s Plan -- 7 Days Free", always visible on mobile, with "No commitment required" below

## Path B: User has NO email (baby.email is null)

### Screen 1: Teaser + Email Capture

1. **Celebration header** - "[Name]'s assessment is complete!" + "Here's a preview of his development."
2. **4 Area Cards (2x2 grid)** - Same as Path A, fully visible (the hook)
3. **Blurred skill details** - Individual skills appear but with CSS blur + gradient fade to white. Lock icon with "Unlock [Name]'s full report" + email input + "Unlock Full Report" button + "We'll also email you the results"

### Screen 2: After email submission (same page, animated unlock)

- Blur fades away revealing full skill details
- Strengths and Focus Areas cards appear
- Timeline shows 2 completed steps (assessment + results)
- Email report fires in background
- Sticky CTA remains

---

## Technical Plan

### 1. Modify `AssessmentNew.tsx` completion handlers
- Change `window.location.href = 'https://app.kinedu.com/ia-signuppage/...'` to `navigate('/report/' + id)` in both `handleSkipArea` and `handleContinueFromSummary`
- Keep the email fire-and-forget and `completed_at` update

### 2. Rewrite `Report.tsx` (complete overhaul)
- Add state: `hasEmail` (derived from `baby.email`), `emailUnlocked` (for Path B after submit), `userEmail` (input field)
- Reuse existing data fetching logic (assessment, responses, milestones, skill calculations)
- Remove existing complex report layout (gauges, collapsibles, recommended activities, print view, etc.)
- Build new simplified layout:

**Shared components:**
- `CelebrationHeader` - emoji + congratulations text
- `AreaCard` - icon, name, percentage, pace, progress bar, milestone count (2x2 grid)
- `StrengthsFocusCards` - green strengths card + amber focus areas card
- `KineduTimeline` - 3-step vertical timeline with completion states
- `EmailCaptureOverlay` - blurred section with email form (Path B only)
- `MobileStickyCta` (already exists, update text to "Start [Name]'s Plan -- 7 Days Free")

**Rendering logic:**
```
if Path A (hasEmail):
  CelebrationHeader (with email sent message)
  AreaCards (2x2)
  StrengthsFocusCards
  KineduTimeline (1 step done)
  MobileStickyCta

if Path B (no email, not unlocked):
  CelebrationHeader (preview message)
  AreaCards (2x2) -- fully visible
  BlurredSkillDetails + EmailCaptureOverlay
  MobileStickyCta

if Path B (email submitted, unlocked):
  CelebrationHeader (updated)
  AreaCards (2x2)
  SkillDetails (animated reveal)
  StrengthsFocusCards
  KineduTimeline (2 steps done)
  MobileStickyCta
```

### 3. Email capture (Path B)
- On submit: update `babies` table with email, fire `send-report-email` edge function
- Set `emailUnlocked = true` to trigger smooth CSS transition (blur removal)
- Track event `email_captured_post_assessment`

### 4. Update `MobileStickyCta` component
- Change button text to "Start [Name]'s Plan -- 7 Days Free"
- Add "No commitment required" text below button
- Style: green background, always visible on mobile

### 5. Styling
- Background: warm cream `#FBF9F6`
- Card borders: `#E8E4DF`
- Border radius: 16-18px
- Font: system (Nunito if available)
- Area colors: Physical #00A3E0, Cognitive #00C853, Linguistic #FF8A00, Socio-Emotional #F06292
- Blur transition: CSS `filter: blur()` with `transition: filter 0.6s ease-out`

### 6. Files to modify
- `src/pages/AssessmentNew.tsx` - Change redirect to navigate to report
- `src/pages/Report.tsx` - Complete rewrite with new two-path layout
- `src/components/MobileStickyCta.tsx` - Update text and add "No commitment" subtitle

### 7. Files to keep unchanged
- Edge function `send-report-email` - Already works
- Database schema - `babies.email` already supports null
- All existing components not related to the report page
