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
      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-12 pb-6 md:pt-20 md:pb-10">
        <div className="max-w-lg mx-auto text-center animate-fade-in">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img src={kineduLogo} alt="Kinedu" className="h-10 md:h-12" />
          </div>

          {/* Emotional headline — message match with ad */}
          <h1 className="text-2xl md:text-3xl font-bold text-primary mb-4">
            Feel unsure about your baby's development?
          </h1>

          {/* Hero photo with decorative elements */}
          <div className="flex justify-center mb-5">
            <div className="relative">
              {/* Decorative elements */}
              <div className="absolute -top-3 -left-4 w-5 h-5 rounded-full border-2 border-orange-400 opacity-80" />
              <div className="absolute -top-2 right--3 w-4 h-4 rounded-full bg-purple-500 opacity-70" />
              <div className="absolute top-1/2 -right-6 w-8 h-3 rounded-sm bg-pink-400 opacity-60" />
              <div className="absolute -bottom-2 -left-5 w-5 h-5 rounded-full bg-blue-500 opacity-70" />
              <div className="absolute bottom-4 -right-4 text-green-500 text-xl font-bold opacity-70">+</div>
              <img
                src={heroBabyPhoto}
                alt="Happy baby smiling"
                className="w-40 md:w-48 h-56 md:h-72 rounded-full object-cover shadow-lg border-4 border-white"
              />
            </div>
          </div>

          {/* Sub-copy */}
          <p className="text-base md:text-lg text-muted-foreground mb-5 max-w-sm mx-auto">
            Answer a few quick questions. Get your baby's personalized development report instantly.
          </p>

          {/* Social proof */}
          <p className="text-sm font-medium text-muted-foreground mb-4">
            Join <span className="font-bold text-foreground">500,000+</span> parents who've already checked
          </p>

          {/* CTA */}
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

          {/* Trust bar */}
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

          {/* Compact academic logos — above the fold */}
          <AcademicLogosBar />

          {/* Inline Age Selector — "Foot in the Door" */}
          {showAgeSelector && (
            <div
              ref={ageSelectorRef}
              className="animate-fade-in bg-card rounded-2xl border border-border p-6 shadow-md mb-6"
            >
              <h2 className="text-lg font-semibold text-foreground mb-4">
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
