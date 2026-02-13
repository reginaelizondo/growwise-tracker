import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// External Supabase client for skill_milestone table
const EXTERNAL_SUPABASE_URL = 'https://uslivvopgsrajcxxjftw.supabase.co';
const EXTERNAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzbGl2dm9wZ3NyYWpjeHhqZnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDcyMjksImV4cCI6MjA3NjgyMzIyOX0.d2E9PPtC0j5V3qDxHHw_y9Z9cQXOi2t5LWwIe9RqJhE';

const externalSupabase = createClient(
  EXTERNAL_SUPABASE_URL,
  EXTERNAL_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
    }
  }
);

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

    // Normalize dates to include proper time boundaries
    const filters = { ...rawFilters };
    // startDate should start at beginning of day (00:00:00)
    if (filters.startDate && !filters.startDate.includes(':')) {
      filters.startDate = `${filters.startDate} 00:00:00`;
    }
    // endDate should include the entire day (23:59:59)
    if (filters.endDate && !filters.endDate.includes(':')) {
      filters.endDate = `${filters.endDate} 23:59:59`;
    }

    console.log('Analytics query:', reportType, filters);

    let data;
    switch (reportType) {
      case 'drop_off_by_question':
        data = await getDropOffByQuestion(supabase, filters);
        break;
      case 'completion_funnel':
        data = await getCompletionFunnel(supabase, filters);
        break;
      case 'time_per_question':
        data = await getTimePerQuestion(supabase, filters);
        break;
      case 'skill_performance':
        data = await getSkillPerformance(supabase, filters);
        break;
      case 'conversion_funnel':
        data = await getConversionFunnel(supabase, filters);
        break;
      case 'area_progression_funnel':
        data = await getAreaProgressionFunnel(supabase, filters);
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

// Drop-off: % de usuarios que abandonan en cada pregunta
async function getDropOffByQuestion(supabase: any, filters: ReportFilters) {
  let query = supabase
    .from('assessment_events')
    .select('assessment_id, milestone_id, event_type, question_index')
    .in('event_type', ['question_view', 'exit']);

  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate);
  }

  const { data: events } = await query.order('created_at');

  const questionViews = new Map<number, Set<string>>();
  const dropOffs = new Map<number, number>();

  events?.forEach((event: any) => {
    if (event.event_type === 'question_view') {
      if (!questionViews.has(event.question_index)) {
        questionViews.set(event.question_index, new Set());
      }
      questionViews.get(event.question_index)!.add(event.assessment_id);
    } else if (event.event_type === 'exit') {
      dropOffs.set(event.question_index, (dropOffs.get(event.question_index) || 0) + 1);
    }
  });

  const result = Array.from(questionViews.entries()).map(([index, assessments]) => ({
    question_index: index,
    total_views: assessments.size,
    drop_offs: dropOffs.get(index) || 0,
    drop_off_rate: ((dropOffs.get(index) || 0) / assessments.size) * 100
  }));

  return result.sort((a, b) => b.drop_off_rate - a.drop_off_rate);
}

// Embudo de conversión
async function getCompletionFunnel(supabase: any, filters: ReportFilters) {
  let query = supabase
    .from('assessments')
    .select('id, started_at, completed_at, reference_age_months');

  if (filters.startDate) {
    query = query.gte('started_at', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('started_at', filters.endDate);
  }

  const { data: assessments } = await query;

  const started = assessments?.length || 0;
  const completed = assessments?.filter((a: any) => a.completed_at).length || 0;

  const { data: events } = await supabase
    .from('assessment_events')
    .select('assessment_id, event_type')
    .eq('event_type', 'question_view');

  const uniqueAssessments = new Set(events?.map((e: any) => e.assessment_id));
  const answeredAtLeastOne = uniqueAssessments.size;

  return {
    started,
    answered_at_least_one: answeredAtLeastOne,
    completed,
    conversion_rate: started > 0 ? (completed / started) * 100 : 0,
    engagement_rate: started > 0 ? (answeredAtLeastOne / started) * 100 : 0
  };
}

// Tiempo promedio por pregunta
async function getTimePerQuestion(supabase: any, filters: ReportFilters) {
  let query = supabase
    .from('assessment_events')
    .select('milestone_id, event_data, created_at')
    .eq('event_type', 'question_duration');

  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate);
  }

  const { data: durations } = await query;

  const timeByMilestone = new Map<number, number[]>();

  durations?.forEach((d: any) => {
    if (!timeByMilestone.has(d.milestone_id)) {
      timeByMilestone.set(d.milestone_id, []);
    }
    timeByMilestone.get(d.milestone_id)!.push(d.event_data.duration_ms);
  });

  return Array.from(timeByMilestone.entries()).map(([milestone_id, times]) => {
    const sorted = times.sort((a, b) => a - b);
    return {
      milestone_id,
      avg_duration_seconds: (times.reduce((a, b) => a + b, 0) / times.length) / 1000,
      median_duration_seconds: sorted[Math.floor(sorted.length / 2)] / 1000,
      sample_size: times.length
    };
  });
}

