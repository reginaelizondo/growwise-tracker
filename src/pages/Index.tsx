import { Button } from "@/components/ui/button";
import { ArrowRight, Timer, Lock, GraduationCap, LayoutDashboard } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import kineduLogo from "@/assets/logo-kinedu-blue.png";
import heroBabyPhoto from "@/assets/hero-baby-real.jpg";
// report preview removed
import { getSessionId } from "@/hooks/useSessionId";
import SocialProofBlock from "@/components/SocialProofBlock";
import WhyTrustUs from "@/components/WhyTrustUs";
import AcademicLogosBar from "@/components/AcademicLogosBar";

const ageRanges = [
  { label: "0–3 months", value: "0-3" },
  { label: "4–6 months", value: "4-6" },
  { label: "7–9 months", value: "7-9" },
  { label: "10–12 months", value: "10-12" },
  { label: "1–2 years", value: "12-24" },
  { label: "2–3 years", value: "24-36" },
  { label: "3+ years", value: "36+" },
];

const Index = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAgeSelector, setShowAgeSelector] = useState(false);
  const ageSelectorRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (showAgeSelector && ageSelectorRef.current) {
      ageSelectorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [showAgeSelector]);

  const trackAndNavigate = async (source: string, ageRange?: string) => {
    try {
      await supabase.from('page_events').insert({
        event_type: 'landing_start_clicked',
        event_data: { source, ...(ageRange ? { age_range: ageRange } : {}) },
        user_agent: navigator.userAgent,
        session_id: getSessionId()
      });
    } catch (err) {
      console.error('Tracking error:', err);
    }
    const params = ageRange ? `?age_range=${ageRange}` : '';
    navigate(`/babies/new${params}`);
  };

  const handleCtaClick = () => {
    setShowAgeSelector(true);
  };

  const handleAgeSelect = (value: string) => {
    trackAndNavigate('hero_age_selector', value);
  };

  return (
    <div className="min-h-screen bg-gradient-warm">
      {/* Logo */}
      <div className="flex justify-center pt-8 pb-4 md:pt-12 md:pb-6">
        <img src={kineduLogo} alt="Kinedu" className="h-10 md:h-12" />
      </div>

      {/* Hero Section — side by side on desktop, stacked on mobile */}
      <section className="container mx-auto px-4 pb-6 md:pb-10">
        <div className="max-w-3xl mx-auto animate-fade-in">
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
            {/* Left: Copy + CTA */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl md:text-4xl font-bold text-primary mb-3 leading-tight">
                Feel unsure about your baby's development?
              </h1>

              <p className="text-base md:text-lg text-muted-foreground mb-4 max-w-sm mx-auto md:mx-0">
                Answer a few quick questions. Get your baby's personalized development report instantly.
              </p>

              <p className="text-sm font-medium text-muted-foreground mb-4">
                Join <span className="font-bold text-foreground">500,000+</span> parents who've already checked
              </p>

              {!showAgeSelector && (
                <Button
                  variant="success"
                  size="xl"
                  className="rounded-full px-10 py-6 shadow-lg hover:shadow-xl transition-all text-lg mb-4"
                  onClick={handleCtaClick}
                >
                  <span className="flex items-center gap-2">
                    Start Assessment — It's Free
                    <ArrowRight className="w-5 h-5" strokeWidth={3} />
                  </span>
                </Button>
              )}

              <div className="flex items-center justify-center md:justify-start gap-2 text-xs md:text-sm text-muted-foreground mb-4">
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

              <div className="flex justify-center md:justify-start">
                <AcademicLogosBar />
              </div>
            </div>

            {/* Right: Baby photo */}
            <div className="flex-shrink-0">
              <img
                src={heroBabyPhoto}
                alt="Happy baby smiling"
                className="w-52 md:w-64 h-64 md:h-80 rounded-3xl object-cover shadow-lg"
              />
            </div>
          </div>

          {/* Inline Age Selector — full width below */}
          {showAgeSelector && (
            <div
              ref={ageSelectorRef}
              className="animate-fade-in bg-card rounded-2xl border border-border p-6 shadow-md mt-6 max-w-lg mx-auto"
            >
              <h2 className="text-lg font-semibold text-foreground mb-4 text-center">
                How old is your baby?
              </h2>
              <div className="grid grid-cols-2 gap-2.5">
                {ageRanges.map((range) => (
                  <Button
                    key={range.value}
                    variant="outline"
                    className="h-12 text-sm font-medium rounded-xl hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => handleAgeSelect(range.value)}
                  >
                    {range.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>




      {/* Social Proof Block */}
      <section className="container mx-auto px-4 pb-8 md:pb-12">
        <div className="max-w-lg mx-auto">
          <SocialProofBlock />
        </div>
      </section>

      {/* Why Trust Us */}
      <section className="container mx-auto px-4 pb-8 md:pb-12">
        <div className="max-w-lg mx-auto">
          <WhyTrustUs />
        </div>
      </section>

      {/* Bottom CTA — different angle */}
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
              Get Your Free Report Now
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

      {/* Minimal Footer — compliance only */}
      <footer className="border-t border-border">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <a href="https://blog.kinedu.com/privacy-policy-2/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="https://blog.kinedu.com/privacy-policy/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Terms</a>
              <a href="mailto:hello@kinedu.com" className="hover:text-foreground transition-colors">Contact Us</a>
            </div>
            <div className="mt-2">© 2025 Kinedu. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
