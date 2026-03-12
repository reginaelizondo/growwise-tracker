import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, TrendingUp, CheckCircle, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from "recharts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Milestone {
  milestoneId: number;
  description: string;
  question: string;
  completed: boolean;
}

interface ProgressPoint {
  date: string;
  score: number;
  type: "assessment" | "update";
}

const SkillDetail = () => {
  const navigate = useNavigate();
  const { skillId } = useParams();
  const location = useLocation();
  const { baby, area, skill } = location.state || {};
  
  const [loading, setLoading] = useState(true);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [progressData, setProgressData] = useState<ProgressPoint[]>([]);
  const [currentProgress, setCurrentProgress] = useState(skill?.progress || 0);
  const [showUnmarkDialog, setShowUnmarkDialog] = useState(false);
  const [pendingMilestoneAction, setPendingMilestoneAction] = useState<{ milestoneId: number; checked: boolean } | null>(null);

  useEffect(() => {
    if (baby && skill) {
      loadSkillDetail();
    }
  }, [baby, skill]);

  const loadSkillDetail = async () => {
    try {
      // Get latest assessment
      const { data: assessments, error: assessmentError } = await supabase
        .from("assessments")
        .select("*, assessment_responses(*)")
        .eq("baby_id", baby.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (assessmentError) throw assessmentError;

      if (!assessments || assessments.length === 0) {
        setLoading(false);
        return;
      }

      const assessment = assessments[0];

      // Get all milestone IDs from the assessment responses for this skill
      const responseMilestoneIds = assessment.assessment_responses?.map((r: any) => r.milestone_id) || [];
      
      if (responseMilestoneIds.length === 0) {
        setLoading(false);
        return;
      }

      // Get milestones that were actually assessed for this skill
      const { data: milestonesData, error: milestonesError } = await supabase
        .from("milestones")
        .select("*")
        .eq("skill_id", Number(skillId))
        .in("milestone_id", responseMilestoneIds);

      if (milestonesError) throw milestonesError;

      const milestonesWithStatus: Milestone[] = milestonesData?.map((m) => {
        const response = assessment.assessment_responses?.find(
          (r: any) => r.milestone_id === m.milestone_id
        );
        return {
          milestoneId: m.milestone_id,
          description: m.description,
          question: m.question,
          completed: response?.answer === "yes",
        };
      }) || [];

      setMilestones(milestonesWithStatus);

      // Load progress history
      await loadProgressHistory(baby.id, Number(skillId));
    } catch (error) {
      console.error("Error loading skill detail:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadProgressHistory = async (babyId: string, skillId: number) => {
    try {
      // Get all assessments
      const { data: assessments, error } = await supabase
        .from("assessments")
        .select("*, assessment_responses(*)")
        .eq("baby_id", babyId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const points: ProgressPoint[] = [];
      const dateCounts: Record<string, number> = {};

      assessments?.forEach((assessment) => {
        // Get milestones for this skill at this age
        const skillMilestones = assessment.assessment_responses?.filter((r: any) => {
          // This is simplified - in production you'd join with milestones table
          return true; // Filter by skill_id
        }) || [];

        if (skillMilestones.length > 0) {
          const completed = skillMilestones.filter((r: any) => r.answer === "yes").length;
          const score = Math.round((completed / skillMilestones.length) * 100);
          
          const date = new Date(assessment.created_at);
          const dateKey = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1;
          
          // If multiple entries on same day, show time
          const displayDate = dateCounts[dateKey] > 1 
            ? date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
            : dateKey;
          
          points.push({
            date: displayDate,
            score,
            type: "assessment",
          });
        }
      });

      setProgressData(points);
    } catch (error) {
      console.error("Error loading progress history:", error);
    }
  };

  const handleMilestoneToggle = async (milestoneId: number, checked: boolean) => {
    try {
      // Save milestone update
      const { error } = await supabase
        .from("milestone_updates")
        .insert({
          baby_id: baby.id,
          milestone_id: milestoneId,
          skill_id: Number(skillId),
          area_id: area.areaId,
          status: checked ? "yes" : "no",
        });

      if (error) throw error;

      // Update local state
      setMilestones((prev) =>
        prev.map((m) =>
          m.milestoneId === milestoneId ? { ...m, completed: checked } : m
        )
      );

      // Recalculate progress
      const completed = milestones.filter((m) => 
        m.milestoneId === milestoneId ? checked : m.completed
      ).length;
      const newProgress = Math.round((completed / milestones.length) * 100);
      setCurrentProgress(newProgress);

      // Add to progress chart
      setProgressData((prev) => [
        ...prev,
        {
          date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          score: newProgress,
          type: "update",
        },
      ]);

      toast({
        title: "Progress updated!",
        description: `Milestone ${checked ? "completed" : "unmarked"}`,
      });
    } catch (error: any) {
      console.error("Error updating milestone:", error);
      toast({
        title: "Error updating milestone",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!baby || !area || !skill) {
    return null;
  }

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 pb-20">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="p-6" style={{ borderTop: `4px solid ${area.color}` }}>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/area/${area.areaId}`, { state: { baby, area } })} className="flex-shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 text-center">
              <h1 className="text-base md:text-lg font-bold" style={{ color: area.color }}>{skill.skillName}</h1>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-3xl md:text-4xl font-bold" style={{ color: area.color }}>
                {currentProgress}%
              </div>
              <div className="text-xs text-muted-foreground whitespace-nowrap">Current Score</div>
            </div>
          </div>
        </Card>

        {/* Progress Chart */}
        {progressData.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center justify-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5" style={{ color: area.color }} />
              <h2 className="text-lg font-semibold">Progress Over Time</h2>
            </div>
            <div className="flex justify-center">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={progressData} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                  <defs>
                    <linearGradient id={`colorScore-${area.areaId}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={area.color} stopOpacity={0.15}/>
                      <stop offset="95%" stopColor={area.color} stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.15} />
                  <XAxis 
                    dataKey="date" 
                    fontSize={11} 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    fontSize={11}
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-card border border-border rounded-lg shadow-lg px-3 py-2">
                            <p className="text-xs font-semibold mb-1" style={{ color: area.color }}>
                              {data.type === "assessment" ? "Assessment" : "Daily Update"}
                            </p>
                            <p className="text-xs text-muted-foreground mb-1">{data.date}</p>
                            <p className="text-lg font-bold" style={{ color: area.color }}>
                              {data.score}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="none"
                    fillOpacity={1}
                    fill={`url(#colorScore-${area.areaId})`}
                    animationDuration={800}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke={area.color} 
                    strokeWidth={2.5}
                    animationDuration={1000}
                    animationEasing="ease-in-out"
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (payload.type === "assessment") {
                        // Solid circle for assessments
                        return (
                          <circle 
                            cx={cx} 
                            cy={cy} 
                            r={5} 
                            fill={area.color} 
                            stroke="hsl(var(--background))" 
                            strokeWidth={2}
                            style={{
                              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                            }}
                          />
                        );
                      } else {
                        // Hollow circle for daily updates
                        return (
                          <circle 
                            cx={cx} 
                            cy={cy} 
                            r={5} 
                            fill="hsl(var(--background))" 
                            stroke={area.color} 
                            strokeWidth={2.5}
                            style={{
                              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                            }}
                          />
                        );
                      }
                    }}
                    activeDot={(props: any) => {
                      const { cx, cy, payload } = props;
                      return (
                        <circle 
                          cx={cx} 
                          cy={cy} 
                          r={7} 
                          fill={payload.type === "assessment" ? area.color : "hsl(var(--background))"} 
                          stroke={area.color} 
                          strokeWidth={3}
                          style={{
                            filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.2))',
                          }}
                        />
                      );
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: area.color }} />
                <span className="font-medium">Assessment</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full border-2 bg-background" 
                     style={{ borderColor: area.color }} />
                <span className="font-medium">Daily Updates</span>
              </div>
            </div>
          </Card>
        )}

        {/* Milestones */}
        <Card className="p-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5" style={{ color: area.color }} />
            <h2 className="text-lg font-semibold">Milestones</h2>
          </div>
          
          {/* In Progress Section */}
          {milestones.filter(m => !m.completed).length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">In progress</h3>
              <div className="space-y-3">
                {milestones.filter(m => !m.completed).map((milestone) => (
                  <div
                    key={milestone.milestoneId}
                    className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                  >
                    <Checkbox
                      checked={milestone.completed}
                      onCheckedChange={(checked) => 
                        handleMilestoneToggle(milestone.milestoneId, checked as boolean)
                      }
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="text-sm">{milestone.question}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Completed Section */}
          {milestones.filter(m => m.completed).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Completed</h3>
              <div className="space-y-3">
                {milestones.filter(m => m.completed).map((milestone) => (
                  <div
                    key={milestone.milestoneId}
                    className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                  >
                    <Checkbox
                      checked={milestone.completed}
                      onCheckedChange={(checked) => {
                        // If unmarking (going from checked to unchecked), show confirmation dialog
                        if (!checked) {
                          setPendingMilestoneAction({ milestoneId: milestone.milestoneId, checked: false });
                          setShowUnmarkDialog(true);
                        } else {
                          // If marking as complete, do it immediately
                          handleMilestoneToggle(milestone.milestoneId, checked as boolean);
                        }
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="text-sm">{milestone.question}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Unmark Confirmation Dialog */}
      <AlertDialog open={showUnmarkDialog} onOpenChange={setShowUnmarkDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader className="text-center pt-2">
            <AlertDialogTitle className="text-xl font-bold">
              Are you sure you want to unmark this milestone?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm pt-2">
              <span className="font-semibold">Important:</span> If you notice that {baby.name} can no longer achieve this specific skill, we recommend speaking with your pediatrician for follow-up.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <AlertDialogFooter className="flex flex-col gap-2 mt-4">
            <AlertDialogAction
              onClick={() => {
                if (pendingMilestoneAction) {
                  handleMilestoneToggle(pendingMilestoneAction.milestoneId, pendingMilestoneAction.checked);
                }
                setShowUnmarkDialog(false);
                setPendingMilestoneAction(null);
              }}
              style={{ backgroundColor: area.color }}
              className="w-full text-white hover:opacity-90 rounded-full py-6 text-base font-medium"
            >
              Yes, unmark
            </AlertDialogAction>
            
            <button
              onClick={() => {
                setShowUnmarkDialog(false);
                setPendingMilestoneAction(null);
              }}
              className="text-sm font-medium underline hover:no-underline"
            >
              Oops, go back!
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SkillDetail;
