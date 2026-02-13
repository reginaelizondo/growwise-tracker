import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, RefreshCw, TrendingDown, Users, Clock, Target, CalendarIcon, X, Trash2, Baby, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format } from 'date-fns';
import { AssessmentBreakdownDialog } from '@/components/AssessmentBreakdownDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';

interface DropOffData {
  question_index: number;
  total_views: number;
  drop_offs: number;
  drop_off_rate: number;
}

interface FunnelData {
  started: number;
  answered_at_least_one: number;
  completed: number;
  conversion_rate: number;
  engagement_rate: number;
}

interface TimeData {
  milestone_id: number;
  avg_duration_seconds: number;
  median_duration_seconds: number;
  sample_size: number;
}

interface SkillData {
  skill_id: number;
  total_responses: number;
  yes_rate: number;
  no_rate: number;
}

interface ConversionFunnelData {
  started: number;
  engaged: number;
  halfway: number;
  completed: number;
  engagement_rate: number;
  halfway_rate: number;
  completion_rate: number;
}

interface AreaProgressionFunnelData {
  created: number;
  started_quiz: number;
  physical: number;
  cognitive: number;
  linguistic: number;
  socioemotional: number;
  completed: number;
  start_rate: number;
  physical_rate: number;
  cognitive_rate: number;
  linguistic_rate: number;
  socioemotional_rate: number;
  completion_rate: number;
}

interface IndividualAssessmentData {
  assessment_id: string;
  baby_id: string;
  baby_name: string;
  started_at: string;
  completed_at: string | null;
  status: 'completed' | 'in_progress' | 'abandoned';
  skills_answered: number;
  total_skills: number;
  last_milestone_id: number | null;
  last_skill_id: number | null;
  last_area_id: number | null;
  last_question_index: number | null;
  duration_seconds: number;
  back_count: number;
  helper_count: number;
  skip_count: number;
  last_activity: string;
  time_on_report_seconds: number | null;
}

interface AgeDistributionData {
  total: number;
  average: number;
  median: number;
  min: number;
  max: number;
  distribution: {
    label: string;
    count: number;
    percentage: number;
  }[];
}

interface PageEventsData {
  landing_start_clicks: number;
  profile_continue_clicks: number;
}

