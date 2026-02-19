import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Loader2, CheckCircle, XCircle, Clock, MousePointer, Download, 
  ExternalLink, ChevronDown, ChevronUp, Smartphone, Monitor, Tablet,
  MessageSquare, HelpCircle, ArrowLeft, SkipForward, Eye, LogOut,
  Play, BarChart3, Timer, Target, FileText, Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { externalSupabase } from '@/integrations/supabase/external-client';
import { format } from 'date-fns';

interface AssessmentBreakdownDialogProps {
  assessmentId: string | null;
  babyName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MilestoneDetail {
  milestone_id: number;
  question: string;
  skill_name: string;
  area_name: string;
  answer: string | null;
  time_to_answer_ms: number | null;
  created_at: string | null;
}

interface SkillBreakdown {
  skill_id: number;
  skill_name: string;
  total_questions: number;
  answered: number;
  mastered: number;
  completed: boolean;
  milestones: MilestoneDetail[];
}

interface AreaBreakdown {
  area_id: number;
  area_name: string;
  skills: SkillBreakdown[];
  total_questions: number;
  answered: number;
  completion_percentage: number;
  reached: boolean;
  abandoned: boolean;
}

interface TimelineEvent {
  id: string;
  event_type: string;
  created_at: string;
  relative_time: string;
  label: string;
  detail: string | null;
  icon: string;
  color: string;
}

interface KPIData {
  progress: { answered: number; total: number; percentage: number };
  duration: string;
  avgTimePerQuestion: string;
  skillsCompleted: { done: number; total: number };
  sawReport: boolean;
  ctaClicked: boolean;
  isCompleted: boolean;
  completedAt: string | null;
  abandonedArea: string | null;
  abandonedSkill: string | null;
}

interface DeviceInfo {
  type: 'mobile' | 'desktop' | 'tablet';
  userAgent: string;
}

export function AssessmentBreakdownDialog({ 
  assessmentId, 
  babyName,
  open, 
  onOpenChange 
}: AssessmentBreakdownDialogProps) {
  const [loading, setLoading] = useState(true);
  const [areaBreakdown, setAreaBreakdown] = useState<AreaBreakdown[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [kpi, setKpi] = useState<KPIData | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [reportActions, setReportActions] = useState({ downloaded: false, ctaClicked: false, kineduDownloadClicked: false, activityClicked: false });

  const areaNames: Record<number, string> = {
    1: 'Physical', 2: 'Cognitive', 3: 'Linguistic', 4: 'Socio-Emotional'
  };
  const areaColors: Record<number, string> = {
    1: 'bg-blue-500', 2: 'bg-green-500', 3: 'bg-orange-500', 4: 'bg-pink-500'
  };

  useEffect(() => {
    if (open && assessmentId) loadBreakdown();
  }, [open, assessmentId]);

  function parseDevice(ua: string): DeviceInfo {
    const lower = ua.toLowerCase();
    if (/ipad|tablet|kindle|playbook/i.test(lower) || (/android/i.test(lower) && !/mobile/i.test(lower))) {
      return { type: 'tablet', userAgent: ua };
    }
    if (/mobile|iphone|ipod|android.*mobile|blackberry|opera mini|iemobile/i.test(lower)) {
      return { type: 'mobile', userAgent: ua };
    }
    return { type: 'desktop', userAgent: ua };
  }

  function formatRelativeTime(eventTime: string, startTime: string): string {
    const diff = new Date(eventTime).getTime() - new Date(startTime).getTime();
    if (diff < 0) return '0s';
    const totalSec = Math.floor(diff / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    if (min === 0) return `+${sec}s`;
    return `+${min}m ${sec}s`;
  }

  function formatDuration(ms: number | null): string {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes === 0) return `${seconds}s`;
    return `${minutes}m ${seconds % 60}s`;
  }

  function getEventIcon(type: string): string {
    const map: Record<string, string> = {
      'question_view': 'eye', 'answer': 'message', 'helper_open': 'help',
      'back': 'back', 'skip': 'skip', 'report_view': 'report',
      'unlock_report_view': 'report', 'cta_clicked': 'zap', 
      'kinedu_download_clicked': 'download', 'report_downloaded': 'download',
      'exit': 'exit', 'question_duration': 'timer'
    };
    return map[type] || 'default';
  }

  function getEventColor(type: string): string {
    const map: Record<string, string> = {
      'answer': 'text-green-600', 'exit': 'text-red-600', 'helper_open': 'text-amber-600',
      'back': 'text-orange-500', 'skip': 'text-orange-500', 'report_view': 'text-purple-600',
      'unlock_report_view': 'text-purple-600', 'cta_clicked': 'text-blue-600',
      'kinedu_download_clicked': 'text-blue-600', 'report_downloaded': 'text-blue-600'
    };
    return map[type] || 'text-muted-foreground';
  }

  const loadBreakdown = async () => {
    if (!assessmentId) return;
    setLoading(true);
    try {
      // Parallel fetches
      const [assessmentRes, responsesRes, allEventsRes] = await Promise.all([
        supabase.from('assessments').select('completed_at, started_at, reference_age_months').eq('id', assessmentId).maybeSingle(),
        supabase.from('assessment_responses').select('area_id, skill_id, milestone_id, answer, created_at').eq('assessment_id', assessmentId).order('created_at', { ascending: true }),
        supabase.from('assessment_events').select('id, event_type, area_id, skill_id, milestone_id, question_index, created_at, event_data, user_agent').eq('assessment_id', assessmentId).order('created_at', { ascending: true })
      ]);

      const assessmentData = assessmentRes.data;
      const responses = responsesRes.data || [];
      const allEvents = allEventsRes.data || [];

      // Device info from first event with user_agent
      const firstWithUA = allEvents.find(e => e.user_agent);
      if (firstWithUA?.user_agent) {
        setDeviceInfo(parseDevice(firstWithUA.user_agent));
      }

      // Get total expected milestones
      let totalExpectedMilestones = 0;
      let totalExpectedSkills = 0;
      if (assessmentData?.reference_age_months !== undefined) {
        const { data: milestonesForAge } = await externalSupabase
          .from('milestones').select('milestone_id, skill_id')
          .lte('age', assessmentData.reference_age_months).eq('locale', 'en').limit(2000);
        if (milestonesForAge) {
          totalExpectedMilestones = milestonesForAge.length;
          totalExpectedSkills = new Set(milestonesForAge.map(m => m.skill_id)).size;
        }
      }

      // Fetch milestone details (question text) from external supabase
      const milestoneIds = [...new Set(responses.map(r => r.milestone_id))];
      const skillIds = [...new Set(responses.map(r => r.skill_id).filter(Boolean) as number[])];
      
      const { data: milestonesData } = await externalSupabase
        .from('milestones')
        .select('milestone_id, question, skill_id, skill_name, area_id, area_name')
        .in('milestone_id', milestoneIds.length > 0 ? milestoneIds : [0]);

      // Build maps
      const milestoneMap = new Map<number, { question: string; skill_name: string; area_name: string; skill_id: number; area_id: number }>();
      const skillNameMap = new Map<number, string>();
      const areaIdMap = new Map<number, number>();
      
      milestonesData?.forEach(m => {
        milestoneMap.set(m.milestone_id, { question: m.question, skill_name: m.skill_name, area_name: m.area_name, skill_id: m.skill_id, area_id: m.area_id });
        skillNameMap.set(m.skill_id, m.skill_name);
        areaIdMap.set(m.skill_id, m.area_id);
      });

      // Build answer time map from events
      const answerTimeMap = new Map<number, number>();
      allEvents.forEach(e => {
        if (e.event_type === 'answer' && e.milestone_id && e.event_data) {
          const data = e.event_data as any;
          if (typeof data.time_to_answer_ms === 'number') {
            answerTimeMap.set(e.milestone_id, data.time_to_answer_ms);
          }
        }
      });

      // Build area breakdown with milestone-level detail
      const areaMapData = new Map<number, AreaBreakdown>();
      const firstResponseByArea = new Map<number, Date>();

      responses.forEach(response => {
        const areaId = response.area_id || areaIdMap.get(response.skill_id!) || 0;
        const skillId = response.skill_id || 0;
        const mInfo = milestoneMap.get(response.milestone_id);

        if (!firstResponseByArea.has(areaId) && response.created_at) {
          firstResponseByArea.set(areaId, new Date(response.created_at));
        }

        if (!areaMapData.has(areaId)) {
          areaMapData.set(areaId, {
            area_id: areaId, area_name: mInfo?.area_name || areaNames[areaId] || `Area ${areaId}`,
            skills: [], total_questions: 0, answered: 0, completion_percentage: 0, reached: true, abandoned: false
          });
        }

        const area = areaMapData.get(areaId)!;
        let skill = area.skills.find(s => s.skill_id === skillId);
        if (!skill) {
          skill = {
            skill_id: skillId, skill_name: mInfo?.skill_name || skillNameMap.get(skillId) || `Skill ${skillId}`,
            total_questions: 0, answered: 0, mastered: 0, completed: false, milestones: []
          };
          area.skills.push(skill);
        }

        const milestoneDetail: MilestoneDetail = {
          milestone_id: response.milestone_id,
          question: mInfo?.question || `Milestone #${response.milestone_id}`,
          skill_name: skill.skill_name,
          area_name: area.area_name,
          answer: response.answer,
          time_to_answer_ms: answerTimeMap.get(response.milestone_id) || null,
          created_at: response.created_at
        };
        skill.milestones.push(milestoneDetail);

        skill.total_questions++;
        area.total_questions++;
        if (response.answer) {
          skill.answered++;
          area.answered++;
          if (response.answer === 'yes') skill.mastered++;
        }
      });

      // Calculate completion & abandonment
      areaMapData.forEach(area => {
        area.completion_percentage = area.total_questions > 0 ? (area.answered / area.total_questions) * 100 : 0;
        area.skills.forEach(skill => { skill.completed = skill.answered === skill.total_questions; });
      });

      const sortedAreas = Array.from(areaMapData.values()).sort((a, b) => {
        const aTime = firstResponseByArea.get(a.area_id)?.getTime() || 0;
        const bTime = firstResponseByArea.get(b.area_id)?.getTime() || 0;
        return aTime - bTime;
      });

      let abandonedAreaName: string | null = null;
      let abandonedSkillName: string | null = null;
      let foundIncomplete = false;
      sortedAreas.forEach((area, index) => {
        if (area.completion_percentage < 100 && !foundIncomplete) {
          area.abandoned = true;
          foundIncomplete = true;
          abandonedAreaName = area.area_name;
          const incompleteSkill = area.skills.find(s => !s.completed);
          if (incompleteSkill) abandonedSkillName = incompleteSkill.skill_name;
        }
        if (index > 0 && sortedAreas[index - 1].completion_percentage < 100) {
          area.reached = false;
        }
      });

      // Report actions
      const downloaded = allEvents.some(e => e.event_type === 'report_downloaded');
      const ctaClicked = allEvents.some(e => e.event_type === 'cta_clicked');
      const kineduDownloadClicked = allEvents.some(e => e.event_type === 'kinedu_download_clicked');
      const domainCtaClicked = allEvents.some(e => e.event_type === 'domain_cta_clicked');
      const activityClicked = kineduDownloadClicked || domainCtaClicked;
      const sawReport = allEvents.some(e => e.event_type === 'report_view');
      setReportActions({ downloaded, ctaClicked, kineduDownloadClicked, activityClicked });

      // Timing metrics
      const answerEvents = allEvents.filter(e => {
        if (e.event_type !== 'answer' || !e.event_data) return false;
        return typeof (e.event_data as any).time_to_answer_ms === 'number';
      });
      const avgTime = answerEvents.length > 0
        ? answerEvents.reduce((s, e) => s + ((e.event_data as any).time_to_answer_ms || 0), 0) / answerEvents.length
        : null;

      let totalDurationMs: number | null = null;
      const lastAnswerEvent = [...allEvents].reverse().find(e => e.event_type === 'answer');
      if (assessmentData?.started_at && lastAnswerEvent) {
        totalDurationMs = new Date(lastAnswerEvent.created_at).getTime() - new Date(assessmentData.started_at).getTime();
      }

      const uniqueSkillsAnswered = new Set(responses.map(r => r.skill_id).filter(Boolean));

      // Build KPI
      setKpi({
        progress: { answered: responses.length, total: totalExpectedMilestones, percentage: totalExpectedMilestones > 0 ? (responses.length / totalExpectedMilestones) * 100 : 0 },
        duration: formatDuration(totalDurationMs),
        avgTimePerQuestion: formatDuration(avgTime),
        skillsCompleted: { done: uniqueSkillsAnswered.size, total: totalExpectedSkills },
        sawReport, ctaClicked,
        isCompleted: !!assessmentData?.completed_at,
        completedAt: assessmentData?.completed_at || null,
        abandonedArea: abandonedAreaName,
        abandonedSkill: abandonedSkillName
      });

      // Build timeline
      const startTime = assessmentData?.started_at || (allEvents.length > 0 ? allEvents[0].created_at : null);
      if (startTime) {
        const timelineItems: TimelineEvent[] = [];
        
        // Add assessment start
        if (assessmentData?.started_at) {
          timelineItems.push({
            id: 'start', event_type: 'start', created_at: assessmentData.started_at,
            relative_time: '+0s', label: 'Assessment iniciado', detail: null,
            icon: 'play', color: 'text-green-600'
          });
        }

        // Add all events (skip question_duration as it's redundant with answer)
        allEvents.filter(e => e.event_type !== 'question_duration').forEach(event => {
          const mInfo = event.milestone_id ? milestoneMap.get(event.milestone_id) : null;
          const skillName = event.skill_id ? (skillNameMap.get(event.skill_id) || `Skill ${event.skill_id}`) : null;
          const areaName = event.area_id ? (areaNames[event.area_id] || `Area ${event.area_id}`) : null;

          let label = event.event_type;
          let detail: string | null = null;

          switch (event.event_type) {
            case 'question_view':
              label = `Vio pregunta`;
              detail = mInfo ? `${mInfo.question.substring(0, 80)}${mInfo.question.length > 80 ? '...' : ''}` : (skillName ? `${skillName}` : null);
              break;
            case 'answer': {
              const ans = (event.event_data as any)?.answer;
              const timeMs = (event.event_data as any)?.time_to_answer_ms;
              label = `Respondió ${ans === 'yes' ? '✓ Sí' : '✗ No'}`;
              const parts: string[] = [];
              if (mInfo) parts.push(mInfo.question.substring(0, 60) + (mInfo.question.length > 60 ? '...' : ''));
              if (timeMs) parts.push(`(${formatDuration(timeMs)})`);
              detail = parts.length > 0 ? parts.join(' ') : null;
              break;
            }
            case 'helper_open':
              label = 'Abrió helper/info';
              detail = mInfo ? mInfo.question.substring(0, 60) : null;
              break;
            case 'back':
              label = '← Retrocedió';
              break;
            case 'skip':
              label = '→ Saltó pregunta';
              break;
            case 'report_view':
              label = '📊 Vio el reporte';
              break;
            case 'unlock_report_view':
              label = '🔓 Vio pantalla de unlock';
              break;
            case 'cta_clicked':
              label = '🎯 Click en CTA "Try 7 days free"';
              break;
            case 'kinedu_download_clicked':
              label = '📱 Click en descarga Kinedu';
              break;
            case 'report_downloaded':
              label = '📥 Descargó reporte PDF';
              break;
            case 'exit':
              label = '🚪 Salió del assessment';
              detail = (event.event_data as any)?.reason || null;
              break;
          }

          timelineItems.push({
            id: event.id, event_type: event.event_type, created_at: event.created_at!,
            relative_time: formatRelativeTime(event.created_at!, startTime),
            label, detail,
            icon: getEventIcon(event.event_type),
            color: getEventColor(event.event_type)
          });
        });

        setTimeline(timelineItems);
      }

      setAreaBreakdown(sortedAreas);
    } catch (error) {
      console.error('Error loading breakdown:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderTimelineIcon = (iconName: string, color: string) => {
    const cls = `h-4 w-4 ${color}`;
    switch (iconName) {
      case 'play': return <Play className={cls} />;
      case 'eye': return <Eye className={cls} />;
      case 'message': return <MessageSquare className={cls} />;
      case 'help': return <HelpCircle className={cls} />;
      case 'back': return <ArrowLeft className={cls} />;
      case 'skip': return <SkipForward className={cls} />;
      case 'report': return <FileText className={cls} />;
      case 'zap': return <Zap className={cls} />;
      case 'download': return <Download className={cls} />;
      case 'exit': return <LogOut className={cls} />;
      case 'timer': return <Timer className={cls} />;
      default: return <Clock className={cls} />;
    }
  };

  const DeviceIcon = deviceInfo?.type === 'mobile' ? Smartphone : deviceInfo?.type === 'tablet' ? Tablet : Monitor;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl flex items-center gap-3">
              Desglose - {babyName}
              {deviceInfo && (
                <Badge variant="outline" className="text-xs font-normal gap-1">
                  <DeviceIcon className="h-3 w-3" />
                  {deviceInfo.type === 'mobile' ? 'Móvil' : deviceInfo.type === 'tablet' ? 'Tablet' : 'Desktop'}
                </Badge>
              )}
            </DialogTitle>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-5 py-2">

            {/* === 1. KPI GRID === */}
            {kpi && (
              <div className="space-y-3">
                {/* Status header */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${kpi.isCompleted ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  {kpi.isCompleted ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
                  <span className={`font-semibold ${kpi.isCompleted ? 'text-green-700' : 'text-red-700'}`}>
                    {kpi.isCompleted ? 'Completado' : 'Abandonado'}
                  </span>
                  {kpi.isCompleted && kpi.completedAt && (
                    <span className="text-sm text-green-600 ml-2">{format(new Date(kpi.completedAt), 'MMM dd, yyyy HH:mm')}</span>
                  )}
                  {!kpi.isCompleted && kpi.abandonedArea && (
                    <span className="text-sm text-red-600 ml-2">
                      en {kpi.abandonedArea}{kpi.abandonedSkill ? ` → ${kpi.abandonedSkill}` : ''}
                    </span>
                  )}
                </div>

                {/* 6 KPI cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {/* Progress */}
                  <Card className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-medium text-muted-foreground">Progreso</span>
                    </div>
                    <p className="text-xl font-bold">{kpi.progress.answered}/{kpi.progress.total}</p>
                    <Progress value={kpi.progress.percentage} className="h-1.5 mt-1" />
                    <p className="text-xs text-muted-foreground mt-0.5">{Math.round(kpi.progress.percentage)}%</p>
                  </Card>

                  {/* Duration */}
                  <Card className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Timer className="h-4 w-4 text-green-600" />
                      <span className="text-xs font-medium text-muted-foreground">Duración</span>
                    </div>
                    <p className="text-xl font-bold">{kpi.duration}</p>
                    <p className="text-xs text-muted-foreground">tiempo en assessment</p>
                  </Card>

                  {/* Avg per question */}
                  <Card className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-amber-600" />
                      <span className="text-xs font-medium text-muted-foreground">Promedio/Pregunta</span>
                    </div>
                    <p className="text-xl font-bold">{kpi.avgTimePerQuestion}</p>
                    <p className="text-xs text-muted-foreground">por respuesta</p>
                  </Card>

                  {/* Skills */}
                  <Card className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart3 className="h-4 w-4 text-purple-600" />
                      <span className="text-xs font-medium text-muted-foreground">Skills</span>
                    </div>
                    <p className="text-xl font-bold">{kpi.skillsCompleted.done}/{kpi.skillsCompleted.total}</p>
                    <p className="text-xs text-muted-foreground">completados</p>
                  </Card>

                  {/* Saw Report */}
                  <Card className={`p-3 ${kpi.sawReport ? 'bg-green-50 border-green-200' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 text-purple-600" />
                      <span className="text-xs font-medium text-muted-foreground">Vio Reporte</span>
                    </div>
                    <p className={`text-xl font-bold ${kpi.sawReport ? 'text-green-600' : 'text-red-500'}`}>
                      {kpi.sawReport ? '✓ Sí' : '✗ No'}
                    </p>
                  </Card>

                  {/* CTA */}
                  <Card className={`p-3 ${kpi.ctaClicked ? 'bg-blue-50 border-blue-200' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-medium text-muted-foreground">CTA Click</span>
                    </div>
                    <p className={`text-xl font-bold ${kpi.ctaClicked ? 'text-blue-600' : 'text-red-500'}`}>
                      {kpi.ctaClicked ? '✓ Sí' : '✗ No'}
                    </p>
                  </Card>
                </div>

                {/* Report action details row */}
                <div className="flex gap-2">
                  <Badge variant={reportActions.activityClicked ? 'default' : 'outline'} className="text-xs">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Go to Activity {reportActions.activityClicked ? '✓' : '✗'}
                  </Badge>
                  <Badge variant={reportActions.ctaClicked ? 'default' : 'outline'} className="text-xs">
                    <Zap className="h-3 w-3 mr-1" />
                    Start Plan {reportActions.ctaClicked ? '✓' : '✗'}
                  </Badge>
                </div>
              </div>
            )}

            {/* === 2. EVENT TIMELINE (Collapsible) === */}
            {timeline.length > 0 && (
              <Collapsible open={timelineOpen} onOpenChange={setTimelineOpen}>
                <Card className="p-4">
                  <CollapsibleTrigger className="flex items-center justify-between w-full">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      Timeline de Eventos ({timeline.length})
                    </h3>
                    {timelineOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-4 relative">
                      {/* Vertical line */}
                      <div className="absolute left-[17px] top-2 bottom-2 w-px bg-border" />
                      
                      <div className="space-y-0">
                        {timeline.map((event, idx) => (
                          <div key={event.id} className="flex gap-3 py-1.5 relative">
                            {/* Icon dot */}
                            <div className="z-10 flex-shrink-0 w-[34px] h-[34px] rounded-full bg-background border flex items-center justify-center">
                              {renderTimelineIcon(event.icon, event.color)}
                            </div>
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-medium ${event.color}`}>{event.label}</span>
                                <span className="text-xs text-muted-foreground font-mono">{event.relative_time}</span>
                              </div>
                              {event.detail && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">{event.detail}</p>
                              )}
                              <p className="text-[10px] text-muted-foreground/60">
                                {format(new Date(event.created_at), 'HH:mm:ss')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            {/* === 3. AREA BREAKDOWN WITH MILESTONE DETAILS === */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Progreso por Área</h3>
              
              <Accordion type="multiple" className="space-y-2">
                {areaBreakdown.map((area, index) => (
                  <AccordionItem key={area.area_id} value={`area-${area.area_id}`} className={`border rounded-lg px-4 ${!area.reached ? 'opacity-50' : ''}`}>
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-3 h-3 rounded-full ${areaColors[area.area_id]}`} />
                        <span className="font-semibold">{area.area_name}</span>
                        {area.abandoned && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            <XCircle className="h-3 w-3 mr-0.5" />Abandono
                          </Badge>
                        )}
                        {area.completion_percentage === 100 && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-green-600">
                            <CheckCircle className="h-3 w-3 mr-0.5" />OK
                          </Badge>
                        )}
                        {!area.reached && <Badge variant="secondary" className="text-[10px]">No alcanzada</Badge>}
                        <span className="text-xs text-muted-foreground ml-auto mr-2">
                          {area.answered}/{area.total_questions} ({Math.round(area.completion_percentage)}%)
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pb-2">
                        <Progress value={area.completion_percentage} className="h-1.5" />

                        {area.skills.map(skill => (
                          <div key={skill.skill_id} className="space-y-2">
                            {/* Skill header */}
                            <div className="flex items-center justify-between px-2 py-1 bg-muted/50 rounded">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{skill.skill_name}</span>
                                {skill.completed && <CheckCircle className="h-3.5 w-3.5 text-green-600" />}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">{skill.answered}/{skill.total_questions}</span>
                                <Badge variant="outline" className="text-[10px]">{skill.mastered} ✓</Badge>
                              </div>
                            </div>

                            {/* Individual milestones */}
                            <div className="space-y-1 pl-4">
                              {skill.milestones.map(ms => (
                                <div key={ms.milestone_id} className="flex items-start gap-2 py-1 border-b border-dashed last:border-0 text-xs">
                                  {/* Answer indicator */}
                                  <div className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center ${
                                    ms.answer === 'yes' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {ms.answer === 'yes' ? '✓' : '✗'}
                                  </div>
                                  {/* Question text */}
                                  <p className="flex-1 text-muted-foreground leading-snug">{ms.question}</p>
                                  {/* Time */}
                                  {ms.time_to_answer_ms && (
                                    <span className="flex-shrink-0 text-[10px] text-muted-foreground/70 font-mono">
                                      {formatDuration(ms.time_to_answer_ms)}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}

                        {/* Area progression indicator */}
                        {index < areaBreakdown.length - 1 && area.completion_percentage === 100 && (
                          <div className="flex items-center gap-2 text-xs text-green-600 pt-1">
                            <CheckCircle className="h-3 w-3" />
                            <span>→ Pasó a {areaBreakdown[index + 1].area_name}</span>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            {/* === 4. VIEW REPORT BUTTON === */}
            <div className="pt-3 border-t">
              <Button variant="outline" className="w-full" onClick={() => window.open(`/report/${assessmentId}`, '_blank')}>
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
