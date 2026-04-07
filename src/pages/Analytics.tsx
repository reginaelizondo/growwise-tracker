import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Loader2, RefreshCw, TrendingDown, Users, Clock, Target, CalendarIcon, X,
  Trash2, Baby, ChevronDown, ChevronLeft, ChevronRight, BarChart3, Eye,
  MousePointerClick, ArrowDown, CheckCircle2, XCircle, AlertTriangle,
  MoreVertical, Download, Lock, DollarSign,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format, subDays, startOfDay } from 'date-fns';
import { AssessmentBreakdownDialog } from '@/components/AssessmentBreakdownDialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import logoKineduBlue from '@/assets/logo-kinedu-blue.png';

// ============================================================
// CONFIG
// ============================================================
const ANALYTICS_PASSWORD = import.meta.env.VITE_ANALYTICS_PASSWORD || 'kinedu2024';

const FUNNEL_LABEL_MAP: Record<string, string> = {
  'Landing Click': 'Clic en Landing',
  'Nombre': 'Nombre',
  'Cumpleaños': 'Cumpleaños',
  'Email': 'Email',
  'Áreas → Continuar': 'Áreas → Continuar',
  'Assessment Creado': 'Assessment Creado',
  '1+ Respuesta': '1+ Respuesta',
  '50%+ Completado': '50%+ Completado',
  'Assessment Completo': 'Assessment Completo',
  'Vio Reporte': 'Vio Reporte',
  'Click en CTA': 'Clic en CTA Kinedu',
};

const DATE_PRESETS = [
  { label: 'Hoy', getRange: () => ({ start: startOfDay(new Date()), end: undefined as Date | undefined }) },
  { label: '7 días', getRange: () => ({ start: subDays(new Date(), 7), end: undefined as Date | undefined }) },
  { label: '30 días', getRange: () => ({ start: subDays(new Date(), 30), end: undefined as Date | undefined }) },
  { label: 'Todo', getRange: () => ({ start: undefined as Date | undefined, end: undefined as Date | undefined }) },
];

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
  emails_sent: number;
  emails_opened: number;
  email_open_rate: number;
  completion_rate: number;
  // A/B test
  landing_views: number;
  landing_views_a: number;
  landing_views_b: number;
  landing_clicks_a: number;
  landing_clicks_b: number;
  ctr_a: number;
  ctr_b: number;
}

