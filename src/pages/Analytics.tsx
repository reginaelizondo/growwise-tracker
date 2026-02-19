import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, RefreshCw, TrendingDown, Users, Clock, Target, CalendarIcon, X, Trash2, Baby, ChevronDown, ChevronLeft, ChevronRight, BarChart3, Eye, MousePointerClick, ArrowDown, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format } from 'date-fns';
import { AssessmentBreakdownDialog } from '@/components/AssessmentBreakdownDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// ============================================================
// TYPES
// ============================================================
interface FunnelStep {
  label: string;
  count: number;
  drop_off_pct: number;
}

interface FullFunnelData {
  steps: FunnelStep[];
  landing_clicks: number;
  form_name_completed: number;
  form_birthday_completed: number;
  form_email_completed: number;
  emails_at_profile: number;
  emails_post_assessment: number;
  babies_with_email: number;
  profile_clicks: number;
  assessments_created: number;
  engaged: number;
  halfway: number;
  completed: number;
  report_views: number;
  cta_clicks: number;
  completion_rate: number;
}

interface DailyStatData {
  date: string;
  started: number;
  completed: number;
  completion_rate: number;
}

interface DropOffByAreaData {
  area_id: number;
  area_name: string;
  reached: number;
  dropped: number;
  drop_off_pct: number;
}

interface IndividualAssessmentData {
  assessment_id: string;
  baby_id: string;
  baby_name: string;
  reference_age_months: number;
  started_at: string;
  completed_at: string | null;
  status: 'completed' | 'in_progress' | 'abandoned';
  skills_answered: number;
  total_skills: number;
  last_milestone_id: number | null;
  last_skill_id: number | null;
  last_area_id: number | null;
  drop_off_area_name: string | null;
  drop_off_skill_name: string | null;
  last_question_index: number | null;
  duration_seconds: number;
  back_count: number;
  helper_count: number;
  skip_count: number;
  last_activity: string;
  time_on_report_seconds: number | null;
  saw_report: boolean;
  cta_clicked: boolean;
}

interface AgeDistributionData {
  total: number;
  average: number;
  median: number;
  min: number;
  max: number;
  distribution: { label: string; count: number; percentage: number }[];
}

