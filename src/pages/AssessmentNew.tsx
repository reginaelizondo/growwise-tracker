import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { externalSupabase } from "@/integrations/supabase/external-client";
import { SkillMilestoneList } from "@/components/assessment/SkillMilestoneList";
import { AreaSummary } from "@/components/assessment/AreaSummary";

import physicalIcon from "@/assets/Physical.png";
import linguisticWithText from "@/assets/Linguistic-with-text.png";
import emotionalWithText from "@/assets/Emotional-with-text.png";
import cognitiveWithText from "@/assets/Cognitive-with-text.png";
import logoCognitive from "@/assets/Logo_Cognitive_HD.png";
import logoLinguistic from "@/assets/Logo_Linguistic_HD.png";
import logoEmotional from "@/assets/Logo_Emotional_HD.png";
import logoPhysical from "@/assets/Logo_Physical_HD.png";

interface Milestone {
  milestone_id: number;
  age: number;
  question: string;
  description: string;
  skill_id: number;
  skill_name: string;
  area_id: number;
  area_name: string;
  science_fact: string;
}

interface SkillInfo {
  skill_id: number;
  skill_name: string;
  area_name: string;
  area_id: number;
  milestones: Milestone[];
}

interface AreaInfo {
  area_id: number;
  area_name: string;
  skills: SkillInfo[];
}

type ViewState = 
  | { type: 'loading' }
  | { type: 'skill'; areaIndex: number; skillIndex: number }
  | { type: 'areaSummary'; areaIndex: number }
  | { type: 'complete' };

