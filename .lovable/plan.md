

# Recovery Email - Major Redesign (Compact & Conversion-Focused)

## Goal
Complete rewrite of the email HTML template to be ~60% shorter, denser, and more conversion-oriented. Then reset flags and re-send test email to reginaelizondo@kinedu.com.

---

## New Email Structure (top to bottom)

### 1. Logo + Headline + Subtext + CTA (tight block)
- Kinedu logo, reduced top padding (24px instead of 32px)
- Headline: 22px bold navy, single line where possible, tighter line-height
- Subtext: single paragraph, 14px gray, "2 more minutes" in bold
- Full-width GREEN CTA button: `border-radius: 12px` (not 50px pill), `#34A853`, 16px font
- "Takes 2 min - 100% free" small text directly below

### 2. Progress Section (inline step tracker)
- Replace the big card with rows/circles with a compact horizontal step tracker
- Light gray card (`#F8F9FA`), 12px padding
- "22% complete" small label above
- Single row of 4 segments using area icons + colored indicators:
  - Completed = green check + name with area color
  - Current = blue dot + "You're here" indicator
  - Pending = gray circle + gray name
- Everything on 1-2 lines max, no big numbered circles

### 3. Value Props (inline, merged)
- Single line: "Full report - Focus areas - Daily activities" with emojis, 12px, gray
- No separate "What you'll unlock" heading, no 3 separate rows

### 4. Kinedu App Section (compact)
- Keep blue background card (`#F0F7FF`)
- "THE #1 APP RECOMMENDED BY PEDIATRICIANS" label
- "Know exactly what to do with Baby every day" - 18px bold
- One-liner: "5 min/day - 1,800+ expert activities - Results in 2-4 weeks"
- Rating pill: "4.7 - 2,000+ reviews"
- NAVY CTA: `border-radius: 12px`, full width
- "No commitment - Cancel anytime" small text
- App Store + Google Play badges on same line, smaller (110px + 120px)
- **Remove phone mockup image entirely**

### 5. Footer (minimal)
- "Trusted by 10M+ families" one line
- Legal disclaimer + copyright, compact

### 6. Remove
- Bottom duplicate CTA (keep only the top one)
- Separate "What you'll unlock" section
- Phone mockup image
- Clipboard emoji from subject
- All 50px border-radius (use 12px everywhere)

---

## Design Rules Applied
- Button border-radius: 12px
- Button padding: 16px vertical, full width
- Section spacing: 16px max
- Card padding: 12-16px
- Font sizes: headline 22px, body 14px, small 11px

---

## Technical Steps

1. **Rewrite** `supabase/functions/send-recovery-email/index.ts`:
   - Replace `buildAreaChecklist()` with `buildStepTracker()` (horizontal inline layout)
   - Replace `buildCtaButton()` with flat full-width 12px radius button
   - Replace `buildAppSection()` with compact version (no image, tighter spacing)
   - Rewrite `buildEmailHtml()` with reduced padding and merged sections
   - Remove clipboard emoji from subject line
   - Update subtext to be single paragraph format

2. **Deploy** the edge function

3. **Reset** `email_sent` / `email_sent_at` flags for session `ce1381af-8295-4cfe-adc3-955b72265c98`

4. **Send** test email by invoking the function with the session ID