// Performance por skill
async function getSkillPerformance(supabase: any, filters: ReportFilters) {
  let query = supabase
    .from('assessment_responses')
    .select('skill_id, area_id, answer, created_at');

  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate);
  }

  const { data: responses } = await query;

  const skillStats = new Map<number, { yes: number; no: number; total: number }>();

  responses?.forEach((r: any) => {
    if (!r.skill_id) return;
    if (!skillStats.has(r.skill_id)) {
      skillStats.set(r.skill_id, { yes: 0, no: 0, total: 0 });
    }
    const stats = skillStats.get(r.skill_id)!;
    stats.total++;
    if (r.answer === 'yes') stats.yes++;
    else stats.no++;
  });

  return Array.from(skillStats.entries()).map(([skill_id, stats]) => ({
    skill_id,
    total_responses: stats.total,
    yes_rate: (stats.yes / stats.total) * 100,
    no_rate: (stats.no / stats.total) * 100
  }));
}

// getConversionFunnel: Returns real conversion funnel stages
async function getConversionFunnel(supabase: any, filters: ReportFilters) {
  // Get all assessments
  let assessmentsQuery = supabase
    .from('assessments')
    .select('id, created_at, completed_at, reference_age_months');

  if (filters.startDate) assessmentsQuery = assessmentsQuery.gte('created_at', filters.startDate);
  if (filters.endDate) assessmentsQuery = assessmentsQuery.lte('created_at', filters.endDate);
  if (filters.babyId) assessmentsQuery = assessmentsQuery.eq('baby_id', filters.babyId);

  const { data: assessments, error: assessmentsError } = await assessmentsQuery;
  if (assessmentsError) throw assessmentsError;

  const totalStarted = assessments?.length || 0;
  
  if (totalStarted === 0) {
    return {
      started: 0,
      engaged: 0,
      halfway: 0,
      completed: 0,
      engagement_rate: 0,
      halfway_rate: 0,
      completion_rate: 0
    };
  }
  
  // Get responses for ALL assessments in one query with proper filtering
  let responsesQuery = supabase
    .from('assessment_responses')
    .select('assessment_id, milestone_id');

  if (filters.startDate || filters.endDate) {
    // Filter responses by joining with assessments
    const assessmentIds = assessments?.map((a: any) => a.id) || [];
    if (assessmentIds.length > 0) {
      responsesQuery = responsesQuery.in('assessment_id', assessmentIds);
    }
  }

  const { data: responses, error: responsesError } = await responsesQuery;
  if (responsesError) throw responsesError;

  // Group responses by assessment - count UNIQUE milestones per assessment
  const responsesPerAssessment = new Map<string, Set<number>>();
  responses?.forEach((r: any) => {
    if (!responsesPerAssessment.has(r.assessment_id)) {
      responsesPerAssessment.set(r.assessment_id, new Set());
    }
    responsesPerAssessment.get(r.assessment_id)!.add(r.milestone_id);
  });

  // Calculate stages
  let engaged = 0; // answered at least 1 question
  let halfway = 0; // >= 50% completed
  let completed = 0; // completed_at is not null

  assessments?.forEach((assessment: any) => {
    const uniqueAnswers = responsesPerAssessment.get(assessment.id)?.size || 0;
    const estimatedTotal = getEstimatedTotalForAge(assessment.reference_age_months || 0);
    
    if (uniqueAnswers >= 1) {
      engaged++;
    }
    
    if (uniqueAnswers >= estimatedTotal * 0.5) {
      halfway++;
    }
    
    if (assessment.completed_at) {
      completed++;
    }
  });

  return {
    started: totalStarted,
    engaged,
    halfway,
    completed,
    engagement_rate: totalStarted > 0 ? (engaged / totalStarted) * 100 : 0,
    halfway_rate: totalStarted > 0 ? (halfway / totalStarted) * 100 : 0,
    completion_rate: totalStarted > 0 ? (completed / totalStarted) * 100 : 0
  };
}

