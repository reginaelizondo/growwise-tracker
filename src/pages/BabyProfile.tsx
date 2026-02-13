import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Activity, Baby } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { differenceInMonths, format } from "date-fns";

interface Baby {
  id: string;
  name: string;
  birthdate: string;
  sex_at_birth: string | null;
  gestational_weeks: number | null;
  created_at: string;
}

const BabyProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [baby, setBaby] = useState<Baby | null>(null);
  const [assessmentCount, setAssessmentCount] = useState(0);
  const [lastAssessment, setLastAssessment] = useState<string | null>(null);

  useEffect(() => {
    loadBabyProfile();
  }, []);

  const loadBabyProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Get baby data
      const { data: babies, error: babyError } = await supabase
        .from("babies")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (babyError) throw babyError;

      if (babies && babies.length > 0) {
        setBaby(babies[0]);

        // Get assessment count
        const { data: assessments, error: assessmentError } = await supabase
          .from("assessments")
          .select("created_at")
          .eq("baby_id", babies[0].id)
          .order("created_at", { ascending: false });

        if (assessmentError) throw assessmentError;

        setAssessmentCount(assessments?.length || 0);
        if (assessments && assessments.length > 0) {
          setLastAssessment(format(new Date(assessments[0].created_at), "MMMM d, yyyy"));
        }
      }
    } catch (error) {
      console.error("Error loading baby profile:", error);
    } finally {
      setLoading(false);
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
    
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''} ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
    }
    return `${months} month${months !== 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!baby) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Baby Profile</h1>
        </div>

        {/* Profile Card */}
        <Card className="p-8">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <Baby className="w-16 h-16 text-primary" />
            </div>
            
            <div>
              <h2 className="text-3xl font-bold mb-2">{baby.name}</h2>
              <p className="text-lg text-muted-foreground">
                {calculateAge(baby.birthdate, baby.gestational_weeks)} old
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full max-w-md pt-4">
              <div className="p-4 rounded-lg bg-primary/5">
                <Calendar className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Birth Date</p>
                <p className="font-semibold">{format(new Date(baby.birthdate), "MMM d, yyyy")}</p>
              </div>
              
              <div className="p-4 rounded-lg bg-primary/5">
                <Activity className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Assessments</p>
                <p className="font-semibold">{assessmentCount} completed</p>
              </div>
            </div>

            {baby.gestational_weeks && baby.gestational_weeks < 37 && (
              <Badge variant="secondary" className="text-sm">
                Premature birth ({baby.gestational_weeks} weeks)
              </Badge>
            )}

            {lastAssessment && (
              <div className="pt-4 border-t w-full">
                <p className="text-sm text-muted-foreground">Last Assessment</p>
                <p className="font-semibold">{lastAssessment}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <Button 
            className="w-full" 
            size="lg"
            onClick={async () => {
              console.log('🚀 Tracking profile_continue_clicked...');
              try {
                const { data, error } = await supabase.from('page_events').insert({
                  event_type: 'profile_continue_clicked',
                  event_data: { baby_id: baby.id },
                  user_agent: navigator.userAgent
                }).select();
                
                console.log('📊 Insert result:', { data, error });
                if (error) console.error('❌ Error tracking:', error);
                else console.log('✅ Tracked successfully:', data);
              } catch (err) {
                console.error('❌ Exception:', err);
              }
              navigate("/assessment/start");
            }}
          >
            Start New Assessment
          </Button>
          <Button 
            variant="outline" 
            className="w-full" 
            size="lg"
            onClick={() => navigate("/history")}
          >
            View Progress History
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BabyProfile;
