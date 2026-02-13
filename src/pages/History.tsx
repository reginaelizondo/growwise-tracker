import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { externalSupabase } from "@/integrations/supabase/external-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, TrendingUp, Calendar, Brain, Dumbbell, MessageCircle, Heart, ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Assessment {
  id: string;
  created_at: string;
  reference_age_months: number;
  scores: {
    cognitive: number;
    physical: number;
    linguistic: number;
    socioemotional: number;
  };
}

interface Baby {
  id: string;
  name: string;
}

const History = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [baby, setBaby] = useState<Baby | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Get baby
      const { data: babies, error: babyError } = await supabase
        .from("babies")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (babyError) throw babyError;

      if (!babies || babies.length === 0) {
        setLoading(false);
        return;
      }

      const babyData = babies[0];
      setBaby(babyData);

      // Get all assessments
      const { data: assessmentsData, error: assessmentError } = await supabase
        .from("assessments")
        .select("*, assessment_responses(*)")
        .eq("baby_id", babyData.id)
        .order("created_at", { ascending: true });

      if (assessmentError) throw assessmentError;

      if (!assessmentsData || assessmentsData.length === 0) {
        setLoading(false);
        return;
      }

      // Get all milestones
      const { data: milestones, error: milestonesError } = await externalSupabase
        .from("milestones")
        .select("*");

      if (milestonesError) throw milestonesError;

      // Calculate scores for each assessment
      const assessmentsWithScores: Assessment[] = await Promise.all(
        assessmentsData.map(async (assessment) => {
          const areaScores: Record<number, { total: number; completed: number }> = {};

          // Filter milestones for this age
          const ageMilestones = milestones?.filter(
            (m) => m.age <= assessment.reference_age_months
          ) || [];

          ageMilestones.forEach((milestone) => {
            if (!areaScores[milestone.area_id]) {
              areaScores[milestone.area_id] = { total: 0, completed: 0 };
            }
            
            areaScores[milestone.area_id].total++;
            
            const response = assessment.assessment_responses?.find(
              (r: any) => r.milestone_id === milestone.milestone_id
            );
            
            if (response && response.answer === "yes") {
              areaScores[milestone.area_id].completed++;
            }
          });

          return {
            id: assessment.id,
            created_at: assessment.created_at,
            reference_age_months: assessment.reference_age_months,
            scores: {
              cognitive: areaScores[2] ? Math.round((areaScores[2].completed / areaScores[2].total) * 100) : 0,
              physical: areaScores[1] ? Math.round((areaScores[1].completed / areaScores[1].total) * 100) : 0,
              linguistic: areaScores[3] ? Math.round((areaScores[3].completed / areaScores[3].total) * 100) : 0,
              socioemotional: areaScores[4] ? Math.round((areaScores[4].completed / areaScores[4].total) * 100) : 0,
            },
          };
        })
      );

      setAssessments(assessmentsWithScores);

      // Prepare chart data
      const chart = assessmentsWithScores.map((a) => ({
        date: format(new Date(a.created_at), "MMM d"),
        age: `${a.reference_age_months}mo`,
        Cognitive: a.scores.cognitive,
        Physical: a.scores.physical,
        Linguistic: a.scores.linguistic,
        "Socio-emotional": a.scores.socioemotional,
      }));

      setChartData(chart);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  const calculateImprovement = () => {
    if (assessments.length < 2) return null;
    const latest = assessments[assessments.length - 1];
    const previous = assessments[assessments.length - 2];
    
    const latestAvg = (latest.scores.cognitive + latest.scores.physical + 
                       latest.scores.linguistic + latest.scores.socioemotional) / 4;
    const prevAvg = (previous.scores.cognitive + previous.scores.physical + 
                     previous.scores.linguistic + previous.scores.socioemotional) / 4;
    
    return Math.round(latestAvg - prevAvg);
  };

  const findBiggestProgress = () => {
    if (assessments.length < 2) return null;
    const latest = assessments[assessments.length - 1];
    const previous = assessments[assessments.length - 2];
    
    const improvements = {
      Cognitive: latest.scores.cognitive - previous.scores.cognitive,
      Physical: latest.scores.physical - previous.scores.physical,
      Linguistic: latest.scores.linguistic - previous.scores.linguistic,
      "Socio-emotional": latest.scores.socioemotional - previous.scores.socioemotional,
    };
    
    const biggest = Object.entries(improvements).reduce((max, [area, value]) => 
      value > max.value ? { area, value } : max
    , { area: '', value: -Infinity });
    
    return biggest.value > 0 ? biggest : null;
  };

  const improvement = calculateImprovement();
  const biggestProgress = findBiggestProgress();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 sm:p-6 pb-20">
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-8">
        {/* Header */}
        <div className="space-y-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="text-center">
            <h1 className="text-xl sm:text-3xl font-bold text-primary leading-tight">
              {baby?.name}&apos;s Development Over Time
            </h1>
          </div>
        </div>

        {/* Main Chart */}
        {chartData.length > 0 && (
          <Card className="p-4 sm:p-8">
            <style>{`
              .recharts-legend-wrapper {
                display: flex !important;
                justify-content: center !important;
                width: 100% !important;
              }
              .recharts-legend-wrapper ul {
                display: flex !important;
                justify-content: center !important;
                flex-wrap: wrap !important;
                gap: 8px !important;
              }
            `}</style>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="cognitiveGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00C853" stopOpacity={0.3}/>
                    <stop offset="100%" stopColor="#00C853" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="physicalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00A3E0" stopOpacity={0.3}/>
                    <stop offset="100%" stopColor="#00A3E0" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="linguisticGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF8A00" stopOpacity={0.3}/>
                    <stop offset="100%" stopColor="#FF8A00" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="emotionalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F06292" stopOpacity={0.3}/>
                    <stop offset="100%" stopColor="#F06292" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis 
                  dataKey="age" 
                  fontSize={11} 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 11 }}
                />
                <YAxis 
                  domain={[0, 100]} 
                  fontSize={11}
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 11 }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    padding: '8px',
                    fontSize: '12px'
                  }}
                />
                 <Legend 
                  wrapperStyle={{ 
                    paddingTop: '20px', 
                    fontSize: '11px',
                    textAlign: 'center',
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                  iconType="circle"
                  iconSize={8}
                  align="center"
                  verticalAlign="bottom"
                  layout="horizontal"
                  formatter={(value) => <span style={{ marginLeft: '4px', marginRight: '12px' }}>{value}</span>}
                />
                <Line 
                  type="monotone" 
                  dataKey="Cognitive" 
                  stroke="#00C853" 
                  strokeWidth={2}
                  dot={{ fill: '#00C853', r: 5, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, fill: '#00C853', stroke: '#fff', strokeWidth: 2 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Physical" 
                  stroke="#00A3E0" 
                  strokeWidth={2}
                  dot={{ fill: '#00A3E0', r: 5, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, fill: '#00A3E0', stroke: '#fff', strokeWidth: 2 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Linguistic" 
                  stroke="#FF8A00" 
                  strokeWidth={2}
                  dot={{ fill: '#FF8A00', r: 5, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, fill: '#FF8A00', stroke: '#fff', strokeWidth: 2 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Socio-emotional" 
                  stroke="#F06292" 
                  strokeWidth={2}
                  dot={{ fill: '#F06292', r: 5, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, fill: '#F06292', stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Summary Section */}
        {assessments.length >= 2 && (
          <Card className="p-4 sm:p-8 bg-gradient-to-br from-success/10 via-card to-primary/5">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 bg-success/20 rounded-xl shrink-0">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-success" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">Progress Summary</h3>
                <div className="grid gap-2 sm:gap-3">
                  {improvement !== null && (
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Average improvement: 
                      <span className={`ml-2 text-base sm:text-lg font-bold ${improvement >= 0 ? 'text-success' : 'text-warning'}`}>
                        {improvement >= 0 ? '+' : ''}{improvement}%
                      </span>
                    </p>
                  )}
                  {biggestProgress && (
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Biggest progress: 
                      <span className="ml-2 text-base sm:text-lg font-bold text-success">
                        {biggestProgress.area} (+{Math.round(biggestProgress.value)}%)
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Assessment Timeline */}
        <div className="space-y-3 sm:space-y-4">
          <h2 className="text-xl sm:text-2xl font-semibold">Assessment Timeline</h2>
          <div className="space-y-3">
            {assessments.map((assessment, index) => {
            const previousAssessment = index > 0 ? assessments[index - 1] : null;
            const avgScore = Math.round(
              (assessment.scores.cognitive + 
               assessment.scores.physical + 
               assessment.scores.linguistic + 
               assessment.scores.socioemotional) / 4
            );
            const prevAvgScore = previousAssessment
              ? Math.round(
                  (previousAssessment.scores.cognitive + 
                   previousAssessment.scores.physical + 
                   previousAssessment.scores.linguistic + 
                   previousAssessment.scores.socioemotional) / 4
                )
              : null;
            const improvement = prevAvgScore ? avgScore - prevAvgScore : null;

                return (
                  <Collapsible key={assessment.id}>
                    <Card className="p-4 sm:p-6 hover:shadow-lg transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-muted-foreground truncate">
                              {format(new Date(assessment.created_at), "MMM d, yyyy")}
                            </div>
                            <div className="text-lg font-semibold">
                              {assessment.reference_age_months} months old
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-2xl sm:text-3xl font-bold text-primary">{avgScore}%</div>
                            {improvement !== null && (
                              <div className={`text-xs font-medium ${improvement >= 0 ? 'text-success' : 'text-warning'}`}>
                                {improvement >= 0 ? '+' : ''}{improvement}%
                              </div>
                            )}
                          </div>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="shrink-0">
                              <ChevronDown className="w-5 h-5 transition-transform ui-expanded:rotate-180" />
                            </Button>
                          </CollapsibleTrigger>
                        </div>
                      </div>

                      <CollapsibleContent>
                        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4 pt-2">
                          <div className="p-3 sm:p-4 rounded-xl border" style={{ backgroundColor: `#00C85310`, borderColor: `#00C85320` }}>
                            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                              <Brain className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ color: '#00C853' }} />
                              Cognitive
                            </p>
                            <p className="text-lg sm:text-xl font-bold" style={{ color: '#00C853' }}>{assessment.scores.cognitive}%</p>
                          </div>
                          <div className="p-3 sm:p-4 rounded-xl border" style={{ backgroundColor: `#00A3E010`, borderColor: `#00A3E020` }}>
                            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                              <Dumbbell className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ color: '#00A3E0' }} />
                              Physical
                            </p>
                            <p className="text-lg sm:text-xl font-bold" style={{ color: '#00A3E0' }}>{assessment.scores.physical}%</p>
                          </div>
                          <div className="p-3 sm:p-4 rounded-xl border" style={{ backgroundColor: `#FF8A0010`, borderColor: `#FF8A0020` }}>
                            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                              <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ color: '#FF8A00' }} />
                              Linguistic
                            </p>
                            <p className="text-lg sm:text-xl font-bold" style={{ color: '#FF8A00' }}>{assessment.scores.linguistic}%</p>
                          </div>
                          <div className="p-3 sm:p-4 rounded-xl border" style={{ backgroundColor: `#F0629210`, borderColor: `#F0629220` }}>
                            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                              <Heart className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ color: '#F06292' }} />
                              Socio-emotional
                            </p>
                            <p className="text-lg sm:text-xl font-bold" style={{ color: '#F06292' }}>{assessment.scores.socioemotional}%</p>
                          </div>
                        </div>
                      </CollapsibleContent>

                      <Button
                        variant="outline"
                        className="w-full text-sm"
                        size="sm"
                        onClick={() => navigate(`/report/${assessment.id}`)}
                      >
                        View Full Report
                      </Button>
                    </Card>
                  </Collapsible>
                );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default History;
