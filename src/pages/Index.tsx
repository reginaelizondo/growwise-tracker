import { Button } from "@/components/ui/button";
import { ArrowRight, Timer, Lock, GraduationCap, LayoutDashboard, Play } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import kineduLogo from "@/assets/logo-kinedu-blue.png";
import { getSessionId } from "@/hooks/useSessionId";
import SocialProofBlock from "@/components/SocialProofBlock";
import WhyTrustUs from "@/components/WhyTrustUs";
import AcademicLogosBar from "@/components/AcademicLogosBar";
import ReportSneakPeek from "@/components/ReportSneakPeek";

const Index = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [recoveryData, setRecoveryData] = useState<{
    assessment_id: string;
    session_id: string;
    baby_name: string;
    progress_percentage: number;
    timestamp: string;
  } | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Check for abandoned assessment to resume
  useEffect(() => {
    try {
      const raw = localStorage.getItem('assessment_recovery');
      if (raw) {
        const data = JSON.parse(raw);
        const savedTime = new Date(data.timestamp).getTime();
        const now = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;
        if (now - savedTime < twentyFourHours && data.assessment_id) {
          setRecoveryData(data);
        } else {
          localStorage.removeItem('assessment_recovery');
        }
      }
    } catch (_) {
      localStorage.removeItem('assessment_recovery');
    }
  }, []);

  const dismissRecovery = () => {
    localStorage.removeItem('assessment_recovery');
    setRecoveryData(null);
  };

  const handleResume = () => {
    if (!recoveryData) return;
    // Restore session_id so AssessmentNew can find the abandoned_session
    if (recoveryData.session_id) {
      localStorage.setItem('analytics_session_id', recoveryData.session_id);
    }
    navigate(`/assessment/${recoveryData.assessment_id}?resume=true`);
  };

  // Track landing page view on mount
  useEffect(() => {
    supabase.from('page_events').insert({
      event_type: 'landing_page_view',
      event_data: {},
      user_agent: navigator.userAgent,
      session_id: getSessionId()
    }).then(() => {}).catch(() => {});
  }, []);

  const trackAndNavigate = async (source: string) => {
    try {
      await supabase.from('page_events').insert({
        event_type: 'landing_start_clicked',
        event_data: { source },
        user_agent: navigator.userAgent,
        session_id: getSessionId()
      });
    } catch (err) {
      console.error('Tracking error:', err);
    }
    navigate('/babies/new');
  };

  return (
    <div className="min-h-screen bg-gradient-warm">
      {/* Resume Banner */}
      {recoveryData && (
        <div className="container mx-auto px-4 pt-4">
          <div className="max-w-lg mx-auto animate-slide-up">
            <div className="bg-card border border-primary/20 rounded-2xl p-4 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Play className="w-4 h-4 text-primary ml-0.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-primary">
                    Continue {recoveryData.baby_name}'s assessment
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={recoveryData.progress_percentage} className="h-1.5 flex-1 bg-muted/40" />
                    <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">
                      {recoveryData.progress_percentage}%
                    </span>
                  </div>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  className="rounded-full px-4 flex-shrink-0"
                  onClick={handleResume}
                >
                  Continue
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
              <button
                onClick={dismissRecovery}
                className="w-full mt-2 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                Start fresh instead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-4 pb-6 md:pt-6 md:pb-10">
        <div className="max-w-lg mx-auto text-center animate-fade-in">
          <div className="flex justify-center mb-4">
            <img src={kineduLogo} alt="Kinedu" className="h-8 md:h-9" />
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-primary mb-3">
            Is your baby on track?
          </h1>

          {/* Social proof — moved up, more prominent */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs md:text-sm font-medium mb-4">
            <span className="flex items-center gap-1 text-amber-600">
              <span className="text-amber-500">★</span>
              <span className="font-bold text-foreground">4.8</span>
              <span className="text-muted-foreground">rating</span>
            </span>
            <span className="text-muted-foreground/60">·</span>
            <span className="text-muted-foreground">
              Joined by <span className="font-bold text-foreground">10M+</span> parents
            </span>
            <span className="text-muted-foreground/60">·</span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <GraduationCap className="w-3.5 h-3.5 text-primary" />
              Stanford-backed
            </span>
          </div>

          {/* Top CTA */}
          <Button
            variant="success"
            size="xl"
            className="rounded-full px-10 py-6 shadow-lg hover:shadow-xl transition-all text-lg mb-3"
            onClick={() => trackAndNavigate('hero_cta_top')}
          >
            <span className="flex items-center gap-2">
              Start <span className="font-extrabold">FREE</span> Assessment
              <ArrowRight className="w-5 h-5" strokeWidth={3} />
            </span>
          </Button>

          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs md:text-sm text-muted-foreground font-medium mb-6">
            <span className="flex items-center gap-1">
              <Timer className="w-3.5 h-3.5 text-primary" />
              Takes only <span className="font-semibold text-foreground">5 min</span>
            </span>
            <span className="text-muted-foreground/60">·</span>
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-primary" />
              No credit card
            </span>
            <span className="text-muted-foreground/60">·</span>
            <span>100% free</span>
          </div>

          {/* Hero visual — report sneak peek */}
          <div className="flex justify-center mb-5">
            <ReportSneakPeek />
          </div>

          <p className="text-base md:text-lg text-muted-foreground mb-5 max-w-sm mx-auto">
            Take this <span className="font-bold">FREE</span> 5-minute milestone assessment and get instant feedback on your baby's development.
          </p>

          <Button
            variant="success"
            size="xl"
            className="rounded-full px-10 py-6 shadow-lg hover:shadow-xl transition-all text-lg mb-3"
            onClick={() => trackAndNavigate('hero_cta')}
          >
            <span className="flex items-center gap-2">
              Start <span className="font-extrabold">FREE</span> Assessment
              <ArrowRight className="w-5 h-5" strokeWidth={3} />
            </span>
          </Button>

          <AcademicLogosBar />
        </div>
      </section>

      <section className="container mx-auto px-4 pb-8 md:pb-12">
        <div className="max-w-lg mx-auto">
          <SocialProofBlock />
        </div>
      </section>

      <section className="container mx-auto px-4 pb-8 md:pb-12">
        <div className="max-w-lg mx-auto">
          <WhyTrustUs />
        </div>
      </section>

      <section className="container mx-auto px-4 pb-8 md:pb-12">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-sm font-medium text-muted-foreground mb-4">
            Most parents are surprised by their results
          </p>
          <Button
            variant="success"
            size="xl"
            className="rounded-full px-10 py-6 shadow-lg hover:shadow-xl transition-all text-lg"
            onClick={() => trackAndNavigate('cta_bottom')}
          >
            <span className="flex items-center gap-2">
              Start <span className="font-extrabold">FREE</span> Assessment
              <ArrowRight className="w-5 h-5" strokeWidth={3} />
            </span>
          </Button>

          {isAuthenticated && (
            <div className="flex justify-center mt-6">
              <Button variant="default" size="lg" asChild className="rounded-full px-8">
                <Link to="/dashboard" className="flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4" />
                  Go to Dashboard
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <a href="https://blog.kinedu.com/privacy-policy-2/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="https://blog.kinedu.com/privacy-policy/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Terms</a>
              <a href="mailto:hello@kinedu.com" className="hover:text-foreground transition-colors">Contact Us</a>
            </div>
            <div className="mt-2">&copy; {new Date().getFullYear()} Kinedu. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