// Area Progression Funnel - tracking progression through areas
async function getAreaProgressionFunnel(supabase: any, filters: ReportFilters) {
  console.log('Analytics query: area_progression_funnel', filters);

  // 1. Get all assessments in date range
  let assessmentsQuery = supabase
    .from('assessments')
    .select('id, completed_at');
  
  if (filters.startDate) assessmentsQuery = assessmentsQuery.gte('created_at', filters.startDate);
  if (filters.endDate) assessmentsQuery = assessmentsQuery.lte('created_at', filters.endDate);
  
  const { data: assessments, error: assessmentsError } = await assessmentsQuery;
  if (assessmentsError) throw assessmentsError;

  const totalCreated = assessments?.length || 0;

  if (totalCreated === 0) {
    return {
      created: 0,
      started_quiz: 0,
      physical: 0,
      cognitive: 0,
      linguistic: 0,
      socioemotional: 0,
      completed: 0,
      start_rate: 0,
      physical_rate: 0,
      cognitive_rate: 0,
      linguistic_rate: 0,
      socioemotional_rate: 0,
      completion_rate: 0
    };
  }

  // 2. Get all responses - fetch ALL rows (default limit is 1000)
  const assessmentIds = assessments?.map((a: any) => a.id) || [];
  
  // Fetch responses in batches to avoid the 1000 row limit
  let allResponses: any[] = [];
  if (assessmentIds.length > 0) {
    const batchSize = 1000;
    let offset = 0;
    let hasMore = true;
    
    while (hasMore) {
      const { data: batchResponses, error: responsesError } = await supabase
        .from('assessment_responses')
        .select('assessment_id, area_id')
        .in('assessment_id', assessmentIds)
        .range(offset, offset + batchSize - 1);
      
      if (responsesError) throw responsesError;
      
      if (batchResponses && batchResponses.length > 0) {
        allResponses = allResponses.concat(batchResponses);
        offset += batchSize;
        hasMore = batchResponses.length === batchSize;
      } else {
        hasMore = false;
      }
    }
  }
  
  const responses = allResponses;

  // 3. Count assessments that reached each stage
  const assessmentAreas = new Map<string, Set<number>>();
  
  responses?.forEach((r: any) => {
    if (!assessmentAreas.has(r.assessment_id)) {
      assessmentAreas.set(r.assessment_id, new Set());
    }
    assessmentAreas.get(r.assessment_id)!.add(r.area_id);
  });

  let startedQuiz = 0;
  let reachedPhysical = 0;
  let reachedCognitive = 0;
  let reachedLinguistic = 0;
  let reachedSocioemotional = 0;
  let completed = 0;

  assessments?.forEach((assessment: any) => {
    const areas = assessmentAreas.get(assessment.id);
    
    if (areas && areas.size > 0) {
      startedQuiz++;
      
      if (areas.has(1)) reachedPhysical++;
      if (areas.has(2)) reachedCognitive++;
      if (areas.has(3)) reachedLinguistic++;
      if (areas.has(4)) reachedSocioemotional++;
    }

    if (assessment.completed_at) {
      completed++;
    }
  });

  return {
    created: totalCreated,
    started_quiz: startedQuiz,
    physical: reachedPhysical,
    cognitive: reachedCognitive,
    linguistic: reachedLinguistic,
    socioemotional: reachedSocioemotional,
    completed: completed,
    start_rate: (startedQuiz / totalCreated) * 100,
    physical_rate: (reachedPhysical / totalCreated) * 100,
    cognitive_rate: (reachedCognitive / totalCreated) * 100,
    linguistic_rate: (reachedLinguistic / totalCreated) * 100,
    socioemotional_rate: (reachedSocioemotional / totalCreated) * 100,
    completion_rate: (completed / totalCreated) * 100
  };
}

