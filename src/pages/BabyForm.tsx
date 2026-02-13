import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Baby, ChevronDown, CalendarIcon, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { getSessionId } from "@/hooks/useSessionId";
import kineduLogo from "@/assets/logo-kinedu-blue.png";

const BabyForm = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [prematureOpen, setPrematureOpen] = useState(false);
  const [babyName, setBabyName] = useState("");
  const [birthDate, setBirthDate] = useState<Date | undefined>(undefined);
  const [gestationalWeeks, setGestationalWeeks] = useState("40");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUserId(session.user.id);
    };
    checkAuth();
  }, []);

  const calculateCorrectedAge = () => {
    if (!birthDate) return null;
    const today = new Date();
    const chronologicalMonths = differenceInMonths(today, birthDate);
    const weeks = parseInt(gestationalWeeks);
    if (weeks < 37) {
      const correctionWeeks = 40 - weeks;
      const correctionMonths = Math.round(correctionWeeks / 4.33);
      return Math.max(0, chronologicalMonths - correctionMonths);
    }
    return chronologicalMonths;
  };

  const handleSubmit = async () => {
    if (!birthDate) {
      toast.error("Please enter the birth date");
      return;
    }
    if (!consent) {
      toast.error("Please accept the consent and privacy terms");
      return;
    }
    setLoading(true);

    try {
      await supabase.from('page_events').insert({
        event_type: 'profile_continue_clicked',
        event_data: { source: 'baby_form' },
        user_agent: navigator.userAgent,
        session_id: getSessionId()
      });
    } catch (err) {
      console.error('Tracking error:', err);
    }

    try {
      const birthDateStr = format(birthDate, "yyyy-MM-dd");
      const { data: baby, error: babyError } = await supabase
        .from("babies")
        .insert({
          name: babyName || "Baby",
          birthdate: birthDateStr,
          gestational_weeks: parseInt(gestationalWeeks),
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

      navigate(`/assessment/${assessment.id}`);
    } catch (error: any) {
      console.error("Error creating baby:", error);
      toast.error(error.message || "Failed to start assessment");
    } finally {
      setLoading(false);
    }
  };

  const correctedAge = calculateCorrectedAge();
  const isPremature = parseInt(gestationalWeeks) < 37;

  return (
    <div className="min-h-screen bg-gradient-warm py-8 px-4">
      <div className="container max-w-md mx-auto">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <img src={kineduLogo} alt="Kinedu" className="h-8" />
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-10">
          <div className={cn("w-2.5 h-2.5 rounded-full transition-colors", step === 1 ? "bg-primary" : "bg-muted")} />
          <div className={cn("w-2.5 h-2.5 rounded-full transition-colors", step === 2 ? "bg-primary" : "bg-muted")} />
        </div>

        {/* Step 1: Baby's Name */}
        {step === 1 && (
          <div className="animate-fade-in space-y-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground mb-2">What's your baby's name?</h1>
              <p className="text-sm text-muted-foreground">Optional — you can skip this</p>
            </div>

            <Input
              placeholder="E.g., Emma"
              value={babyName}
              onChange={(e) => setBabyName(e.target.value)}
              className="h-14 text-lg bg-card border-border rounded-2xl text-center"
              autoFocus
            />

            <Button
              variant="success"
              className="w-full h-14 text-lg font-bold rounded-full shadow-lg hover:shadow-xl transition-all group"
              onClick={() => setStep(2)}
            >
              Next
              <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        )}

        {/* Step 2: Birthday + Premature */}
        {step === 2 && (
          <div className="animate-fade-in space-y-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground mb-2">When is your baby's birthday?</h1>
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-14 w-full justify-start text-left text-lg font-normal bg-card border-border rounded-2xl",
                    !birthDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-5 w-5" />
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
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            {/* Separator + Premature */}
            <div className="border-t border-border pt-4">
              <Collapsible open={prematureOpen} onOpenChange={setPrematureOpen}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
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
                    value={gestationalWeeks}
                    onChange={(e) => setGestationalWeeks(e.target.value)}
                    className="h-12 text-base bg-card border-border rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground/80 leading-relaxed">
                    Important for premature babies (&lt;37 weeks) to calculate corrected age
                  </p>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Corrected Age Notice */}
            {isPremature && correctedAge !== null && (
              <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 animate-fade-in">
                <h3 className="font-semibold text-sm text-warning-foreground mb-1 flex items-center gap-2">
                  <Baby className="w-4 h-4" />
                  Corrected Age
                </h3>
                <p className="text-xs text-foreground/80">
                  We'll use the corrected age of <span className="font-bold">{correctedAge} months</span> for the assessment.
                </p>
              </div>
            )}

            {/* Consent */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="consent"
                checked={consent}
                onCheckedChange={(checked) => setConsent(checked as boolean)}
                className="mt-0.5"
              />
              <label htmlFor="consent" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                I agree this assessment is for informational purposes only and does not replace professional medical consultation.
              </label>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="h-14 rounded-full px-6"
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button
                variant="success"
                className="flex-1 h-14 text-lg font-bold rounded-full shadow-lg hover:shadow-xl transition-all group"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? "Starting..." : (
                  <>
                    Continue
                    <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BabyForm;
