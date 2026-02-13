import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Baby, ChevronDown, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { differenceInMonths, format } from "date-fns";
import { cn } from "@/lib/utils";
import { getSessionId } from "@/hooks/useSessionId";
import { Progress } from "@/components/ui/progress";
import kineduLogo from "@/assets/logo-kinedu-blue.png";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 7 }, (_, i) => currentYear - i);

const getDaysInMonth = (month: number, year: number) => {
  if (!month || !year) return 31;
  return new Date(year, month, 0).getDate();
};

const BabyForm = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [prematureOpen, setPrematureOpen] = useState(false);
  const [babyName, setBabyName] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [gestationalWeeks, setGestationalWeeks] = useState("40");
  const [showMotivation, setShowMotivation] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUserId(session.user.id);
    };
    checkAuth();
  }, []);

  const birthDate = birthMonth && birthDay && birthYear
    ? new Date(parseInt(birthYear), parseInt(birthMonth) - 1, parseInt(birthDay))
    : null;

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

  const handleNextStep = () => {
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!birthDate) {
      toast.error("Please select the birth date");
      return;
    }
    
    // Show motivational transition first
    setShowMotivation(true);
    
    // Wait for animation, then proceed
    setTimeout(async () => {
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
        setShowMotivation(false);
      } finally {
        setLoading(false);
      }
    }, 1800);
  };

  const correctedAge = calculateCorrectedAge();
  const isPremature = parseInt(gestationalWeeks) < 37;
  const progressValue = step === 1 ? 10 : 22;
  const daysInMonth = getDaysInMonth(parseInt(birthMonth), parseInt(birthYear));
  const dayOptions = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const displayName = babyName || "your baby";

  return (
    <div className="min-h-screen bg-gradient-warm py-6 px-4">
      <div className="container max-w-md mx-auto">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src={kineduLogo} alt="Kinedu" className="h-8" />
        </div>

        {/* Global Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-muted-foreground">Your report</span>
            <span className="text-xs font-bold text-primary">{progressValue}% complete</span>
          </div>
          <Progress value={progressValue} className="h-2.5 bg-muted/50" />
        </div>

        {/* Motivational transition */}
        {showMotivation && (
          <div className="animate-fade-in flex flex-col items-center justify-center py-16 space-y-4">
            <Sparkles className="w-10 h-10 text-primary animate-pulse" />
            <p className="text-lg font-semibold text-foreground text-center">
              Great! We'll personalize {babyName ? `${babyName}'s` : "the"} assessment ✨
            </p>
          </div>
        )}

        {/* Step 1: Baby's Name */}
        {step === 1 && !showMotivation && (
          <div className="animate-fade-in space-y-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-primary mb-2">What's your baby's name?</h1>
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
              onClick={handleNextStep}
            >
              Next
              <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        )}

        {/* Step 2: Birthday + Premature */}
        {step === 2 && !showMotivation && (
          <div className="animate-fade-in space-y-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground mb-2">
                When is {displayName}'s birthday?
              </h1>
            </div>

            {/* 3 Dropdowns: Month / Day / Year */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-medium">Month</Label>
                <Select value={birthMonth} onValueChange={setBirthMonth}>
                  <SelectTrigger className="h-12 rounded-xl bg-card border-border">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[250px] z-50 bg-background">
                    {months.map((m, i) => (
                      <SelectItem key={i} value={(i + 1).toString()}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-medium">Day</Label>
                <Select value={birthDay} onValueChange={setBirthDay}>
                  <SelectTrigger className="h-12 rounded-xl bg-card border-border">
                    <SelectValue placeholder="Day" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[250px] z-50 bg-background">
                    {dayOptions.map((d) => (
                      <SelectItem key={d} value={d.toString()}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-medium">Year</Label>
                <Select value={birthYear} onValueChange={setBirthYear}>
                  <SelectTrigger className="h-12 rounded-xl bg-card border-border">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[250px] z-50 bg-background">
                    {years.map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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

            {/* Buttons */}
            <div className="space-y-3">
              <Button
                variant="success"
                className="w-full h-14 text-lg font-bold rounded-full shadow-lg hover:shadow-xl transition-all group"
                onClick={handleSubmit}
                disabled={loading || !birthDate}
              >
                {loading ? "Starting..." : (
                  <>
                    Continue
                    <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
              <button
                type="button"
                className="w-full text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors flex items-center justify-center gap-1"
                onClick={() => setStep(1)}
              >
                <ArrowLeft className="w-3 h-3" />
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BabyForm;
