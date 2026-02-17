
# Analytics Dashboard Overhaul

## Current Issues Found

1. **Empty data in key reports**: `drop_off_by_question` and `time_per_question` return empty arrays because assessment_events tracking (question_view, question_duration) is not firing consistently -- the edge function relies on events that aren't being recorded by the assessment flow.

2. **Completion funnel shows 0% engagement**: The `completion_funnel` report counts `question_view` events from `assessment_events`, but these aren't being tracked properly, so `answered_at_least_one` is always 0.

3. **No visual funnel chart**: The conversion funnel uses plain colored bars instead of a proper funnel visualization with drop-off percentages between stages.

4. **Missing full-journey funnel**: There's no end-to-end funnel from Landing -> Profile -> Assessment Start -> 25% -> 50% -> 75% -> Complete -> Report View -> CTA Click.

5. **Individual assessments table lacks key info**: No reference age, no area where they dropped, skill names show as IDs.

6. **No time-series view**: No way to see trends over time (daily assessments, daily completion rate).

---

## Plan

### 1. Fix the Completion Funnel to Use Real Data (Edge Function)

Update `completion_funnel` to calculate engagement from `assessment_responses` instead of `assessment_events`, since responses are reliably recorded.

### 2. Build a Full End-to-End Funnel (New Report Type + UI)

Add a new `full_funnel` report type to the edge function that calculates:

```text
Landing Clicks (page_events) 
   |  -> drop %
Profile Clicks (page_events)
   |  -> drop %
Assessment Created (assessments count)
   |  -> drop %
1+ Questions Answered (has responses)
   |  -> drop %
50%+ Completed
   |  -> drop %
Assessment Completed (completed_at not null)
   |  -> drop %
Report Viewed (report_view event)
   |  -> drop %
CTA Clicked (cta_clicked event)
```

Display this as a proper vertical funnel with drop-off percentages between each step, colored bars narrowing from top to bottom.

### 3. Redesign the Top KPI Cards

Restructure the 6 metric cards to show the most actionable numbers:

- **Total Sessions**: Landing clicks count
- **Assessments Started**: Total assessments created
- **Completion Rate**: % that completed (with color coding: green >60%, yellow 30-60%, red <30%)
- **Abandoned**: Count + % with red styling
- **Median Duration**: Of completed assessments only
- **Report Views**: How many saw the report page (from events)

### 4. Add Drop-off by Area (Fix Empty Data)

Instead of relying on `assessment_events` for drop-off (which returns empty), calculate drop-off directly from `assessment_responses` -- group by area_id and find where users stop answering. This is more reliable since responses always exist.

Add a new `drop_off_by_area` report type that shows:
- How many users reached each area
- How many dropped within each area
- Net drop-off % per area

### 5. Improve Individual Assessments Table

Add columns:
- **Age (months)**: Reference age from assessment
- **Drop-off Point**: Show area name + skill name where they stopped (not IDs)
- **Report Viewed**: Yes/No indicator
- **CTA Clicked**: Yes/No indicator

Fetch skill/area names from the external Supabase in the edge function so the frontend doesn't need to resolve IDs.

### 6. Add Daily Trend Chart

Add a new `daily_stats` report type that returns per-day:
- assessments_started
- assessments_completed
- completion_rate

Display using Recharts BarChart already available in the project.

### 7. Reorganize Page Layout

New layout order (most actionable first):

1. **KPI Cards** (6 cards with key metrics)
2. **Full End-to-End Funnel** (the main visualization)
3. **Daily Trend Chart** (new - bar chart with daily starts vs completions)
4. **Drop-off by Area** (where users abandon, using response data)
5. **Individual Assessments Table** (enhanced with names, age, drop point)
6. **Age Distribution** (collapsible, already exists)
7. **Skill Performance** (collapsible, already exists)

Remove the duplicate funnels (conversion_funnel and area_progression_funnel tabs) and consolidate into the single full funnel.

---

## Technical Details

### Edge Function Changes (`analytics-query/index.ts`)

New report types to add:
- `full_funnel`: Combines page_events + assessments + responses + events into one end-to-end funnel
- `daily_stats`: Aggregates assessments by day for trend chart
- `drop_off_by_area`: Calculates area-level drop-off from responses

Fix existing:
- `completion_funnel`: Use `assessment_responses` count instead of `assessment_events` for engagement
- `individual_assessments`: Include `reference_age_months`, resolve area/skill names for drop-off point, add `saw_report` and `cta_clicked` booleans

### Frontend Changes (`src/pages/Analytics.tsx`)

- Complete rewrite of the page layout with the new section order
- Add Recharts BarChart for daily trends
- Build proper funnel visualization component with narrowing bars and drop-off annotations between steps
- Enhanced table with resolved names and status indicators
- Make Skill Performance and Age Distribution collapsible (already partially done)

### Files Modified

1. `supabase/functions/analytics-query/index.ts` -- Add new report types, fix existing ones
2. `src/pages/Analytics.tsx` -- Redesign layout, add charts, improve table

No database changes needed -- all data already exists in `page_events`, `assessments`, `assessment_responses`, and `assessment_events`.
