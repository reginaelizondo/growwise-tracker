import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Clock, MousePointer, Download, AlertTriangle, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { externalSupabase } from '@/integrations/supabase/external-client';
import { format } from 'date-fns';

interface AssessmentBreakdownDialogProps {
  assessmentId: string | null;
  babyName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AreaBreakdown {
  area_id: number;
  area_name: string;
  skills: {
    skill_id: number;
    skill_name: string;
    total_questions: number;
    answered: number;
    mastered: number;
    completed: boolean;
  }[];
  total_questions: number;
  answered: number;
  completion_percentage: number;
  reached: boolean;
  abandoned: boolean;
}

interface LastActivity {
  event_type: string;
  area_id: number | null;
  skill_id: number | null;
  milestone_id: number | null;
  question_index: number | null;
  created_at: string;
}

interface ReportActions {
  downloaded: boolean;
  ctaClicked: boolean;
  kineduDownloadClicked: boolean;
}

interface LastResponse {
  area_id: number | null;
  skill_id: number | null;
  milestone_id: number | null;
  answer: string;
  created_at: string;
}

interface LastView {
  type: 'question' | 'report';
  event_type: string;
  area_id: number | null;
  skill_id: number | null;
  milestone_id: number | null;
  question_index: number | null;
  created_at: string;
}

interface AbandonmentInfo {
  isAbandoned: boolean;
  completedAt: string | null;
  abandonedArea: string | null;
  abandonedSkill: string | null;
  lastQuestionIndex: number | null;
  totalDuration: string | null;
  totalResponses: number;
  sawReport: boolean;
  sawUnlockReport: boolean;
  // New fields for remaining questions
  totalExpectedMilestones: number;
  remainingMilestones: number;
  totalExpectedSkills: number;
  skillsAnswered: number;
  remainingSkills: number;
}

interface TimingMetrics {
  avgTimePerQuestion: number | null;  // en ms
  totalAssessmentTime: number | null; // en ms
  timeOnReportPage: number | null;    // en ms
  totalQuestions: number;
  firstReportViewAt: string | null;
  lastEventAt: string | null;
}

export function AssessmentBreakdownDialog({ 
  assessmentId, 
  babyName,
  open, 
  onOpenChange 
}: AssessmentBreakdownDialogProps) {
  const [loading, setLoading] = useState(true);
  const [areaBreakdown, setAreaBreakdown] = useState<AreaBreakdown[]>([]);
  const [lastActivity, setLastActivity] = useState<LastActivity | null>(null);
  const [reportActions, setReportActions] = useState<ReportActions>({ 
    downloaded: false, 
    ctaClicked: false,
    kineduDownloadClicked: false
  });
  const [lastResponse, setLastResponse] = useState<LastResponse | null>(null);
  const [lastView, setLastView] = useState<LastView | null>(null);
  const [abandonmentInfo, setAbandonmentInfo] = useState<AbandonmentInfo | null>(null);
  const [timingMetrics, setTimingMetrics] = useState<TimingMetrics | null>(null);

  const areaNames: Record<number, string> = {
    1: 'Physical',
    2: 'Cognitive', 
    3: 'Linguistic',
    4: 'Socio-Emotional'
  };

  const areaColors: Record<number, string> = {
    1: 'bg-blue-500',
    2: 'bg-green-500',
    3: 'bg-orange-500',
    4: 'bg-pink-500'
  };

  useEffect(() => {
    if (open && assessmentId) {
      loadBreakdown();
    }
  }, [open, assessmentId]);

  const loadBreakdown = async () => {
    if (!assessmentId) return;
    
    setLoading(true);
    try {
      // Fetch assessment details for completion status
      const { data: assessmentData } = await supabase
        .from('assessments')
        .select('completed_at, started_at, reference_age_months')
        .eq('id', assessmentId)
        .maybeSingle();

      // Fetch total expected milestones for this age
      let totalExpectedMilestones = 0;
      let totalExpectedSkills = 0;
      if (assessmentData?.reference_age_months !== undefined) {
        const { data: milestonesForAge } = await supabase
          .from('milestones')
          .select('milestone_id, skill_id')
          .lte('age', assessmentData.reference_age_months)
          .eq('locale', 'en');
        
        if (milestonesForAge) {
          totalExpectedMilestones = milestonesForAge.length;
          const uniqueSkills = new Set(milestonesForAge.map(m => m.skill_id));
          totalExpectedSkills = uniqueSkills.size;
        }
      }

      // Fetch responses grouped by area and skill, ordered by time to detect response order
      const { data: responses, error: responsesError } = await supabase
        .from('assessment_responses')
        .select('area_id, skill_id, milestone_id, answer, created_at')
        .eq('assessment_id', assessmentId)
        .order('created_at', { ascending: true });

      if (responsesError) throw responsesError;

      // Fetch events to get last activity
      const { data: events, error: eventsError } = await supabase
        .from('assessment_events')
        .select('event_type, area_id, skill_id, milestone_id, question_index, created_at')
        .eq('assessment_id', assessmentId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (eventsError) throw eventsError;

      if (events && events.length > 0) {
        setLastActivity(events[0]);
      }

      // Fetch all events for timing calculations and report actions
      const { data: allEvents } = await supabase
        .from('assessment_events')
        .select('event_type, event_data, created_at')
        .eq('assessment_id', assessmentId)
        .order('created_at', { ascending: true });

      const downloaded = allEvents?.some(e => e.event_type === 'report_downloaded') || false;
      const ctaClicked = allEvents?.some(e => e.event_type === 'cta_clicked') || false;
      const kineduDownloadClicked = allEvents?.some(e => e.event_type === 'kinedu_download_clicked') || false;
      
      setReportActions({ downloaded, ctaClicked, kineduDownloadClicked });

      // Calculate timing metrics
      // 1. Average time per question from answer events
      const answerEvents = allEvents?.filter(e => {
        if (e.event_type !== 'answer' || !e.event_data) return false;
        const data = e.event_data as any;
        return typeof data.time_to_answer_ms === 'number';
      }) || [];

      const avgTimePerQuestion = answerEvents.length > 0
        ? answerEvents.reduce((sum, e) => {
            const data = e.event_data as any;
            return sum + (data.time_to_answer_ms || 0);
          }, 0) / answerEvents.length
        : null;

      // 2. Time on report page (from first report_view to last event)
      const firstReportView = allEvents?.find(e => e.event_type === 'report_view');
      const lastEvent = allEvents && allEvents.length > 0 ? allEvents[allEvents.length - 1] : null;

      let timeOnReportPage: number | null = null;
      if (firstReportView && lastEvent) {
        const reportViewTime = new Date(firstReportView.created_at).getTime();
        const lastEventTime = new Date(lastEvent.created_at).getTime();
        if (lastEventTime > reportViewTime) {
          timeOnReportPage = lastEventTime - reportViewTime;
        }
      }

      // 3. Total assessment time (from started_at to last answer, not including report views)
      const lastAnswerEvent = [...(allEvents || [])].reverse().find(e => e.event_type === 'answer');
      
      let totalAssessmentTime: number | null = null;
      if (assessmentData?.started_at && lastAnswerEvent) {
        const startTime = new Date(assessmentData.started_at).getTime();
        const endTime = new Date(lastAnswerEvent.created_at).getTime();
        totalAssessmentTime = endTime - startTime;
      }

      setTimingMetrics({
        avgTimePerQuestion,
        totalAssessmentTime,
        timeOnReportPage,
        totalQuestions: answerEvents.length,
        firstReportViewAt: firstReportView?.created_at || null,
        lastEventAt: lastEvent?.created_at || null
      });

      // Fetch última respuesta (answer event)
      const { data: lastAnswerData } = await supabase
        .from('assessment_responses')
        .select('area_id, skill_id, milestone_id, answer, created_at')
        .eq('assessment_id', assessmentId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (lastAnswerData && lastAnswerData.length > 0) {
        setLastResponse(lastAnswerData[0]);
      }

      // Fetch última vista (question_view or report_view event)
      const { data: lastViewData } = await supabase
        .from('assessment_events')
        .select('event_type, area_id, skill_id, milestone_id, question_index, created_at')
        .eq('assessment_id', assessmentId)
        .in('event_type', ['question_view', 'report_view'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (lastViewData && lastViewData.length > 0) {
        const view = lastViewData[0];
        setLastView({
          type: view.event_type === 'report_view' ? 'report' : 'question',
          event_type: view.event_type,
          area_id: view.area_id,
          skill_id: view.skill_id,
          milestone_id: view.milestone_id,
          question_index: view.question_index,
          created_at: view.created_at
        });
      }

      // Fetch all milestones to get skill names
      const skillIds = [...new Set(responses?.map(r => r.skill_id).filter(Boolean) as number[])];
      const { data: skillsData } = await externalSupabase
        .from('milestones')
        .select('skill_id, skill_name, area_id, area_name')
        .in('skill_id', skillIds);

      // Build skill name map
      const skillNameMap = new Map<number, string>();
      const areaIdMap = new Map<number, number>();
      skillsData?.forEach(s => {
        skillNameMap.set(s.skill_id, s.skill_name);
        areaIdMap.set(s.skill_id, s.area_id);
      });

      // Group responses by area and skill
      const areaMap = new Map<number, AreaBreakdown>();
      // Track first response timestamp per area to sort by actual response order
      const firstResponseByArea = new Map<number, Date>();

      responses?.forEach(response => {
        const areaId = response.area_id || areaIdMap.get(response.skill_id!) || 0;
        const skillId = response.skill_id || 0;

        // Track first response time per area
        if (!firstResponseByArea.has(areaId) && response.created_at) {
          firstResponseByArea.set(areaId, new Date(response.created_at));
        }

        if (!areaMap.has(areaId)) {
          areaMap.set(areaId, {
            area_id: areaId,
            area_name: areaNames[areaId] || `Area ${areaId}`,
            skills: [],
            total_questions: 0,
            answered: 0,
            completion_percentage: 0,
            reached: true,
            abandoned: false
          });
        }

        const area = areaMap.get(areaId)!;
        let skill = area.skills.find(s => s.skill_id === skillId);

        if (!skill) {
          skill = {
            skill_id: skillId,
            skill_name: skillNameMap.get(skillId) || `Skill ${skillId}`,
            total_questions: 0,
            answered: 0,
            mastered: 0,
            completed: false
          };
          area.skills.push(skill);
        }

        skill.total_questions++;
        area.total_questions++;

        if (response.answer) {
          skill.answered++;
          area.answered++;
          if (response.answer === 'yes') {
            skill.mastered++;
          }
        }
      });

      // Calculate completion percentages and check if completed
      areaMap.forEach(area => {
        area.completion_percentage = area.total_questions > 0 
          ? (area.answered / area.total_questions) * 100 
          : 0;
        
        area.skills.forEach(skill => {
          skill.completed = skill.answered === skill.total_questions;
        });
      });

      // Determine abandonment
      // Sort areas by the order they were actually answered (first response timestamp)
      const sortedAreas = Array.from(areaMap.values()).sort((a, b) => {
        const aTime = firstResponseByArea.get(a.area_id)?.getTime() || 0;
        const bTime = firstResponseByArea.get(b.area_id)?.getTime() || 0;
        return aTime - bTime;
      });
      let foundIncomplete = false;
      let abandonedAreaName: string | null = null;
      let abandonedSkillName: string | null = null;

      sortedAreas.forEach((area, index) => {
        if (area.completion_percentage < 100 && !foundIncomplete) {
          area.abandoned = true;
          foundIncomplete = true;
          abandonedAreaName = area.area_name;
          // Find the incomplete skill
          const incompleteSkill = area.skills.find(s => !s.completed);
          if (incompleteSkill) {
            abandonedSkillName = incompleteSkill.skill_name;
          }
        }
        if (index > 0 && sortedAreas[index - 1].completion_percentage < 100) {
          area.reached = false;
        }
      });

      // Calculate total duration
      let totalDuration: string | null = null;
      if (assessmentData?.started_at && events && events.length > 0) {
        const startTime = new Date(assessmentData.started_at).getTime();
        const endTime = new Date(events[0].created_at).getTime();
        const durationMs = endTime - startTime;
        const minutes = Math.floor(durationMs / 60000);
        const seconds = Math.floor((durationMs % 60000) / 1000);
        totalDuration = `${minutes}m ${seconds}s`;
      }

      // Check if saw unlock report and report
      const sawUnlockReport = allEvents?.some(e => e.event_type === 'unlock_report_view') || false;
      const sawReport = allEvents?.some(e => e.event_type === 'report_view') || false;

      // Calculate skills answered
      const uniqueSkillsAnswered = new Set(responses?.map(r => r.skill_id).filter(Boolean));
      const skillsAnswered = uniqueSkillsAnswered.size;
      const remainingSkills = Math.max(0, totalExpectedSkills - skillsAnswered);
      const remainingMilestones = Math.max(0, totalExpectedMilestones - (responses?.length || 0));

      // Set abandonment info
      const isAbandoned = !assessmentData?.completed_at;
      setAbandonmentInfo({
        isAbandoned,
        completedAt: assessmentData?.completed_at || null,
        abandonedArea: isAbandoned ? abandonedAreaName : null,
        abandonedSkill: isAbandoned ? abandonedSkillName : null,
        lastQuestionIndex: events?.[0]?.question_index ?? null,
        totalDuration,
        totalResponses: responses?.length || 0,
        sawReport,
        sawUnlockReport,
        totalExpectedMilestones,
        remainingMilestones,
        totalExpectedSkills,
        skillsAnswered,
        remainingSkills
      });

      setAreaBreakdown(sortedAreas);
    } catch (error) {
      console.error('Error loading breakdown:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (ms: number | null): string => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes === 0) return `${seconds}s`;
    return `${minutes}m ${seconds % 60}s`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Desglose del Assessment - {babyName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Abandonment Status Banner */}
            {abandonmentInfo && (
              <Card className={`p-4 ${abandonmentInfo.isAbandoned ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-300'}`}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${abandonmentInfo.isAbandoned ? 'bg-red-100' : 'bg-green-100'}`}>
                    {abandonmentInfo.isAbandoned ? (
                      <XCircle className="h-6 w-6 text-red-600" />
                    ) : (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold text-lg ${abandonmentInfo.isAbandoned ? 'text-red-700' : 'text-green-700'}`}>
                      {abandonmentInfo.isAbandoned ? '⚠️ Assessment Abandonado' : '✓ Assessment Completado'}
                    </h3>
                    <div className="text-sm mt-1 space-y-1">
                      {abandonmentInfo.isAbandoned ? (
                        <>
                          <p className="text-red-600">
                            <strong>Punto de abandono:</strong> {abandonmentInfo.abandonedArea || 'N/A'} 
                            {abandonmentInfo.abandonedSkill && ` → ${abandonmentInfo.abandonedSkill}`}
                          </p>
                          {abandonmentInfo.lastQuestionIndex !== null && (
                            <p className="text-red-600"><strong>Última pregunta vista:</strong> #{abandonmentInfo.lastQuestionIndex + 1}</p>
                          )}
                        </>
                      ) : (
                        <p className="text-green-600">
                          <strong>Completado:</strong> {abandonmentInfo.completedAt ? format(new Date(abandonmentInfo.completedAt), 'MMM dd, yyyy HH:mm') : 'Sí'}
                        </p>
                      )}
                      <div className="flex gap-4 pt-1">
                        <span className="text-muted-foreground"><strong>Duración:</strong> {abandonmentInfo.totalDuration || 'N/A'}</span>
                        <span className="text-muted-foreground"><strong>Respuestas:</strong> {abandonmentInfo.totalResponses}/{abandonmentInfo.totalExpectedMilestones}</span>
                        <span className={abandonmentInfo.sawUnlockReport ? 'text-green-600' : 'text-red-600'}>
                          <strong>Vio unlock:</strong> {abandonmentInfo.sawUnlockReport ? '✓ Sí' : '✗ No'}
                        </span>
                        <span className={abandonmentInfo.sawReport ? 'text-green-600' : 'text-red-600'}>
                          <strong>Vio reporte:</strong> {abandonmentInfo.sawReport ? '✓ Sí' : '✗ No'}
                        </span>
                      </div>
                      {abandonmentInfo.isAbandoned && (
                        <div className="flex gap-4 pt-1 border-t mt-2 pt-2">
                          <span className="text-orange-600">
                            <strong>Skills faltantes:</strong> {abandonmentInfo.remainingSkills} de {abandonmentInfo.totalExpectedSkills} ({abandonmentInfo.skillsAnswered} completados)
                          </span>
                          <span className="text-orange-600">
                            <strong>Preguntas faltantes:</strong> {abandonmentInfo.remainingMilestones} de {abandonmentInfo.totalExpectedMilestones}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Timing Metrics */}
            {timingMetrics && (
              <Card className="p-4 bg-blue-50 border-blue-200">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Métricas de Tiempo
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-white rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      {formatDuration(timingMetrics.avgTimePerQuestion)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tiempo promedio por pregunta
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ({timingMetrics.totalQuestions} preguntas)
                    </p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {formatDuration(timingMetrics.totalAssessmentTime)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tiempo total en assessment
                    </p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">
                      {formatDuration(timingMetrics.timeOnReportPage)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tiempo en página de reporte
                    </p>
                    {timingMetrics.firstReportViewAt && (
                      <p className="text-xs text-muted-foreground">
                        (desde {format(new Date(timingMetrics.firstReportViewAt), 'HH:mm:ss')})
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Report Actions Summary */}
            <div className="grid grid-cols-3 gap-4">
              <Card className={`p-4 ${reportActions.downloaded ? 'bg-green-50 border-green-200' : 'bg-secondary/20'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${reportActions.downloaded ? 'bg-green-100' : 'bg-secondary'}`}>
                    <CheckCircle className={`h-5 w-5 ${reportActions.downloaded ? 'text-green-600' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Descargó Reporte</p>
                    <p className={`text-xs ${reportActions.downloaded ? 'text-green-700' : 'text-muted-foreground'}`}>
                      {reportActions.downloaded ? '✓ Sí' : '✗ No'}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className={`p-4 ${reportActions.ctaClicked ? 'bg-blue-50 border-blue-200' : 'bg-secondary/20'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${reportActions.ctaClicked ? 'bg-blue-100' : 'bg-secondary'}`}>
                    <MousePointer className={`h-5 w-5 ${reportActions.ctaClicked ? 'text-blue-600' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Try 7 Days Free</p>
                    <p className={`text-xs ${reportActions.ctaClicked ? 'text-blue-700' : 'text-muted-foreground'}`}>
                      {reportActions.ctaClicked ? '✓ "Try 7 days free"' : '✗ No'}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className={`p-4 ${reportActions.kineduDownloadClicked ? 'bg-purple-50 border-purple-200' : 'bg-secondary/20'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${reportActions.kineduDownloadClicked ? 'bg-purple-100' : 'bg-secondary'}`}>
                    <Download className={`h-5 w-5 ${reportActions.kineduDownloadClicked ? 'text-purple-600' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Download Kinedu (Activity Cards)</p>
                    <p className={`text-xs ${reportActions.kineduDownloadClicked ? 'text-purple-700' : 'text-muted-foreground'}`}>
                      {reportActions.kineduDownloadClicked ? '✓ Sí' : '✗ No'}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Last Activity */}
            {lastActivity && (
              <Card className="p-4 bg-secondary/20">
                <div className="flex items-start gap-3">
                  <MousePointer className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Última Actividad</h3>
                    <div className="text-sm space-y-1">
                      <p><strong>Evento:</strong> {lastActivity.event_type}</p>
                      {lastActivity.area_id && (
                        <p><strong>Área:</strong> {areaNames[lastActivity.area_id] || lastActivity.area_id}</p>
                      )}
                      {lastActivity.skill_id && (
                        <p><strong>Skill:</strong> {lastActivity.skill_id}</p>
                      )}
                      {lastActivity.milestone_id && (
                        <p><strong>Milestone:</strong> {lastActivity.milestone_id}</p>
                      )}
                      {lastActivity.question_index !== null && (
                        <p><strong>Pregunta:</strong> #{lastActivity.question_index + 1}</p>
                      )}
                      <p className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(lastActivity.created_at), 'MMM dd, yyyy HH:mm:ss')}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Areas Breakdown */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Progreso por Área</h3>
              
              {areaBreakdown.map((area, index) => (
                <Card key={area.area_id} className={`p-4 ${!area.reached ? 'opacity-50' : ''}`}>
                  <div className="space-y-3">
                    {/* Area Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${areaColors[area.area_id]}`} />
                        <h4 className="font-semibold text-lg">{area.area_name}</h4>
                        {area.abandoned && (
                          <Badge variant="destructive" className="ml-2">
                            <XCircle className="h-3 w-3 mr-1" />
                            Punto de Abandono
                          </Badge>
                        )}
                        {area.completion_percentage === 100 && (
                          <Badge variant="default" className="ml-2">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completada
                          </Badge>
                        )}
                        {!area.reached && (
                          <Badge variant="secondary" className="ml-2">
                            No Alcanzada
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm font-medium">
                        {area.answered}/{area.total_questions} preguntas
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <Progress value={area.completion_percentage} className="h-2" />

                    {/* Skills */}
                    <div className="space-y-2 pl-6">
                      {area.skills.map(skill => (
                        <div key={skill.skill_id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{skill.skill_name}</span>
                            {skill.completed && (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">
                              {skill.answered}/{skill.total_questions} respondidas
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {skill.mastered} ✓
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Progression Status */}
                    {index < areaBreakdown.length - 1 && area.completion_percentage === 100 && (
                      <div className="flex items-center gap-2 text-sm text-green-600 pt-2">
                        <CheckCircle className="h-4 w-4" />
                        <span>Pasó a {areaBreakdown[index + 1].area_name}</span>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {/* View Report Button */}
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(`/report/${assessmentId}`, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver Reporte del Usuario
              </Button>
            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
