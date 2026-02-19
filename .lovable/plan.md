

## Make Email Report Cards Bigger

Increase the size of the 2x2 area cards in the report email template to make them more visually prominent.

### Changes

**File: `supabase/functions/send-report-email/index.ts`** (lines ~160-183, `areaCard` function)

- Increase card padding from `14px 14px 12px` to `18px 16px 16px`
- Increase area icon from `20px` to `28px`
- Increase area name font from `14px` to `16px`
- Increase pace value font from `18px` to `22px`
- Increase pace label font from `11px` to `12px`
- Add slightly more spacing above the gauge (`margin-top: 4px`)

### Technical Details

All changes are in the `areaCard()` function within the `send-report-email` edge function. After editing, the function will be redeployed and a test email sent to verify.