interface MetaAdsData {
  configured: boolean;
  error?: string;
  campaign_name: string;
  adset_name: string;
  impressions: number;
  clicks: number;
  link_clicks: number;
  landing_page_views: number;
  reach: number;
  frequency: number;
  spend: number;
  cpc: number;
  cpm: number;
  ctr: number;
  cost_per_link_click: number;
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
  // Auth
  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem('analytics_auth') === 'true');
  const [passwordInput, setPasswordInput] = useState('');

  // Data
  const [fullFunnel, setFullFunnel] = useState<FullFunnelData | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStatData[]>([]);
  const [dropOffByArea, setDropOffByArea] = useState<DropOffByAreaData[]>([]);
  const [individualAssessments, setIndividualAssessments] = useState<IndividualAssessmentData[]>([]);
  const [ageDistribution, setAgeDistribution] = useState<AgeDistributionData | null>(null);
  const [metaAds, setMetaAds] = useState<MetaAdsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Date filters
  const [startDate, setStartDate] = useState<Date | undefined>(new Date('2026-03-20'));
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<string>('Todo');

  // Interactions
  const [selectedAssessment, setSelectedAssessment] = useState<{ id: string; name: string } | null>(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [assessmentToDelete, setAssessmentToDelete] = useState<{ id: string; babyId: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Meta Ads manual inputs (persisted in localStorage)
  const [metaSpend, setMetaSpend] = useState<string>(() => localStorage.getItem('analytics_meta_spend') || '');
  const [ftStarts, setFtStarts] = useState<string>(() => localStorage.getItem('analytics_ft_starts') || '');
  const [ftConversion, setFtConversion] = useState<string>(() => localStorage.getItem('analytics_ft_conversion') || '');

  // Persist manual inputs
  useEffect(() => { localStorage.setItem('analytics_meta_spend', metaSpend); }, [metaSpend]);
  useEffect(() => { localStorage.setItem('analytics_ft_starts', ftStarts); }, [ftStarts]);
  useEffect(() => { localStorage.setItem('analytics_ft_conversion', ftConversion); }, [ftConversion]);

  // Load data when authenticated or date filters change
  useEffect(() => {
    if (isAuthenticated) loadAnalytics();
  }, [isAuthenticated, startDate, endDate]);

  // Auto-refresh every 60s
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => loadAnalytics(), 60_000);
    return () => clearInterval(interval);
  }, [isAuthenticated, startDate, endDate]);

  // ============================================================
  // AUTH
  // ============================================================
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ANALYTICS_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem('analytics_auth', 'true');
    } else {
      toast({ variant: 'destructive', title: 'Contraseña incorrecta' });
      setPasswordInput('');
    }
  };

  // ============================================================
  // DATA LOADING
  // ============================================================
  const loadAnalytics = async () => {
    setLoading(true);
    setCurrentPage(1);
    try {
      const filters: any = {};
      if (startDate) filters.startDate = format(startDate, 'yyyy-MM-dd');
      if (endDate) filters.endDate = format(endDate, 'yyyy-MM-dd');

      const [funnelResult, dailyResult, dropOffResult, individualResult, ageResult, metaResult] = await Promise.all([
        supabase.functions.invoke('analytics-query', { body: { reportType: 'full_funnel', filters } }),
        supabase.functions.invoke('analytics-query', { body: { reportType: 'daily_stats', filters } }),
        supabase.functions.invoke('analytics-query', { body: { reportType: 'drop_off_by_area', filters } }),
        supabase.functions.invoke('analytics-query', { body: { reportType: 'individual_assessments', filters } }),
        supabase.functions.invoke('analytics-query', { body: { reportType: 'age_distribution', filters } }),
        supabase.functions.invoke('analytics-query', { body: { reportType: 'meta_ads', filters } }),
      ]);

      if (funnelResult.data) setFullFunnel(funnelResult.data);
      if (dailyResult.data) setDailyStats(dailyResult.data);
      if (dropOffResult.data) setDropOffByArea(dropOffResult.data);
      if (individualResult.data) setIndividualAssessments(individualResult.data);
      if (ageResult.data) setAgeDistribution(ageResult.data);
      if (metaResult.data) setMetaAds(metaResult.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // ACTIONS
  // ============================================================
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
        toast({ title: 'Eliminado', description: `${assessmentToDelete.name} eliminado correctamente` });
        loadAnalytics();
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Hubo un error al eliminar' });
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

  const exportCSV = () => {
    if (!individualAssessments || individualAssessments.length === 0) {
      toast({ title: 'Sin datos', description: 'No hay assessments para exportar.' });
      return;
    }
    const headers = [
      'Bebé', 'Edad (meses)', 'Inicio', 'Estado', 'Duración (seg)',
      'Preguntas Contestadas', 'Total Preguntas', 'Progreso %',
      'Área de Abandono', 'Skill de Abandono',
      'Vio Reporte', 'Clic CTA', 'Retrocesos', 'Ayudas', 'Omisiones',
    ];
    const rows = individualAssessments.map(a => [
      a.baby_name,
      a.reference_age_months,
      a.started_at,
      a.status === 'completed' ? 'Completado' : a.status === 'in_progress' ? 'En Progreso' : 'Abandonado',
      a.duration_seconds,
      a.skills_answered,
      a.total_skills,
      a.total_skills > 0 ? ((a.skills_answered / a.total_skills) * 100).toFixed(0) : '0',
      a.drop_off_area_name || '',
      a.drop_off_skill_name || '',
      a.saw_report ? 'Sí' : 'No',
      a.cta_clicked ? 'Sí' : 'No',
      a.back_count,
      a.helper_count,
      a.skip_count,
    ]);
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: 'CSV exportado', description: `${individualAssessments.length} assessments exportados.` });
  };

  // ============================================================
  // HELPERS
  // ============================================================
  const getAreaColor = (areaId: number | null): string => {
    const colors: Record<number, string> = { 1: '#00A3E0', 2: '#00C853', 3: '#FF8A00', 4: '#F06292' };
    return areaId ? colors[areaId] || 'hsl(var(--primary))' : 'hsl(var(--primary))';
  };

  // ============================================================
  // PASSWORD GATE
  // ============================================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader className="text-center space-y-4">
            <img src={logoKineduBlue} alt="Kinedu" className="h-8 mx-auto" />
            <div>
              <CardTitle className="text-xl">Panel de Analytics</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Ingresa la contraseña para acceder</p>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Contraseña"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full">Acceder</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================
  // LOADING
  // ============================================================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Cargando analytics...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // COMPUTED VALUES
  // ============================================================
  const totalPages = Math.ceil((individualAssessments?.length || 0) / itemsPerPage);
  const paginatedAssessments = individualAssessments?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const completedCount = individualAssessments?.filter(a => a.status === 'completed').length || 0;
  const abandonedCount = individualAssessments?.filter(a => a.status === 'abandoned').length || 0;
  const totalAssessments = individualAssessments?.length || 0;
  const completionRate = fullFunnel?.completion_rate || (totalAssessments > 0 ? (completedCount / totalAssessments) * 100 : 0);

  const completedDurations = (individualAssessments || [])
    .filter(a => a.status === 'completed' && a.duration_seconds > 0)
    .map(a => a.duration_seconds)
    .sort((a, b) => a - b);
  const medianDuration = completedDurations.length > 0
    ? completedDurations[Math.floor(completedDurations.length / 2)]
    : 0;

  const ctaClicks = fullFunnel?.cta_clicks || 0;
  const reportViews = fullFunnel?.report_views || 0;
  const ctaRate = reportViews > 0 ? ((ctaClicks / reportViews) * 100) : 0;

  // Meta Ads computed values
  const metaSpendNum = parseFloat(metaSpend) || 0;
  const ftStartsNum = parseFloat(ftStarts) || 0;
  const ftConversionNum = parseFloat(ftConversion) || 0;
  const costPerFt = ftStartsNum > 0 ? metaSpendNum / ftStartsNum : 0;
  const ftConverted = Math.round(ftStartsNum * (ftConversionNum / 100));
  // Revenue estimate: converted users * $9.99 avg (adjustable)
  const revenuePerConversion = 9.99;
  const estimatedRevenue = ftConverted * revenuePerConversion;
  const contributionMargin = estimatedRevenue - metaSpendNum;

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ============================================================ */}
        {/* HEADER */}
        {/* ============================================================ */}
        <div className="space-y-4">
          {/* Row 1: Brand + Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <img src={logoKineduBlue} alt="Kinedu" className="h-7" />
              <Separator orientation="vertical" className="h-8 hidden sm:block" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Panel de Analytics</h1>
                <p className="text-sm text-muted-foreground">Visibilidad completa del journey del usuario</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={exportCSV}>
                    <Download className="w-4 h-4 mr-2" />
                    Exportar CSV
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteAllConfirmOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Borrar Todos los Datos
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={loadAnalytics} variant="outline" size="sm" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Actualizar</span>
              </Button>
            </div>
          </div>

          {/* Row 2: Date Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {DATE_PRESETS.map(preset => (
              <Button
                key={preset.label}
                variant={activePreset === preset.label ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  const r = preset.getRange();
                  setStartDate(r.start);
                  setEndDate(r.end);
                  setActivePreset(preset.label);
                }}
                className="text-xs"
              >
                {preset.label}
              </Button>
            ))}
            <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />
            <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs">
                  <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
                  {startDate ? format(startDate, 'dd MMM yyyy') : 'Desde'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-50" align="end">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(d) => { setStartDate(d); setStartDateOpen(false); setActivePreset(''); }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs">
                  <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
                  {endDate ? format(endDate, 'dd MMM yyyy') : 'Hasta'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-50" align="end">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(d) => { setEndDate(d); setEndDateOpen(false); setActivePreset(''); }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {(startDate || endDate) && activePreset === '' && (
              <Button variant="ghost" size="sm" onClick={() => { setStartDate(undefined); setEndDate(undefined); setActivePreset('Todo'); }}>
                <X className="w-4 h-4" />
              </Button>
            )}
            <span className="text-[10px] text-muted-foreground ml-auto hidden sm:inline">Auto-refresh: 60s</span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* CONVERSION BANNER */}
        {/* ============================================================ */}
        {fullFunnel && (
          <div className="rounded-xl border-2 border-green-200 bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-100 shrink-0">
                <MousePointerClick className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-800/70">Conversión a Kinedu — Objetivo Principal</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-green-700">{ctaRate.toFixed(1)}%</span>
                  <span className="text-sm text-green-600/70">
                    ({ctaClicks} de {reportViews} que vieron reporte)
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground hidden md:block">
              <p>Usuarios que vieron el reporte</p>
              <p>e hicieron clic en el CTA de Kinedu</p>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* META ADS — AD SET (moved above KPIs) */}
        {/* ============================================================ */}
        {metaAds && metaAds.configured && !metaAds.error && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="w-5 h-5" />
                Meta Ads — {metaAds.adset_name || 'Ad Set'}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{metaAds.campaign_name}</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 text-center space-y-1">
                  <p className="text-2xl font-bold text-blue-600">${metaAds.spend.toFixed(2)}</p>
                  <p className="text-sm font-medium text-foreground">Spend</p>
                </div>
                <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-4 text-center space-y-1">
                  <p className="text-2xl font-bold text-indigo-600">{metaAds.impressions.toLocaleString()}</p>
                  <p className="text-sm font-medium text-foreground">Impresiones</p>
                </div>
                <div className="rounded-lg bg-purple-50 border border-purple-100 p-4 text-center space-y-1">
                  <p className="text-2xl font-bold text-purple-600">{metaAds.reach.toLocaleString()}</p>
                  <p className="text-sm font-medium text-foreground">Alcance</p>
                </div>
                <div className="rounded-lg bg-teal-50 border border-teal-100 p-4 text-center space-y-1">
                  <p className="text-2xl font-bold text-teal-600">{metaAds.link_clicks}</p>
                  <p className="text-sm font-medium text-foreground">Link Clicks</p>
                </div>
                <div className="rounded-lg bg-green-50 border border-green-100 p-4 text-center space-y-1">
                  <p className="text-2xl font-bold text-green-600">{metaAds.landing_page_views}</p>
                  <p className="text-sm font-medium text-foreground">Landing Views</p>
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-100 p-4 text-center space-y-1">
                  <p className="text-2xl font-bold text-amber-600">${metaAds.cpc.toFixed(2)}</p>
                  <p className="text-sm font-medium text-foreground">CPC</p>
                </div>
                <div className="rounded-lg bg-rose-50 border border-rose-100 p-4 text-center space-y-1">
                  <p className="text-2xl font-bold text-rose-600">${metaAds.cpm.toFixed(2)}</p>
                  <p className="text-sm font-medium text-foreground">CPM</p>
                </div>
                <div className="rounded-lg bg-cyan-50 border border-cyan-100 p-4 text-center space-y-1">
                  <p className="text-2xl font-bold text-cyan-600">{metaAds.ctr.toFixed(2)}%</p>
                  <p className="text-sm font-medium text-foreground">CTR</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {metaAds && metaAds.error && (
          <Card className="shadow-sm border-amber-200 bg-amber-50">
            <CardContent className="py-4">
              <p className="text-sm text-amber-700">Meta Ads: {metaAds.error}</p>
            </CardContent>
          </Card>
        )}

        {/* ============================================================ */}
        {/* KPI CARDS */}
        {/* ============================================================ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard
            label="Total Sesiones"
            value={fullFunnel?.landing_clicks || 0}
            icon={<Users className="w-4 h-4" />}
            iconBg="bg-blue-100 text-blue-600"
          />
          <KpiCard
            label="Assessments Creados"
            value={fullFunnel?.assessments_created || 0}
            icon={<Target className="w-4 h-4" />}
            iconBg="bg-indigo-100 text-indigo-600"
          />
          <KpiCard
            label="Tasa Completado"
            value={`${completionRate.toFixed(0)}%`}
            icon={<CheckCircle2 className="w-4 h-4" />}
            iconBg={completionRate >= 60 ? 'bg-green-100 text-green-600' : completionRate >= 30 ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}
            valueColor={completionRate >= 60 ? 'text-green-600' : completionRate >= 30 ? 'text-amber-600' : 'text-red-600'}
          />
          <KpiCard
            label="Abandonados"
            value={abandonedCount}
            subtitle={totalAssessments > 0 ? `${((abandonedCount / totalAssessments) * 100).toFixed(0)}%` : undefined}
            icon={<XCircle className="w-4 h-4" />}
            iconBg="bg-red-100 text-red-600"
            valueColor="text-red-600"
          />
          <KpiCard
            label="Duración Mediana"
            value={`${Math.floor(medianDuration / 60)}m ${medianDuration % 60}s`}
            subtitle="(completados)"
            icon={<Clock className="w-4 h-4" />}
            iconBg="bg-amber-100 text-amber-600"
          />
          <KpiCard
            label="Vieron Reporte"
            value={reportViews}
            icon={<Eye className="w-4 h-4" />}
            iconBg="bg-purple-100 text-purple-600"
          />
        </div>

        {/* ============================================================ */}
        {/* FULL FUNNEL */}
        {/* ============================================================ */}
        {fullFunnel && fullFunnel.steps && (() => {
          // Prepend Meta link_clicks as first funnel step if available
          const metaStep = metaAds && metaAds.configured && !metaAds.error && metaAds.link_clicks > 0
            ? [{ label: 'Clicks en Meta', count: metaAds.link_clicks, drop_off_pct: 0 }]
            : [];
          const allSteps = [...metaStep, ...fullFunnel.steps];
          // Recalculate drop-off for the first original step relative to meta clicks
          if (metaStep.length > 0 && allSteps.length > 1) {
            const metaCount = allSteps[0].count;
            const nextCount = allSteps[1].count;
            allSteps[1] = { ...allSteps[1], drop_off_pct: metaCount > 0 ? ((metaCount - nextCount) / metaCount) * 100 : 0 };
          }
          return (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingDown className="w-5 h-5" />
                Funnel Completo del Usuario
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {allSteps.map((step, i) => {
                  const maxCount = allSteps[0].count || 1;
                  const widthPct = maxCount > 0 ? Math.max((step.count / maxCount) * 100, 8) : 8;
                  const colors = [
                    'bg-blue-600', 'bg-blue-500', 'bg-indigo-500', 'bg-violet-500',
                    'bg-purple-500', 'bg-green-600', 'bg-emerald-500', 'bg-teal-500',
                    'bg-green-700', 'bg-cyan-600', 'bg-rose-500',
                  ];
                  const displayLabel = FUNNEL_LABEL_MAP[step.label] || step.label;
                  return (
                    <div key={step.label}>
                      {i > 0 && step.drop_off_pct > 0 && (
                        <div className="flex items-center gap-2 py-1 pl-4">
                          <ArrowDown className="w-3 h-3 text-red-400" />
                          <span className="text-xs text-red-400 font-medium">
                            -{step.drop_off_pct.toFixed(0)}% abandono
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <div className="w-44 text-right text-sm font-medium text-muted-foreground shrink-0">
                          {displayLabel}
                        </div>
                        <div className="flex-1">
                          <div
                            className={`h-9 ${colors[i % colors.length]} rounded-md flex items-center justify-between px-3 text-white font-semibold text-sm transition-all duration-500`}
                            style={{ width: `${widthPct}%`, minWidth: '100px' }}
                          >
                            <span>{step.count}</span>
                            {i > 0 && maxCount > 0 && (
                              <span className="text-white/70 text-xs">
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
          );
        })()}

        {/* ============================================================ */}
        {/* DAILY TREND CHART */}
        {/* ============================================================ */}
        {dailyStats.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
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
                        return `${parts[2]}/${parts[1]}`;
                      }}
                      className="text-xs"
                    />
                    <YAxis className="text-xs" />
                    <RechartsTooltip
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
        {/* DROP-OFF BY AREA */}
        {/* ============================================================ */}
        {dropOffByArea.length > 0 && (() => {
          const areaOrder = [2, 1, 3, 4];
          const sortedAreas = areaOrder
            .map(id => dropOffByArea.find(a => a.area_id === id))
            .filter(Boolean) as DropOffByAreaData[];
          dropOffByArea.forEach(a => { if (!areaOrder.includes(a.area_id)) sortedAreas.push(a); });
          const maxReached = Math.max(...sortedAreas.map(a => a.reached), 1);

          return (
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="w-5 h-5" />
                  Abandono por Área
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {sortedAreas.map((area, i) => {
                    const widthPct = Math.max((area.reached / maxReached) * 100, 15);
                    const color = getAreaColor(area.area_id);
                    return (
                      <div key={area.area_id}>
                        {i > 0 && (
                          <div className="flex items-center gap-2 py-1 pl-4">
                            <ArrowDown className="w-3 h-3 text-red-400" />
                            <span className="text-xs text-red-400 font-medium">
                              {sortedAreas[i - 1].dropped > 0
                                ? `-${sortedAreas[i - 1].drop_off_pct.toFixed(0)}% abandonaron en ${sortedAreas[i - 1].area_name}`
                                : `0% abandono en ${sortedAreas[i - 1].area_name}`}
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
                              className="h-11 rounded-md flex items-center justify-between px-4 text-white font-semibold text-sm transition-all duration-500"
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
                          <ArrowDown className="w-3 h-3 text-red-400" />
                          <span className="text-xs text-red-400 font-medium">
                            {lastArea.dropped > 0
                              ? `-${lastArea.drop_off_pct.toFixed(0)}% abandonaron en ${lastArea.area_name}`
                              : `0% abandono en ${lastArea.area_name}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-40 text-right shrink-0">
                            <span className="text-sm font-semibold text-green-600">Completaron</span>
                          </div>
                          <div className="flex-1">
                            <div
                              className="h-11 rounded-md flex items-center justify-between px-4 text-white font-semibold text-sm bg-green-600"
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
        {/* INDIVIDUAL ASSESSMENTS TABLE */}
        {/* ============================================================ */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5" />
                Assessments Individuales
                <Badge variant="secondary" className="ml-1 text-xs">{individualAssessments?.length || 0}</Badge>
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={exportCSV} className="gap-2 text-muted-foreground text-xs">
                <Download className="w-3.5 h-3.5" />
                CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold">Bebé</TableHead>
                    <TableHead className="font-semibold">Edad</TableHead>
                    <TableHead className="font-semibold">Inicio</TableHead>
                    <TableHead className="font-semibold">Estado</TableHead>
                    <TableHead className="font-semibold">Duración</TableHead>
                    <TableHead className="font-semibold">Progreso</TableHead>
                    <TableHead className="font-semibold">Abandono</TableHead>
                    <TableHead className="font-semibold text-center">Reporte</TableHead>
                    <TableHead className="font-semibold text-center">CTA</TableHead>
                    <TableHead className="font-semibold text-center w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAssessments?.map((a) => (
                    <TableRow
                      key={a.assessment_id}
                      className="cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => {
                        setSelectedAssessment({ id: a.assessment_id, name: a.baby_name });
                        setBreakdownOpen(true);
                      }}
                    >
                      <TableCell className="font-medium text-primary">{a.baby_name}</TableCell>
                      <TableCell className="text-muted-foreground">{a.reference_age_months}m</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {format(new Date(a.started_at), 'dd MMM, HH:mm')}
                      </TableCell>
                      <TableCell>
                        {a.status === 'completed' ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 text-xs font-medium">
                            Completado
                          </Badge>
                        ) : a.status === 'in_progress' ? (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 text-xs font-medium">
                            En Progreso
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 text-xs font-medium">
                            Abandonado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {Math.floor(a.duration_seconds / 60)}m {a.duration_seconds % 60}s
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={a.total_skills > 0 ? (a.skills_answered / a.total_skills) * 100 : 0}
                            className="w-16 h-2"
                            style={{
                              '--progress-color': a.status === 'completed' ? 'hsl(var(--primary))' : getAreaColor(a.last_area_id),
                            } as React.CSSProperties}
                          />
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {a.total_skills > 0 ? ((a.skills_answered / a.total_skills) * 100).toFixed(0) : '0'}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {a.status === 'completed' ? (
                          <span className="text-muted-foreground/40">—</span>
                        ) : a.drop_off_area_name ? (
                          <div>
                            <span className="font-medium text-xs" style={{ color: getAreaColor(a.last_area_id) }}>
                              {a.drop_off_area_name}
                            </span>
                            {a.drop_off_skill_name && (
                              <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">{a.drop_off_skill_name}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {a.saw_report ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto" />
                        ) : (
                          <span className="text-muted-foreground/30">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {a.cta_clicked ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 text-[10px]">Sí</Badge>
                        ) : (
                          <span className="text-muted-foreground/30">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssessmentToDelete({ id: a.assessment_id, babyId: a.baby_id, name: a.baby_name });
                            setDeleteConfirmOpen(true);
                          }}
                          className="text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {(!individualAssessments || individualAssessments.length === 0) && (
                <div className="text-center py-12 text-muted-foreground">
                  No hay assessments en el rango seleccionado
                </div>
              )}
            </div>

            {/* Pagination */}
            {individualAssessments && individualAssessments.length > itemsPerPage && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t">
                <span className="text-xs text-muted-foreground">
                  {((currentPage - 1) * itemsPerPage) + 1} – {Math.min(currentPage * itemsPerPage, individualAssessments.length)} de {individualAssessments.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="h-8 w-8 p-0">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs font-medium px-2">{currentPage} / {totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="h-8 w-8 p-0">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ============================================================ */}
        {/* A/B TEST LANDING PAGE */}
        {/* ============================================================ */}
        {fullFunnel && (fullFunnel.landing_views_a > 0 || fullFunnel.landing_views_b > 0) && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="w-5 h-5" />
                A/B Test — Landing Page
              </CardTitle>
              <p className="text-xs text-muted-foreground">A = Foto del bebe | B = Sneak peek del reporte</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {/* Variant A */}
                <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: '#3b82f6', borderWidth: 2 }}>
                  <p className="text-sm font-bold text-blue-600 text-center">Variante A</p>
                  <p className="text-xs text-center text-muted-foreground">Foto del bebe</p>
                  <div className="text-center space-y-1 pt-2">
                    <p className="text-2xl font-bold text-foreground">{fullFunnel.landing_views_a}</p>
                    <p className="text-xs text-muted-foreground">vistas</p>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-2xl font-bold text-foreground">{fullFunnel.landing_clicks_a}</p>
                    <p className="text-xs text-muted-foreground">clicks CTA</p>
                  </div>
                  <div className="text-center pt-2 border-t">
                    <p className="text-3xl font-extrabold text-blue-600">{fullFunnel.ctr_a.toFixed(1)}%</p>
                    <p className="text-xs font-medium text-muted-foreground">CTR</p>
                  </div>
                </div>

                {/* Variant B */}
                <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: '#8b5cf6', borderWidth: 2 }}>
                  <p className="text-sm font-bold text-purple-600 text-center">Variante B</p>
                  <p className="text-xs text-center text-muted-foreground">Sneak peek reporte</p>
                  <div className="text-center space-y-1 pt-2">
                    <p className="text-2xl font-bold text-foreground">{fullFunnel.landing_views_b}</p>
                    <p className="text-xs text-muted-foreground">vistas</p>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-2xl font-bold text-foreground">{fullFunnel.landing_clicks_b}</p>
                    <p className="text-xs text-muted-foreground">clicks CTA</p>
                  </div>
                  <div className="text-center pt-2 border-t">
                    <p className="text-3xl font-extrabold text-purple-600">{fullFunnel.ctr_b.toFixed(1)}%</p>
                    <p className="text-xs font-medium text-muted-foreground">CTR</p>
                  </div>
                </div>
              </div>

              {/* Winner indicator */}
              {fullFunnel.landing_views_a >= 10 && fullFunnel.landing_views_b >= 10 && (
                <div className="mt-4 text-center">
                  {fullFunnel.ctr_b > fullFunnel.ctr_a ? (
                    <p className="text-sm font-bold text-purple-600">Variante B gana por {(fullFunnel.ctr_b - fullFunnel.ctr_a).toFixed(1)}pp</p>
                  ) : fullFunnel.ctr_a > fullFunnel.ctr_b ? (
                    <p className="text-sm font-bold text-blue-600">Variante A gana por {(fullFunnel.ctr_a - fullFunnel.ctr_b).toFixed(1)}pp</p>
                  ) : (
                    <p className="text-sm font-bold text-muted-foreground">Empate</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ============================================================ */}
        {/* AGE DISTRIBUTION (collapsible) */}
        {/* ============================================================ */}
        {ageDistribution && (
          <Collapsible defaultOpen={false}>
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CollapsibleTrigger className="flex items-center justify-between w-full group">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Baby className="w-5 h-5" />
                    Distribución de Edades
                  </CardTitle>
                  <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-blue-600">{ageDistribution.average}</p>
                      <p className="text-xs text-muted-foreground">Promedio (meses)</p>
                    </div>
                    <div className="bg-indigo-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-indigo-600">{ageDistribution.median}</p>
                      <p className="text-xs text-muted-foreground">Mediana</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-slate-600">{ageDistribution.min}</p>
                      <p className="text-xs text-muted-foreground">Mínimo</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-slate-600">{ageDistribution.max}</p>
                      <p className="text-xs text-muted-foreground">Máximo</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-purple-600">{ageDistribution.total}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {ageDistribution.distribution.map((range) => (
                      <div key={range.label} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{range.label}</span>
                          <span className="text-muted-foreground tabular-nums">{range.count} ({range.percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="h-5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary/70 rounded-full transition-all duration-500" style={{ width: `${Math.max(range.percentage, 2)}%` }} />
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
        {/* EMAIL METRICS */}
        {/* ============================================================ */}
        {fullFunnel && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="w-5 h-5" />
                Métricas de Email
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 text-center space-y-1">
                  <p className="text-3xl font-bold text-blue-600">{fullFunnel.emails_at_profile || 0}</p>
                  <p className="text-sm font-medium text-foreground">Emails en perfil</p>
                  <p className="text-xs text-muted-foreground">Dejaron email al crear perfil</p>
                </div>
                <div className="rounded-lg bg-purple-50 border border-purple-100 p-4 text-center space-y-1">
                  <p className="text-3xl font-bold text-purple-600">{fullFunnel.emails_post_assessment || 0}</p>
                  <p className="text-sm font-medium text-foreground">Emails post-assessment</p>
                  <p className="text-xs text-muted-foreground">Dejaron email al ver reporte</p>
                </div>
                <div className="rounded-lg bg-green-50 border border-green-100 p-4 text-center space-y-1">
                  <p className="text-3xl font-bold text-green-600">{fullFunnel.babies_with_email || 0}</p>
                  <p className="text-sm font-medium text-foreground">Total con email</p>
                  <p className="text-xs text-muted-foreground">Bebés con email registrado</p>
                </div>
                <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-4 text-center space-y-1">
                  <p className="text-3xl font-bold text-indigo-600">{fullFunnel.emails_sent || 0}</p>
                  <p className="text-sm font-medium text-foreground">Emails enviados</p>
                  <p className="text-xs text-muted-foreground">Report emails via Resend</p>
                </div>
                <div className="rounded-lg bg-teal-50 border border-teal-100 p-4 text-center space-y-1">
                  <p className="text-3xl font-bold text-teal-600">{fullFunnel.emails_opened || 0}</p>
                  <p className="text-sm font-medium text-foreground">Emails abiertos</p>
                  <p className="text-xs text-muted-foreground">Tracking pixel</p>
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-100 p-4 text-center space-y-1">
                  <p className="text-3xl font-bold text-amber-600">{(fullFunnel.email_open_rate || 0).toFixed(1)}%</p>
                  <p className="text-sm font-medium text-foreground">Open rate</p>
                  <p className="text-xs text-muted-foreground">Abiertos / Enviados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ============================================================ */}
      {/* DIALOGS */}
      {/* ============================================================ */}
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
            <AlertDialogTitle>¿Eliminar TODOS los assessments?</AlertDialogTitle>
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
  iconBg = 'bg-primary/10 text-primary',
  valueColor = 'text-foreground',
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  iconBg?: string;
  valueColor?: string;
}) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="pt-4 pb-3 px-4">
        <div className={`inline-flex p-2 rounded-lg mb-2 ${iconBg}`}>
          {icon}
        </div>
        <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
        <p className="text-xs font-medium text-muted-foreground mt-0.5">{label}</p>
        {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
