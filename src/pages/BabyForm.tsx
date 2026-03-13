import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Baby, ChevronDown, ArrowRight, ArrowLeft, Sparkles, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { differenceInMonths, format } from "date-fns";
import { cn } from "@/lib/utils";
import { getSessionId } from "@/hooks/useSessionId";
import { Progress } from "@/components/ui/progress";
import kineduLogo from "@/assets/logo-kinedu-blue.png";
import { KINEDU_API_BASE_URL } from "@/config/kinedu";
import { getMetaPixelData, sendKineduEvent, trackPixelPageView } from "@/utils/metaPixel";
import logoCognitive from "@/assets/Logo_Cognitive_HD.png";
import logoPhysical from "@/assets/Logo_Physical_HD.png";
import logoLinguistic from "@/assets/Logo_Linguistic_HD.png";
import logoEmotional from "@/assets/Logo_Emotional_HD.png";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const getDaysInMonth = (month: number, year: number) => {
  if (isNaN(month) || isNaN(year) || !month || !year) return 31;
  return new Date(year, month, 0).getDate();
};

const BabyForm = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [prematureOpen, setPrematureOpen] = useState(false);
  const [babyName, setBabyName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentName, setParentName] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [gestationalWeeks, setGestationalWeeks] = useState("40");
  const [selectedAreas, setSelectedAreas] = useState<number[]>([2, 1, 3, 4]); // All selected by default
  const submittingRef = useRef(false); // Prevent double-submit

  // Compute years dynamically (not at module level) so it updates if tab stays open across New Year
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => currentYear - i);

  const areaOptions = [
    { id: 2, name: "Cognitive", icon: logoCognitive, color: "hsl(var(--cognitive))" },
    { id: 1, name: "Physical", icon: logoPhysical, color: "hsl(var(--physical))" },
    { id: 3, name: "Linguistic", icon: logoLinguistic, color: "hsl(var(--linguistic))" },
    { id: 4, name: "Socio-Emotional", icon: logoEmotional, color: "hsl(var(--emotional))" },
  ];

  const toggleArea = (areaId: number) => {
    setSelectedAreas(prev =>
      prev.includes(areaId)
        ? prev.filter(id => id !== areaId)
        : [...prev, areaId]
    );
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUserId(session.user.id);
    };
    checkAuth();
  }, []);

  // Meta Pixel: track quiz start
  useEffect(() => {
    trackPixelPageView();
    sendKineduEvent("quiz_start", { source: "baby_form" });
  }, []);

  // Clamp day when month/year changes to avoid invalid dates (e.g., Feb 31)
  const daysInMonth = getDaysInMonth(parseInt(birthMonth), parseInt(birthYear));
  useEffect(() => {
    if (birthDay && parseInt(birthDay) > daysInMonth) {
      setBirthDay(daysInMonth.toString());
    }
  }, [birthMonth, birthYear, daysInMonth, birthDay]);

  const dayOptions = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const birthDate = birthMonth && birthDay && birthYear
    ? new Date(parseInt(birthYear), parseInt(birthMonth) - 1, parseInt(birthDay))
    : null;

  // Validate birth date is not in the future
  const isFutureDate = birthDate ? birthDate > new Date() : false;

  // Validate gestational weeks
  const parsedGestationalWeeks = parseInt(gestationalWeeks);
  const isValidGestationalWeeks = !isNaN(parsedGestationalWeeks) && parsedGestationalWeeks >= 24 && parsedGestationalWeeks <= 42;

  const calculateCorrectedAge = () => {
    if (!birthDate) return null;
    const today = new Date();
    const chronologicalMonths = differenceInMonths(today, birthDate);
    if (isValidGestationalWeeks && parsedGestationalWeeks < 37) {
      const correctionWeeks = 40 - parsedGestationalWeeks;
      const correctionMonths = Math.round(correctionWeeks / 4.33);
      return Math.max(0, chronologicalMonths - correctionMonths);
    }
    return Math.max(0, chronologicalMonths);
  };

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const trackStep = (stepName: string, extraData?: Record<string, any>) => {
    // Remove PII from tracking data
    const safeData = { ...extraData };
    delete safeData.name;

    supabase.from('page_events').insert({
      event_type: stepName,
      event_data: { source: 'baby_form', ...safeData },
      user_agent: navigator.userAgent,
      session_id: getSessionId()
    }).then(() => {}).catch((err: any) => console.error('Tracking error:', err));
  };

  const handleNextStep = () => {
    if (step === 1) {
      trackStep('form_name_completed');
      setStep(2);
    } else if (step === 2) {
      if (!birthDate) {
        toast.error("Please select the birth date");
        return;
      }
      if (isFutureDate) {
        toast.error("Birth date cannot be in the future");
        return;
      }
      if (prematureOpen && !isValidGestationalWeeks) {
        toast.error("Gestational weeks must be between 24 and 42");
        return;
      }
      trackStep('form_birthday_completed');
      setStep(3);
    } else if (step === 3) {
      if (parentEmail && !isValidEmail(parentEmail)) {
        toast.error("Please enter a valid email address");
        return;
      }
      trackStep('form_email_completed', { has_email: !!parentEmail, has_parent_name: !!parentName });
      setStep(4);
    }
  };

  const handleSubmit = async () => {
    // Prevent double-submit
    if (submittingRef.current) return;
    submittingRef.current = true;

    if (selectedAreas.length === 0) {
      toast.error("Please select at least one area");
      submittingRef.current = false;
      return;
    }
    if (!birthDate) {
      toast.error("Please select the birth date");
      submittingRef.current = false;
      return;
    }
    if (isFutureDate) {
      toast.error("Birth date cannot be in the future");
      submittingRef.current = false;
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
      const safeGestationalWeeks = isValidGestationalWeeks ? parsedGestationalWeeks : 40;

      const { data: baby, error: babyError } = await supabase
        .from("babies")
        .insert({
          name: babyName || "Baby",
          birthdate: birthDateStr,
          gestational_weeks: safeGestationalWeeks,
          user_id: userId,
          email: parentEmail || null,
        })
        .select()
        .single();
      if (babyError) throw babyError;

      // Meta Pixel: track baby created
      sendKineduEvent("baby_created", { baby_id: baby.id, source: "baby_form" });

      // If Kinedu registration was initiated, update baby_id for tracking
      if (parentEmail && parentName) {
        const metaData = getMetaPixelData();
        supabase.functions.invoke('register-kinedu-user', {
          body: { name: parentName, email: parentEmail, baby_id: baby.id, kinedu_api_base_url: KINEDU_API_BASE_URL, ...metaData }
        }).then(({ data }) => {
          if (data?.token) {
            localStorage.setItem(`kinedu_token_${baby.id}`, data.token);
          }
        }).catch(err => console.warn('Kinedu registration failed:', err));
      }

      const babyBirthDate = new Date(baby.birthdate);
      const today = new Date();
      const chronologicalMonths = differenceInMonths(today, babyBirthDate);
      let referenceAgeMonths = Math.max(0, chronologicalMonths);
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

      // Store selected areas for the assessment
      localStorage.setItem(`assessment_areas_${assessment.id}`, JSON.stringify(selectedAreas));

      // Create abandoned_sessions row for recovery
      try {
        await (supabase.from('abandoned_sessions' as any) as any).insert({
          session_id: getSessionId(),
          baby_id: baby.id,
          assessment_id: assessment.id,
          baby_name: babyName || 'Baby',
          baby_birthday: birthDateStr,
          email: parentEmail || null,
          selected_areas: selectedAreas,
          completed_areas: [],
          current_area_id: selectedAreas[0] || 2,
          current_skill_index: 0,
          milestone_answers: {},
          progress_percentage: 24,
        });
      } catch (err) {
        console.error('Error creating abandoned session:', err);
      }

      // Save localStorage recovery record for resume banner on landing page
      try {
        localStorage.setItem('assessment_recovery', JSON.stringify({
          assessment_id: assessment.id,
          session_id: getSessionId(),
          baby_name: babyName || 'Baby',
          progress_percentage: 24,
          timestamp: new Date().toISOString(),
        }));
      } catch (_) {}

      navigate(`/assessment/${assessment.id}`);
    } catch (error: any) {
      console.error("Error creating baby:", error);
      toast.error("Failed to start assessment. Please try again.");
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  const correctedAge = calculateCorrectedAge();
  const isPremature = isValidGestationalWeeks && parsedGestationalWeeks < 37;
  const progressValue = step === 1 ? 10 : step === 2 ? 16 : step === 3 ? 20 : 24;
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

        {/* Step 1: Baby's Name */}
        {step === 1 && !loading && (
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
        {step === 2 && !loading && (
          <div className="animate-fade-in space-y-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-primary mb-2">
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

            {/* Future date warning */}
            {isFutureDate && (
              <p className="text-sm text-destructive text-center">Birth date cannot be in the future</p>
            )}

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
                    onChange={(e) => {
                      const val = e.target.value;
                      // Only allow numbers in range
                      if (val === '') {
                        setGestationalWeeks('');
                        return;
                      }
                      const num = parseInt(val);
                      if (!isNaN(num) && num >= 0 && num <= 50) {
                        setGestationalWeeks(val);
                      }
                    }}
                    className="h-12 text-base bg-card border-border rounded-xl"
                  />
                  {gestationalWeeks && !isValidGestationalWeeks && (
                    <p className="text-xs text-destructive">Must be between 24 and 42 weeks</p>
                  )}
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
                onClick={handleNextStep}
                disabled={!birthDate || isFutureDate}
              >
                Continue
                <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
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

        {/* Step 3: Contact Info */}
        {step === 3 && !loading && (
          <div className="animate-fade-in space-y-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-primary mb-2">Your contact info</h1>
              <p className="text-sm text-muted-foreground"><span className="font-bold">Optional</span> — we'll send you {displayName}'s results</p>
            </div>

            <div className="space-y-4">
              <Input
                type="text"
                placeholder="Your name"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                className="h-14 text-lg bg-card border-border rounded-2xl text-center"
                autoFocus
              />
              <Input
                type="email"
                placeholder="parent@email.com"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                className="h-14 text-lg bg-card border-border rounded-2xl text-center"
              />
            </div>

            <div className="space-y-3">
              <Button
                variant="success"
                className="w-full h-14 text-lg font-bold rounded-full shadow-lg hover:shadow-xl transition-all group"
                onClick={handleNextStep}
              >
                {parentEmail ? "Continue" : "Skip"}
                <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
              <button
                type="button"
                className="w-full text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors flex items-center justify-center gap-1"
                onClick={() => setStep(2)}
              >
                <ArrowLeft className="w-3 h-3" />
                Back
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Area Selection */}
        {step === 4 && !loading && (
          <div className="animate-fade-in space-y-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-primary mb-2">
                What should we focus on for {displayName}?
              </h1>
              <p className="text-sm text-muted-foreground">Pick one or more developmental areas</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {areaOptions.map((area) => {
                const isSelected = selectedAreas.includes(area.id);
                const colorVar = {
                  2: "--cognitive",
                  1: "--physical",
                  3: "--linguistic",
                  4: "--emotional",
                }[area.id];

                return (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => toggleArea(area.id)}
                    aria-pressed={isSelected}
                    className={cn("relative flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all duration-200 bg-card", !isSelected && "border-border hover:border-muted-foreground/30")}
                    style={isSelected ? {
                      borderColor: `hsl(var(${colorVar}))`,
                      backgroundColor: `hsl(var(${colorVar}) / 0.05)`,
                      transform: 'scale(1.02)',
                      boxShadow: `0 4px 12px hsl(var(${colorVar}) / 0.2)`
                    } : undefined}
                    data-unselected={!isSelected ? "true" : undefined}
                  >
                    {isSelected && (
                      <div
                        className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `hsl(var(${colorVar}))` }}
                      >
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <img src={area.icon} alt={area.name} className="w-12 h-12 object-contain" />
                    <span className={cn(
                      "text-sm font-semibold text-center",
                      isSelected ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {area.name}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-3">
              <Button
                variant="success"
                className="w-full h-14 text-lg font-bold rounded-full shadow-lg hover:shadow-xl transition-all group"
                onClick={handleSubmit}
                disabled={loading || selectedAreas.length === 0}
              >
                {loading ? "Starting..." : (
                  <>
                    Start Assessment
                    <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
              <button
                type="button"
                className="w-full text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors flex items-center justify-center gap-1"
                onClick={() => setStep(3)}
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
