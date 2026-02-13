import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Baby, ChevronDown, CalendarIcon, User, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { getSessionId } from "@/hooks/useSessionId";

const BabyForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [prematureOpen, setPrematureOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    gestationalWeeks: "40",
  });
  const [birthDate, setBirthDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUserId(session.user.id);
    }
  };

  const calculateCorrectedAge = () => {
    if (!birthDate) return null;
    
    const today = new Date();
    const chronologicalMonths = differenceInMonths(today, birthDate);
    
    const gestationalWeeks = parseInt(formData.gestationalWeeks);
    if (gestationalWeeks < 37) {
      const correctionWeeks = 40 - gestationalWeeks;
      const correctionMonths = Math.round(correctionWeeks / 4.33);
      return Math.max(0, chronologicalMonths - correctionMonths);
    }
    
    return chronologicalMonths;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!birthDate) {
      toast.error("Please enter the birth date");
      return;
    }

    if (!consent) {
      toast.error("Please accept the consent and privacy terms");
      return;
    }

    setLoading(true);
    
    console.log('🚀 Tracking profile_continue_clicked (baby_form)...');
    try {
      const { data: trackData, error: trackError } = await supabase.from('page_events').insert({
        event_type: 'profile_continue_clicked',
        event_data: { source: 'baby_form' },
        user_agent: navigator.userAgent,
        session_id: getSessionId()
      }).select();
      
      console.log('📊 Insert result:', { data: trackData, error: trackError });
      if (trackError) console.error('❌ Error tracking:', trackError);
      else console.log('✅ Tracked successfully:', trackData);
    } catch (err) {
      console.error('❌ Exception tracking:', err);
    }
    
    try {
      const birthDateStr = format(birthDate, "yyyy-MM-dd");
      
      const { data: baby, error: babyError } = await supabase
        .from("babies")
        .insert({
          name: formData.name || "Baby",
          birthdate: birthDateStr,
          gestational_weeks: parseInt(formData.gestationalWeeks),
          user_id: userId,
        })
        .select()
        .single();

      if (babyError) throw babyError;

      const babyBirthDate = new Date(baby.birthdate);
      const today = new Date();
      const chronologicalMonths = differenceInMonths(today, babyBirthDate);
      
      let referenceAgeMonths = chronologicalMonths;
      if (baby.gestational_weeks && baby.gestational_weeks < 37) {
        const correctionWeeks = 40 - baby.gestational_weeks;
        const correctionMonths = Math.round(correctionWeeks / 4.33);
        referenceAgeMonths = Math.max(0, chronologicalMonths - correctionMonths);
      }

      const { data: assessment, error: assessmentError } = await supabase
        .from("assessments")
        .insert({
          baby_id: baby.id,
          reference_age_months: referenceAgeMonths,
          locale: "en",
        })
        .select()
        .single();

      if (assessmentError) throw assessmentError;

      toast.success("Baby profile created successfully");
      navigate(`/assessment/${assessment.id}`);
    } catch (error: any) {
      console.error("Error creating baby:", error);
      toast.error(error.message || "Failed to create baby profile");
    } finally {
      setLoading(false);
    }
  };

  const correctedAge = calculateCorrectedAge();
  const isPremature = parseInt(formData.gestationalWeeks) < 37;

  return (
    <div className="min-h-screen bg-gradient-warm py-6 md:py-8 px-4">
      <div className="container max-w-md mx-auto">
        <Button variant="ghost" asChild className="mb-6 hover:bg-transparent transition-colors -ml-2">
          <Link to="/" className="flex items-center gap-2 text-base text-foreground">
            <ArrowLeft className="w-5 h-5" />
            Back
          </Link>
        </Button>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6 animate-fade-in">
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
            <span className="text-sm font-medium text-foreground">Profile</span>
          </div>
          <div className="w-6 h-px bg-border" />
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">2</div>
            <span className="text-sm text-muted-foreground">Assessment</span>
          </div>
          <div className="w-6 h-px bg-border" />
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">3</div>
            <span className="text-sm text-muted-foreground">Plan</span>
          </div>
        </div>
        
        <Card className="relative overflow-hidden p-6 md:p-8 shadow-lg bg-card/80 backdrop-blur border-border/50">
          {/* Decorative gradient blob */}
          <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-accent/5 blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="relative flex flex-col items-center text-center mb-8 animate-fade-in">
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">Baby Profile</h1>
            <p className="text-sm text-muted-foreground mt-1">Tell us about your little one</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-7 relative">
            {/* Baby's Name */}
            <div className="space-y-2 animate-fade-in" style={{ animationDelay: "0.05s", animationFillMode: "both" }}>
              <Label htmlFor="name" className="text-sm font-medium text-foreground">Baby's name <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <div>
                <Input
                  id="name"
                  placeholder="E.g., Emma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-12 text-base bg-background border-border rounded-xl focus:ring-primary/30 transition-shadow focus:shadow-soft"
                />
              </div>
            </div>
            
            {/* Date of Birth */}
            <div className="space-y-2 animate-fade-in" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
              <Label className="text-sm font-medium text-foreground">Date of birth</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-12 w-full justify-start text-left font-normal bg-background border-border rounded-xl transition-shadow focus:shadow-soft",
                      !birthDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {birthDate ? format(birthDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={birthDate}
                    onSelect={setBirthDate}
                    disabled={(date) => {
                      const sixYearsAgo = new Date();
                      sixYearsAgo.setFullYear(sixYearsAgo.getFullYear() - 6);
                      return date > new Date() || date < sixYearsAgo;
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">Age range for quiz: 0-6 years</p>
            </div>
            
            {/* Premature toggle → Gestational Weeks */}
            <div className="animate-fade-in" style={{ animationDelay: "0.15s", animationFillMode: "both" }}>
              <Collapsible open={prematureOpen} onOpenChange={setPrematureOpen}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group w-full"
                  >
                    <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", prematureOpen && "rotate-180")} />
                    <span>Born premature?</span>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-2">
                  <Label htmlFor="gestationalWeeks" className="text-sm font-medium text-foreground">Gestational weeks</Label>
                  <Input
                    id="gestationalWeeks"
                    type="number"
                    min="24"
                    max="42"
                    value={formData.gestationalWeeks}
                    onChange={(e) => setFormData({ ...formData, gestationalWeeks: e.target.value })}
                    className="h-12 text-base bg-background border-border rounded-xl focus:ring-primary/30 transition-shadow focus:shadow-soft"
                  />
                  <p className="text-xs text-muted-foreground/80 leading-relaxed">
                    Important for premature babies (less than 37 weeks) to calculate corrected age
                  </p>
                </CollapsibleContent>
              </Collapsible>
            </div>
            
            {/* Corrected Age Notice */}
            {isPremature && correctedAge !== null && (
              <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 animate-fade-in">
                <h3 className="font-semibold text-sm text-warning-foreground mb-2 flex items-center gap-2">
                  <Baby className="w-4 h-4" />
                  Corrected Age
                </h3>
                <p className="text-xs text-foreground/80 leading-relaxed">
                  Since your baby was born premature, we'll use the corrected age of{" "}
                  <span className="font-bold text-foreground">{correctedAge} months</span> to 
                  show only appropriate milestones
                </p>
              </div>
            )}
            
            {/* Consent — collapsible */}
            <div className="animate-fade-in" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
              <Collapsible>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="consent"
                    checked={consent}
                    onCheckedChange={(checked) => setConsent(checked as boolean)}
                  />
                  <div className="flex items-center gap-2">
                    <label htmlFor="consent" className="text-sm font-medium text-foreground cursor-pointer">
                      Consent and Privacy
                    </label>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </div>
                <CollapsibleContent className="mt-2 ml-8">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    I agree this assessment is for informational purposes only and does not replace professional medical consultation. Data is stored securely.
                  </p>
                </CollapsibleContent>
              </Collapsible>
            </div>
            
            {/* Action Button */}
            <div className="pt-2 animate-fade-in" style={{ animationDelay: "0.25s", animationFillMode: "both" }}>
              <Button 
                type="submit" 
                variant="success"
                className="w-full h-14 text-base font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all group" 
                disabled={loading}
              >
                {loading ? "Creating..." : (
                  <>
                    Continue to Assessment
                    <ArrowRight className="w-5 h-5 ml-2 flex-shrink-0 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default BabyForm;
