import { Button } from "@/components/ui/button";
import { ArrowRight, Timer, Lock, GraduationCap, LayoutDashboard, Play } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import kineduLogo from "@/assets/logo-kinedu-blue.png";
import heroBabyPhoto from "@/assets/hero-baby-real.jpg";
import { getSessionId } from "@/hooks/useSessionId";
import SocialProofBlock from "@/components/SocialProofBlock";
import WhyTrustUs from "@/components/WhyTrustUs";
import AcademicLogosBar from "@/components/AcademicLogosBar";

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
      <section className="container mx-auto px-4 pt-12 pb-6 md:pt-20 md:pb-10">
        <div className="max-w-lg mx-auto text-center animate-fade-in">
          <div className="flex justify-center mb-8">
            <img src={kineduLogo} alt="Kinedu" className="h-10 md:h-12" />
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-primary mb-4">
            Feel unsure about your baby's development?
          </h1>

          {/* Hero photo with decorative elements */}
          <div className="flex justify-center mb-5">
            <div className="relative py-4 px-6">
              <div className="absolute top-0 left-2 w-7 h-7 rounded-full border-[3px] border-orange-400 opacity-80" />
              <div className="absolute top-1 left-12 w-6 h-6 rounded-full bg-purple-500 opacity-70" />
              <div className="absolute top-1/3 -right-2 w-12 h-4 rounded-md bg-pink-400 opacity-60" />
              <div className="absolute bottom-2 left-4 w-7 h-7 rounded-full bg-blue-500 opacity-70" />
              <div className="absolute bottom-1/4 -right-3 text-green-500 text-2xl font-bold opacity-70">+</div>
              <div className="absolute top-1/2 -left-3 w-5 h-5 rounded-full bg-yellow-400 opacity-60" />
              <div className="absolute bottom-0 right-6 w-4 h-4 rounded-full border-[2px] border-pink-400 opacity-60" />
              <img
                src={heroBabyPhoto}
                alt="Happy baby smiling"
                className="relative z-10 w-44 md:w-52 h-60 md:h-80 rounded-[2.5rem] object-cover shadow-lg border-4 border-white"
              />
            </div>
          </div>

          <p className="text-base md:text-lg text-muted-foreground mb-5 max-w-sm mx-auto">
            Answer a few quick questions. Get your baby's personalized development report instantly.
          </p>

          <p className="text-sm font-medium text-muted-foreground mb-4">
            Join <span className="font-bold text-foreground">10M+</span> parents who've already checked
          </p>

          <Button
            variant="success"
            size="xl"
            className="rounded-full px-10 py-6 shadow-lg hover:shadow-xl transition-all text-lg mb-4"
            onClick={() => trackAndNavigate('hero_cta')}
          >
            <span className="flex items-center gap-2">
              Start Assessment — It's Free
              <ArrowRight className="w-5 h-5" strokeWidth={3} />
            </span>
          </Button>

          <div className="flex items-center justify-center gap-2 text-xs md:text-sm text-muted-foreground mb-4">
            <span className="flex items-center gap-1">
              <Timer className="w-3.5 h-3.5 text-primary" />
              2 min
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-primary" />
              No credit card
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-primary" />
              Stanford-backed
            </span>
          </div>

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
              Start Assessment — It's Free
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
