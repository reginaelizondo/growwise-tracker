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
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [prematureOpen, setPrematureOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    gestationalWeeks: "40",
  });
  const [birthDate, setBirthDate] = useState<Date | undefined>(undefined);

  // Pre-fill birth date from age_range query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ageRange = params.get('age_range');
    if (ageRange && !birthDate) {
      const today = new Date();
      let monthsBack = 0;
      if (ageRange === '0-3') monthsBack = 1;
      else if (ageRange === '4-6') monthsBack = 5;
      else if (ageRange === '7-9') monthsBack = 8;
      else if (ageRange === '10-12') monthsBack = 11;
      else if (ageRange === '12-24') monthsBack = 18;
      else if (ageRange === '24-36') monthsBack = 30;
      else if (ageRange === '36+') monthsBack = 42;
      if (monthsBack > 0) {
        const approxDate = new Date(today.getFullYear(), today.getMonth() - monthsBack, today.getDate());
        setBirthDate(approxDate);
      }
    }
  }, []);

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

      navigate(`/assessment/${assessment.id}`);
    } catch (error: any) {
      console.error("Error creating baby:", error);
      toast.error(error.message || "Failed to start assessment");
    } finally {
      setLoading(false);
    }
  };

  const correctedAge = calculateCorrectedAge();
  const isPremature = parseInt(formData.gestationalWeeks) < 37;

  return (
    <div className="min-h-screen bg-gradient-warm py-8 px-4">
      <div className="container max-w-md mx-auto">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <img src={kineduLogo} alt="Kinedu" className="h-8" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in">
          {/* Baby's Name */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">What's your baby's name?</h2>
            <Input
              id="name"
              placeholder="E.g., Emma"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-14 text-lg bg-card border-border rounded-2xl focus:ring-primary/30 transition-shadow focus:shadow-soft"
            />
            <p className="text-xs text-muted-foreground">Optional — you can skip this</p>
          </div>

          {/* Date of Birth */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">When is your baby's birthday?</h2>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-14 w-full justify-start text-left text-lg font-normal bg-card border-border rounded-2xl transition-shadow focus:shadow-soft",
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
          </div>

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
                  value={formData.gestationalWeeks}
                  onChange={(e) => setFormData({ ...formData, gestationalWeeks: e.target.value })}
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

          {/* CTA */}
          <Button
            type="submit"
            variant="success"
            className="w-full h-14 text-lg font-bold rounded-full shadow-lg hover:shadow-xl transition-all group"
            disabled={loading}
          >
            {loading ? "Starting..." : (
              <>
                Continue
                <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default BabyForm;
