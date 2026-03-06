import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const ResumeAssessment = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const sessionId = searchParams.get("session");

  useEffect(() => {
    if (!sessionId) {
      setError("No session found.");
      return;
    }

    const resume = async () => {
      try {
        const { data: session, error: fetchError } = await (supabase.from('abandoned_sessions' as any) as any)
          .select("*")
          .eq("session_id", sessionId)
          .single();

        if (fetchError || !session) {
          setError("This session has expired or doesn't exist.");
          return;
        }

        if (session.completed) {
          setError("This assessment has already been completed.");
          return;
        }

        // Restore selected areas to localStorage
        if (session.selected_areas && session.assessment_id) {
          localStorage.setItem(
            `assessment_areas_${session.assessment_id}`,
            JSON.stringify(session.selected_areas)
          );
        }

        // CRITICAL: Store the session_id in localStorage so AssessmentNew can find the abandoned session
        localStorage.setItem('analytics_session_id', sessionId);

        // Navigate to assessment with resume flag
        navigate(`/assessment/${session.assessment_id}?resume=true`, { replace: true });
      } catch (err) {
        console.error("Error resuming session:", err);
        setError("Something went wrong. Please try again.");
      }
    };

    resume();
  }, [sessionId, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center px-4">
        <Card className="p-8 text-center max-w-md">
          <p className="text-4xl mb-4">😔</p>
          <h2 className="text-xl font-bold text-primary mb-2">Session Expired</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => navigate("/babies/new")} variant="default">
            Start a New Assessment
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-warm flex items-center justify-center px-4">
      <div className="flex flex-col items-center space-y-6">
        <div className="relative flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-9 h-9 text-primary animate-pulse" />
          </div>
          <div className="absolute inset-0 w-20 h-20 rounded-full border-[3px] border-primary/20 border-t-primary animate-spin" style={{ animationDuration: '1.2s' }} />
        </div>
        <div className="space-y-2 text-center">
          <p className="text-xl font-bold text-primary">Resuming your assessment…</p>
          <p className="text-sm text-muted-foreground">Loading your saved progress</p>
        </div>
      </div>
    </div>
  );
};

export default ResumeAssessment;
