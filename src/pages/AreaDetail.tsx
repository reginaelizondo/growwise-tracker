import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Lightbulb, Brain, Dumbbell, MessageCircle, Heart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RecommendedActivityCard } from "@/components/RecommendedActivityCard";

interface Skill {
  skillId: number;
  skillName: string;
  progress: number;
  status: "needs-practice" | "on-track" | "mastered";
  lastUpdated: string;
}

const AreaDetail = () => {
  const navigate = useNavigate();
  const { areaId } = useParams();
  const location = useLocation();
  const locationState = location.state || {};
  
  const [loading, setLoading] = useState(true);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [baby, setBaby] = useState<any>(locationState.baby || null);
  const [area, setArea] = useState<any>(locationState.area || null);

  useEffect(() => {
    loadData();
  }, [areaId]);

  // Reload when navigating back to this page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && baby && area) {
        loadData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [baby, area]);

  const loadData = async () => {
    try {
      // If baby and area data are not in location state, fetch them
      if (!baby || !area) {
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
          navigate("/dashboard");
          return;
        }

        setBaby(babies[0]);

        // Get area info from latest assessment
        const { data: assessments, error: assessmentError } = await supabase
          .from("assessments")
          .select("*")
          .eq("baby_id", babies[0].id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (assessmentError) throw assessmentError;

        // Create area object
        const areaMap: any = {
          1: { areaId: 1, areaName: "Physical", color: "#00A3E0" },
          2: { areaId: 2, areaName: "Cognitive", color: "#00C853" },
          3: { areaId: 3, areaName: "Linguistic", color: "#FF8A00" },
          4: { areaId: 4, areaName: "Social-emotional", color: "#F06292" }
        };

        const areaData = areaMap[Number(areaId)];
        if (areaData) {
          setArea({ ...areaData, progress: 0 });
        }

        await loadSkillData(babies[0], areaData, assessments?.[0]);
      } else {
        await loadSkillData(baby, area);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSkillData = async (babyData: any, areaData: any, assessmentData?: any) => {
    try {
      // Get latest assessment if not provided
      let assessment = assessmentData;
      if (!assessment) {
        const { data: assessments, error: assessmentError } = await supabase
          .from("assessments")
          .select("*, assessment_responses(*)")
          .eq("baby_id", babyData.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (assessmentError) throw assessmentError;

        if (!assessments || assessments.length === 0) {
          return;
        }

        assessment = assessments[0];
      } else {
        // Load responses if not included
        const { data: responses, error: responsesError } = await supabase
          .from("assessment_responses")
          .select("*")
          .eq("assessment_id", assessment.id);

        if (!responsesError) {
          assessment.assessment_responses = responses;
        }
      }

      // Get all milestone IDs from the assessment responses for this area
      const responseMilestoneIds = assessment.assessment_responses?.map((r: any) => r.milestone_id) || [];
      
      if (responseMilestoneIds.length === 0) {
        return;
      }

      // Get milestones that were actually assessed in this area
      const { data: milestones, error: milestonesError } = await supabase
        .from("milestones")
        .select("*")
        .eq("area_id", Number(areaId))
        .in("milestone_id", responseMilestoneIds);

      if (milestonesError) throw milestonesError;

      const milestoneIds = milestones?.map((m) => m.milestone_id) || [];

      // Fetch latest milestone updates for this baby and area
      const { data: updates, error: updatesError } = await supabase
        .from("milestone_updates")
        .select("*")
        .eq("baby_id", babyData.id)
        .eq("area_id", Number(areaId))
        .in("milestone_id", milestoneIds);

      if (updatesError) throw updatesError;

      // Keep most recent update per milestone
      const updatesByMilestone = new Map<number, any>();
      updates?.forEach((u) => {
        const existing = updatesByMilestone.get(u.milestone_id);
        if (!existing || new Date(u.created_at) > new Date(existing.created_at)) {
          updatesByMilestone.set(u.milestone_id, u);
        }
      });

      // Group by skill
      const skillMap = new Map<number, { name: string; total: number; completed: number; latestUpdated: Date }>();
      
      milestones?.forEach((milestone) => {
        if (!skillMap.has(milestone.skill_id)) {
          skillMap.set(milestone.skill_id, {
            name: milestone.skill_name,
            total: 0,
            completed: 0,
            latestUpdated: new Date(assessment.created_at),
          });
        }
        
        const skill = skillMap.get(milestone.skill_id)!;
        skill.total++;
        
        const response = assessment.assessment_responses?.find(
          (r: any) => r.milestone_id === milestone.milestone_id
        );
        const update = updatesByMilestone.get(milestone.milestone_id);
        
        let isCompleted = false;
        if (update) {
          isCompleted = update.status === "yes";
          const updatedAt = new Date(update.created_at);
          if (updatedAt > skill.latestUpdated) skill.latestUpdated = updatedAt;
        } else if (response && response.answer === "yes") {
          isCompleted = true;
        }

        if (isCompleted) {
          skill.completed++;
        }
      });

      const skillsData: Skill[] = Array.from(skillMap.entries()).map(([skillId, data]) => {
        const progress = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
        let status: "needs-practice" | "on-track" | "mastered" = "needs-practice";
        
        if (progress >= 80) status = "mastered";
        else if (progress >= 50) status = "on-track";
        
        return {
          skillId,
          skillName: data.name,
          progress,
          status,
          lastUpdated: data.latestUpdated.toLocaleDateString(),
        };
      });

      setSkills(skillsData);
      
      // Calculate and update area progress
      const totalProgress = skillsData.reduce((sum, skill) => sum + skill.progress, 0);
      const areaProgress = skillsData.length > 0 ? Math.round(totalProgress / skillsData.length) : 0;
      setArea((prev: any) => ({ ...prev, progress: areaProgress }));
    } catch (error) {
      console.error("Error loading skill data:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      "needs-practice": { label: "Needs Practice", className: "bg-warning/20 text-warning-foreground border-warning/30" },
      "on-track": { label: "On Track", className: "bg-primary/20 text-primary-foreground border-primary/30" },
      "mastered": { label: "Mastered", className: "bg-success/20 text-success-foreground border-success/30" },
    };
    
    const variant = variants[status as keyof typeof variants];
    return <Badge className={variant.className} variant="outline">{variant.label}</Badge>;
  };

  // Calculate baby age in months
  const babyAgeMonths = useMemo(() => {
    if (!baby?.birthdate) return 0;
    const birthdate = new Date(baby.birthdate);
    const today = new Date();
    const months = (today.getFullYear() - birthdate.getFullYear()) * 12 +
      (today.getMonth() - birthdate.getMonth());
    
    // Adjust for prematurity if applicable
    if (baby.gestational_weeks && baby.gestational_weeks < 37) {
      const weeksEarly = 40 - baby.gestational_weeks;
      const monthsAdjustment = Math.floor(weeksEarly / 4);
      return Math.max(0, months - monthsAdjustment);
    }
    
    return Math.max(0, months);
  }, [baby?.birthdate, baby?.gestational_weeks]);

  const getAreaIcon = () => {
    const iconProps = { className: "w-8 h-8", strokeWidth: 2.5 };
    switch (Number(areaId)) {
      case 1: return <Dumbbell {...iconProps} style={{ color: area?.color }} />;
      case 2: return <Brain {...iconProps} style={{ color: area?.color }} />;
      case 3: return <MessageCircle {...iconProps} style={{ color: area?.color }} />;
      case 4: return <Heart {...iconProps} style={{ color: area?.color }} />;
      default: return null;
    }
  };

  // Memoize skills array to prevent unnecessary re-renders in RecommendedActivityCard
  const memoizedSkills = useMemo(() => 
    skills.map(skill => ({
      skillId: skill.skillId,
      skillName: skill.skillName,
      progress: skill.progress,
      status: skill.status
    })), [skills]
  );

  if (!baby || !area) {
    if (loading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      );
    }
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
        {/* Top Banner */}
        <div className="relative">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/dashboard")}
            className="absolute -left-1 md:-left-2 top-2 md:top-4 z-10 hover:bg-muted/50"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="pt-12 pb-2">
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center gap-2 mb-0.5">
                {getAreaIcon()}
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: area.color }}>{area.areaName}</h1>
              </div>
              
              <span className="font-bold text-lg md:text-xl" style={{ color: area.color }}>
                {area.progress}/100
              </span>
            </div>
          </div>
        </div>

        {/* Skills List */}
        <div className="space-y-2 md:space-y-3 -mt-2">
          {skills.map((skill) => (
            <Card
              key={skill.skillId}
              className="p-4 md:p-6 cursor-pointer hover:shadow-lg transition-all active:scale-[0.98] md:hover:scale-[1.01] group relative overflow-hidden"
              onClick={() => navigate(`/skill/${skill.skillId}`, { state: { baby, area, skill } })}
            >
              <div className="relative z-10 space-y-3 md:space-y-4">
                <div className="flex items-start justify-between gap-3 md:gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base md:text-xl mb-2 md:mb-3 leading-snug">{skill.skillName}</h3>
                    <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                      <div className="text-[10px] md:text-xs">{getStatusBadge(skill.status)}</div>
                      <span className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                        Updated: {skill.lastUpdated}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xl md:text-2xl font-bold" style={{ color: area.color }}>
                      {skill.progress}%
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Hover gradient overlay */}
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity"
                style={{ backgroundColor: area.color }}
              />
            </Card>
          ))}
        </div>

        {/* Recommended Activity */}
        <div className="mt-8">
          <h2 
            className="text-2xl font-semibold mb-6 text-center" 
            style={{ color: area.color }}
          >
            Recommended Activities to Keep Building These Skills
          </h2>
          
          <RecommendedActivityCard
            areaId={area.areaId}
            areaName={
              area.areaName === "Social-emotional" ? "Social & Emotional" :
              area.areaName === "Linguistic" ? "Lingustic" :
              area.areaName
            }
            areaColor={area.color}
            skills={memoizedSkills}
            babyAgeMonths={babyAgeMonths}
            locale="en"
            kineduToken={baby?.kinedu_token || undefined}
            email={baby?.email || undefined}
          />
        </div>
      </div>
    </div>
  );
};

export default AreaDetail;
