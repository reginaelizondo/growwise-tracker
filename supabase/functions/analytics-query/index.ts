import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};


interface ReportFilters {
  startDate?: string;
  endDate?: string;
  babyId?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { reportType, filters: rawFilters = {} } = await req.json();

    const filters = { ...rawFilters };
    if (filters.startDate && !filters.startDate.includes(':')) {
      filters.startDate = `${filters.startDate} 00:00:00`;
    }
    if (filters.endDate && !filters.endDate.includes(':')) {
      filters.endDate = `${filters.endDate} 23:59:59`;
    }

    console.log('Analytics query:', reportType, filters);

    let data;
    switch (reportType) {
      case 'full_funnel':
        data = await getFullFunnel(supabase, filters);
        break;
      case 'daily_stats':
        data = await getDailyStats(supabase, filters);
        break;
      case 'drop_off_by_area':
        data = await getDropOffByArea(supabase, filters);
        break;
      case 'completion_funnel':
        data = await getCompletionFunnel(supabase, filters);
        break;
      case 'skill_performance':
        data = await getSkillPerformance(supabase, filters);
        break;
      case 'individual_assessments':
        data = await getIndividualAssessments(supabase, filters);
        break;
      case 'age_distribution':
        data = await getAgeDistribution(supabase, filters);
        break;
      case 'page_events':
        data = await getPageEvents(supabase, filters);
        break;
      case 'meta_ads':
        data = await getMetaAdsData(filters);
        break;
      // Legacy - keep for backward compat
      case 'conversion_funnel':
        data = await getFullFunnel(supabase, filters);
        break;
      case 'area_progression_funnel':
        data = await getDropOffByArea(supabase, filters);
        break;
      case 'drop_off_by_question':
        data = [];
        break;
      case 'time_per_question':
        data = [];
        break;
      default:
        throw new Error('Invalid report type');
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// ============================================================
// FULL END-TO-END FUNNEL
// Landing -> Profile -> Assessment Created -> 1+ Answered -> 50%+ -> Completed -> Report Viewed -> CTA Clicked
// ============================================================
async function getFullFunnel(supabase: any, filters: ReportFilters) {
  // 1. Page events
  let peQuery = supabase.from('page_events').select('event_type, session_id, event_data');
  if (filters.startDate) peQuery = peQuery.gte('created_at', filters.startDate);
  if (filters.endDate) peQuery = peQuery.lte('created_at', filters.endDate);
  const { data: pageEvents } = await peQuery;

  // Landing page views and A/B variant tracking — count unique sessions, not raw page views
  const landingViewEvents = (pageEvents || []).filter((e: any) => e.event_type === 'landing_page_view');
  const landingSessions = new Set<string>();
  const landingSessionsA = new Set<string>();
  const landingSessionsB = new Set<string>();
  for (const e of landingViewEvents) {
    if (!e.session_id) continue;
    landingSessions.add(e.session_id);
    if (e.event_data?.variant === 'A') landingSessionsA.add(e.session_id);
    else if (e.event_data?.variant === 'B') landingSessionsB.add(e.session_id);
  }
  const landingViewsTotal = landingSessions.size;
  const landingViewsA = landingSessionsA.size;
  const landingViewsB = landingSessionsB.size;

  // Count unique sessions per funnel step (not raw events) so each step = unique users
  const uniqueSessionsForEvent = (
    type: string,
    predicate?: (e: any) => boolean,
  ): Set<string> => {
    const s = new Set<string>();
    for (const e of pageEvents || []) {
      if (e.event_type !== type) continue;
      if (predicate && !predicate(e)) continue;
      if (!e.session_id) continue;
      s.add(e.session_id);
    }
    return s;
  };

  const landingClickSessions = uniqueSessionsForEvent('landing_start_clicked');
  const landingClickSessionsA = uniqueSessionsForEvent('landing_start_clicked', (e) => e.event_data?.variant === 'A');
  const landingClickSessionsB = uniqueSessionsForEvent('landing_start_clicked', (e) => e.event_data?.variant === 'B');
  const landingClicks = landingClickSessions.size;
  const landingClicksA = landingClickSessionsA.size;
  const landingClicksB = landingClickSessionsB.size;

  const formNameCompleted = uniqueSessionsForEvent('form_name_completed').size;
  const formBirthdayCompleted = uniqueSessionsForEvent('form_birthday_completed').size;
  const formEmailCompleted = uniqueSessionsForEvent('form_email_completed').size;
  const emailsProvidedAtProfile = uniqueSessionsForEvent('form_email_completed', (e) => e.event_data?.has_email === true).size;
  const profileClicks = uniqueSessionsForEvent('profile_continue_clicked').size;

  // 2. Assessments
  let aQuery = supabase.from('assessments').select('id, completed_at, reference_age_months, email_sent_at, email_opened_at');
  if (filters.startDate) aQuery = aQuery.gte('created_at', filters.startDate);
  if (filters.endDate) aQuery = aQuery.lte('created_at', filters.endDate);
  const { data: assessments } = await aQuery;

  const totalCreated = assessments?.length || 0;
  const completed = assessments?.filter((a: any) => a.completed_at).length || 0;
  const emailsSent = assessments?.filter((a: any) => a.email_sent_at).length || 0;
  const emailsOpened = assessments?.filter((a: any) => a.email_opened_at).length || 0;

  // 3. Responses per assessment
  const assessmentIds = assessments?.map((a: any) => a.id) || [];
  let allResponses: any[] = [];
  if (assessmentIds.length > 0) {
    const batchSize = 500;
    for (let i = 0; i < assessmentIds.length; i += batchSize) {
      const batch = assessmentIds.slice(i, i + batchSize);
      const { data } = await supabase
        .from('assessment_responses')
        .select('assessment_id, milestone_id')
        .in('assessment_id', batch);
      if (data) allResponses = allResponses.concat(data);
    }
  }

  const responsesPerAssessment = new Map<string, Set<number>>();
  allResponses.forEach((r: any) => {
    if (!responsesPerAssessment.has(r.assessment_id)) {
      responsesPerAssessment.set(r.assessment_id, new Set());
    }
    responsesPerAssessment.get(r.assessment_id)!.add(r.milestone_id);
  });

  let engaged = 0;
  let halfway = 0;
  assessments?.forEach((a: any) => {
    const uniqueAnswers = responsesPerAssessment.get(a.id)?.size || 0;
    if (uniqueAnswers >= 1) engaged++;
    // If assessment is completed, it's always 50%+
    if (a.completed_at) {
      halfway++;
    } else {
      const estimatedTotal = getEstimatedTotalForAge(a.reference_age_months || 0);
      if (uniqueAnswers >= estimatedTotal * 0.5) halfway++;
    }
  });

  // 4. Report views and CTA clicks from assessment_events
  // Only count events whose assessment was created in the date range.
  // If there are no assessments in the range, there are no report views / CTA clicks to report either.
  let events: any[] = [];
  if (assessmentIds.length > 0) {
    const evBatchSize = 500;
    for (let i = 0; i < assessmentIds.length; i += evBatchSize) {
      const batch = assessmentIds.slice(i, i + evBatchSize);
      const { data } = await supabase.from('assessment_events')
        .select('event_type, assessment_id')
        .in('event_type', ['report_view', 'cta_clicked', 'email_captured_post_assessment'])
        .in('assessment_id', batch);
      if (data) events = events.concat(data);
    }
  }

  const reportViewAssessments = new Set(events.filter((e: any) => e.event_type === 'report_view').map((e: any) => e.assessment_id));
  const ctaClickAssessments = new Set(events.filter((e: any) => e.event_type === 'cta_clicked').map((e: any) => e.assessment_id));
  const emailCapturedPost = new Set(events.filter((e: any) => e.event_type === 'email_captured_post_assessment').map((e: any) => e.assessment_id));

  // Count babies with email (profile-level)
  let babiesWithEmail = 0;
  try {
    const { count } = await supabase.from('babies').select('id', { count: 'exact', head: true }).not('email', 'is', null).neq('email', '');
    babiesWithEmail = count || 0;
  } catch { /* ignore */ }

  const steps = [
    { label: 'Vio Landing Page', count: landingViewsTotal },
    { label: 'Click en Start FREE Assessment', count: landingClicks },
    { label: '① Nombre', count: formNameCompleted },
    { label: '② Cumpleaños', count: formBirthdayCompleted },
    { label: '③ Email', count: formEmailCompleted },
    { label: '④ Áreas → Continuar', count: profileClicks },
    { label: 'Assessment Creado', count: totalCreated },
    { label: '1+ Respuesta', count: engaged },
    { label: '50%+ Completado', count: halfway },
    { label: 'Assessment Completo', count: completed },
    { label: 'Vio Reporte', count: reportViewAssessments.size },
    { label: 'Click en CTA', count: ctaClickAssessments.size },
  ];

  // Add drop-off % between each step
  const stepsWithDropOff = steps.map((step, i) => {
    const prev = i > 0 ? steps[i - 1].count : step.count;
    const dropOff = prev > 0 ? ((prev - step.count) / prev) * 100 : 0;
    return { ...step, drop_off_pct: i === 0 ? 0 : dropOff };
  });

  return {
    steps: stepsWithDropOff,
    landing_views: landingViewsTotal,
    landing_clicks: landingClicks,
    profile_clicks: profileClicks,
    form_name_completed: formNameCompleted,
    form_birthday_completed: formBirthdayCompleted,
    form_email_completed: formEmailCompleted,
    emails_at_profile: emailsProvidedAtProfile,
    emails_post_assessment: emailCapturedPost.size,
    babies_with_email: babiesWithEmail,
    assessments_created: totalCreated,
    engaged,
    halfway,
    completed,
    report_views: reportViewAssessments.size,
    cta_clicks: ctaClickAssessments.size,
    emails_sent: emailsSent,
    emails_opened: emailsOpened,
    email_open_rate: emailsSent > 0 ? (emailsOpened / emailsSent) * 100 : 0,
    completion_rate: totalCreated > 0 ? (completed / totalCreated) * 100 : 0,
    // A/B test data
    landing_views: landingViewsTotal,
    landing_views_a: landingViewsA,
    landing_views_b: landingViewsB,
    landing_clicks_a: landingClicksA,
    landing_clicks_b: landingClicksB,
    ctr_a: landingViewsA > 0 ? (landingClicksA / landingViewsA) * 100 : 0,
    ctr_b: landingViewsB > 0 ? (landingClicksB / landingViewsB) * 100 : 0,
  };
}

// ============================================================
// DAILY STATS - assessments per day
// ============================================================
async function getDailyStats(supabase: any, filters: ReportFilters) {
  let query = supabase.from('assessments').select('id, created_at, completed_at');
  if (filters.startDate) query = query.gte('created_at', filters.startDate);
  if (filters.endDate) query = query.lte('created_at', filters.endDate);
  query = query.order('created_at', { ascending: true });

  const { data: assessments } = await query;
  if (!assessments || assessments.length === 0) return [];

  const dailyMap = new Map<string, { started: number; completed: number }>();

  assessments.forEach((a: any) => {
    const day = a.created_at?.substring(0, 10);
    if (!day) return;
    if (!dailyMap.has(day)) dailyMap.set(day, { started: 0, completed: 0 });
    dailyMap.get(day)!.started++;
    if (a.completed_at) dailyMap.get(day)!.completed++;
  });

  return Array.from(dailyMap.entries()).map(([date, stats]) => ({
    date,
    started: stats.started,
    completed: stats.completed,
    completion_rate: stats.started > 0 ? (stats.completed / stats.started) * 100 : 0,
  }));
}

// ============================================================
// DROP-OFF BY AREA - where users abandon based on responses
// ============================================================
async function getDropOffByArea(supabase: any, filters: ReportFilters) {
  // Get assessments
  let aQuery = supabase.from('assessments').select('id, completed_at');
  if (filters.startDate) aQuery = aQuery.gte('created_at', filters.startDate);
  if (filters.endDate) aQuery = aQuery.lte('created_at', filters.endDate);
  const { data: assessments } = await aQuery;

  if (!assessments || assessments.length === 0) return [];

  const assessmentIds = assessments.map((a: any) => a.id);
  const completedSet = new Set(assessments.filter((a: any) => a.completed_at).map((a: any) => a.id));

  // Get responses
  let allResponses: any[] = [];
  const batchSize = 500;
  for (let i = 0; i < assessmentIds.length; i += batchSize) {
    const batch = assessmentIds.slice(i, i + batchSize);
    const { data } = await supabase
      .from('assessment_responses')
      .select('assessment_id, area_id')
      .in('assessment_id', batch);
    if (data) allResponses = allResponses.concat(data);
  }

  // Group: assessment -> set of area_ids
  const assessmentAreas = new Map<string, Set<number>>();
  allResponses.forEach((r: any) => {
    if (!r.area_id) return;
    if (!assessmentAreas.has(r.assessment_id)) assessmentAreas.set(r.assessment_id, new Set());
    assessmentAreas.get(r.assessment_id)!.add(r.area_id);
  });

  const areaNames: Record<number, string> = {
    1: 'Physical',
    2: 'Cognitive',
    3: 'Linguistic',
    4: 'Socio-emotional',
  };

  // For each incomplete assessment, find the last area they reached
  const dropOffCounts: Record<number, number> = {};
  const reachedCounts: Record<number, number> = {};

  assessments.forEach((a: any) => {
    const areas = assessmentAreas.get(a.id);
    if (!areas || areas.size === 0) return;

    // Count reached
    areas.forEach(areaId => {
      reachedCounts[areaId] = (reachedCounts[areaId] || 0) + 1;
    });

    // If not completed, the max area is where they dropped
    if (!completedSet.has(a.id)) {
      const maxArea = Math.max(...Array.from(areas));
      dropOffCounts[maxArea] = (dropOffCounts[maxArea] || 0) + 1;
    }
  });

  return [1, 2, 3, 4].map(areaId => ({
    area_id: areaId,
    area_name: areaNames[areaId] || `Area ${areaId}`,
    reached: reachedCounts[areaId] || 0,
    dropped: dropOffCounts[areaId] || 0,
    drop_off_pct: (reachedCounts[areaId] || 0) > 0
      ? ((dropOffCounts[areaId] || 0) / (reachedCounts[areaId] || 0)) * 100
      : 0,
  }));
}

// ============================================================
// COMPLETION FUNNEL (fixed to use responses instead of events)
// ============================================================
async function getCompletionFunnel(supabase: any, filters: ReportFilters) {
  let query = supabase.from('assessments').select('id, started_at, completed_at, reference_age_months');
  if (filters.startDate) query = query.gte('started_at', filters.startDate);
  if (filters.endDate) query = query.lte('started_at', filters.endDate);
  const { data: assessments } = await query;

  const started = assessments?.length || 0;
  const completed = assessments?.filter((a: any) => a.completed_at).length || 0;

  // Use responses for engagement instead of events
  const assessmentIds = assessments?.map((a: any) => a.id) || [];
  let respondedAssessments = new Set<string>();
  if (assessmentIds.length > 0) {
    const { data: responses } = await supabase
      .from('assessment_responses')
      .select('assessment_id')
      .in('assessment_id', assessmentIds.slice(0, 500));
    responses?.forEach((r: any) => respondedAssessments.add(r.assessment_id));
  }

  return {
    started,
    answered_at_least_one: respondedAssessments.size,
    completed,
    conversion_rate: started > 0 ? (completed / started) * 100 : 0,
    engagement_rate: started > 0 ? (respondedAssessments.size / started) * 100 : 0,
  };
}

// ============================================================
// SKILL PERFORMANCE
// ============================================================
async function getSkillPerformance(supabase: any, filters: ReportFilters) {
  let query = supabase.from('assessment_responses').select('skill_id, area_id, answer, created_at');
  if (filters.startDate) query = query.gte('created_at', filters.startDate);
  if (filters.endDate) query = query.lte('created_at', filters.endDate);
  const { data: responses } = await query;

  const skillStats = new Map<number, { yes: number; no: number; total: number; area_id: number }>();
  responses?.forEach((r: any) => {
    if (!r.skill_id) return;
    if (!skillStats.has(r.skill_id)) {
      skillStats.set(r.skill_id, { yes: 0, no: 0, total: 0, area_id: r.area_id || 0 });
    }
    const stats = skillStats.get(r.skill_id)!;
    stats.total++;
    if (r.answer === 'yes') stats.yes++;
    else stats.no++;
  });

  // Fetch skill names
  const skillIds = Array.from(skillStats.keys());
  let skillNames: Record<number, string> = {};
  if (skillIds.length > 0) {
    try {
      const { data: skillLocales } = await supabase
        .from('skills_locales')
        .select('skill_id, name')
        .in('skill_id', skillIds)
        .eq('locale', 'en');
      skillLocales?.forEach((s: any) => { skillNames[s.skill_id] = s.name; });
    } catch { /* ignore */ }
  }

  return Array.from(skillStats.entries()).map(([skill_id, stats]) => ({
    skill_id,
    skill_name: skillNames[skill_id] || `Skill ${skill_id}`,
    area_id: stats.area_id,
    total_responses: stats.total,
    yes_rate: (stats.yes / stats.total) * 100,
    no_rate: (stats.no / stats.total) * 100,
  }));
}

// ============================================================
// INDIVIDUAL ASSESSMENTS (enhanced with names, age, drop point)
// ============================================================
async function getIndividualAssessments(supabase: any, filters: ReportFilters) {
  let query = supabase
    .from('assessments')
    .select('id, baby_id, started_at, completed_at, reference_age_months, babies!inner(name)')
    .order('started_at', { ascending: false });
  if (filters.startDate) query = query.gte('started_at', filters.startDate);
  if (filters.endDate) query = query.lte('started_at', filters.endDate);
  if (filters.babyId) query = query.eq('baby_id', filters.babyId);

  const { data: assessments, error: assessmentsError } = await query;
  if (assessmentsError) throw assessmentsError;
  if (!assessments || assessments.length === 0) return [];

  // Fetch all area/skill names from milestones table for resolving IDs
  const areaNames: Record<number, string> = {
    1: 'Physical', 2: 'Cognitive', 3: 'Linguistic', 4: 'Socio-emotional'
  };

  // Get skill names
  let skillNamesMap: Record<number, string> = {};
  try {
    const { data: skillLocales } = await supabase
      .from('skills_locales')
      .select('skill_id, name')
      .eq('locale', 'en');
    skillLocales?.forEach((s: any) => { skillNamesMap[s.skill_id] = s.name; });
  } catch { /* ignore */ }

  const enriched = await Promise.all(
    assessments.map(async (assessment: any) => {
      const { data: responses } = await supabase
        .from('assessment_responses')
        .select('id, skill_id, area_id')
        .eq('assessment_id', assessment.id);

      const { data: events } = await supabase
        .from('assessment_events')
        .select('event_type, milestone_id, skill_id, area_id, created_at, question_index')
        .eq('assessment_id', assessment.id)
        .order('created_at', { ascending: true });

      // Report time
      const firstReportView = events?.find((e: any) => e.event_type === 'report_view');
      let timeOnReportSeconds: number | null = null;
      if (firstReportView) {
        const reportViewTime = new Date(firstReportView.created_at).getTime();
        const eventsAfterReport = events?.filter((e: any) =>
          new Date(e.created_at).getTime() > reportViewTime
        ) || [];
        if (eventsAfterReport.length > 0) {
          const lastEventTime = new Date(eventsAfterReport[eventsAfterReport.length - 1].created_at).getTime();
          timeOnReportSeconds = Math.min(Math.floor((lastEventTime - reportViewTime) / 1000), 1800);
        } else {
          timeOnReportSeconds = 0;
        }
      }

      // Saw report / CTA clicked
      const sawReport = events?.some((e: any) => e.event_type === 'report_view') || false;
      const ctaClicked = events?.some((e: any) => e.event_type === 'cta_clicked') || false;

      const lastEvent = events && events.length > 0 ? events[events.length - 1] : null;
      const backCount = events?.filter((e: any) => e.event_type === 'back').length || 0;
      const helperCount = events?.filter((e: any) => e.event_type === 'helper_open').length || 0;
      const skipCount = events?.filter((e: any) => e.event_type === 'skip').length || 0;

      // Duration from responses
      const MAX_GAP_MS = 600000;
      let realDuration = 0;
      const { data: responseTimestamps } = await supabase
        .from('assessment_responses')
        .select('created_at')
        .eq('assessment_id', assessment.id)
        .order('created_at', { ascending: true });

      if (responseTimestamps && responseTimestamps.length > 1) {
        for (let i = 1; i < responseTimestamps.length; i++) {
          const gap = new Date(responseTimestamps[i].created_at).getTime() - new Date(responseTimestamps[i - 1].created_at).getTime();
          if (gap < MAX_GAP_MS) realDuration += gap;
        }
        realDuration += 30000;
      } else if (responseTimestamps && responseTimestamps.length === 1 && assessment.started_at) {
        realDuration = Math.min(Math.max(
          new Date(responseTimestamps[0].created_at).getTime() - new Date(assessment.started_at).getTime(), 0
        ), MAX_GAP_MS);
      }

      // Status — use last response timestamp as fallback when no events exist
      const now = new Date();
      const lastResponseTime = responseTimestamps && responseTimestamps.length > 0
        ? new Date(responseTimestamps[responseTimestamps.length - 1].created_at)
        : null;
      const lastActivity = lastEvent
        ? new Date(lastEvent.created_at)
        : (lastResponseTime || new Date(assessment.started_at));
      const minutesSince = (now.getTime() - lastActivity.getTime()) / 60000;
      let status = 'abandoned';
      if (assessment.completed_at) status = 'completed';
      else if (minutesSince < 30) status = 'in_progress';

      // Skills answered
      const skillsAnswered = new Set((responses || []).filter((r: any) => r.skill_id).map((r: any) => r.skill_id)).size;
      const totalSkills = await getSkillsCountByAgeRange(supabase, assessment.reference_age_months);

      // Resolve drop-off point: prefer events, fall back to last response
      let lastAreaId = lastEvent?.area_id || null;
      let lastSkillId = lastEvent?.skill_id || null;
      if (!lastAreaId && responses && responses.length > 0) {
        const lastResponse = responses[responses.length - 1];
        lastAreaId = lastResponse.area_id || null;
        lastSkillId = lastResponse.skill_id || null;
      }
      const dropOffAreaName = lastAreaId ? (areaNames[lastAreaId] || `Area ${lastAreaId}`) : null;
      const dropOffSkillName = lastSkillId ? (skillNamesMap[lastSkillId] || `Skill ${lastSkillId}`) : null;

      return {
        assessment_id: assessment.id,
        baby_id: assessment.baby_id,
        baby_name: assessment.babies.name,
        reference_age_months: assessment.reference_age_months,
        started_at: assessment.started_at,
        completed_at: assessment.completed_at,
        status,
        skills_answered: skillsAnswered,
        total_skills: totalSkills,
        last_milestone_id: lastEvent?.milestone_id,
        last_skill_id: lastSkillId,
        last_area_id: lastAreaId,
        drop_off_area_name: dropOffAreaName,
        drop_off_skill_name: dropOffSkillName,
        last_question_index: lastEvent?.question_index,
        duration_seconds: Math.floor(realDuration / 1000),
        back_count: backCount,
        helper_count: helperCount,
        skip_count: skipCount,
        last_activity: lastEvent?.created_at || assessment.started_at,
        time_on_report_seconds: timeOnReportSeconds,
        saw_report: sawReport,
        cta_clicked: ctaClicked,
      };
    })
  );

  return enriched;
}

// ============================================================
// AGE DISTRIBUTION
// ============================================================
async function getAgeDistribution(supabase: any, filters: ReportFilters) {
  let query = supabase.from('assessments').select('id, reference_age_months');
  if (filters.startDate) query = query.gte('created_at', filters.startDate);
  if (filters.endDate) query = query.lte('created_at', filters.endDate);
  const { data: assessments, error } = await query;
  if (error) throw error;
  if (!assessments || assessments.length === 0) {
    return { total: 0, average: 0, median: 0, min: 0, max: 0, distribution: [] };
  }

  const ages = assessments.map((a: any) => a.reference_age_months || 0).sort((a: number, b: number) => a - b);
  const total = ages.length;
  const average = ages.reduce((s: number, a: number) => s + a, 0) / total;
  const median = ages.length % 2 === 0
    ? (ages[ages.length / 2 - 1] + ages[ages.length / 2]) / 2
    : ages[Math.floor(ages.length / 2)];

  const ranges = [
    { label: '0-3 meses', min: 0, max: 3 },
    { label: '4-6 meses', min: 4, max: 6 },
    { label: '7-12 meses', min: 7, max: 12 },
    { label: '13-24 meses', min: 13, max: 24 },
    { label: '25+ meses', min: 25, max: 100 },
  ];

  const distribution = ranges.map(range => ({
    label: range.label,
    count: ages.filter((age: number) => age >= range.min && age <= range.max).length,
    percentage: (ages.filter((age: number) => age >= range.min && age <= range.max).length / total) * 100,
  }));

  return { total, average: Math.round(average * 10) / 10, median, min: ages[0], max: ages[ages.length - 1], distribution };
}

// ============================================================
// PAGE EVENTS
// ============================================================
async function getPageEvents(supabase: any, filters: ReportFilters) {
  let query = supabase.from('page_events').select('event_type, created_at');
  if (filters.startDate) query = query.gte('created_at', filters.startDate);
  if (filters.endDate) query = query.lte('created_at', filters.endDate);
  const { data: events, error } = await query;
  if (error) throw error;

  return {
    landing_start_clicks: (events || []).filter((e: any) => e.event_type === 'landing_start_clicked').length,
    profile_continue_clicks: (events || []).filter((e: any) => e.event_type === 'profile_continue_clicked').length,
  };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================
async function getSkillsCountByAgeRange(sb: any, referenceAge: number): Promise<number> {
  try {
    const { data, error } = await sb
      .from('skill_milestone')
      .select('skill_id, age')
      .gte('age', referenceAge)
      .lte('age', referenceAge + 1);
    if (error || !data || data.length === 0) return 0;
    const uniqueSkills = new Set<number>();
    data.forEach((m: any) => uniqueSkills.add(m.skill_id));
    return uniqueSkills.size;
  } catch {
    return 0;
  }
}

function getEstimatedTotalForAge(ageMonths: number): number {
  if (ageMonths <= 3) return 96;
  if (ageMonths <= 6) return 120;
  if (ageMonths <= 12) return 180;
  if (ageMonths <= 24) return 250;
  return 300;
}

// ============================================================
// META ADS DATA
// ============================================================
async function getMetaAdsData(filters: ReportFilters) {
  const token = Deno.env.get('META_ADS_ACCESS_TOKEN') || Deno.env.get('META_ACCESS_TOKEN');
  const adAccountId = Deno.env.get('META_AD_ACCOUNT_ID');
  const adsetId = Deno.env.get('META_ADSET_ID');

  if (!token || !adAccountId) {
    return { error: 'Meta API not configured', configured: false };
  }

  try {
    // Build time range
    let timeRange = '';
    if (filters.startDate && filters.endDate) {
      const start = filters.startDate.split(' ')[0];
      const end = filters.endDate.split(' ')[0];
      timeRange = `&time_range={"since":"${start}","until":"${end}"}`;
    } else {
      timeRange = '&date_preset=last_30d';
    }

    // Query ad account insights filtered by adset
    const fields = 'campaign_name,adset_name,impressions,clicks,spend,cpc,cpm,ctr,reach,frequency,actions,cost_per_action_type';
    let url = `https://graph.facebook.com/v21.0/${adAccountId}/insights?fields=${fields}${timeRange}&access_token=${token}`;
    if (adsetId) {
      url += `&filtering=[{"field":"adset.id","operator":"EQUAL","value":"${adsetId}"}]`;
    }

    const response = await fetch(url);
    const result = await response.json();

    if (result.error) {
      console.error('Meta API error:', result.error);
      return { error: result.error.message, configured: true };
    }

    const data = result.data?.[0] || {};

    // Parse actions to find link_clicks, landing_page_views
    const actions = data.actions || [];
    const costPerActions = data.cost_per_action_type || [];
    const linkClicks = actions.find((a: any) => a.action_type === 'link_click')?.value || 0;
    const landingViews = actions.find((a: any) => a.action_type === 'landing_page_view')?.value || 0;
    const costPerLinkClick = costPerActions.find((a: any) => a.action_type === 'link_click')?.value || 0;

    return {
      configured: true,
      campaign_name: data.campaign_name || '',
      adset_name: data.adset_name || '',
      impressions: parseInt(data.impressions || '0'),
      clicks: parseInt(data.clicks || '0'),
      link_clicks: parseInt(linkClicks),
      landing_page_views: parseInt(landingViews),
      reach: parseInt(data.reach || '0'),
      frequency: parseFloat(data.frequency || '0'),
      spend: parseFloat(data.spend || '0'),
      cpc: parseFloat(data.cpc || '0'),
      cpm: parseFloat(data.cpm || '0'),
      ctr: parseFloat(data.ctr || '0'),
      cost_per_link_click: parseFloat(costPerLinkClick),
    };
  } catch (err) {
    console.error('Meta API fetch error:', err);
    return { error: err instanceof Error ? err.message : 'Unknown error', configured: true };
  }
}