const AssessmentNew = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [assessment, setAssessment] = useState<any>(null);
  const [baby, setBaby] = useState<any>(null);
  const [areas, setAreas] = useState<AreaInfo[]>([]);
  const [responses, setResponses] = useState<{ [key: number]: string }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewState, setViewState] = useState<ViewState>({ type: 'loading' });
  const [skillScores, setSkillScores] = useState<Map<number, { percentile: number | null; masteredCount: number; totalCount: number }>>(new Map());

  // Area order: Cognitive, Physical, Linguistic, Socio-Emotional
  const areaOrder = [2, 1, 3, 4];

  // Scroll to top when viewState changes to a new skill
  useEffect(() => {
    if (viewState.type === 'skill' || viewState.type === 'areaSummary') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [viewState]);

  const getAreaColorVariable = (areaId: number): string => {
    const colorMap: Record<number, string> = {
      1: 'physical',
      2: 'cognitive',
      3: 'linguistic',
      4: 'emotional'
    };
    return colorMap[areaId] || 'primary';
  };

  const getAreaIcon = (areaId: number): string => {
    const iconMap: Record<number, string> = {
      1: logoPhysical,
      2: logoCognitive,
      3: logoLinguistic,
      4: logoEmotional
    };
    return iconMap[areaId] || logoPhysical;
  };

  const getAreaNameFromId = (areaId: number): string => {
    const areaMap: { [key: number]: string } = {
      1: 'Physical',
      2: 'Cognitive',
      3: 'Linguistic',
      4: 'Socio-Emotional'
    };
    return areaMap[areaId] || 'Unknown';
  };

  // Load assessment data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch assessment and baby
        const { data: assessmentData, error: assessmentError } = await supabase
          .from("assessments")
          .select("*, babies(*)")
          .eq("id", id)
          .single();

        if (assessmentError || !assessmentData) {
          toast.error("Assessment not found");
          navigate("/");
          return;
        }

        setAssessment(assessmentData);
        setBaby(assessmentData.babies);

        const referenceAge = assessmentData.reference_age_months;
        const userLocale = assessmentData.locale || 'en';
        const minAge = Math.max(0, referenceAge - 3);
        const maxAge = referenceAge + 5;

        // Load existing responses
        const { data: existingResponses } = await supabase
          .from("assessment_responses")
          .select("milestone_id, answer")
          .eq("assessment_id", id);

        const responsesMap: { [key: number]: string } = {};
        existingResponses?.forEach((r: any) => {
          responsesMap[r.milestone_id] = r.answer;
        });
        setResponses(responsesMap);

        // Find milestones in age range
        const { data: milestonesInRange, error: milestonesError } = await externalSupabase
          .from('skill_milestone')
          .select('milestone_id, age, skill_id')
          .gte('age', minAge)
          .lte('age', maxAge);

        if (milestonesError || !milestonesInRange?.length) {
          toast.info('No milestones found for this age');
          setLoading(false);
          return;
        }

        // Filter to skills that have milestones in the core range (referenceAge to +1)
        const coreRangeMilestones = milestonesInRange.filter(m => 
          m.age >= referenceAge && m.age <= referenceAge + 1
        );
        const skillIdsInCoreRange = [...new Set(coreRangeMilestones.map(m => m.skill_id))];

        // Get all milestones for these skills
        const { data: allSkillMilestones } = await externalSupabase
          .from('skill_milestone')
          .select('milestone_id, age, skill_id')
          .in('skill_id', skillIdsInCoreRange);

        if (!allSkillMilestones?.length) {
          setLoading(false);
          return;
        }

        const milestoneIds = allSkillMilestones.map(m => m.milestone_id);

        // Load milestone texts
        let { data: milestoneTexts } = await externalSupabase
          .from('milestones_locale')
          .select('milestone_id, title, description, science_fact, locale')
          .in('milestone_id', milestoneIds)
          .eq('locale', userLocale);

        if (!milestoneTexts?.length) {
          const { data: englishTexts } = await externalSupabase
            .from('milestones_locale')
            .select('milestone_id, title, description, science_fact, locale')
            .in('milestone_id', milestoneIds)
            .eq('locale', 'en');
          milestoneTexts = englishTexts || [];
        }

        // Load skill names
        const { data: skillsData } = await externalSupabase
          .from('skills_locales')
          .select('skill_id, title, locale')
          .in('skill_id', skillIdsInCoreRange);

        const skillNameMap = new Map<number, string>();
        skillsData?.forEach((s: any) => {
          if (!skillNameMap.has(s.skill_id) || s.locale === userLocale) {
            skillNameMap.set(s.skill_id, s.title);
          }
        });

        // Load skill area mapping
        const { data: skillAreaData } = await externalSupabase
          .from('skills_area')
          .select('skill_id, area_id')
          .in('skill_id', skillIdsInCoreRange);

        const skillAreaMap = new Map<number, number>();
        skillAreaData?.forEach((sa: any) => {
          skillAreaMap.set(sa.skill_id, sa.area_id);
        });

        // Build texts map
        const textsMap = new Map<number, any>();
        milestoneTexts?.forEach((t: any) => {
          if (!textsMap.has(t.milestone_id) || t.locale === userLocale) {
            textsMap.set(t.milestone_id, t);
          }
        });

        // Build milestone age map
        const ageMap = new Map<number, { age: number; skill_id: number }>();
        allSkillMilestones.forEach(m => {
          ageMap.set(m.milestone_id, { age: m.age, skill_id: m.skill_id });
        });

        // Build full milestones with all data
        const fullMilestones: Milestone[] = milestoneIds.map(mid => {
          const ageData = ageMap.get(mid);
          const textData = textsMap.get(mid);
          const skillId = ageData?.skill_id ?? 0;
          const areaId = skillAreaMap.get(skillId) ?? 0;

          return {
            milestone_id: mid,
            age: ageData?.age ?? 0,
            skill_id: skillId,
            skill_name: skillNameMap.get(skillId) || `Skill ${skillId}`,
            area_id: areaId,
            area_name: getAreaNameFromId(areaId),
            question: textData?.description || textData?.title || '',
            description: textData?.description || '',
            science_fact: textData?.science_fact || ''
          };
        }).filter(m => m.age >= 0);

        // Group by area, then by skill
        const areaMap = new Map<number, Map<number, Milestone[]>>();
        
        fullMilestones.forEach(milestone => {
          if (!areaMap.has(milestone.area_id)) {
            areaMap.set(milestone.area_id, new Map());
          }
          const skillMap = areaMap.get(milestone.area_id)!;
          if (!skillMap.has(milestone.skill_id)) {
            skillMap.set(milestone.skill_id, []);
          }
          skillMap.get(milestone.skill_id)!.push(milestone);
        });

        // Build areas array in correct order
        // Get selected areas from localStorage (default to all)
        const storedAreas = localStorage.getItem(`assessment_areas_${id}`);
        const selectedAreaIds: number[] = storedAreas ? JSON.parse(storedAreas) : areaOrder;

        const areasArray: AreaInfo[] = areaOrder
          .filter(areaId => areaMap.has(areaId) && selectedAreaIds.includes(areaId))
          .map(areaId => {
            const skillMap = areaMap.get(areaId)!;
            const skills: SkillInfo[] = Array.from(skillMap.entries()).map(([skillId, milestones]) => ({
              skill_id: skillId,
              skill_name: milestones[0].skill_name,
              area_name: milestones[0].area_name,
              area_id: areaId,
              milestones: milestones.sort((a, b) => a.age - b.age)
            }));

            // Sort skills by minimum milestone age
            skills.sort((a, b) => {
              const minAgeA = Math.min(...a.milestones.map(m => m.age));
              const minAgeB = Math.min(...b.milestones.map(m => m.age));
              return minAgeA - minAgeB;
            });

            return {
              area_id: areaId,
              area_name: getAreaNameFromId(areaId),
              skills
            };
          });

        setAreas(areasArray);
        setViewState({ type: 'skill', areaIndex: 0, skillIndex: 0 });
        setLoading(false);

      } catch (error) {
        console.error("Error fetching assessment data:", error);
        toast.error("Failed to load assessment");
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  // Calculate skill scores for area summary
  const calculateSkillScores = async (areaIndex: number) => {
    const area = areas[areaIndex];
    if (!area) return;

    const referenceAge = assessment?.reference_age_months || 0;
    const newScores = new Map(skillScores);

    for (const skill of area.skills) {
      const allMilestoneIds = skill.milestones.map(m => m.milestone_id);
      
      // Get merged responses (DB + local)
      const { data: dbResponses } = await supabase
        .from('assessment_responses')
        .select('milestone_id, answer')
        .eq('assessment_id', id)
        .in('milestone_id', allMilestoneIds);

      const mergedResponses = { ...responses };
      dbResponses?.forEach((r: any) => {
        if (!mergedResponses[r.milestone_id]) {
          mergedResponses[r.milestone_id] = r.answer;
        }
      });

      // Count mastered
      let masteredCount = 0;
      let totalCount = 0;

      skill.milestones.forEach(m => {
        const answer = mergedResponses[m.milestone_id];
        if (answer) {
          totalCount++;
          if (answer === 'yes') masteredCount++;
        }
      });

      const completionPercentage = totalCount > 0 ? (masteredCount / totalCount) * 100 : 0;

      // Fetch percentile from percentile_skills
      let percentile: number | null = null;
      try {
        const { data: curves } = await externalSupabase
          .from('percentile_skills')
          .select('percentile, completion_percentage')
          .eq('skill_id', skill.skill_id)
          .eq('baby_age', referenceAge)
          .order('completion_percentage', { ascending: true });

        if (curves?.length) {
          const targetCompletion = completionPercentage / 100;
          for (let i = 0; i < curves.length - 1; i++) {
            if (curves[i].completion_percentage <= targetCompletion && 
                targetCompletion <= curves[i + 1].completion_percentage) {
              percentile = Math.round(curves[i + 1].percentile * 100);
              break;
            }
          }
          if (percentile === null && curves.length > 0) {
            percentile = Math.round(curves[curves.length - 1].percentile * 100);
          }
        }
      } catch (e) {
        console.warn('Could not fetch percentile for skill', skill.skill_id);
      }

      newScores.set(skill.skill_id, {
        percentile,
        masteredCount,
        totalCount: skill.milestones.length
      });
    }

    setSkillScores(newScores);
  };

  // Handle milestone response
  const handleResponse = async (milestoneId: number, answer: "yes" | "no") => {
    setResponses(prev => ({ ...prev, [milestoneId]: answer }));

    // Save to database
    try {
      const milestone = areas.flatMap(a => a.skills.flatMap(s => s.milestones)).find(m => m.milestone_id === milestoneId);
      
      await supabase
        .from("assessment_responses")
        .upsert({
          assessment_id: id,
          milestone_id: milestoneId,
          answer,
          skill_id: milestone?.skill_id,
          area_id: milestone?.area_id,
          source: 'manual'
        }, { onConflict: 'assessment_id,milestone_id' });
    } catch (error) {
      console.error('Error saving response:', error);
    }
  };

  // Handle next skill
  const handleNextSkill = async () => {
    if (viewState.type !== 'skill') return;

    const { areaIndex, skillIndex } = viewState;
    const currentArea = areas[areaIndex];

    // Mark unanswered milestones as "no"
    const currentSkill = currentArea.skills[skillIndex];
    const unansweredMilestones = currentSkill.milestones.filter(m => !responses[m.milestone_id]);
    
    if (unansweredMilestones.length > 0) {
      const newResponses = { ...responses };
      const batchInserts = unansweredMilestones.map(m => {
        newResponses[m.milestone_id] = 'no';
        return {
          assessment_id: id,
          milestone_id: m.milestone_id,
          answer: 'no',
          skill_id: m.skill_id,
          area_id: m.area_id,
          source: 'manual'
        };
      });
      
      setResponses(newResponses);
      
      try {
        await supabase
          .from("assessment_responses")
          .upsert(batchInserts, { onConflict: 'assessment_id,milestone_id' });
      } catch (error) {
        console.error('Error saving auto-no responses:', error);
      }
    }

    // Check if this is the last skill in the area
    if (skillIndex >= currentArea.skills.length - 1) {
      // Calculate scores and show area summary
      await calculateSkillScores(areaIndex);
      setViewState({ type: 'areaSummary', areaIndex });
    } else {
      // Move to next skill
      setViewState({ type: 'skill', areaIndex, skillIndex: skillIndex + 1 });
    }
  };

  // Handle skip entire area
  const handleSkipArea = async () => {
    if (viewState.type !== 'skill') return;
    const { areaIndex } = viewState;
    const currentArea = areas[areaIndex];

    // Collect all milestone IDs and check which have answers
    const allAreaMilestoneIds: number[] = [];
    currentArea.skills.forEach(skill => {
      skill.milestones.forEach(m => allAreaMilestoneIds.push(m.milestone_id));
    });
    const hasAnswers = allAreaMilestoneIds.some(mid => responses[mid]);

    // Mark all unanswered milestones as "no"
    const newResponses = { ...responses };
    const batchInserts: any[] = [];
    currentArea.skills.forEach(skill => {
      skill.milestones.forEach(m => {
        if (!newResponses[m.milestone_id]) {
          newResponses[m.milestone_id] = 'no';
          batchInserts.push({
            assessment_id: id,
            milestone_id: m.milestone_id,
            answer: 'no',
            skill_id: m.skill_id,
            area_id: m.area_id,
            source: 'skipped'
          });
        }
      });
    });

    if (batchInserts.length > 0) {
      setResponses(newResponses);
      try {
        await supabase
          .from("assessment_responses")
          .upsert(batchInserts, { onConflict: 'assessment_id,milestone_id' });
      } catch (error) {
        console.error('Error saving skipped responses:', error);
      }
    }

    if (hasAnswers) {
      // Has answers → show area summary
      await calculateSkillScores(areaIndex);
      setViewState({ type: 'areaSummary', areaIndex });
    } else {
      // No answers → skip summary entirely
      if (areaIndex >= areas.length - 1) {
        // Last area → complete assessment
        try {
          await supabase
            .from("assessments")
            .update({ completed_at: new Date().toISOString() })
            .eq("id", id);

          localStorage.setItem('assessment_draft', JSON.stringify({
            baby_id: baby?.id,
            assessment_id: id,
            timestamp: new Date().toISOString()
          }));

          // Fire-and-forget email
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          fetch(`${supabaseUrl}/functions/v1/send-report-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` },
            body: JSON.stringify({ assessment_id: id, baby_id: baby?.id }),
          }).catch(err => console.error('Email send error:', err));

          toast.success("Assessment completed!");
          navigate(`/report/${id}`);
        } catch (error) {
          console.error("Error completing assessment:", error);
          toast.error("Failed to complete assessment");
        }
      } else {
        // Not last → jump to next area
        setViewState({ type: 'skill', areaIndex: areaIndex + 1, skillIndex: 0 });
      }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle go to previous skill (last answered skill)
  const handleGoToLastSkill = () => {
    if (viewState.type !== 'skill') return;
    
    const { areaIndex, skillIndex } = viewState;
    if (skillIndex > 0) {
      setViewState({ type: 'skill', areaIndex, skillIndex: skillIndex - 1 });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handle continue from area summary
  const handleContinueFromSummary = async () => {
    if (viewState.type !== 'areaSummary') return;

    const { areaIndex } = viewState;

    // Check if this is the last area
    if (areaIndex >= areas.length - 1) {
      // Complete assessment
      try {
        await supabase
          .from("assessments")
          .update({ completed_at: new Date().toISOString() })
          .eq("id", id);

        localStorage.setItem('assessment_draft', JSON.stringify({
          baby_id: baby?.id,
          assessment_id: id,
          timestamp: new Date().toISOString()
        }));

        // Fire-and-forget email
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        fetch(`${supabaseUrl}/functions/v1/send-report-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` },
          body: JSON.stringify({ assessment_id: id, baby_id: baby?.id }),
        }).catch(err => console.error('Email send error:', err));

        toast.success("Assessment completed!");
        navigate(`/report/${id}`);
      } catch (error) {
        console.error("Error completing assessment:", error);
        toast.error("Failed to complete assessment");
      }
    } else {
      // Move to next area
      setViewState({ type: 'skill', areaIndex: areaIndex + 1, skillIndex: 0 });
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Loading state
  if (loading || viewState.type === 'loading') {
    const name = baby?.name;
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center px-4">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-9 h-9 text-primary animate-pulse" />
            </div>
            <div className="absolute inset-0 w-20 h-20 rounded-full border-[3px] border-primary/20 border-t-primary animate-spin" style={{ animationDuration: '1.2s' }} />
          </div>
          <div className="space-y-2 text-center">
            <p className="text-xl font-bold text-primary">
              {name ? `Personalizing ${name}'s assessment` : "Personalizing your assessment"}
            </p>
            <p className="text-sm text-muted-foreground">
              Building milestones based on age & selected areas…
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!assessment || !baby || areas.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center">
        <Card className="p-6 text-center">
          <p className="text-muted-foreground mb-4">Assessment not found</p>
          <Button asChild variant="default">
            <Link to="/">Back to home</Link>
          </Button>
        </Card>
      </div>
    );
  }

  // Skill view
  if (viewState.type === 'skill') {
    const { areaIndex, skillIndex } = viewState;
    const currentArea = areas[areaIndex];
    const currentSkill = currentArea.skills[skillIndex];
    const areaColor = `hsl(var(--${getAreaColorVariable(currentArea.area_id)}))`;

    // Calculate overall progress: 22% base + proportion through all skills * 78%
    const totalSkills = areas.reduce((sum, a) => sum + a.skills.length, 0);
    const completedSkills = areas.slice(0, areaIndex).reduce((sum, a) => sum + a.skills.length, 0) + skillIndex;
    const overallProgress = 22 + (completedSkills / totalSkills) * 78;

    return (
      <SkillMilestoneList
        areaName={currentArea.area_name}
        areaIcon={getAreaIcon(currentArea.area_id)}
        skillName={currentSkill.skill_name}
        skillNumber={skillIndex + 1}
        totalSkills={currentArea.skills.length}
        milestones={currentSkill.milestones}
        responses={responses}
        areaColor={areaColor}
        onResponse={handleResponse}
        onNextSkill={handleNextSkill}
        onGoToLastSkill={handleGoToLastSkill}
        onSkipArea={handleSkipArea}
        isLastSkill={skillIndex >= currentArea.skills.length - 1}
        babyName={baby?.name}
        babyAgeMonths={assessment?.reference_age_months}
        overallProgress={overallProgress}
      />
    );
  }

  // Area summary view
  if (viewState.type === 'areaSummary') {
    const { areaIndex } = viewState;
    const currentArea = areas[areaIndex];
    const areaColor = `hsl(var(--${getAreaColorVariable(currentArea.area_id)}))`;

    const skillSummaries = currentArea.skills.map(skill => {
      const score = skillScores.get(skill.skill_id);
      return {
        skill_id: skill.skill_id,
        skill_name: skill.skill_name,
        percentile: score?.percentile ?? null,
        masteredCount: score?.masteredCount ?? 0,
        totalCount: score?.totalCount ?? skill.milestones.length
      };
    });

    return (
      <AreaSummary
        areaName={currentArea.area_name}
        areaId={currentArea.area_id}
        areaIcon={getAreaIcon(currentArea.area_id)}
        areaColor={areaColor}
        skills={skillSummaries}
        onContinue={handleContinueFromSummary}
        isLastArea={areaIndex >= areas.length - 1}
        babyAgeMonths={assessment?.reference_age_months ?? 0}
        babyName={baby?.name}
      />
    );
  }

  return null;
};

export default AssessmentNew;