// Get total skills count for a given age using current age to +1 month range from external Supabase
// All areas use current age to +1 month range only
async function getSkillsCountByAgeRange(referenceAge: number): Promise<number> {
  const minAge = referenceAge;
  const maxAge = referenceAge + 1;
  
  try {
    const { data, error } = await externalSupabase
      .from('skill_milestone')
      .select('skill_id, age')
      .gte('age', minAge)
      .lte('age', maxAge);
    
    if (error) {
      console.error('Error fetching skills from external DB:', error);
      return 0;
    }
    
    if (!data || data.length === 0) {
      console.warn(`No skills found for age range ${minAge}-${maxAge}`);
      return 0;
    }
    
    // Count unique skills
    const uniqueSkills = new Set<number>();
    data.forEach((m: any) => {
      uniqueSkills.add(m.skill_id);
    });
    
    const count = uniqueSkills.size;
    console.log(`Skills for age ${referenceAge} (+1 month only, range ${minAge}-${maxAge}): ${count}`);
    
    return count;
  } catch (err) {
    console.error('Exception fetching skills:', err);
    return 0;
  }
}

// Get max skills per age from all assessments (completed or observed)
async function getMaxSkillsPerAge(supabase: any): Promise<Map<number, number>> {
  // 1. Get ALL assessments with their age (simple query, no joins)
  const { data: assessments } = await supabase
    .from('assessments')
    .select('id, reference_age_months');
  
  // Create map: assessment_id -> age
  const assessmentAges = new Map<string, number>();
  assessments?.forEach((a: any) => {
    assessmentAges.set(a.id, a.reference_age_months);
  });
  
  // 2. Get skills from responses (NO nested join)
  const { data: responsesData } = await supabase
    .from('assessment_responses')
    .select('assessment_id, skill_id')
    .not('skill_id', 'is', null);
  
  // 3. Get skills from events (NO nested join)
  const { data: eventsData } = await supabase
    .from('assessment_events')
    .select('assessment_id, skill_id')
    .eq('event_type', 'question_view')
    .not('skill_id', 'is', null);
  
  // 4. Build map manually in JavaScript: age -> assessment_id -> Set<skill_id>
  const skillsByAgeByAssessment = new Map<number, Map<string, Set<number>>>();
  
  const processRecord = (record: any) => {
    const age = assessmentAges.get(record.assessment_id);
    if (age === undefined) return; // Skip if we don't find the age
    
    if (!skillsByAgeByAssessment.has(age)) {
      skillsByAgeByAssessment.set(age, new Map());
    }
    if (!skillsByAgeByAssessment.get(age)!.has(record.assessment_id)) {
      skillsByAgeByAssessment.get(age)!.set(record.assessment_id, new Set());
    }
    skillsByAgeByAssessment.get(age)!.get(record.assessment_id)!.add(record.skill_id);
  };
  
  responsesData?.forEach(processRecord);
  eventsData?.forEach(processRecord);
  
  // 5. Calculate maximum skills per age
  const maxSkillsByAge = new Map<number, number>();
  
  for (const [age, assessmentsMap] of skillsByAgeByAssessment.entries()) {
    let maxSkills = 0;
    for (const skillSet of assessmentsMap.values()) {
      maxSkills = Math.max(maxSkills, skillSet.size);
    }
    maxSkillsByAge.set(age, maxSkills);
  }
  
  console.log('Max skills by age:', Array.from(maxSkillsByAge.entries()));
  
  return maxSkillsByAge;
}