// ============================================================
// COMPONENT
// ============================================================
export default function Analytics() {
  const [fullFunnel, setFullFunnel] = useState<FullFunnelData | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStatData[]>([]);
  const [dropOffByArea, setDropOffByArea] = useState<DropOffByAreaData[]>([]);
  const [individualAssessments, setIndividualAssessments] = useState<IndividualAssessmentData[]>([]);
  const [ageDistribution, setAgeDistribution] = useState<AgeDistributionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<{ id: string; name: string } | null>(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [assessmentToDelete, setAssessmentToDelete] = useState<{ id: string; babyId: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadAnalytics();
  }, [startDate, endDate]);

  const loadAnalytics = async () => {
    setLoading(true);
    setCurrentPage(1);
    try {
      const filters: any = {};
      if (startDate) filters.startDate = format(startDate, 'yyyy-MM-dd');
      if (endDate) filters.endDate = format(endDate, 'yyyy-MM-dd');

      const [funnelResult, dailyResult, dropOffResult, individualResult, ageResult] = await Promise.all([
        supabase.functions.invoke('analytics-query', { body: { reportType: 'full_funnel', filters } }),
        supabase.functions.invoke('analytics-query', { body: { reportType: 'daily_stats', filters } }),
        supabase.functions.invoke('analytics-query', { body: { reportType: 'drop_off_by_area', filters } }),
        supabase.functions.invoke('analytics-query', { body: { reportType: 'individual_assessments', filters } }),
        supabase.functions.invoke('analytics-query', { body: { reportType: 'age_distribution', filters } }),
      ]);

      if (funnelResult.data) setFullFunnel(funnelResult.data);
      if (dailyResult.data) setDailyStats(dailyResult.data);
      if (dropOffResult.data) setDropOffByArea(dropOffResult.data);
      if (individualResult.data) setIndividualAssessments(individualResult.data);
      if (individualResult.data) setIndividualAssessments(individualResult.data);
      if (ageResult.data) setAgeDistribution(ageResult.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!assessmentToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-assessment', {
        body: { babyId: assessmentToDelete.babyId, adminDelete: true },
      });
      if (error) {
        toast({ variant: 'destructive', title: 'Error al eliminar', description: error.message });
      } else {
        toast({ title: 'Eliminado correctamente', description: `${assessmentToDelete.name} ha sido eliminado` });
        loadAnalytics();
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error al eliminar', description: 'Hubo un error al eliminar el assessment' });
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setAssessmentToDelete(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!individualAssessments || individualAssessments.length === 0) return;
    setDeletingAll(true);
    let successCount = 0;
    let errorCount = 0;
    try {
      for (const assessment of individualAssessments) {
        try {
          const { error } = await supabase.functions.invoke('delete-assessment', {
            body: { babyId: assessment.baby_id, adminDelete: true },
          });
          if (error) errorCount++;
          else successCount++;
        } catch {
          errorCount++;
        }
      }
      if (successCount > 0) {
        toast({
          title: 'Assessments eliminados',
          description: `${successCount} eliminado(s)${errorCount > 0 ? `. ${errorCount} fallaron.` : '.'}`,
        });
      }
      loadAnalytics();
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Ocurrió un error durante la eliminación.' });
    } finally {
      setDeletingAll(false);
      setDeleteAllConfirmOpen(false);
    }
  };

  const getAreaColor = (areaId: number | null): string => {
    const colors: Record<number, string> = {
      1: '#00A3E0',
      2: '#00C853',
      3: '#FF8A00',
      4: '#F06292',
    };
    return areaId ? colors[areaId] || 'hsl(var(--primary))' : 'hsl(var(--primary))';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalPages = Math.ceil((individualAssessments?.length || 0) / itemsPerPage);
  const paginatedAssessments = individualAssessments?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const completedCount = individualAssessments?.filter(a => a.status === 'completed').length || 0;
  const abandonedCount = individualAssessments?.filter(a => a.status === 'abandoned').length || 0;
  const totalAssessments = individualAssessments?.length || 0;
  const completionRate = fullFunnel?.completion_rate || (totalAssessments > 0 ? (completedCount / totalAssessments) * 100 : 0);

  // Median duration of completed assessments only
  const completedDurations = (individualAssessments || [])
    .filter(a => a.status === 'completed' && a.duration_seconds > 0)
    .map(a => a.duration_seconds)
    .sort((a, b) => a - b);
  const medianDuration = completedDurations.length > 0
    ? completedDurations[Math.floor(completedDurations.length / 2)]
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Assessment Analytics</h1>
            <p className="text-muted-foreground mt-1">Visibilidad completa del journey del usuario</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {startDate ? format(startDate, 'PP') : 'Desde'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-50" align="end">
                <Calendar mode="single" selected={startDate} onSelect={(d) => { setStartDate(d); setStartDateOpen(false); }} initialFocus />
              </PopoverContent>
            </Popover>
            <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {endDate ? format(endDate, 'PP') : 'Hasta'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-50" align="end">
                <Calendar mode="single" selected={endDate} onSelect={(d) => { setEndDate(d); setEndDateOpen(false); }} initialFocus />
              </PopoverContent>
            </Popover>
            {(startDate || endDate) && (
              <Button variant="ghost" size="sm" onClick={() => { setStartDate(undefined); setEndDate(undefined); }}>
                <X className="w-4 h-4" />
              </Button>
            )}
            <Button onClick={loadAnalytics} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 1. KPI CARDS */}
        {/* ============================================================ */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard label="Total Sesiones" value={fullFunnel?.landing_clicks || 0} icon={<Users className="w-4 h-4" />} />
          <KpiCard label="Assessments Creados" value={fullFunnel?.assessments_created || 0} icon={<Target className="w-4 h-4" />} />
          <KpiCard
            label="Tasa Completado"
            value={`${completionRate.toFixed(0)}%`}
            icon={<CheckCircle2 className="w-4 h-4" />}
            valueColor={completionRate >= 60 ? 'text-green-600' : completionRate >= 30 ? 'text-yellow-600' : 'text-destructive'}
          />
          <KpiCard
            label="Abandonados"
            value={abandonedCount}
            subtitle={totalAssessments > 0 ? `${((abandonedCount / totalAssessments) * 100).toFixed(0)}%` : undefined}
            icon={<XCircle className="w-4 h-4" />}
            valueColor="text-destructive"
          />
          <KpiCard
            label="Duración Mediana"
            value={`${Math.floor(medianDuration / 60)}m ${medianDuration % 60}s`}
            subtitle="(completados)"
            icon={<Clock className="w-4 h-4" />}
          />
          <KpiCard label="Vieron Reporte" value={fullFunnel?.report_views || 0} icon={<Eye className="w-4 h-4" />} />
        </div>

        {/* ============================================================ */}
        {/* 2. FULL END-TO-END FUNNEL */}
        {/* ============================================================ */}
        {fullFunnel && fullFunnel.steps && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5" />
                Funnel Completo del Usuario
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {fullFunnel.steps.map((step, i) => {
                  const maxCount = fullFunnel.steps[0].count || 1;
                  const widthPct = maxCount > 0 ? Math.max((step.count / maxCount) * 100, 8) : 8;
                  const colors = [
                    'bg-blue-600', 'bg-blue-500', 'bg-indigo-500', 'bg-violet-500',
                    'bg-purple-500', 'bg-green-600', 'bg-emerald-500', 'bg-teal-500'
                  ];
                  return (
                    <div key={step.label}>
                      {i > 0 && step.drop_off_pct > 0 && (
                        <div className="flex items-center gap-2 py-1 pl-4">
                          <ArrowDown className="w-3 h-3 text-destructive" />
                          <span className="text-xs text-destructive font-medium">
                            -{step.drop_off_pct.toFixed(0)}% drop-off
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <div className="w-44 text-right text-sm font-medium text-muted-foreground shrink-0">
                          {step.label}
                        </div>
                        <div className="flex-1">
                          <div
                            className={`h-10 ${colors[i % colors.length]} rounded-md flex items-center justify-between px-4 text-white font-semibold text-sm transition-all duration-500`}
                            style={{ width: `${widthPct}%`, minWidth: '120px' }}
                          >
                            <span>{step.count}</span>
                            {i > 0 && maxCount > 0 && (
                              <span className="text-white/80 text-xs">
                                {((step.count / maxCount) * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ============================================================ */}
        {/* 3. DAILY TREND CHART */}
        {/* ============================================================ */}
        {dailyStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Tendencia Diaria
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d: string) => {
                        const parts = d.split('-');
                        return `${parts[1]}/${parts[2]}`;
                      }}
                      className="text-xs"
                    />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                      labelFormatter={(d: string) => `Fecha: ${d}`}
                    />
                    <Legend />
                    <Bar dataKey="started" name="Iniciados" fill="hsl(221, 83%, 53%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" name="Completados" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ============================================================ */}
        {/* 4. DROP-OFF BY AREA */}
        {/* ============================================================ */}
        {dropOffByArea.length > 0 && (() => {
          // Order: Cognitive (2) → Physical (1) → Linguistic (3) → Socio-Emotional (4)
          const areaOrder = [2, 1, 3, 4];
          const sortedAreas = areaOrder
            .map(id => dropOffByArea.find(a => a.area_id === id))
            .filter(Boolean) as DropOffByAreaData[];
          // If there are areas not in the predefined order, append them
          dropOffByArea.forEach(a => { if (!areaOrder.includes(a.area_id)) sortedAreas.push(a); });
          const maxReached = Math.max(...sortedAreas.map(a => a.reached), 1);

          return (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Drop-off por Área (Funnel)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {sortedAreas.map((area, i) => {
                    const widthPct = Math.max((area.reached / maxReached) * 100, 15);
                    const color = getAreaColor(area.area_id);
                    const survived = area.reached - area.dropped;
                    return (
                      <div key={area.area_id}>
                        {i > 0 && (
                          <div className="flex items-center gap-2 py-1 pl-4">
                            <ArrowDown className="w-3 h-3 text-destructive" />
                            <span className="text-xs text-destructive font-medium">
                              {sortedAreas[i - 1].dropped > 0
                                ? `-${sortedAreas[i - 1].drop_off_pct.toFixed(0)}% abandonaron en ${sortedAreas[i - 1].area_name}`
                                : `0% drop-off en ${sortedAreas[i - 1].area_name}`}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <div className="w-40 text-right shrink-0 flex items-center justify-end gap-2">
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-sm font-medium text-muted-foreground">{area.area_name}</span>
                          </div>
                          <div className="flex-1">
                            <div
                              className="h-12 rounded-md flex items-center justify-between px-4 text-white font-semibold text-sm transition-all duration-500"
                              style={{ width: `${widthPct}%`, minWidth: '140px', backgroundColor: color }}
                            >
                              <span>{area.reached} llegaron</span>
                              <span className="text-white/80 text-xs">
                                {area.dropped > 0 ? `${area.dropped} abandonaron (${area.drop_off_pct.toFixed(0)}%)` : '0 abandonaron'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {/* Final: survived all areas */}
                  {sortedAreas.length > 0 && (() => {
                    const lastArea = sortedAreas[sortedAreas.length - 1];
                    const survivedAll = lastArea.reached - lastArea.dropped;
                    const widthPct = Math.max((survivedAll / maxReached) * 100, 10);
                    return (
                      <>
                        <div className="flex items-center gap-2 py-1 pl-4">
                          <ArrowDown className="w-3 h-3 text-destructive" />
                          <span className="text-xs text-destructive font-medium">
                            {lastArea.dropped > 0
                              ? `-${lastArea.drop_off_pct.toFixed(0)}% abandonaron en ${lastArea.area_name}`
                              : `0% drop-off en ${lastArea.area_name}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-40 text-right shrink-0">
                            <span className="text-sm font-medium text-green-600">✅ Completaron</span>
                          </div>
                          <div className="flex-1">
                            <div
                              className="h-12 rounded-md flex items-center justify-between px-4 text-white font-semibold text-sm bg-green-600"
                              style={{ width: `${widthPct}%`, minWidth: '120px' }}
                            >
                              <span>{survivedAll}</span>
                              <span className="text-white/80 text-xs">
                                {maxReached > 0 ? `${((survivedAll / maxReached) * 100).toFixed(0)}% del total` : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* ============================================================ */}
        {/* 5. INDIVIDUAL ASSESSMENTS TABLE */}
        {/* ============================================================ */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Assessments Individuales
              </CardTitle>
              {individualAssessments && individualAssessments.length > 0 && (
                <Button variant="destructive" size="sm" onClick={() => setDeleteAllConfirmOpen(true)} className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Borrar Todos
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 text-sm font-medium">Baby</th>
                    <th className="text-left p-3 text-sm font-medium">Edad</th>
                    <th className="text-left p-3 text-sm font-medium">Inicio</th>
                    <th className="text-left p-3 text-sm font-medium">Status</th>
                    <th className="text-left p-3 text-sm font-medium">Duración</th>
                    <th className="text-left p-3 text-sm font-medium">Progreso</th>
                    <th className="text-left p-3 text-sm font-medium">Drop-off</th>
                    <th className="text-center p-3 text-sm font-medium">Reporte</th>
                    <th className="text-center p-3 text-sm font-medium">CTA</th>
                    <th className="text-center p-3 text-sm font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAssessments?.map((a) => (
                    <tr
                      key={a.assessment_id}
                      className="border-b hover:bg-secondary/20 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedAssessment({ id: a.assessment_id, name: a.baby_name });
                        setBreakdownOpen(true);
                      }}
                    >
                      <td className="p-3 font-medium text-primary">{a.baby_name}</td>
                      <td className="p-3 text-sm text-muted-foreground">{a.reference_age_months}m</td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {format(new Date(a.started_at), 'MMM dd, HH:mm')}
                      </td>
                      <td className="p-3">
                        <Badge variant={a.status === 'completed' ? 'default' : a.status === 'in_progress' ? 'secondary' : 'destructive'}>
                          {a.status === 'completed' ? '✅ Completado' : a.status === 'in_progress' ? '🔄 En Progreso' : '❌ Abandonado'}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm">
                        {Math.floor(a.duration_seconds / 60)}m {a.duration_seconds % 60}s
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Progress
                            value={a.total_skills > 0 ? (a.skills_answered / a.total_skills) * 100 : 0}
                            className="w-20"
                            style={{
                              '--progress-color': a.status === 'completed' ? 'hsl(var(--primary))' : getAreaColor(a.last_area_id),
                            } as React.CSSProperties}
                          />
                          <span className="text-xs text-muted-foreground">
                            {a.total_skills > 0 ? ((a.skills_answered / a.total_skills) * 100).toFixed(0) : '0'}%
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-sm">
                        {a.status === 'completed' ? (
                          <span className="text-primary font-medium">—</span>
                        ) : a.drop_off_area_name ? (
                          <div>
                            <span className="font-medium" style={{ color: getAreaColor(a.last_area_id) }}>
                              {a.drop_off_area_name}
                            </span>
                            {a.drop_off_skill_name && (
                              <div className="text-xs text-muted-foreground">{a.drop_off_skill_name}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {a.saw_report ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto" />
                        ) : (
                          <XCircle className="w-4 h-4 text-muted-foreground/40 mx-auto" />
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {a.cta_clicked ? (
                          <MousePointerClick className="w-4 h-4 text-green-600 mx-auto" />
                        ) : (
                          <XCircle className="w-4 h-4 text-muted-foreground/40 mx-auto" />
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssessmentToDelete({ id: a.assessment_id, babyId: a.baby_id, name: a.baby_name });
                            setDeleteConfirmOpen(true);
                          }}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!individualAssessments || individualAssessments.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  No hay assessments en el rango de fechas seleccionado
                </div>
              )}
            </div>

            {/* Pagination */}
            {individualAssessments && individualAssessments.length > itemsPerPage && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <span className="text-sm text-muted-foreground">
                  {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, individualAssessments.length)} de {individualAssessments.length}
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">
                    {currentPage} / {totalPages}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ============================================================ */}
        {/* 6. AGE DISTRIBUTION (collapsible) */}
        {/* ============================================================ */}
        {ageDistribution && (
          <Collapsible defaultOpen={false}>
            <Card>
              <CardHeader className="pb-3">
                <CollapsibleTrigger className="flex items-center justify-between w-full group">
                  <CardTitle className="flex items-center gap-2">
                    <Baby className="w-5 h-5" />
                    Distribución de Edades
                  </CardTitle>
                  <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-secondary/50 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-primary">{ageDistribution.average}</p>
                      <p className="text-sm text-muted-foreground">Promedio (meses)</p>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-primary">{ageDistribution.median}</p>
                      <p className="text-sm text-muted-foreground">Mediana</p>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold">{ageDistribution.min}</p>
                      <p className="text-sm text-muted-foreground">Mínimo</p>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold">{ageDistribution.max}</p>
                      <p className="text-sm text-muted-foreground">Máximo</p>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-primary">{ageDistribution.total}</p>
                      <p className="text-sm text-muted-foreground">Total</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {ageDistribution.distribution.map((range) => (
                      <div key={range.label} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{range.label}</span>
                          <span className="text-muted-foreground">{range.count} ({range.percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="h-6 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${Math.max(range.percentage, 2)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* ============================================================ */}
        {/* 7. EMAIL METRICS */}
        {/* ============================================================ */}
        {fullFunnel && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Métricas de Email
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg border p-4 text-center space-y-1">
                  <p className="text-3xl font-bold text-primary">{fullFunnel.emails_at_profile || 0}</p>
                  <p className="text-sm font-medium">Emails en perfil</p>
                  <p className="text-xs text-muted-foreground">Dejaron email al crear perfil</p>
                </div>
                <div className="rounded-lg border p-4 text-center space-y-1">
                  <p className="text-3xl font-bold text-primary">{fullFunnel.emails_post_assessment || 0}</p>
                  <p className="text-sm font-medium">Emails post-assessment</p>
                  <p className="text-xs text-muted-foreground">Dejaron email al ver reporte</p>
                </div>
                <div className="rounded-lg border p-4 text-center space-y-1">
                  <p className="text-3xl font-bold text-primary">{fullFunnel.babies_with_email || 0}</p>
                  <p className="text-sm font-medium">Total con email</p>
                  <p className="text-xs text-muted-foreground">Bebés con email registrado</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialogs */}
      <AssessmentBreakdownDialog
        assessmentId={selectedAssessment?.id || null}
        babyName={selectedAssessment?.name || ''}
        open={breakdownOpen}
        onOpenChange={setBreakdownOpen}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar el assessment de <strong>{assessmentToDelete?.name}</strong>?
              <strong className="block mt-2 text-destructive">Esta acción no se puede deshacer.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteAllConfirmOpen} onOpenChange={setDeleteAllConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ ¿Eliminar TODOS los assessments?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán <strong>{individualAssessments?.length || 0}</strong> assessments y todos los datos asociados.
              <strong className="block mt-2 text-destructive">Esta acción no se puede deshacer.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingAll}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll} disabled={deletingAll} className="bg-destructive hover:bg-destructive/90">
              {deletingAll ? 'Eliminando...' : 'Eliminar Todos'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================
// KPI CARD COMPONENT
// ============================================================
function KpiCard({
  label,
  value,
  subtitle,
  icon,
  valueColor = 'text-primary',
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  valueColor?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-2 mb-1 text-muted-foreground">
          {icon}
          <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        </div>
        <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