export default function Analytics() {
  const [dropOffData, setDropOffData] = useState<DropOffData[]>([]);
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [timeData, setTimeData] = useState<TimeData[]>([]);
  const [skillData, setSkillData] = useState<SkillData[]>([]);
  const [conversionFunnel, setConversionFunnel] = useState<ConversionFunnelData | null>(null);
  const [areaProgressionFunnel, setAreaProgressionFunnel] = useState<AreaProgressionFunnelData | null>(null);
  const [individualAssessments, setIndividualAssessments] = useState<IndividualAssessmentData[]>([]);
  const [ageDistribution, setAgeDistribution] = useState<AgeDistributionData | null>(null);
  const [pageEvents, setPageEvents] = useState<PageEventsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  // Helper function to get area color
  const getAreaColor = (areaId: number | null): string => {
    const colors: Record<number, string> = {
      1: '#00A3E0', // Physical - Azul
      2: '#00C853', // Cognitive - Verde
      3: '#FF8A00', // Linguistic - Naranja
      4: '#F06292', // Social-emotional - Rosa
    };
    return areaId ? colors[areaId] || 'hsl(var(--primary))' : 'hsl(var(--primary))';
  };
  const [selectedAssessment, setSelectedAssessment] = useState<{ id: string; name: string } | null>(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [assessmentToDelete, setAssessmentToDelete] = useState<{id: string, babyId: string, name: string} | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;


  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [startDate, endDate]);

  const handleDelete = async () => {
    if (!assessmentToDelete) return;
    setDeleting(true);
    
    try {
      const { error } = await supabase.functions.invoke('delete-assessment', {
        body: { babyId: assessmentToDelete.babyId, adminDelete: true }
      });
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Error al eliminar",
          description: error.message
        });
      } else {
        toast({
          title: "Eliminado correctamente",
          description: `${assessmentToDelete.name} ha sido eliminado`
        });
        loadAnalytics(); // Recargar datos
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al eliminar",
        description: "Hubo un error al eliminar el assessment"
      });
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
      // Eliminar todos los assessments uno por uno
      for (const assessment of individualAssessments) {
        try {
          const { error } = await supabase.functions.invoke('delete-assessment', {
            body: { babyId: assessment.baby_id, adminDelete: true }
          });

          if (error) {
            console.error(`Error deleting assessment for ${assessment.baby_name}:`, error);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (error) {
          console.error(`Error deleting assessment for ${assessment.baby_name}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Assessments eliminados",
          description: `${successCount} assessment(s) eliminado(s) exitosamente${errorCount > 0 ? `. ${errorCount} fallaron.` : '.'}`,
        });
      }

      if (errorCount > 0 && successCount === 0) {
        toast({
          title: "Error",
          description: "No se pudieron eliminar los assessments. Por favor intenta de nuevo.",
          variant: "destructive",
        });
      }

      // Recargar los datos
      loadAnalytics();
    } catch (error) {
      console.error('Error in delete all:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error durante la eliminación. Por favor intenta de nuevo.",
      });
    } finally {
      setDeletingAll(false);
      setDeleteAllConfirmOpen(false);
    }
  };

  const loadAnalytics = async () => {
    setLoading(true);
    setCurrentPage(1); // Reset pagination on reload
    try {
      const filters: any = {};
      if (startDate) filters.startDate = format(startDate, 'yyyy-MM-dd');
      if (endDate) filters.endDate = format(endDate, 'yyyy-MM-dd');

      const [dropOffResult, funnelResult, timeResult, skillResult, conversionResult, areaProgressionResult, individualResult, ageDistributionResult, pageEventsResult] = await Promise.all([
        supabase.functions.invoke('analytics-query', {
          body: { reportType: 'drop_off_by_question', filters }
        }),
        supabase.functions.invoke('analytics-query', {
          body: { reportType: 'completion_funnel', filters }
        }),
        supabase.functions.invoke('analytics-query', {
          body: { reportType: 'time_per_question', filters }
        }),
        supabase.functions.invoke('analytics-query', {
          body: { reportType: 'skill_performance', filters }
        }),
        supabase.functions.invoke('analytics-query', {
          body: { reportType: 'conversion_funnel', filters }
        }),
        supabase.functions.invoke('analytics-query', {
          body: { reportType: 'area_progression_funnel', filters }
        }),
        supabase.functions.invoke('analytics-query', {
          body: { reportType: 'individual_assessments', filters }
        }),
        supabase.functions.invoke('analytics-query', {
          body: { reportType: 'age_distribution', filters }
        }),
        supabase.functions.invoke('analytics-query', {
          body: { reportType: 'page_events', filters }
        })
      ]);

      if (dropOffResult.data) setDropOffData(dropOffResult.data);
      if (funnelResult.data) setFunnelData(funnelResult.data);
      if (timeResult.data) setTimeData(timeResult.data);
      if (skillResult.data) setSkillData(skillResult.data);
      if (conversionResult.data) setConversionFunnel(conversionResult.data);
      if (areaProgressionResult.data) setAreaProgressionFunnel(areaProgressionResult.data);
      if (individualResult.data) setIndividualAssessments(individualResult.data);
      if (ageDistributionResult.data) setAgeDistribution(ageDistributionResult.data);
      if (pageEventsResult.data) setPageEvents(pageEventsResult.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate pagination
  const totalPages = Math.ceil((individualAssessments?.length || 0) / itemsPerPage);
  const paginatedAssessments = individualAssessments?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Assessment Analytics</h1>
            <p className="text-muted-foreground mt-1">Comportamiento de usuarios en evaluaciones</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
          {/* Date Filters */}
            <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {startDate ? format(startDate, 'PP') : 'Desde'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-50" align="end">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => {
                    setStartDate(date);
                    setStartDateOpen(false);
                  }}
                  initialFocus
                />
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
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => {
                    setEndDate(date);
                    setEndDateOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {(startDate || endDate) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setStartDate(undefined);
                  setEndDate(undefined);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            )}

            <Button onClick={loadAnalytics} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </div>

        {/* Métricas Agregadas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Clicks en Landing */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-primary">
                {pageEvents?.landing_start_clicks || 0}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Clicks en Landing</p>
              <p className="text-xs text-muted-foreground">"Start Assessment"</p>
            </CardContent>
          </Card>
          
          {/* Clicks en Profile */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-primary">
                {pageEvents?.profile_continue_clicks || 0}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Clicks en Profile</p>
              <p className="text-xs text-muted-foreground">"Continue to Assessment"</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-primary">
                {individualAssessments?.filter(a => a.status === 'completed').length || 0}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Completados</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-destructive">
                {individualAssessments?.filter(a => a.status === 'abandoned').length || 0}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Abandonados</p>
              {individualAssessments && individualAssessments.length > 0 && (
                <p className="text-xs text-destructive mt-1">
                  {((individualAssessments.filter(a => a.status === 'abandoned').length / individualAssessments.length) * 100).toFixed(1)}%
                </p>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-primary">
                {(() => {
                  if (!individualAssessments || individualAssessments.length === 0) return '0m';
                  
                  // Filtrar duraciones válidas y ordenar para calcular mediana
                  const validDurations = individualAssessments
                    .map(a => a.duration_seconds)
                    .filter(d => d > 0)
                    .sort((a, b) => a - b);
                  
                  if (validDurations.length === 0) return '0m';
                  
                  // Calcular mediana (más robusta contra outliers)
                  const mid = Math.floor(validDurations.length / 2);
                  const medianSeconds = validDurations.length % 2 === 0
                    ? (validDurations[mid - 1] + validDurations[mid]) / 2
                    : validDurations[mid];
                  
                  return `${Math.floor(medianSeconds / 60)}m`;
                })()}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Tiempo Promedio (mediana)</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-primary">
                {individualAssessments && individualAssessments.length > 0 
                  ? (individualAssessments.reduce((sum, a) => 
                      sum + (a.skills_answered / a.total_skills), 0
                    ) / individualAssessments.length * 100).toFixed(0)
                  : 0}%
              </div>
              <p className="text-sm text-muted-foreground mt-1">Progreso Promedio</p>
            </CardContent>
          </Card>
        </div>

        {/* Distribución de Edades */}
        {ageDistribution && (
          <Collapsible defaultOpen={false}>
            <Card>
              <CardHeader className="pb-3">
                <CollapsibleTrigger className="flex items-center justify-between w-full group">
                  <CardTitle className="flex items-center gap-2">
                    <Baby className="w-5 h-5" />
                    Distribución de Edades de Bebés
                  </CardTitle>
                  <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-secondary/50 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-primary">{ageDistribution.average}</p>
                      <p className="text-sm text-muted-foreground">Edad Promedio (meses)</p>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-primary">{ageDistribution.median}</p>
                      <p className="text-sm text-muted-foreground">Mediana (meses)</p>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold">{ageDistribution.min}</p>
                      <p className="text-sm text-muted-foreground">Mínimo (meses)</p>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold">{ageDistribution.max}</p>
                      <p className="text-sm text-muted-foreground">Máximo (meses)</p>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-primary">{ageDistribution.total}</p>
                      <p className="text-sm text-muted-foreground">Total Assessments</p>
                    </div>
                  </div>
                  
                  {/* Bar chart visualization */}
                  <div className="space-y-3">
                    {ageDistribution.distribution.map((range) => (
                      <div key={range.label} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{range.label}</span>
                          <span className="text-muted-foreground">{range.count} ({range.percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="h-8 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(range.percentage, 2)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Tabla de Assessments Individuales */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Assessments Individuales
              </CardTitle>
              {individualAssessments && individualAssessments.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteAllConfirmOpen(true)}
                  className="gap-2"
                >
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
                    <th className="text-left p-3 text-sm font-medium">Inicio</th>
                    <th className="text-left p-3 text-sm font-medium">Status</th>
                    <th className="text-left p-3 text-sm font-medium">Duración</th>
                    <th className="text-left p-3 text-sm font-medium">Tiempo en Reporte</th>
                    <th className="text-left p-3 text-sm font-medium">Progreso</th>
                    <th className="text-left p-3 text-sm font-medium">Último Punto</th>
                    <th className="text-center p-3 text-sm font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAssessments?.map((assessment) => (
                    <tr 
                      key={assessment.assessment_id} 
                      className="border-b hover:bg-secondary/20 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedAssessment({ 
                          id: assessment.assessment_id, 
                          name: assessment.baby_name 
                        });
                        setBreakdownOpen(true);
                      }}
                    >
                      <td className="p-3 font-medium text-primary hover:underline">{assessment.baby_name}</td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {format(new Date(assessment.started_at), 'MMM dd, HH:mm')}
                      </td>
                      <td className="p-3">
                        <Badge variant={
                          assessment.status === 'completed' ? 'default' : 
                          assessment.status === 'in_progress' ? 'secondary' : 
                          'destructive'
                        }>
                          {assessment.status === 'completed' ? '✅ Completado' :
                           assessment.status === 'in_progress' ? '🔄 En Progreso' :
                           '❌ Abandonado'}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm">
                        {Math.floor(assessment.duration_seconds / 60)}m {assessment.duration_seconds % 60}s
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {assessment.time_on_report_seconds !== null
                          ? `${Math.floor(assessment.time_on_report_seconds / 60)}m ${assessment.time_on_report_seconds % 60}s`
                          : 'N/A'}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={assessment.total_skills > 0 ? (assessment.skills_answered / assessment.total_skills) * 100 : 0} 
                            className="w-24"
                            style={{ 
                              '--progress-color': assessment.status === 'completed' 
                                ? 'hsl(var(--primary))' 
                                : getAreaColor(assessment.last_area_id)
                            } as React.CSSProperties}
                          />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {assessment.total_skills > 0
                              ? ((assessment.skills_answered / assessment.total_skills) * 100).toFixed(0)
                              : '0'}%
                          </span>
                        </div>
                      </td>
                       <td className="p-3 text-sm">
                        {assessment.status === 'completed' ? (
                          <span className="font-medium text-primary">Report page</span>
                        ) : assessment.last_area_id ? (
                          <div>
                            <span className="font-medium">Área {assessment.last_area_id}</span>
                            {assessment.last_skill_id && ` - Skill ${assessment.last_skill_id}`}
                            {assessment.last_milestone_id && (
                              <div className="text-xs text-muted-foreground">
                                Milestone {assessment.last_milestone_id}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssessmentToDelete({
                              id: assessment.assessment_id,
                              babyId: assessment.baby_id,
                              name: assessment.baby_name
                            });
                            setDeleteConfirmOpen(true);
                          }}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          🗑️
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
            
            {/* Pagination Controls */}
            {individualAssessments && individualAssessments.length > itemsPerPage && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <span className="text-sm text-muted-foreground">
                  Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, individualAssessments.length)} de {individualAssessments.length}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Funnel de Conversión Real */}
        {conversionFunnel && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Funnel de Conversión
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Iniciados - 100% */}
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <div className="w-40 text-right text-sm font-medium">Iniciados</div>
                  <div className="flex-1">
                    <div 
                      className="h-16 bg-primary rounded-lg flex items-center justify-between px-6 text-primary-foreground font-bold shadow-lg"
                      style={{ width: '100%' }}
                    >
                      <span>{conversionFunnel.started} assessments</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enganchados - respondieron 1+ */}
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <div className="w-40 text-right text-sm font-medium">Enganchados (1+ respuesta)</div>
                  <div className="flex-1">
                    <div 
                      className="h-14 bg-blue-500 rounded-lg flex items-center justify-between px-6 text-white font-semibold shadow-md"
                      style={{ 
                        width: `${Math.max(conversionFunnel.engagement_rate, 15)}%`,
                        minWidth: '200px'
                      }}
                    >
                      <span>{conversionFunnel.engaged} usuarios</span>
                      <span>{conversionFunnel.engagement_rate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 50% Completado */}
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <div className="w-40 text-right text-sm font-medium">50% Completado</div>
                  <div className="flex-1">
                    <div 
                      className="h-14 bg-green-500 rounded-lg flex items-center justify-between px-6 text-white font-semibold shadow-md"
                      style={{ 
                        width: `${Math.max(conversionFunnel.halfway_rate, 10)}%`,
                        minWidth: '200px'
                      }}
                    >
                      <span>{conversionFunnel.halfway} usuarios</span>
                      <span>{conversionFunnel.halfway_rate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Completados */}
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <div className="w-40 text-right text-sm font-medium">Completados</div>
                  <div className="flex-1">
                    <div 
                      className="h-16 bg-purple-500 rounded-lg flex items-center justify-between px-6 text-white font-bold shadow-lg"
                      style={{ 
                        width: `${Math.max(conversionFunnel.completion_rate, 10)}%`,
                        minWidth: '200px'
                      }}
                    >
                      <span>{conversionFunnel.completed} reportes</span>
                      <span>{conversionFunnel.completion_rate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Funnel de Avance por Área */}
        {areaProgressionFunnel && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Funnel de Avance por Área
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs defaultValue="physical-first" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="physical-first">Physical Primero</TabsTrigger>
                  <TabsTrigger value="cognitive-first">Cognitive Primero</TabsTrigger>
                </TabsList>
                
                {/* Physical First Tab */}
                <TabsContent value="physical-first" className="space-y-6">
                  {/* Creado */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <div className="w-48 text-right text-sm font-medium">📊 Creado</div>
                      <div className="flex-1">
                        <div 
                          className="h-16 bg-secondary rounded-lg flex items-center justify-between px-6 text-secondary-foreground font-bold shadow-lg border-2 border-border"
                          style={{ width: '100%' }}
                        >
                          <span>{areaProgressionFunnel.created} assessments</span>
                          <span>100%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Empezaron Quiz */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <div className="w-48 text-right text-sm font-medium">▶️ Empezaron Quiz</div>
                      <div className="flex-1">
                        <div 
                          className="h-14 bg-green-600 rounded-lg flex items-center justify-between px-6 text-white font-semibold shadow-md"
                          style={{ 
                            width: `${Math.max(areaProgressionFunnel.start_rate, 10)}%`,
                            minWidth: '200px'
                          }}
                        >
                          <span>{areaProgressionFunnel.started_quiz}</span>
                          <span>{areaProgressionFunnel.start_rate.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Physical */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <div className="w-48 text-right text-sm font-medium">🏃 Physical</div>
                      <div className="flex-1">
                        <div 
                          className="h-14 bg-blue-500 rounded-lg flex items-center justify-between px-6 text-white font-semibold shadow-md"
                          style={{ 
                            width: `${Math.max(areaProgressionFunnel.physical_rate, 10)}%`,
                            minWidth: '200px'
                          }}
                        >
                          <span>{areaProgressionFunnel.physical}</span>
                          <span>{areaProgressionFunnel.physical_rate.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cognitive */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <div className="w-48 text-right text-sm font-medium">🧠 Cognitive</div>
                      <div className="flex-1">
                        <div 
                          className="h-14 bg-green-500 rounded-lg flex items-center justify-between px-6 text-white font-semibold shadow-md"
                          style={{ 
                            width: `${Math.max(areaProgressionFunnel.cognitive_rate, 10)}%`,
                            minWidth: '200px'
                          }}
                        >
                          <span>{areaProgressionFunnel.cognitive}</span>
                          <span>{areaProgressionFunnel.cognitive_rate.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Linguistic */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <div className="w-48 text-right text-sm font-medium">💬 Linguistic</div>
                      <div className="flex-1">
                        <div 
                          className="h-14 bg-orange-500 rounded-lg flex items-center justify-between px-6 text-white font-semibold shadow-md"
                          style={{ 
                            width: `${Math.max(areaProgressionFunnel.linguistic_rate, 10)}%`,
                            minWidth: '200px'
                          }}
                        >
                          <span>{areaProgressionFunnel.linguistic}</span>
                          <span>{areaProgressionFunnel.linguistic_rate.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Socio-emotional */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <div className="w-48 text-right text-sm font-medium">❤️ Socio-emotional</div>
                      <div className="flex-1">
                        <div 
                          className="h-14 bg-pink-500 rounded-lg flex items-center justify-between px-6 text-white font-semibold shadow-md"
                          style={{ 
                            width: `${Math.max(areaProgressionFunnel.socioemotional_rate, 10)}%`,
                            minWidth: '200px'
                          }}
                        >
                          <span>{areaProgressionFunnel.socioemotional}</span>
                          <span>{areaProgressionFunnel.socioemotional_rate.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Completaron Reporte */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <div className="w-48 text-right text-sm font-medium">📋 Completaron Reporte</div>
                      <div className="flex-1">
                        <div 
                          className="h-16 bg-secondary rounded-lg flex items-center justify-between px-6 text-secondary-foreground font-bold shadow-lg border-2 border-border"
                          style={{ 
                            width: `${Math.max(areaProgressionFunnel.completion_rate, 10)}%`,
                            minWidth: '200px'
                          }}
                        >
                          <span>{areaProgressionFunnel.completed} reportes</span>
                          <span>{areaProgressionFunnel.completion_rate.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Cognitive First Tab */}
                <TabsContent value="cognitive-first" className="space-y-6">
                  {/* Creado */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <div className="w-48 text-right text-sm font-medium">📊 Creado</div>
                      <div className="flex-1">
                        <div 
                          className="h-16 bg-secondary rounded-lg flex items-center justify-between px-6 text-secondary-foreground font-bold shadow-lg border-2 border-border"
                          style={{ width: '100%' }}
                        >
                          <span>{areaProgressionFunnel.created} assessments</span>
                          <span>100%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Empezaron Quiz */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <div className="w-48 text-right text-sm font-medium">▶️ Empezaron Quiz</div>
                      <div className="flex-1">
                        <div 
                          className="h-14 bg-green-600 rounded-lg flex items-center justify-between px-6 text-white font-semibold shadow-md"
                          style={{ 
                            width: `${Math.max(areaProgressionFunnel.start_rate, 10)}%`,
                            minWidth: '200px'
                          }}
                        >
                          <span>{areaProgressionFunnel.started_quiz}</span>
                          <span>{areaProgressionFunnel.start_rate.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cognitive (first in this version) */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <div className="w-48 text-right text-sm font-medium">🧠 Cognitive</div>
                      <div className="flex-1">
                        <div 
                          className="h-14 bg-green-500 rounded-lg flex items-center justify-between px-6 text-white font-semibold shadow-md"
                          style={{ 
                            width: `${Math.max(areaProgressionFunnel.cognitive_rate, 10)}%`,
                            minWidth: '200px'
                          }}
                        >
                          <span>{areaProgressionFunnel.cognitive}</span>
                          <span>{areaProgressionFunnel.cognitive_rate.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Physical (second in this version) */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <div className="w-48 text-right text-sm font-medium">🏃 Physical</div>
                      <div className="flex-1">
                        <div 
                          className="h-14 bg-blue-500 rounded-lg flex items-center justify-between px-6 text-white font-semibold shadow-md"
                          style={{ 
                            width: `${Math.max(areaProgressionFunnel.physical_rate, 10)}%`,
                            minWidth: '200px'
                          }}
                        >
                          <span>{areaProgressionFunnel.physical}</span>
                          <span>{areaProgressionFunnel.physical_rate.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Linguistic */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <div className="w-48 text-right text-sm font-medium">💬 Linguistic</div>
                      <div className="flex-1">
                        <div 
                          className="h-14 bg-orange-500 rounded-lg flex items-center justify-between px-6 text-white font-semibold shadow-md"
                          style={{ 
                            width: `${Math.max(areaProgressionFunnel.linguistic_rate, 10)}%`,
                            minWidth: '200px'
                          }}
                        >
                          <span>{areaProgressionFunnel.linguistic}</span>
                          <span>{areaProgressionFunnel.linguistic_rate.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Socio-emotional */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <div className="w-48 text-right text-sm font-medium">❤️ Socio-emotional</div>
                      <div className="flex-1">
                        <div 
                          className="h-14 bg-pink-500 rounded-lg flex items-center justify-between px-6 text-white font-semibold shadow-md"
                          style={{ 
                            width: `${Math.max(areaProgressionFunnel.socioemotional_rate, 10)}%`,
                            minWidth: '200px'
                          }}
                        >
                          <span>{areaProgressionFunnel.socioemotional}</span>
                          <span>{areaProgressionFunnel.socioemotional_rate.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Completaron Reporte */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <div className="w-48 text-right text-sm font-medium">📋 Completaron Reporte</div>
                      <div className="flex-1">
                        <div 
                          className="h-16 bg-secondary rounded-lg flex items-center justify-between px-6 text-secondary-foreground font-bold shadow-lg border-2 border-border"
                          style={{ 
                            width: `${Math.max(areaProgressionFunnel.completion_rate, 10)}%`,
                            minWidth: '200px'
                          }}
                        >
                          <span>{areaProgressionFunnel.completed} reportes</span>
                          <span>{areaProgressionFunnel.completion_rate.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Drop-off by Question */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5" />
                Drop-off por Pregunta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {dropOffData.slice(0, 15).map((q) => (
                  <div key={q.question_index} className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                    <div>
                      <p className="font-medium">Pregunta {q.question_index}</p>
                      <p className="text-xs text-muted-foreground">
                        {q.total_views} vistas, {q.drop_offs} abandonos
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-bold ${q.drop_off_rate > 20 ? 'text-destructive' : 'text-foreground'}`}>
                        {q.drop_off_rate.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Time per Question */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Tiempo por Pregunta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {timeData.slice(0, 15).map((t) => (
                  <div key={t.milestone_id} className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                    <div>
                      <p className="font-medium">Milestone {t.milestone_id}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.sample_size} respuestas
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{t.avg_duration_seconds.toFixed(1)}s</p>
                      <p className="text-xs text-muted-foreground">
                        mediana: {t.median_duration_seconds.toFixed(1)}s
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Skill Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Performance por Skill
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {skillData.slice(0, 12).map((s) => (
                <div key={s.skill_id} className="p-4 bg-secondary/50 rounded-lg">
                  <p className="font-medium mb-2">Skill {s.skill_id}</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Sí:</span>
                      <span className="font-medium text-primary">{s.yes_rate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">No:</span>
                      <span className="font-medium">{s.no_rate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Total:</span>
                      <span>{s.total_responses} respuestas</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assessment Breakdown Dialog */}
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
              ¿Estás seguro de eliminar el assessment de <strong>{assessmentToDelete?.name}</strong>? 
              Esta acción eliminará todos los datos del assessment y del bebé asociado. 
              <strong className="block mt-2 text-destructive">Esta acción no se puede deshacer.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Confirmation Dialog */}
      <AlertDialog open={deleteAllConfirmOpen} onOpenChange={setDeleteAllConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ ¿Eliminar TODOS los assessments?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Esta acción eliminará permanentemente <strong>TODOS los {individualAssessments?.length || 0} assessments</strong> y sus datos asociados:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 pl-2">
                <li>Todos los bebés registrados</li>
                <li>Todas las respuestas de assessments</li>
                <li>Todos los eventos de analytics</li>
                <li>Todos los milestone updates</li>
              </ul>
              <p className="font-bold text-destructive mt-4">
                Esta acción NO se puede deshacer.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingAll}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              disabled={deletingAll}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deletingAll ? 'Eliminando...' : 'Sí, Eliminar Todo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