// Individual assessments con métricas de comportamiento
async function getIndividualAssessments(supabase: any, filters: ReportFilters) {
  // Query principal: assessments con baby info
  let query = supabase
    .from('assessments')
    .select(`
      id,
      baby_id,
      started_at,
      completed_at,
      reference_age_months,
      babies!inner(name)
    `)
    .order('started_at', { ascending: false });

  if (filters.startDate) query = query.gte('started_at', filters.startDate);
  if (filters.endDate) query = query.lte('started_at', filters.endDate);
  if (filters.babyId) query = query.eq('baby_id', filters.babyId);

  const { data: assessments, error: assessmentsError } = await query;

  if (assessmentsError) throw assessmentsError;
  if (!assessments || assessments.length === 0) return [];

  // Para cada assessment, obtener métricas
  const enriched = await Promise.all(
    assessments.map(async (assessment: any) => {
      // Respuestas totales
      const { data: responses } = await supabase
        .from('assessment_responses')
        .select('id')
        .eq('assessment_id', assessment.id);

      // Eventos de comportamiento
      const { data: events } = await supabase
        .from('assessment_events')
        .select('event_type, milestone_id, skill_id, area_id, created_at, question_index')
        .eq('assessment_id', assessment.id)
        .order('created_at', { ascending: true });

      // Calcular tiempo en página de reporte
      const firstReportView = events?.find((e: any) => e.event_type === 'report_view');
      
      // Calcular tiempo en reporte: solo considerar eventos DESPUÉS del report_view
      let timeOnReportSeconds = null; // null = no vio reporte, 0+ = tiempo en reporte
      if (firstReportView) {
        const reportViewTime = new Date(firstReportView.created_at).getTime();
        // Buscar eventos después del report_view
        const eventsAfterReport = events?.filter((e: any) => 
          new Date(e.created_at).getTime() > reportViewTime
        ) || [];
        
        if (eventsAfterReport.length > 0) {
          const lastEventAfterReport = eventsAfterReport[eventsAfterReport.length - 1];
          const lastEventTime = new Date(lastEventAfterReport.created_at).getTime();
          timeOnReportSeconds = Math.floor((lastEventTime - reportViewTime) / 1000);
          // Cap de 30 minutos máximo en reporte
          timeOnReportSeconds = Math.min(timeOnReportSeconds, 1800);
        } else {
          // El report_view es el último evento
          timeOnReportSeconds = 0;
        }
      }

      // Último evento visto (el más reciente)
      const lastEventForPosition = events && events.length > 0 ? events[events.length - 1] : null;
      
      // Contar eventos por tipo
      const backCount = events?.filter((e: any) => e.event_type === 'back').length || 0;
      const helperCount = events?.filter((e: any) => e.event_type === 'helper_open').length || 0;
      const skipCount = events?.filter((e: any) => e.event_type === 'skip').length || 0;

      // Calcular duración real usando responses - suma solo tiempo activo
      // Ignora gaps mayores a 10 minutos (pausas/abandonos temporales)
      const MAX_GAP_MS = 600000; // 10 minutos máximo entre respuestas consecutivas
      const lastEventTime = events && events.length > 0 ? events[events.length - 1] : null;
      let realDuration = 0;
      
      // Siempre usar responses para calcular tiempo activo real
      const { data: responseTimestamps } = await supabase
        .from('assessment_responses')
        .select('created_at')
        .eq('assessment_id', assessment.id)
        .order('created_at', { ascending: true });
      
      if (responseTimestamps && responseTimestamps.length > 1) {
        // Sumar solo el tiempo entre respuestas consecutivas, ignorando gaps grandes
        for (let i = 1; i < responseTimestamps.length; i++) {
          const prevTime = new Date(responseTimestamps[i - 1].created_at).getTime();
          const currTime = new Date(responseTimestamps[i].created_at).getTime();
          const gap = currTime - prevTime;
          
          // Solo contar si el gap es menor a 10 minutos (sesión activa)
          if (gap < MAX_GAP_MS) {
            realDuration += gap;
          }
        }
        // Añadir 30 segundos estimados para la última respuesta
        realDuration += 30000;
      } else if (responseTimestamps && responseTimestamps.length === 1 && assessment.started_at) {
        // Una sola respuesta: usar tiempo desde started_at
        realDuration = new Date(responseTimestamps[0].created_at).getTime() - 
                       new Date(assessment.started_at).getTime();
        realDuration = Math.min(Math.max(realDuration, 0), MAX_GAP_MS);
      }

      // Determinar status
      const now = new Date();
      const lastActivity = lastEventTime ? new Date(lastEventTime.created_at) : new Date(assessment.started_at);
      const minutesSinceLastActivity = (now.getTime() - lastActivity.getTime()) / 1000 / 60;
      
      let status = 'abandoned';
      if (assessment.completed_at) {
        status = 'completed';
      } else if (minutesSinceLastActivity < 30) {
        status = 'in_progress';
      }

      // Contar skills únicos respondidos
      const { data: responsesWithSkill } = await supabase
        .from('assessment_responses')
        .select('skill_id')
        .eq('assessment_id', assessment.id)
        .not('skill_id', 'is', null);
      
      const skillsAnswered = new Set(
        (responsesWithSkill || []).map((r: any) => r.skill_id)
      ).size;
      
      // SIEMPRE usar el total teórico de skills para esa edad (no lo que el usuario vio)
      // Esto asegura que progreso = skills_respondidos / skills_esperados_para_esa_edad
      const totalSkills = await getSkillsCountByAgeRange(assessment.reference_age_months);

      return {
        assessment_id: assessment.id,
        baby_id: assessment.baby_id,
        baby_name: assessment.babies.name,
        started_at: assessment.started_at,
        completed_at: assessment.completed_at,
        status,
        skills_answered: skillsAnswered,
        total_skills: totalSkills,
        last_milestone_id: lastEventForPosition?.milestone_id,
        last_skill_id: lastEventForPosition?.skill_id,
        last_area_id: lastEventForPosition?.area_id,
        last_question_index: lastEventForPosition?.question_index,
        duration_seconds: Math.floor(realDuration / 1000),
        back_count: backCount,
        helper_count: helperCount,
        skip_count: skipCount,
        last_activity: lastEventTime?.created_at || assessment.started_at,
        time_on_report_seconds: timeOnReportSeconds
      };
    })
  );

  return enriched;
}

