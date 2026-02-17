import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Lock, Check, ArrowRight, Mail, Star, Target } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { externalSupabase } from "@/integrations/supabase/external-client";
import { MobileStickyCta } from "@/components/MobileStickyCta";
import { calculatePace } from "@/components/PaceGauge";

import logoPhysical from "@/assets/Logo_Physical_HD.png";
import logoCognitive from "@/assets/Logo_Cognitive_HD.png";
import logoLinguistic from "@/assets/Logo_Linguistic_HD.png";
import logoEmotional from "@/assets/Logo_Emotional_HD.png";

const kineduLogo = "/images/logo-kinedu-blue.png";

// Area colors as hex for inline styles
const AREA_COLORS: Record<number, string> = {
  1: '#00A3E0', // Physical
  2: '#00C853', // Cognitive
  3: '#FF8A00', // Linguistic
  4: '#F06292', // Socio-Emotional
};

const AREA_ICONS: Record<number, string> = {
  1: logoPhysical,
  2: logoCognitive,
  3: logoLinguistic,
  4: logoEmotional,
};

const AREA_NAMES: Record<number, string> = {
  1: 'Physical',
  2: 'Cognitive',
  3: 'Linguistic',
  4: 'Socio-Emotional',
};

const AREA_CSS_VARS: Record<number, string> = {
  1: 'var(--physical)',
  2: 'var(--cognitive)',
  3: 'var(--linguistic)',
  4: 'var(--emotional)',
};

interface SkillResult {
  skill_id: number;
  skill_name: string;
  area_id: number;
  area_name: string;
  mastered: number;
  total: number;
  score: number;
  pace: number;
}

interface AreaResult {
  area_id: number;
  area_name: string;
  avgScore: number;
  pace: number;
  skills: SkillResult[];
  masteredCount: number;
  totalCount: number;
}

