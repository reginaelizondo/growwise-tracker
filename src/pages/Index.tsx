import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowRight, Brain, Heart, MessageCircle, TrendingUp, Baby, CheckCircle, Download, Clock, Zap, FileText, GraduationCap, LogIn, LayoutDashboard, CircleCheck, Timer, Lock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import kineduLogo from "@/assets/logo-kinedu-blue.png";
import babyDevelopmentIllustration from "@/assets/baby-development-illustration.png";
import stanfordLogo from "@/assets/Stanford-Seal-Logo.png";
import stanfordLogoSmall from "@/assets/stanford-logo.png";
import stanfordUniversityLogo from "@/assets/stanford-university-logo.png";
import harvardCenterLogo from "@/assets/harvard-center-logo.png";
import { SkillsOverview } from "@/components/SkillsOverview";
import { getSessionId } from "@/hooks/useSessionId";

const Index = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showVideoDialog, setShowVideoDialog] = useState(false);

  useEffect(() => {
    checkAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
  };

  return <div className="min-h-screen bg-gradient-warm">
      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-12 pb-4 md:pt-20 md:pb-6">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
          <div className="flex justify-center mb-8">
            <img src={kineduLogo} alt="Kinedu" className="h-10 md:h-12" />
          </div>
          
          {/* Text */}
          <h1 className="text-2xl md:text-3xl mb-4 max-w-2xl mx-auto bg-muted/30 px-6 py-4 rounded-lg font-bold text-primary">
            Is your baby on track?
          </h1>
          
          <div className="text-base md:text-lg text-muted-foreground mb-4 max-w-2xl mx-auto text-center">
            <p>Take this <span className="font-black text-xl md:text-2xl">FREE</span> 5-minute milestone assessment and get instant feedback on your <span className="font-bold">baby's development.</span></p>
          </div>

          {/* Image */}
          <div className="flex justify-center mb-4">
            <img 
              src={babyDevelopmentIllustration} 
              alt="Baby development stages illustration" 
              className="w-full max-w-xs md:max-w-sm"
            />
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs md:text-sm text-muted-foreground mb-6 max-w-xl mx-auto">
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-primary" />
              No credit card required
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Timer className="w-3.5 h-3.5 text-primary" />
              5 minutes
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-primary" />
              Backed by <span className="font-bold">Stanford</span> research
            </span>
          </div>

          {/* CTA */}
          <div className="flex flex-col items-center gap-4 mb-6">
            <Button 
              variant="success" 
              size="xl" 
              className="rounded-full px-10 py-6 shadow-lg hover:shadow-xl transition-all text-lg"
              onClick={async () => {
                console.log('🚀 Tracking landing_start_clicked (hero)...');
                try {
                  const { data, error } = await supabase.from('page_events').insert({
                    event_type: 'landing_start_clicked',
                    event_data: { source: 'hero' },
                    user_agent: navigator.userAgent,
                    session_id: getSessionId()
                  }).select();
                  
                  console.log('📊 Insert result:', { data, error });
                  if (error) console.error('❌ Error tracking:', error);
                  else console.log('✅ Tracked successfully:', data);
                } catch (err) {
                  console.error('❌ Exception:', err);
                }
                navigate('/babies/new');
              }}
            >
              <span className="flex items-center gap-2">
                Start <span className="font-black">FREE</span> Assessment
                <ArrowRight className="w-5 h-5" strokeWidth={3} />
              </span>
            </Button>
          </div>

          {/* Decorative Separator */}
          <div className="mt-6 mb-0 flex items-center justify-center gap-4 max-w-md mx-auto">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-border"></div>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent via-border to-border"></div>
          </div>
        </div>
      </section>

      {/* Skills Overview Section */}
      <SkillsOverview />

      {/* Double Line Separator */}
      <div className="flex flex-col items-center gap-1.5 py-8">
        <div className="w-40 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
        <div className="w-28 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
      </div>

      {/* How It Works */}
      <section className="container mx-auto px-4 pb-12 md:pb-16 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
              4 Simple Steps
            </h2>
            <p className="text-sm text-muted-foreground">
              From a few quick answers to your complete developmental report.
            </p>
          </div>
          
          {/* Timeline Grid */}
          <div className="grid gap-1.5 max-w-xl mx-auto">
            {/* Step 1 */}
            <div className="group flex items-start gap-2 animate-fade-in p-3 rounded-2xl hover:bg-primary/5 transition-all duration-300">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <span className="text-lg font-bold text-primary">1</span>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold mb-0">Mark what baby can do</h3>
                <p className="text-sm text-muted-foreground/80 leading-relaxed">
                  Answer simple Yes/No questions — you'll only see milestones that match your baby's age.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="group flex items-start gap-2 animate-fade-in p-3 rounded-2xl hover:bg-primary/5 transition-all duration-300" style={{ animationDelay: '0.1s' }}>
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <span className="text-lg font-bold text-primary">2</span>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold mb-0">Get instant feedback</h3>
                <p className="text-sm text-muted-foreground/80 leading-relaxed">
                  See how each skill is progressing (Mastered / On Track / Reinforce) and view percentile results with clear next steps.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="group flex items-start gap-2 animate-fade-in p-3 rounded-2xl hover:bg-primary/5 transition-all duration-300" style={{ animationDelay: '0.2s' }}>
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <span className="text-lg font-bold text-primary">3</span>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold mb-0">Download your report</h3>
                <p className="text-sm text-muted-foreground/80 leading-relaxed">
                  Get a full summary by area, including skill details, charts, and monthly insights on what to expect next.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="group flex items-start gap-2 animate-fade-in p-3 rounded-2xl hover:bg-primary/5 transition-all duration-300" style={{ animationDelay: '0.3s' }}>
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <span className="text-lg font-bold text-primary">4</span>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold mb-0">Unlock Kinedu plan</h3>
                <p className="text-sm text-muted-foreground/80 leading-relaxed">
                  Download the Kinedu app to receive a personalized activity plan tailored to your baby's unique development.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Double Line Separator */}
      <div className="flex flex-col items-center gap-1.5 pt-2 pb-8">
        <div className="w-40 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
        <div className="w-28 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
      </div>

      {/* Why Trust Us */}
      <section className="container mx-auto px-4 pt-2 pb-12 md:pt-2 md:pb-16">
        <Card className="max-w-3xl mx-auto p-8 md:p-10 bg-primary/5 border-primary/20">
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mx-auto mb-6">
              <img src={stanfordUniversityLogo} alt="Stanford University" className="w-32 h-auto object-contain" />
              <img src={harvardCenterLogo} alt="Harvard Center on the Developing Child" className="w-32 h-auto object-contain" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Why Trust Us
            </h2>
            <div className="text-center max-w-xl mx-auto space-y-3 text-sm md:text-base text-muted-foreground leading-relaxed">
              <p>
                <span className="font-semibold text-foreground">Kinedu Skills®</span> was developed in collaboration with <span className="font-semibold text-foreground">Prof. Michael Frank, PhD (Stanford University)</span> and is informed by research from <span className="font-semibold text-foreground">Harvard University</span>.
              </p>
              <p>
                Grounded in science, our framework covers <span className="font-semibold text-foreground">74 core developmental skills</span> and <span className="font-semibold text-foreground">400+ milestones</span>, validated through large-scale studies with more than <span className="font-semibold text-foreground">2,000 caregivers</span>.
              </p>
              <p>
                The model demonstrates exceptional psychometric reliability <span className="font-semibold text-foreground">(Cronbach's α ≈ .99 global)</span> and reflects the latest research on early learning and caregiver-reported development.
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* CTA */}
      <section className="relative container mx-auto px-4 pt-2 pb-8 md:pb-12 overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-2xl md:text-3xl font-bold mb-6 bg-gradient-hero bg-clip-text text-transparent leading-tight">
              Start Your Baby's Development Journey Today
            </h2>
            
            <p className="text-base text-muted-foreground mb-10 max-w-xl mx-auto">
              Join thousands of parents who trust our research-backed assessment to support their baby's growth
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Button 
                variant="success" 
                size="xl" 
                className="rounded-full px-10 py-6 shadow-lg hover:shadow-xl transition-all text-lg"
                onClick={async () => {
                  console.log('🚀 Tracking landing_start_clicked (cta_bottom)...');
                  try {
                    const { data, error } = await supabase.from('page_events').insert({
                      event_type: 'landing_start_clicked',
                      event_data: { source: 'cta_bottom' },
                      user_agent: navigator.userAgent,
                      session_id: getSessionId()
                    }).select();
                    
                    console.log('📊 Insert result:', { data, error });
                    if (error) console.error('❌ Error tracking:', error);
                    else console.log('✅ Tracked successfully:', data);
                  } catch (err) {
                    console.error('❌ Exception:', err);
                  }
                  navigate('/babies/new');
                }}
              >
                <span className="flex items-center gap-2">
                  Start <span className="font-black">FREE</span> Assessment
                  <ArrowRight className="w-5 h-5" strokeWidth={3} />
                </span>
              </Button>
            </div>

            {/* Go to Dashboard - Only for authenticated users */}
            {isAuthenticated && (
              <div className="flex justify-center mb-8">
                <Button 
                  variant="default" 
                  size="lg"
                  asChild 
                  className="rounded-full px-8"
                >
                  <Link to="/dashboard" className="flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4" />
                    Go to Dashboard
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <a href="https://app.kinedu.com/about-copy2/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">About Kinedu</a>
              <a href="https://app.kinedu.com/science/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Science Behind Kinedu</a>
            </div>
            <div className="flex items-center gap-4">
              <a href="https://blog.kinedu.com/privacy-policy-2/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="https://blog.kinedu.com/privacy-policy/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Terms</a>
              <a href="mailto:hello@kinedu.com" className="hover:text-foreground transition-colors">Contact Us</a>
            </div>
            <div className="mt-2">© 2025 Kinedu. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>;
};
export default Index;