// Función auxiliar para estimar total de milestones por edad
function getEstimatedTotalForAge(ageMonths: number): number {
  // Estimados basados en datos reales de la aplicación
  if (ageMonths <= 3) return 96;
  if (ageMonths <= 6) return 120;
  if (ageMonths <= 12) return 180;
  if (ageMonths <= 24) return 250;
  return 300; // Para mayores de 24 meses
}

// Age distribution analysis
async function getAgeDistribution(supabase: any, filters: ReportFilters) {
  let query = supabase
    .from('assessments')
    .select('id, reference_age_months');

  if (filters.startDate) query = query.gte('created_at', filters.startDate);
  if (filters.endDate) query = query.lte('created_at', filters.endDate);

  const { data: assessments, error } = await query;
  if (error) throw error;

  if (!assessments || assessments.length === 0) {
    return {
      total: 0,
      average: 0,
      median: 0,
      min: 0,
      max: 0,
      distribution: []
    };
  }

  const ages = assessments.map((a: any) => a.reference_age_months || 0).sort((a: number, b: number) => a - b);
  
  // Calculate statistics
  const total = ages.length;
  const average = ages.reduce((sum: number, age: number) => sum + age, 0) / total;
  const median = ages.length % 2 === 0 
    ? (ages[ages.length / 2 - 1] + ages[ages.length / 2]) / 2 
    : ages[Math.floor(ages.length / 2)];
  const min = ages[0];
  const max = ages[ages.length - 1];

  // Create distribution by age ranges
  const ranges = [
    { label: '0-3 meses', min: 0, max: 3 },
    { label: '4-6 meses', min: 4, max: 6 },
    { label: '7-12 meses', min: 7, max: 12 },
    { label: '13-24 meses', min: 13, max: 24 },
    { label: '25+ meses', min: 25, max: 100 }
  ];

  const distribution = ranges.map(range => ({
    label: range.label,
    count: ages.filter((age: number) => age >= range.min && age <= range.max).length,
    percentage: (ages.filter((age: number) => age >= range.min && age <= range.max).length / total) * 100
  }));

  console.log('Age distribution:', { total, average, median, min, max });

  return {
    total,
    average: Math.round(average * 10) / 10,
    median,
    min,
    max,
    distribution
  };
}

// Page events: Count clicks on landing and profile buttons
async function getPageEvents(supabase: any, filters: ReportFilters) {
  let query = supabase
    .from('page_events')
    .select('event_type, created_at');

  if (filters.startDate) query = query.gte('created_at', filters.startDate);
  if (filters.endDate) query = query.lte('created_at', filters.endDate);

  const { data: events, error } = await query;
  if (error) throw error;

  const landingClicks = (events || []).filter((e: any) => e.event_type === 'landing_start_clicked').length;
  const profileClicks = (events || []).filter((e: any) => e.event_type === 'profile_continue_clicked').length;

  console.log('Page events:', { landingClicks, profileClicks });

  return {
    landing_start_clicks: landingClicks,
    profile_continue_clicks: profileClicks
  };
}