const Report = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState<any>(null);
  const [baby, setBaby] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [areaResults, setAreaResults] = useState<AreaResult[]>([]);
  const [allSkillResults, setAllSkillResults] = useState<SkillResult[]>([]);

  // Path B state
  const [hasEmail, setHasEmail] = useState(false);
  const [emailUnlocked, setEmailUnlocked] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [submittingEmail, setSubmittingEmail] = useState(false);

  // Safety timeout
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) setLoading(false);
    }, 15000);
    return () => clearTimeout(timeout);
  }, [loading]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: assessmentData, error: assessmentError } = await supabase
          .from("assessments")
          .select("*, babies(*)")
          .eq("id", id)
          .single();

        if (assessmentError || !assessmentData) {
          toast.error("Report not found");
          navigate("/");
          return;
        }

        setAssessment(assessmentData);
        setBaby(assessmentData.babies);
        setHasEmail(!!assessmentData.babies?.email);

        // Track report view
        supabase.from('assessment_events').insert({
          assessment_id: id,
          baby_id: assessmentData.babies?.id,
          event_type: 'report_view',
          event_data: { source: 'report_page' }
        });

        // If has email, fire email in background (Path A) with delay + retry
        if (assessmentData.babies?.email) {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          const sendEmail = async (retryCount = 0) => {
            try {
              const res = await fetch(`${supabaseUrl}/functions/v1/send-report-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` },
                body: JSON.stringify({ assessment_id: id, baby_id: assessmentData.babies?.id }),
              });
              const data = await res.json();
              if (!res.ok && retryCount < 1) {
                console.warn('Email send failed, retrying in 5s...', data);
                setTimeout(() => sendEmail(retryCount + 1), 5000);
              }
            } catch (err) {
              console.error('Email send error:', err);
              if (retryCount < 1) {
                setTimeout(() => sendEmail(retryCount + 1), 5000);
              }
            }
          };
          // Delay 3s to avoid race condition with response writes
          setTimeout(() => sendEmail(), 3000);
        }

        // Fetch responses
        const { data: responsesData } = await supabase
          .from("assessment_responses")
          .select("milestone_id, answer, skill_id, area_id")
          .eq("assessment_id", id);

        if (!responsesData?.length) {
          setLoading(false);
          return;
        }

        const skillIds = [...new Set(responsesData.map(r => r.skill_id).filter(Boolean))];
        const milestoneIds = responsesData.map(r => r.milestone_id);

        // Fetch skill names
        const { data: skillsRows } = await externalSupabase
          .from('skills_locales')
          .select('skill_id, title, locale')
          .in('skill_id', skillIds);

        const skillNameMap = new Map<number, string>();
        const skillsById = new Map<number, any[]>();
        (skillsRows || []).forEach((row: any) => {
          if (!skillsById.has(row.skill_id)) skillsById.set(row.skill_id, []);
          skillsById.get(row.skill_id)!.push(row);
        });
        const locale = assessmentData.locale || 'en';
        skillsById.forEach((rows, key) => {
          const preferred = rows.find((r: any) => r.locale === locale) || rows.find((r: any) => r.locale === 'en') || rows[0];
          skillNameMap.set(key, preferred?.title || `Skill ${key}`);
        });

        // Fetch ages for milestones
        const { data: ageData } = await externalSupabase
          .from('skill_milestone')
          .select('milestone_id, age')
          .in('milestone_id', milestoneIds);

        const ageMap = new Map<number, number>();
        ageData?.forEach((d: any) => ageMap.set(d.milestone_id, d.age));

        // Build skill results
        const skillMap = new Map<number, { area_id: number; mastered: number; total: number }>();
        responsesData.forEach(r => {
          if (!r.skill_id || !r.area_id) return;
          if (!skillMap.has(r.skill_id)) {
            skillMap.set(r.skill_id, { area_id: r.area_id, mastered: 0, total: 0 });
          }
          const entry = skillMap.get(r.skill_id)!;
          entry.total++;
          if (r.answer === 'yes') entry.mastered++;
        });

        const skills: SkillResult[] = [];
        skillMap.forEach((data, skillId) => {
          const score = data.total > 0 ? Math.round((data.mastered / data.total) * 100) : 0;
          skills.push({
            skill_id: skillId,
            skill_name: skillNameMap.get(skillId) || `Skill ${skillId}`,
            area_id: data.area_id,
            area_name: AREA_NAMES[data.area_id] || 'Unknown',
            mastered: data.mastered,
            total: data.total,
            score,
            pace: calculatePace(score),
          });
        });

        setAllSkillResults(skills);

        // Build area results
        const areaMap = new Map<number, SkillResult[]>();
        skills.forEach(s => {
          if (!areaMap.has(s.area_id)) areaMap.set(s.area_id, []);
          areaMap.get(s.area_id)!.push(s);
        });

        const areas: AreaResult[] = [2, 1, 3, 4]
          .filter(id => areaMap.has(id))
          .map(areaId => {
            const areaSkills = areaMap.get(areaId)!;
            const avgScore = Math.round(areaSkills.reduce((s, sk) => s + sk.score, 0) / areaSkills.length);
            const avgPace = Math.round(areaSkills.reduce((s, sk) => s + sk.pace, 0) / areaSkills.length * 10) / 10;
            const masteredCount = areaSkills.reduce((s, sk) => s + sk.mastered, 0);
            const totalCount = areaSkills.reduce((s, sk) => s + sk.total, 0);
            return {
              area_id: areaId,
              area_name: AREA_NAMES[areaId],
              avgScore,
              pace: avgPace,
              skills: areaSkills,
              masteredCount,
              totalCount,
            };
          });

        setAreaResults(areas);
      } catch (error) {
        console.error("Error fetching report data:", error);
        toast.error("Failed to load report");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  // Strengths and focus areas
  const { strengths, focusAreas } = useMemo(() => {
    if (allSkillResults.length === 0) return { strengths: [], focusAreas: [] };
    const sorted = [...allSkillResults].sort((a, b) => b.score - a.score);
    return {
      strengths: sorted.slice(0, 3),
      focusAreas: sorted.slice(-3).reverse(),
    };
  }, [allSkillResults]);

  // Handle email submit (Path B)
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail.trim() || !baby?.id) return;

    setSubmittingEmail(true);
    try {
      await supabase.from('babies').update({ email: userEmail.trim() }).eq('id', baby.id);

      // Fire email with delay + retry (Path B)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const sendEmail = async (retryCount = 0) => {
        try {
          const res = await fetch(`${supabaseUrl}/functions/v1/send-report-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` },
            body: JSON.stringify({ assessment_id: id, baby_id: baby.id }),
          });
          const data = await res.json();
          if (!res.ok && retryCount < 1) {
            console.warn('Email send failed (Path B), retrying in 5s...', data);
            setTimeout(() => sendEmail(retryCount + 1), 5000);
          }
        } catch (err) {
          console.error('Email send error:', err);
          if (retryCount < 1) {
            setTimeout(() => sendEmail(retryCount + 1), 5000);
          }
        }
      };
      setTimeout(() => sendEmail(), 3000);

      // Track event
      supabase.from('assessment_events').insert({
        assessment_id: id,
        baby_id: baby.id,
        event_type: 'email_captured_post_assessment',
        event_data: { timestamp: new Date().toISOString() }
      });

      setEmailUnlocked(true);
      setHasEmail(true);
      toast.success("Report unlocked! Check your email.");
    } catch (error) {
      console.error('Error submitting email:', error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmittingEmail(false);
    }
  };

  const getPaceLabel = (pace: number) => {
    if (pace >= 1.2) return 'Ahead';
    if (pace >= 0.9) return 'On track';
    return 'Needs support';
  };

  const getPaceColor = (pace: number) => {
    if (pace >= 1.2) return 'hsl(145, 60%, 45%)';
    if (pace >= 0.9) return 'hsl(40, 90%, 50%)';
    return 'hsl(0, 70%, 55%)';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FBF9F6' }}>
        <Card className="p-6"><p className="text-muted-foreground">Loading report...</p></Card>
      </div>
    );
  }

  if (!assessment || !baby) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FBF9F6' }}>
        <Card className="p-6 text-center">
          <p className="text-muted-foreground mb-4">Report not found</p>
          <Button onClick={() => navigate("/")}>Back to home</Button>
        </Card>
      </div>
    );
  }

  const babyName = baby.name;
  const showFullDetails = hasEmail || emailUnlocked;
  const timelineSteps = emailUnlocked
    ? 2 // Path B after unlock: 2 done
    : hasEmail
      ? 1 // Path A: 1 done
      : 0; // Path B before unlock: 0 done (but step 1 is done always since assessment is complete)

  return (
    <div className="min-h-screen pb-36" style={{ background: '#FBF9F6' }}>
      {/* Header with logo */}
      <div className="px-4 pt-4 pb-2 flex justify-center">
        <img src={kineduLogo} alt="Kinedu" className="h-7" />
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-5">
        {/* 1. Celebration Header */}
        <div className="text-center pt-4 pb-2">
          <div className="text-5xl mb-3">🎉</div>
          {hasEmail && !emailUnlocked ? (
            <>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Great job completing {babyName}'s assessment!
              </h1>
              <p className="text-muted-foreground flex items-center justify-center gap-1.5">
                <Mail className="w-4 h-4" /> We've sent the full report to your email
              </p>
            </>
          ) : emailUnlocked ? (
            <>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {babyName}'s full report is ready!
              </h1>
              <p className="text-muted-foreground flex items-center justify-center gap-1.5">
                <Mail className="w-4 h-4" /> We've also emailed you the results
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {babyName}'s assessment is complete!
              </h1>
              <p className="text-muted-foreground">
                Here's a preview of {baby.sex_at_birth === 'female' ? 'her' : 'his'} development.
              </p>
            </>
          )}
        </div>

        {/* 2. Area Cards - responsive grid */}
        <div className={`grid gap-3 ${areaResults.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : 'grid-cols-2'}`}>
          {areaResults.map(area => {
            const color = AREA_COLORS[area.area_id];
            const icon = AREA_ICONS[area.area_id];
            return (
              <div
                key={area.area_id}
                className="rounded-2xl p-4 border"
                style={{ 
                  background: 'white',
                  borderColor: '#E8E4DF',
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <img src={icon} alt={area.area_name} className="w-8 h-8" />
                  <span className="font-bold text-sm text-foreground">{area.area_name}</span>
                </div>
                <div className="text-3xl font-bold mb-1" style={{ color }}>
                  {area.pace.toFixed(1)}x
                </div>
                <div className="text-xs font-medium mb-2" style={{ color: getPaceColor(area.pace) }}>
                  {getPaceLabel(area.pace)}
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: `${color}20` }}>
                  <div 
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${area.avgScore}%`, background: color }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {area.masteredCount}/{area.totalCount} milestones
                </p>
              </div>
            );
          })}
        </div>

        {/* 3. Skill details (blurred or visible) */}
        {!showFullDetails ? (
          /* Path B: Email capture with preview behind */
          <div className="relative" style={{ minHeight: '340px' }}>
            {/* Blurred skill list */}
            <div className="space-y-2 select-none" style={{ filter: 'blur(6px)', pointerEvents: 'none' }}>
              {allSkillResults.length > 0 ? (
                allSkillResults.slice(0, 6).map(skill => (
                  <div key={skill.skill_id} className="rounded-xl p-3 border bg-white" style={{ borderColor: '#E8E4DF' }}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{skill.skill_name}</span>
                      <span className="text-sm font-bold">{skill.score}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full mt-2" style={{ background: '#eee' }}>
                      <div className="h-full rounded-full" style={{ width: `${skill.score}%`, background: AREA_COLORS[skill.area_id] }} />
                    </div>
                  </div>
                ))
              ) : (
                /* Placeholder rows when no skills to show */
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-xl p-3 border bg-white" style={{ borderColor: '#E8E4DF' }}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">Skill details</span>
                      <span className="text-sm font-bold text-muted-foreground">—%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full mt-2" style={{ background: '#eee' }}>
                      <div className="h-full rounded-full" style={{ width: '40%', background: '#ccc' }} />
                    </div>
                  </div>
                ))
              )}
            </div>
            {/* Gradient overlay with email capture */}
            <div 
              className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl"
              style={{
                background: 'linear-gradient(180deg, rgba(251,249,246,0.2) 0%, rgba(251,249,246,0.9) 40%, rgba(251,249,246,1) 70%)',
              }}
            >
              <Lock className="w-8 h-8 text-muted-foreground mb-3" />
              <h3 className="text-lg font-bold text-foreground mb-1">
                Unlock {babyName}'s full report
              </h3>
              <p className="text-sm text-muted-foreground mb-4 text-center px-4">
                See which skills need attention & get {baby.sex_at_birth === 'female' ? 'her' : 'his'} personalized plan
              </p>
              <form onSubmit={handleEmailSubmit} className="w-full max-w-xs space-y-3 px-4">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  required
                  className="h-12 rounded-xl text-base border-2"
                  style={{ borderColor: '#E8E4DF' }}
                />
                <Button
                  type="submit"
                  disabled={submittingEmail}
                  className="w-full h-12 rounded-xl font-bold text-base text-white"
                  style={{ background: 'hsl(145, 60%, 45%)' }}
                >
                  {submittingEmail ? 'Unlocking...' : 'Unlock Full Report'}
                  {!submittingEmail && <ArrowRight className="w-4 h-4 ml-1" />}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  We'll also email you the results
                </p>
              </form>
            </div>
          </div>
        ) : (
          /* Full skill details (Path A, or Path B unlocked) */
          <div className={`space-y-2 transition-all duration-600 ${emailUnlocked ? 'animate-[fadeIn_0.6s_ease-out]' : ''}`}>
            {allSkillResults.map(skill => {
              const color = AREA_COLORS[skill.area_id];
              const statusLabel = skill.score >= 75 ? 'Great!' : skill.score >= 40 ? 'On track' : 'Needs support';
              const statusColor = skill.score >= 75 ? 'hsl(145, 60%, 45%)' : skill.score >= 40 ? 'hsl(40, 90%, 50%)' : 'hsl(0, 70%, 55%)';
              return (
                <div key={skill.skill_id} className="rounded-xl p-3 border bg-white" style={{ borderColor: '#E8E4DF' }}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-semibold text-foreground">{skill.skill_name}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: statusColor, background: `${statusColor}15` }}>
                      {statusLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: `${color}20` }}>
                      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${skill.score}%`, background: color }} />
                    </div>
                    <span className="text-sm font-bold text-foreground w-10 text-right">{skill.score}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{skill.mastered}/{skill.total} milestones</p>
                </div>
              );
            })}
          </div>
        )}

        {/* 4. Strengths & Focus Areas (only when details visible) */}
        {showFullDetails && strengths.length > 0 && (
          <div className={`space-y-3 ${emailUnlocked ? 'animate-[fadeIn_0.6s_ease-out_0.2s_both]' : ''}`}>
            {/* Strengths */}
            <div className="rounded-2xl p-4 border" style={{ background: 'hsl(145, 60%, 96%)', borderColor: 'hsl(145, 40%, 85%)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-5 h-5" style={{ color: 'hsl(145, 60%, 40%)' }} />
                <span className="font-bold text-sm" style={{ color: 'hsl(145, 60%, 30%)' }}>Strengths</span>
              </div>
              <p className="text-sm" style={{ color: 'hsl(145, 60%, 25%)' }}>
                {strengths.map(s => `${s.skill_name} (${s.score}%)`).join(', ')}
              </p>
            </div>

            {/* Focus Areas */}
            <div className="rounded-2xl p-4 border" style={{ background: 'hsl(40, 80%, 96%)', borderColor: 'hsl(40, 60%, 85%)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5" style={{ color: 'hsl(40, 80%, 40%)' }} />
                <span className="font-bold text-sm" style={{ color: 'hsl(40, 80%, 30%)' }}>Needs support</span>
              </div>
              <p className="text-sm" style={{ color: 'hsl(40, 80%, 25%)' }}>
                {focusAreas.map(s => `${s.skill_name} (${s.score}%)`).join(', ')}
              </p>
            </div>
          </div>
        )}

        {/* 5. Timeline */}
        {showFullDetails && (
          <div className={`rounded-2xl p-5 border bg-white ${emailUnlocked ? 'animate-[fadeIn_0.6s_ease-out_0.4s_both]' : ''}`} style={{ borderColor: '#E8E4DF' }}>
            <h3 className="font-bold text-base text-foreground mb-4">
              How Kinedu helps {babyName} grow
            </h3>
            <div className="space-y-4">
              {/* Step 1 - Always done */}
              <TimelineStep
                step={1}
                done={true}
                title="Take the assessment"
                subtitle="Done!"
              />
              {/* Step 2 */}
              <TimelineStep
                step={2}
                done={emailUnlocked}
                title={emailUnlocked ? "Get your results" : "Get personalized daily activities"}
                subtitle={emailUnlocked ? "Done!" : `5-10 min activities for ${baby.sex_at_birth === 'female' ? 'her' : 'his'} stage`}
              />
              {/* Step 3 */}
              <TimelineStep
                step={3}
                done={false}
                title={emailUnlocked ? "Start personalized daily activities" : `Track progress as ${babyName} develops`}
                subtitle={emailUnlocked ? `5-10 min for ${babyName}` : `We adapt as ${babyName} grows`}
              />
            </div>
          </div>
        )}
      </div>

      {/* Sticky CTA */}
      <MobileStickyCta
        babyName={babyName}
        assessmentId={id}
        babyId={baby.id}
      />
    </div>
  );
};

// Timeline step component
const TimelineStep = ({ step, done, title, subtitle }: { step: number; done: boolean; title: string; subtitle: string }) => (
  <div className="flex items-start gap-3">
    <div className="flex flex-col items-center">
      <div 
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
        style={{
          background: done ? 'hsl(145, 60%, 45%)' : '#E8E4DF',
          color: done ? 'white' : '#999',
        }}
      >
        {done ? <Check className="w-4 h-4" /> : step}
      </div>
      {step < 3 && (
        <div className="w-0.5 h-6 mt-1" style={{ background: done ? 'hsl(145, 60%, 45%)' : '#E8E4DF' }} />
      )}
    </div>
    <div className="pt-1">
      <p className={`text-sm font-semibold ${done ? 'text-foreground' : 'text-muted-foreground'}`}>
        {title}
      </p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  </div>
);

export default Report;
