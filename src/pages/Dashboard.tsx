import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { LogOut, TrendingUp, Plus, Download, Baby, Calendar, Sparkles, CheckCircle, Clock } from "lucide-react";
import iconPhysical from "@/assets/icon-physical.png";
import iconCognitive from "@/assets/icon-cognitive.png";
import iconLinguistic from "@/assets/icon-linguistic.png";
import iconSocioemotional from "@/assets/icon-socioemotional.png";
import masteredIcon from "@/assets/mastered-icon.png";
import onTrackIcon from "@/assets/on-track-icon.png";
import needsPracticeIcon from "@/assets/needs-practice-icon.png";
import { differenceInMonths, format } from "date-fns";
import { DonutChart } from "@/components/DonutChart";

interface Baby {
  id: string;
  name: string;
  birthdate: string;
  gestational_weeks: number | null;
}

interface AreaProgress {
  areaId: number;
  areaName: string;
  color: string;
  icon: string;
  progress: number;
  skillCount?: number;
  lastUpdated: string;
  status: "ahead" | "on-track" | "behind";
  statusText: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [baby, setBaby] = useState<Baby | null>(null);
  const [user, setUser] = useState<any>(null);
  const [areaProgress, setAreaProgress] = useState<AreaProgress[]>([
    { areaId: 1, areaName: "Physical", color: "#00A3E0", icon: "", progress: 0, lastUpdated: "No data yet", status: "on-track", statusText: "On track" },
    { areaId: 2, areaName: "Cognitive", color: "#00C853", icon: "", progress: 0, lastUpdated: "No data yet", status: "on-track", statusText: "On track" },
    { areaId: 3, areaName: "Linguistic", color: "#FF8A00", icon: "", progress: 0, lastUpdated: "No data yet", status: "on-track", statusText: "On track" },
    { areaId: 4, areaName: "Socio-emotional", color: "#F06292", icon: "", progress: 0, lastUpdated: "No data yet", status: "on-track", statusText: "On track" },
  ]);
  const [hoveredSegment, setHoveredSegment] = useState<{ name: string; value: number } | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  // Reload data when returning to dashboard from other pages
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && baby) {
        // Reload data when tab becomes visible
        loadBabyData(user.id);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, baby]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth", { state: { from: "/dashboard" } });
      return;
    }

    setUser(session.user);
    await loadBabyData(session.user.id);
  };

  const loadBabyData = async (userId: string) => {
    try {
      console.log("🔍 Loading baby data for user:", userId);
      
      // Get baby data
      const { data: babies, error: babyError } = await supabase
        .from("babies")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (babyError) throw babyError;

      console.log(`👶 Found ${babies?.length || 0} babies`);

      if (!babies || babies.length === 0) {
        // Check if there's a cached assessment that wasn't linked
        const draftData = localStorage.getItem('assessment_draft');
        if (draftData) {
          try {
            const draft = JSON.parse(draftData);
            if (draft.baby_id) {
              // Try to link the baby now
              const { data: linked, error: linkError } = await supabase.rpc('link_baby_after_signup', {
                baby_uuid: draft.baby_id,
                assessment_uuid: draft.assessment_id,
              });
              
              if (!linkError && linked) {
                // Successfully linked, reload the page
                localStorage.removeItem('assessment_draft');
                window.location.reload();
                return;
              }
            }
          } catch (err) {
            console.error("Error linking cached assessment:", err);
          }
        }
        
        toast({
          title: "No baby profile found",
          description: "Let's create your baby's profile to get started!",
        });
        navigate("/babies/new");
        return;
      }

      const babyData = babies[0];
      setBaby(babyData);

      // Get latest assessment
      const { data: assessments, error: assessmentError } = await supabase
        .from("assessments")
        .select("*, assessment_responses(*)")
        .eq("baby_id", babyData.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (assessmentError) {
        console.error("⚠️ Assessment error:", assessmentError);
        // Don't throw, just use defaults
      }

      console.log(`📋 Found ${assessments?.length || 0} assessments`);

      if (assessments && assessments.length > 0) {
        await calculateAreaProgress(babyData.id, assessments[0]);
      } else {
        console.log("ℹ️ No assessments found, using default values");
      }
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateAreaProgress = async (babyId: string, assessment: any) => {
    try {
      console.log("📊 Calculating progress for baby:", babyId, "assessment:", assessment.id);
      
      // All areas use current age to +1 month range only
      const referenceAge = assessment.reference_age_months;
      const minAge = referenceAge;
      const maxAge = referenceAge + 1;

      // Get all milestones in broad age window
      const { data: milestones, error: milestonesError } = await supabase
        .from("milestones")
        .select("*")
        .gte("age", minAge)
        .lte("age", maxAge);

      if (milestonesError) throw milestonesError;

      console.log(`📚 Loaded ${milestones?.length || 0} milestones for age ${minAge}-${maxAge}`);

      // Get all milestone updates for this baby
      const milestoneIds = milestones?.map(m => m.milestone_id) || [];
      const { data: updates, error: updatesError } = await supabase
        .from("milestone_updates")
        .select("*")
        .eq("baby_id", babyId)
        .in("milestone_id", milestoneIds);

      if (updatesError) console.error("Error loading updates:", updatesError);

      console.log(`📝 Loaded ${updates?.length || 0} milestone updates`);

      // Keep most recent update per milestone
      const updatesByMilestone = new Map<number, any>();
      updates?.forEach((u) => {
        const existing = updatesByMilestone.get(u.milestone_id);
        if (!existing || new Date(u.created_at) > new Date(existing.created_at)) {
          updatesByMilestone.set(u.milestone_id, u);
        }
      });

      // Define all areas with their metadata (matching database area_id)
      const areaMetadata: Record<number, { name: string; color: string }> = {
        1: { name: "Physical", color: "#00A3E0" },
        2: { name: "Cognitive", color: "#00C853" },
        3: { name: "Linguistic", color: "#FF8A00" },
        4: { name: "Socio-emotional", color: "#F06292" },
      };

      // Initialize all areas
      const areaMap = new Map<number, { name: string; total: number; completed: number }>();
      [1, 2, 3, 4].forEach(areaId => {
        areaMap.set(areaId, {
          name: areaMetadata[areaId].name,
          total: 0,
          completed: 0,
        });
      });
      
      // All areas use ±1 month range (already filtered by query)
      milestones?.forEach((milestone) => {
        const areaId = milestone.area_id;
        const area = areaMap.get(areaId);
        if (area) {
          area.total++;
          
          // Check if there's a more recent update
          const update = updatesByMilestone.get(milestone.milestone_id);
          let isCompleted = false;

          if (update) {
            // Use update status if available
            isCompleted = update.status === "yes";
          } else {
            // Fall back to assessment response
            const response = assessment.assessment_responses?.find(
              (r: any) => r.milestone_id === milestone.milestone_id
            );
            isCompleted = response && response.answer === "yes";
          }
          
          if (isCompleted) {
            area.completed++;
          }
        }
      });

      // Create progress array for all 4 areas
      const progress: AreaProgress[] = [1, 2, 3, 4].map((areaId) => {
        const data = areaMap.get(areaId)!;
        const progressPercent = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
        
        // Calculate status relative to age (same logic as Assessment.tsx)
        const monthsOffset = ((progressPercent / 100) - 0.5) * 6;
        const monthsAhead = Math.round(monthsOffset * 10) / 10;
        
        const isAhead = monthsAhead > 0.5;
        const isBehind = monthsAhead < -0.5;
        
        let status: "ahead" | "on-track" | "behind";
        let statusText: string;
        
        if (isAhead) {
          status = "ahead";
          statusText = `${Math.abs(monthsAhead)} month${Math.abs(monthsAhead) !== 1 ? 's' : ''} ahead`;
        } else if (isBehind) {
          status = "behind";
          statusText = `${Math.abs(monthsAhead)} month${Math.abs(monthsAhead) !== 1 ? 's' : ''} behind`;
        } else {
          status = "on-track";
          statusText = "On track";
        }
        
        return {
          areaId,
          areaName: data.name,
          color: areaMetadata[areaId].color,
          icon: "", // Icons will be rendered as components
          progress: progressPercent,
          lastUpdated: format(new Date(assessment.created_at), "MMM d, yyyy"),
          status,
          statusText,
        };
      });

      console.log("✅ Progress calculated:", progress);
      setAreaProgress(progress);
    } catch (error) {
      console.error("❌ Error calculating progress:", error);
      // Always set default values on error
      setAreaProgress([
        { areaId: 1, areaName: "Physical", color: "#00A3E0", icon: "", progress: 0, lastUpdated: "Error loading", status: "on-track", statusText: "On track" },
        { areaId: 2, areaName: "Cognitive", color: "#00C853", icon: "", progress: 0, lastUpdated: "Error loading", status: "on-track", statusText: "On track" },
        { areaId: 3, areaName: "Linguistic", color: "#FF8A00", icon: "", progress: 0, lastUpdated: "Error loading", status: "on-track", statusText: "On track" },
        { areaId: 4, areaName: "Socio-emotional", color: "#F06292", icon: "", progress: 0, lastUpdated: "Error loading", status: "on-track", statusText: "On track" },
      ]);
    }
  };

  const calculateAge = (birthdate: string, gestationalWeeks: number | null) => {
    const birth = new Date(birthdate);
    const now = new Date();
    let months = differenceInMonths(now, birth);
    
    if (gestationalWeeks && gestationalWeeks < 37) {
      const correction = Math.round((40 - gestationalWeeks) / 4);
      months = Math.max(0, months - correction);
    }
    
    return months;
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getStatusInfo = (progress: number) => {
    if (progress >= 80) return { label: "Mastered", variant: "bg-success/20 text-success-foreground border-success/30" };
    if (progress >= 50) return { label: "On Track", variant: "bg-primary/20 text-primary-foreground border-primary/30" };
    return { label: "Needs Practice", variant: "bg-warning/20 text-warning-foreground border-warning/30" };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!baby) return null;

  const age = calculateAge(baby.birthdate, baby.gestational_weeks);
  
  const donutData = areaProgress.map(area => ({
    name: area.areaName,
    value: area.progress,
    color: area.color,
    status: area.status,
    statusText: area.statusText
  }));

  const getAreaIcon = (areaId: number) => {
    const iconProps = { className: "w-8 h-8" };
    switch (areaId) {
      case 1: return <img src={iconPhysical} alt="Physical" {...iconProps} />; // Physical
      case 2: return <img src={iconCognitive} alt="Cognitive" {...iconProps} />; // Cognitive
      case 3: return <img src={iconLinguistic} alt="Linguistic" {...iconProps} />; // Linguistic
      case 4: return <img src={iconSocioemotional} alt="Socio-emotional" {...iconProps} />; // Socio-emotional
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-8">
        {/* Header Card - Clean & Minimal */}
        <Card className="p-4 sm:p-6 md:p-8 bg-card/50 backdrop-blur-sm border">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3 sm:gap-5">
              {/* Minimal Baby Icon */}
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Baby className="w-6 h-6 sm:w-7 sm:h-7 text-primary" strokeWidth={2} />
              </div>
              
              {/* Baby Info - Clean Typography */}
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
                  Welcome back
                </p>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary tracking-tight">
                  {baby.name}
                </h1>
                <div className="flex items-center gap-2 sm:gap-4 mt-1 sm:mt-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    {age !== null ? `${age} ${age === 1 ? "month" : "months"} old` : "N/A"}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                  <span className="text-xs">
                    {new Date().toLocaleDateString("en-US", { 
                      month: "short", 
                      day: "numeric",
                      year: "numeric" 
                    })}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Sign Out Button */}
            <Button 
              variant="ghost" 
              size="icon"
              className="w-10 h-10 hover:bg-muted/50"
              onClick={handleSignOut} 
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </Card>

        {/* Central Visualization - Full Pie Chart */}
        <Card className="p-4 sm:p-6 md:p-8 bg-card/50 backdrop-blur-sm border">
          <div className="flex flex-col items-center space-y-4 sm:space-y-6">
            {/* Updated Date */}
            <p className="text-xs text-muted-foreground">
              Updated {areaProgress.length > 0 ? areaProgress[0].lastUpdated : "N/A"}
            </p>
            
            {/* Chart with Global Progress */}
            <DonutChart 
              data={donutData} 
              size={window.innerWidth < 640 ? 320 : 400}
              strokeWidth={window.innerWidth < 640 ? 18 : 20}
              onSegmentHover={setHoveredSegment}
              showGlobalProgress={true}
            />

            {/* Explanatory Note */}
            <p className="text-xs text-center text-muted-foreground max-w-md px-4">
              Current progress of age-appropriate skills
            </p>

            {/* Progress History Button */}
            <div className="w-full max-w-md pt-2">
              <Button
                variant="outline"
                className="h-11 text-sm w-full"
                size="lg"
                onClick={() => navigate("/history")}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Progress History
              </Button>
            </div>
          </div>
        </Card>

        {/* Compact Area Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {areaProgress.map((area) => {
            const StatusIcon = 
              area.status === "ahead" ? Sparkles :
              area.status === "on-track" ? CheckCircle :
              Clock;
            
            // Calculate timeline position (same logic as Assessment)
            const progressPercent = area.progress;
            const monthsOffset = ((progressPercent / 100) - 0.5) * 6;
            const monthsAhead = Math.round(monthsOffset * 10) / 10;
            const barPosition = ((monthsOffset + 3) / 6) * 100;
            
            // Format the display text to always show months
            const displayText = monthsAhead > 0 
              ? `${Math.abs(monthsAhead)} month${Math.abs(monthsAhead) !== 1 ? 's' : ''} ahead`
              : monthsAhead < 0
              ? `${Math.abs(monthsAhead)} month${Math.abs(monthsAhead) !== 1 ? 's' : ''} behind`
              : `0 months ahead`;
            
            return (
              <Card
                key={area.areaId}
                className="p-3 sm:p-4 cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 bg-card border-t-2"
                style={{ borderTopColor: area.color }}
                onClick={() => navigate(`/area/${area.areaId}`, { state: { baby, area } })}
              >
                {/* Centered Area Name */}
                <h3 
                  className="font-semibold text-sm sm:text-base text-center mb-3"
                  style={{ color: area.color }}
                >
                  {area.areaName}
                </h3>
                
                {/* Timeline with circle indicator */}
                <div className="mt-2">
                  <div className="relative h-8 py-1">
                    <div className="relative h-2 bg-gray-200 rounded-full overflow-visible">
                      {/* Center line marker */}
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-0.5 bg-gray-400 rounded z-10" />
                      {/* Label under center */}
                      <div className="absolute left-1/2 top-full -translate-x-1/2 mt-1 text-[10px] text-muted-foreground whitespace-nowrap">
                        current age
                      </div>
                      
                      {/* Progress indicator circle */}
                      <div 
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md transition-all duration-500 z-30"
                        style={{ 
                          left: `${Math.max(0, Math.min(100, barPosition))}%`,
                          transform: `translate(-50%, -50%)`,
                          backgroundColor: area.color
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Status text with icon */}
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    <StatusIcon 
                      className="w-3.5 h-3.5"
                      style={{ color: area.color }}
                    />
                    <span className="text-[10px] sm:text-xs font-medium" style={{ color: area.color }}>
                      {displayText}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Progress Assessment Button */}
        <Button
          className="h-11 w-full"
          size="lg"
          onClick={() => navigate(`/progress-assessment/start?babyId=${baby.id}`)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Start Progress Assessment
        </Button>

        {/* Download Button */}
        <Button
          variant="outline"
          className="h-11 w-full"
          size="lg"
          onClick={() => window.print()}
        >
          <Download className="w-4 h-4 mr-2" />
          Download Report
        </Button>
      </div>
    </div>
  );
};

export default Dashboard;
