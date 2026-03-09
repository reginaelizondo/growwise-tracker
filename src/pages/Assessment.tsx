import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Baby, Save, ChevronDown, Check, X, Info, Target, BarChart3, CheckCircle2, CircleDashed, Home, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { externalSupabase } from "@/integrations/supabase/external-client";
import { decodeHtmlText } from "@/lib/sanitizeHtml";
import { cn } from "@/lib/utils";
import { CircularProgress } from "@/components/CircularProgress";
import { PaceGauge } from "@/components/PaceGauge";
import { RecommendedActivityCard } from "@/components/RecommendedActivityCard";
import { useAssessmentAnalytics } from "@/hooks/useAssessmentAnalytics";
import physicalIcon from "@/assets/Physical.png";
import linguisticIcon from "@/assets/Linguistic.png";
import linguisticWithText from "@/assets/Linguistic-with-text.png";
import emotionalIcon from "@/assets/Emotional.png";
import emotionalWithText from "@/assets/Emotional-with-text.png";
import cognitiveIcon from "@/assets/Cognitive.png";
import cognitiveWithText from "@/assets/Cognitive-with-text.png";
import logoPhysical from "@/assets/Logo_Physical_HD.png";
import logoCognitive from "@/assets/Logo_Cognitive_HD.png";
import logoLinguistic from "@/assets/Logo_Linguistic_HD.png";
import logoEmotional from "@/assets/Logo_Emotional_HD.png";
import logoKinedu from "@/assets/logo-kinedu-blue.png";
import activity1 from "@/assets/activity-1.jpg";
import activity2 from "@/assets/activity-2.jpg";
import activity3 from "@/assets/activity-3.jpg";

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
  area_id: number; // Added for robust color mapping
  min_age: number;
  max_age: number;
  milestone_count: number;
  milestones_in_range: number; // New: count of milestones within baby's age ±3
  start_index: number;
}

interface AreaInfo {
  area_name: string;
  area_id: number; // Added for color mapping
  start_index: number;
  end_index: number;
  milestone_count: number;
}

// Helper function to sort milestones within each skill by age
function sortWithinSkills(ms: Milestone[]): Milestone[] {
  const groups = new Map<number, Milestone[]>();
  const skillOrder: number[] = [];
  
  for (const m of ms) {
    if (!groups.has(m.skill_id)) {
      groups.set(m.skill_id, []);
      skillOrder.push(m.skill_id);
    }
    groups.get(m.skill_id)!.push(m);
  }
  
  for (const id of skillOrder) {
    groups.get(id)!.sort((a, b) => (a.age !== b.age ? a.age - b.age : a.milestone_id - b.milestone_id));
  }
  
  const flat: Milestone[] = [];
  for (const id of skillOrder) flat.push(...groups.get(id)!);
  return flat;
}

// Helper function to recompute skills from sorted milestones (area-aware)
function recomputeSkillsFromMilestones(
  ms: Milestone[], 
  referenceAge: number
): SkillInfo[] {
  const skillMap = new Map<number, {
    skill_id: number;
    skill_name: string;
    area_name: string;
    area_id: number;
    milestones: Milestone[];
  }>();
  
  ms.forEach((m, idx) => {
    if (!skillMap.has(m.skill_id)) {
      skillMap.set(m.skill_id, {
        skill_id: m.skill_id,
        skill_name: m.skill_name,
        area_name: m.area_name,
        area_id: m.area_id,
        milestones: []
      });
    }
    skillMap.get(m.skill_id)!.milestones.push(m);
  });
  
  const result: SkillInfo[] = [];
  let currentIndex = 0;
  
  // Preserve order of skills as they appear in the array
  const seenSkills = new Set<number>();
  ms.forEach(m => {
    if (!seenSkills.has(m.skill_id)) {
      seenSkills.add(m.skill_id);
      const skillData = skillMap.get(m.skill_id)!;
      const skillMilestones = skillData.milestones;
      
      // All areas use current age to +1 month range only
      const offset = 1;
      const minAge = referenceAge;
      const maxAge = referenceAge + offset;
      const milestonesInRange = skillMilestones.filter(mm => mm.age >= minAge && mm.age <= maxAge);
      
      result.push({
        skill_id: m.skill_id,
        skill_name: m.skill_name,
        area_name: m.area_name,
        area_id: m.area_id,
        min_age: Math.min(...skillMilestones.map(mm => mm.age)),
        max_age: Math.max(...skillMilestones.map(mm => mm.age)),
        milestone_count: skillMilestones.length,
        milestones_in_range: milestonesInRange.length,
        start_index: currentIndex
      });
      
      currentIndex += skillMilestones.length;
    }
  });
  
  return result;
}

// Helper function to recompute areas from sorted milestones
function recomputeAreasFromMilestones(ms: Milestone[]): AreaInfo[] {
  const result: AreaInfo[] = [];
  let currentAreaName = "";
  let currentAreaId = 0;
  let areaStartIndex = 0;
  
  ms.forEach((m, index) => {
    if (m.area_name !== currentAreaName) {
      if (currentAreaName !== "") {
        result.push({
          area_name: currentAreaName,
          area_id: currentAreaId,
          start_index: areaStartIndex,
          end_index: index - 1,
          milestone_count: index - areaStartIndex
        });
      }
      currentAreaName = m.area_name;
      currentAreaId = m.area_id;
      areaStartIndex = index;
    }
  });
  
  // Add final area
  if (currentAreaName !== "" && ms.length > 0) {
    result.push({
      area_name: currentAreaName,
      area_id: currentAreaId,
      start_index: areaStartIndex,
      end_index: ms.length - 1,
      milestone_count: ms.length - areaStartIndex
    });
  }
  
  return result;
}

const Assessment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<any>(null);
  const [baby, setBaby] = useState<any>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [areas, setAreas] = useState<AreaInfo[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<{ [key: number]: string }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showHelper, setShowHelper] = useState(false);
  const [swipeStart, setSwipeStart] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [showAreaFeedback, setShowAreaFeedback] = useState(false);
  const [completedArea, setCompletedArea] = useState<AreaInfo | null>(null);
  const [areaInterpretation, setAreaInterpretation] = useState<string | null>(null);
  const [loadingAreaInterpretation, setLoadingAreaInterpretation] = useState(false);
  const [showAreaIntro, setShowAreaIntro] = useState(false);
  const [introArea, setIntroArea] = useState<AreaInfo | null>(null);
  const [showSkillIntro, setShowSkillIntro] = useState(false);
  const [introSkill, setIntroSkill] = useState<SkillInfo | null>(null);
  const [pendingSkillStart, setPendingSkillStart] = useState<number | null>(null);
  const [showSkillFeedback, setShowSkillFeedback] = useState(false);
  const [isLearnMoreOpen, setIsLearnMoreOpen] = useState(false);
  const [isActivitiesOpen, setIsActivitiesOpen] = useState(false);
  const [completedSkill, setCompletedSkill] = useState<{
    skill: SkillInfo;
    currentRangeScore: number;
    totalSkillScore: number;
    percentile: number | null;
    referencePercentile: number | null;
    probability: number | null;
    monthsOffset: number | null;
    masteredInRange: number;
    totalInRange: number;
    masteredTotal: number;
    totalSkillMilestones: number;
  } | null>(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const [completionInsight, setCompletionInsight] = useState<string | null>(null);
  const [loadingCompletionInsight, setLoadingCompletionInsight] = useState(false);
  const [mandatoryAgeRange, setMandatoryAgeRange] = useState<{ min: number; max: number }>({ min: 0, max: 0 });
  const [skillsDescriptions, setSkillsDescriptions] = useState<{ [key: number]: string }>({});
  const [currentSkillDescription, setCurrentSkillDescription] = useState<string | null>(null);
  const [loadingSkillDescription, setLoadingSkillDescription] = useState(false);

  // Quick Check state
  const [earlySkipDecisions, setEarlySkipDecisions] = useState<{ [skillId: number]: boolean }>({});
  const [showEarlyIntro, setShowEarlyIntro] = useState(false);
  const [earlyIntroSkill, setEarlyIntroSkill] = useState<SkillInfo | null>(null);
  const [checkedMilestones, setCheckedMilestones] = useState<Record<number, boolean>>({});
  
  // Milestone counter state
  const [displayQuestionNumber, setDisplayQuestionNumber] = useState<number>(1);
  const [totalSkillMilestones, setTotalSkillMilestones] = useState<number>(0);
  
  // Future Milestones Check state
  const [showFutureMilestonesCheck, setShowFutureMilestonesCheck] = useState(false);
  const [futureMilestones, setFutureMilestones] = useState<Milestone[]>([]);
  const [futureCheckedMilestones, setFutureCheckedMilestones] = useState<{ [key: number]: boolean }>({});
  const [pendingSkillCompletion, setPendingSkillCompletion] = useState<{
    skill: SkillInfo;
    updatedResponses: { [key: number]: string };
  } | null>(null);

  // Initialize analytics tracking
  const analytics = useAssessmentAnalytics(id, baby?.id);

  // Derived values used by hooks (must be before any early returns)
  const currentMilestone = milestones[currentQuestionIndex];
  const currentSkillInfo = skills.find(skill => 
    currentQuestionIndex >= skill.start_index && 
    currentQuestionIndex < skill.start_index + skill.milestone_count
  );

  useEffect(() => {
    if (currentSkillInfo && currentMilestone) {
      // Use preloaded milestones array which now contains ALL milestones for the skill
      const skillMilestones = milestones
        .filter(m => m.skill_id === currentSkillInfo.skill_id)
        .sort((a, b) => (a.age !== b.age ? a.age - b.age : a.milestone_id - b.milestone_id));

      // Total should reflect ALL milestones of the skill (includes early ones confirmed via Quick Check)
      setTotalSkillMilestones(skillMilestones.length);

      // Position within the full skill, counting already answered milestones (incl. Quick Check)
      const indexInSkill = skillMilestones.findIndex(m => m.milestone_id === currentMilestone.milestone_id);
      const answeredBefore = skillMilestones
        .slice(0, Math.max(0, indexInSkill))
        .filter(m => Boolean(responses[m.milestone_id]))
        .length;
      setDisplayQuestionNumber(answeredBefore + 1);

      // Track question view for analytics
      analytics.trackQuestionView(
        currentQuestionIndex,
        currentMilestone.milestone_id,
        currentMilestone.skill_id,
        currentMilestone.area_id
      );
    }
  }, [currentSkillInfo?.skill_id, currentMilestone?.milestone_id, milestones, responses]);

  // Helper function to get age range offset based on area
  // All areas use current age to +1 month range only
  const getAgeRangeOffset = (areaId: number): number => {
    return 1;
  };

  // Helper function to map area_id to area_name
  const getAreaNameFromId = (areaId: number | undefined): string => {
    const areaMap: { [key: number]: string } = {
      1: 'Physical',
      2: 'Cognitive', 
      3: 'Linguistic',
      4: 'Socio-Emotional'
    };
    return areaMap[areaId || 0] || 'Unknown';
  };

  // Helper function to load skills with locale fallback
  const loadSkillsWithLocale = async (
    skillIds: number[], 
    userLocale: string = 'en'
  ): Promise<any[]> => {
    console.log('🔍 [loadSkillsWithLocale] Buscando skills:', { skillIds, userLocale });
    
    // Consultamos columnas con espacios en select; para filtros usamos el nombre sin comillas
    let skillsRaw: any[] | null = null;
    let queryError: any = null;
    
      const { data: firstTry, error: firstError } = await externalSupabase
        .from('skills_locales')
        .select('skill_id, title, description, locale')
        .in('skill_id', skillIds);
    
    if (firstError) {
      console.warn('⚠️ [loadSkillsWithLocale] Primer intento con .in falló, probando sin filtro y filtrando en cliente:', firstError);
      const { data: allRows, error: secondError } = await externalSupabase
        .from('skills_locales')
        .select('skill_id, title, description, locale');
      if (secondError) {
        queryError = secondError;
      } else {
        skillsRaw = (allRows || []).filter((r: any) => skillIds.includes(r.skill_id));
      }
    } else {
      skillsRaw = firstTry || [];
    }
    
    console.log('📡 [loadSkillsWithLocale] Respuesta de Supabase:', { 
      dataCount: skillsRaw?.length || 0, 
      error: firstError || queryError,
      rawData: skillsRaw 
    });
    
    if (firstError || queryError) {
      console.error('❌ [loadSkillsWithLocale] Error loading skills:', firstError || queryError);
      if (!skillsRaw || skillsRaw.length === 0) return [];
    }
    
    if (!skillsRaw || skillsRaw.length === 0) {
      console.warn('⚠️ [loadSkillsWithLocale] No se encontraron skills en la base de datos');
      return [];
    }

    // Normalizar nombres de columnas para el resto del flujo
    const skills = (skillsRaw || []).map((s: any) => ({
      skill_id: s.skill_id,
      title: s.title,
      description: s.description,
      locale: s.locale,
    }));
    
    // Group by skill_id and prefer userLocale, fallback to 'en'
    const skillsMap = new Map();
    skills.forEach((skill: any) => {
      const skillId = skill.skill_id;
      const existing = skillsMap.get(skillId);
      
      console.log(`📋 [loadSkillsWithLocale] Procesando skill ${skillId}:`, {
        locale: skill.locale,
        hasDescription: !!skill.description,
        descriptionLength: skill.description?.length || 0,
        title: skill.title
      });
      
      if (!existing) {
        skillsMap.set(skillId, skill);
      } else if (skill.locale === userLocale) {
        console.log(`✅ [loadSkillsWithLocale] Usando locale preferido (${userLocale}) para skill ${skillId}`);
        skillsMap.set(skillId, skill);
      } else if (skill.locale === 'en' && existing.locale !== userLocale) {
        console.log(`🔄 [loadSkillsWithLocale] Fallback a 'en' para skill ${skillId}`);
        skillsMap.set(skillId, skill);
      }
    });
    
    const result = Array.from(skillsMap.values());
    console.log('✨ [loadSkillsWithLocale] Resultado final:', {
      skillsCount: result.length,
      skillIds: result.map(s => s.skill_id),
      descriptions: result.map(s => ({ 
        id: s.skill_id, 
        hasDesc: !!s.description,
        descLength: s.description?.length || 0
      }))
    });
    
    return result;
  };

  // New: fetch a single skill description with safe fallbacks
  const fetchSkillDescription = async (skillId: number, locale: string): Promise<string | null> => {
    try {
      console.log('🔎 [fetchSkillDescription] skillId:', skillId, 'locale:', locale);
      // 1) Try exact locale
      let { data, error } = await externalSupabase
        .from('skills_locales')
        .select('description, locale')
        .eq('skill_id', skillId)
        .eq('locale', locale)
        .maybeSingle();

      if (error) console.warn('⚠️ [fetchSkillDescription] exact locale error:', error);
      if (data?.description) return data.description as string;

      // 2) Fallback to English if not already tried
      if (locale !== 'en') {
        const { data: enData, error: enError } = await externalSupabase
          .from('skills_locales')
          .select('description, locale')
          .eq('skill_id', skillId)
          .eq('locale', 'en')
          .maybeSingle();

        if (enError) console.warn('⚠️ [fetchSkillDescription] English fallback error:', enError);
        if (enData?.description) return enData.description as string;
      }

      // 3) Try any locale (first row)
      const { data: anyRows, error: anyError } = await externalSupabase
        .from('skills_locales')
        .select('description, locale, skill_id')
        .eq('skill_id', skillId)
        .limit(1);

      if (anyError) console.warn('⚠️ [fetchSkillDescription] any locale error:', anyError);
      if (anyRows && anyRows.length > 0 && anyRows[0]?.description) return anyRows[0].description as string;

      return null;
    } catch (e) {
      console.error('❌ [fetchSkillDescription] unexpected error:', e);
      return null;
    }
  };

  // Helper function to map area_id to area_name (canonical names for color mapping)
  const getAreaNameFromAreaId = (areaId: number): string => {
    const areaMap: Record<number, string> = {
      1: 'Physical',
      2: 'Cognitive',
      3: 'Linguistic',
      4: 'Social-Emotional' // Use hyphenated version for consistency
    };
    return areaMap[areaId] || 'Unknown';
  };

  // Skill name to area corrections (for skills with incorrect mapping in database)
  // This map corrects known mismatches between skill names and their correct areas
  const skillNameToCorrectArea: Record<string, number> = {
    'Basic Vocabulary': 3,  // Linguistic (naranja)
    'Vocabulary': 3,        // Linguistic
    'Babbling': 3,          // Linguistic
    'Focus and Short-Term Memory': 2,  // Cognitive (verde)
    'Memory and Attention': 2,  // Cognitive (verde) - variant name
    // Add more corrections here as needed
  };

  // Load skills area mapping from skills_area table
  const loadSkillsArea = async (skillIds: number[], skillMetaMap: Map<number, any>): Promise<Map<number, number>> => {
    try {
      console.log('🔍 [loadSkillsArea] Loading area mapping for skills:', skillIds);
      
      const { data, error } = await externalSupabase
        .from('skills_area')
        .select('skill_id, area_id')
        .in('skill_id', skillIds);
      
      if (error) {
        console.error('❌ [loadSkillsArea] Error loading skills_area:', error);
        console.error('❌ [loadSkillsArea] Error details:', JSON.stringify(error, null, 2));
        toast.error('Failed to load skill area mapping');
        return new Map();
      }
      
      if (!data || data.length === 0) {
        console.warn('⚠️ [loadSkillsArea] No area mappings found for skills:', skillIds);
        console.warn('⚠️ [loadSkillsArea] This means the skills_area table is empty or missing data');
        toast.error('Skill area data not found - colors will be incorrect');
        return new Map();
      }
      
      console.log('📡 [loadSkillsArea] Raw data from skills_area:', data);
      
      const areaMap = new Map<number, number>();
      data?.forEach(sa => {
        areaMap.set(sa.skill_id, sa.area_id);
        console.log(`✅ [loadSkillsArea] Mapped skill ${sa.skill_id} → area ${sa.area_id}`);
      });
      
      // Apply corrections for skills with incorrect mapping
      console.log('🔧 [loadSkillsArea] Applying skill name corrections...');
      skillIds.forEach(skillId => {
        const skillMeta = skillMetaMap.get(skillId);
        if (skillMeta && skillMeta.title) {
          const skillName = skillMeta.title.trim();
          const correctArea = skillNameToCorrectArea[skillName];
          
          if (correctArea !== undefined) {
            const originalArea = areaMap.get(skillId);
            if (originalArea !== correctArea) {
              console.log(`🔧 [loadSkillsArea] CORRECTING skill "${skillName}" (${skillId}): ${originalArea} → ${correctArea}`);
              areaMap.set(skillId, correctArea);
            } else {
              console.log(`✅ [loadSkillsArea] Skill "${skillName}" (${skillId}) already has correct area: ${correctArea}`);
            }
          }
        }
      });
      
      console.log('✅ [loadSkillsArea] Final area map (after corrections):', {
        size: areaMap.size,
        mappings: Array.from(areaMap.entries())
      });
      
      return areaMap;
    } catch (err) {
      console.error('❌ [loadSkillsArea] Exception:', err);
      toast.error('Failed to load skill areas: ' + String(err));
      return new Map();
    }
  };

  // Auto-fetch current skill description when intro opens
  useEffect(() => {
    if (!showSkillIntro || !introSkill) return;
    const locale = assessment?.locale || 'en';

    setLoadingSkillDescription(true);
    setCurrentSkillDescription(null);

    fetchSkillDescription(introSkill.skill_id, locale).then((desc) => {
      console.log('✅ [fetchSkillDescription] resultado:', { skillId: introSkill.skill_id, desc });
      if (desc) {
        setCurrentSkillDescription(desc);
        setSkillsDescriptions((prev) => ({ ...prev, [introSkill.skill_id]: desc }));
      }
    }).finally(() => setLoadingSkillDescription(false));
  }, [showSkillIntro, introSkill?.skill_id, assessment?.locale]);

  // Note: Quick Check is now triggered directly from Skill Intro button, not from useEffect

  // Helper function to load milestones with locale fallback
  const loadMilestonesWithLocale = async (
    skillIds: number[],
    userLocale: string = 'en'
  ): Promise<{ mappings: any[], texts: any[] }> => {
    // 1. Get milestone mappings (skill_id -> milestone_id)
    const { data: mappings, error: mappingsError } = await externalSupabase
      .from('skill_milestone')
      .select('skill_id, milestone_id')
      .in('skill_id', skillIds);
    
    if (mappingsError || !mappings) {
      console.error('Error loading milestone mappings:', mappingsError);
      return { mappings: [], texts: [] };
    }
    
    const milestoneIds = mappings.map(m => m.milestone_id);

    // 2. Fetch ages from skill_milestone table (id = milestone_id)
    const { data: milestonesBase, error: milestonesError } = await externalSupabase
      .from('skill_milestone')
      .select('milestone_id, age')
      .in('milestone_id', milestoneIds);

    if (milestonesError || !milestonesBase) {
      console.error('Error loading milestone ages:', milestonesError);
    }

    const ageMap = new Map<number, number>();
    milestonesBase?.forEach(m => ageMap.set(m.milestone_id, m.age));

    const mappingsWithAge = mappings.map(m => ({ ...m, age: ageMap.get(m.milestone_id) ?? null }));
    
    // 3. Load milestone texts with locale
    const { data: texts, error: textsError } = await externalSupabase
      .from('milestones_locale')
      .select('milestone_id, title, description, science_fact, source_data, locale, media_jpg_file_name, media_mp4_file_name')
      .in('milestone_id', milestoneIds);
    
    if (textsError) {
      console.error('Error loading milestone texts:', textsError);
      return { mappings: mappingsWithAge, texts: [] };
    }
    
    // 4. Group by milestone_id and prefer userLocale
    const textsMap = new Map<number, any>();
    texts?.forEach((text: any) => {
      const key = text.milestone_id;
      const existing = textsMap.get(key);
      if (!existing || text.locale === userLocale) {
        textsMap.set(key, text);
      }
    });
    
    return { 
      mappings: mappingsWithAge, 
      texts: Array.from(textsMap.values()) 
    };
  };

  // Generate completion insight when completion screen is shown
  useEffect(() => {
    const generateInsight = async () => {
      if (showCompletion && !completionInsight && !loadingCompletionInsight && baby && assessment) {
        setLoadingCompletionInsight(true);
        try {
          const areasData = areas.map(area => {
            const areaSkills = skills.filter(s => s.area_name === area.area_name);
            return {
              areaName: area.area_name,
              percentage: calculateAreaPercentage(area),
              skillsCount: areaSkills.length
            };
          });

          const { data, error } = await supabase.functions.invoke('generate-completion-insight', {
            body: { 
              babyName: baby.name,
              babyAgeMonths: assessment.reference_age_months,
              areasData
            }
          });

          if (error) throw error;
          setCompletionInsight(data.insight);
        } catch (error) {
          console.error('Error generating completion insight:', error);
          setCompletionInsight(`${baby?.name || 'Your baby'} is thriving beautifully across all developmental areas!`);
        } finally {
          setLoadingCompletionInsight(false);
        }
      }
    };
    generateInsight();
  }, [showCompletion, completionInsight, loadingCompletionInsight, baby, assessment, areas, skills]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch assessment
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

        // Load existing responses but DON'T filter them out yet
        // We need to show Quick Check for early milestones even if answered before
        const { data: existingResponses } = await supabase
          .from("assessment_responses")
          .select("milestone_id, answer, source")
          .eq("assessment_id", id);
        
        // Store existing responses to pre-populate UI
        const existingResponsesMap: { [key: number]: { answer: string; source?: string } } = {};
        existingResponses?.forEach((r: any) => {
          existingResponsesMap[r.milestone_id] = { 
            answer: r.answer, 
            source: r.source || 'manual' 
          };
        });

        // Calculate age window
        const referenceAge = assessmentData.reference_age_months;
        const mandatoryMaxAge = referenceAge + 1;
        const extendedMaxAge = referenceAge + 5; // Load milestones up to +5 months
        const minAge = Math.max(0, referenceAge - 3);
        const userLocale = assessmentData.locale || 'en';

        console.log("🔍 Age range:", { minAge, mandatoryMaxAge, extendedMaxAge, userLocale });

        // Step 1: Find milestone IDs in age range -3 to +5 months from skill_milestone
        const { data: milestonesInRange, error: milestonesRangeError } = await externalSupabase
          .from('skill_milestone')
          .select('milestone_id, age, skill_id')
          .gte('age', minAge)
          .lte('age', extendedMaxAge);

        if (milestonesRangeError) {
          console.error('❌ Error fetching milestones:', milestonesRangeError);
          toast.error('Failed to load skills');
          return;
        }

        if (!milestonesInRange || milestonesInRange.length === 0) {
          toast.info(`No milestones available for ${referenceAge} months. Please check backend data.`);
          setMilestones([]);
          setLoading(false);
          return;
        }

        // Get all unique skill IDs from the broad range first
        const allSkillIds = [...new Set(milestonesInRange.map((r: any) => r.skill_id))];
        console.log('🔍 All skills in broad range:', allSkillIds);

        if (allSkillIds.length === 0) {
          toast.info('No skills found for this age');
          setMilestones([]);
          setLoading(false);
          return;
        }

        // Load skill metadata (names, classification/area)
        const skillsMeta = await loadSkillsWithLocale(allSkillIds, userLocale);
        const skillMetaMap = new Map<number, any>();
        skillsMeta.forEach((s: any) => skillMetaMap.set(s.skill_id, s));

        // Load skill area mapping (pass skillMetaMap for corrections)
        const skillAreaMap = await loadSkillsArea(allSkillIds, skillMetaMap);
        
        // All areas use current age to +1 month range only
        const skillsWithMilestonesInDeterminationRange = milestonesInRange.filter((m: any) => {
          const minAge = referenceAge;
          const maxAge = referenceAge + 1;
          return m.age >= minAge && m.age <= maxAge;
        });
        const skillIdsInRange = [...new Set(skillsWithMilestonesInDeterminationRange.map((r: any) => r.skill_id))];
        console.log('🔍 Skills in +1 month age range:', skillIdsInRange);
        
        if (skillIdsInRange.length === 0) {
          toast.info('No skills found for this age');
          setMilestones([]);
          setLoading(false);
          return;
        }

        // Fetch ALL milestone mappings for skills in range (no age filter for Quick Check)
        const { data: allMappings, error: allMappingsError } = await externalSupabase
          .from('skill_milestone')
          .select('skill_id, milestone_id, age')
          .in('skill_id', skillIdsInRange);

        if (allMappingsError) {
          console.error('Error fetching all milestone mappings:', allMappingsError);
          toast.error('Failed to load milestones');
          return;
        }

        const allMilestoneIds = [...new Set((allMappings || []).map((m: any) => m.milestone_id))];

        // Step 2a: Get ages from skill_milestone (id = milestone_id)
        const { data: milestoneAges, error: agesError } = await externalSupabase
          .from('skill_milestone')
          .select('milestone_id, age, skill_id')
          .in('milestone_id', allMilestoneIds);

        if (agesError) {
          console.error('Error fetching milestone ages:', agesError);
          toast.error('Failed to load milestone data');
          return;
        }

        // Step 2b: Get texts from milestones_locale with fallback to 'en'
        let { data: milestoneTexts, error: textsError } = await externalSupabase
          .from('milestones_locale')
          .select('milestone_id, title, description, science_fact, source_data, locale')
          .in('milestone_id', allMilestoneIds)
          .eq('locale', userLocale);

        if (textsError) {
          console.error('Error fetching milestone texts:', textsError);
          toast.error('Failed to load milestone texts');
          return;
        }

        // Fallback to English if no texts found in requested locale
        if (!milestoneTexts || milestoneTexts.length === 0) {
          const { data: englishTexts } = await externalSupabase
            .from('milestones_locale')
            .select('milestone_id, title, description, science_fact, source_data, locale')
            .in('milestone_id', allMilestoneIds)
            .eq('locale', 'en');
          
          milestoneTexts = englishTexts || [];
        }

        if (!milestoneAges || milestoneAges.length === 0) {
          toast.info('No milestones found for selected skills');
          setMilestones([]);
          setLoading(false);
          return;
        }

        // Create maps for merging
        const ageMap = new Map<number, { age: number; skill_id: number }>();
        milestoneAges.forEach(m => ageMap.set(m.milestone_id, { age: m.age, skill_id: m.skill_id }));

        // Deduplicate texts by milestone_id preferring user's locale
        const textsMap = new Map<number, any>();
        (milestoneTexts || []).forEach((text: any) => {
          const existing = textsMap.get(text.milestone_id);
          if (!existing || text.locale === userLocale) {
            textsMap.set(text.milestone_id, text);
          }
        });

        // Merge ages + texts
        const fullMilestones = allMilestoneIds.map(mid => {
          const ageData = ageMap.get(mid);
          const textData = textsMap.get(mid);
          const meta = skillMetaMap.get(ageData?.skill_id ?? 0);
          const skillId = ageData?.skill_id ?? 0;
          const areaId = skillAreaMap.get(skillId) ?? 0;
          const areaName = getAreaNameFromAreaId(areaId);
          
          console.log(`🏗️ [Milestone] Building milestone ${mid}:`, {
            skillId,
            areaId,
            areaName,
            hasMapping: skillAreaMap.has(skillId)
          });
          
          return {
            milestone_id: mid,
            age: ageData?.age ?? 0,
            skill_id: skillId,
            skill_name: meta?.title || `Skill ${skillId}`,
            area_id: areaId,
            area_name: areaName,
            question: textData?.description || textData?.title || '',
            description: textData?.description || '',
            science_fact: textData?.science_fact || '',
          };
        }).filter(m => m.age >= 0); // Include milestones from age 0 (newborns)

        // Group milestones by skill to calculate ordering metrics
        interface SkillOrderInfo {
          skill_id: number;
          skill_name: string;
          area_name: string;
          area_id: number;
          min_age_in_window: number;
          max_age_in_window: number;
          milestones: typeof fullMilestones;
        }
        
        const skillGroups = new Map<number, SkillOrderInfo>();
        
        fullMilestones.forEach((milestone) => {
          if (!skillGroups.has(milestone.skill_id)) {
            skillGroups.set(milestone.skill_id, {
              skill_id: milestone.skill_id,
              skill_name: milestone.skill_name,
              area_name: milestone.area_name,
              area_id: milestone.area_id,
              min_age_in_window: Infinity,
              max_age_in_window: -Infinity,
              milestones: [],
            });
          }
          
          const group = skillGroups.get(milestone.skill_id)!;
          group.milestones.push(milestone);
          
          // Calculate min/max age for milestones within the age window
          if (milestone.age >= minAge && milestone.age <= extendedMaxAge) {
            group.min_age_in_window = Math.min(group.min_age_in_window, milestone.age);
            group.max_age_in_window = Math.max(group.max_age_in_window, milestone.age);
          }
        });
        
        // Sort skills by: area → skill_name (alphabetical within area)
        // This ensures ALL skills from one area are completed before moving to the next
        const areaOrder: { [key: number]: number } = {
          1: 2, // Physical - turquesa (segundo)
          2: 1, // Cognitive - verde (primero)
          3: 3, // Linguistic - naranja
          4: 4  // Social-Emotional - rosa
        };
        
        const sortedSkills = Array.from(skillGroups.values()).sort((a, b) => {
          // 1. Area ID (custom order) - ensures area completion
          if (a.area_id !== b.area_id) {
            const orderA = areaOrder[a.area_id] || 999;
            const orderB = areaOrder[b.area_id] || 999;
            return orderA - orderB;
          }
          
          // 2. Min age within area (skills with younger milestones first)
          if (a.min_age_in_window !== b.min_age_in_window) {
            return a.min_age_in_window - b.min_age_in_window;
          }
          
          // 3. Fallback to skill name if same min age
          return a.skill_name.localeCompare(b.skill_name);
        });
        
        // Reconstruct milestones array in the new skill order, sorting within each skill by age
        // Keep ALL milestones (no age filtering) for correct Quick Check and counts
        const allMilestones: typeof fullMilestones = [];
        sortedSkills.forEach((skillInfo) => {
          const sortedMilestones = skillInfo.milestones
            .sort((a, b) => {
              if (a.age !== b.age) return a.age - b.age;
              return a.milestone_id - b.milestone_id;
            });
          allMilestones.push(...sortedMilestones);
        });

        console.log('🔍 Total milestones loaded (base):', allMilestones.length);
        
        // Sort milestones within each skill by age
        const sortedMilestones = sortWithinSkills(allMilestones);
        setMilestones(sortedMilestones);

        // Recompute skills from sorted milestones (now area-aware)
        const recomputedSkills = recomputeSkillsFromMilestones(sortedMilestones, referenceAge);
        setSkills(recomputedSkills);
        console.log("🔍 Skills calculated:", recomputedSkills);
        console.log("📋 Skill Order Check:", recomputedSkills.map((s, idx) => `${idx}: ${s.area_name} - ${s.skill_name} (skill_id: ${s.skill_id})`));

        // Load skill descriptions from skills_locales
        const skillIds = recomputedSkills.map(s => s.skill_id);
        console.log('🎯 [Main] Iniciando carga de descripciones para skills:', skillIds);
        
        if (skillIds.length > 0) {
          const skillsData = await loadSkillsWithLocale(skillIds, userLocale);
          console.log('📦 [Main] Datos recibidos de loadSkillsWithLocale:', {
            count: skillsData.length,
            skills: skillsData.map(s => ({
              id: s.skill_id,
              title: s.title,
              hasDesc: !!s.description,
              descPreview: s.description?.substring(0, 50) + '...'
            }))
          });
          
          const descriptionsMap: { [key: number]: string } = {};
          skillsData.forEach((skill: any) => {
            const skillId = skill.skill_id;
            if (skill.description) {
              descriptionsMap[skillId] = skill.description;
              console.log(`✅ [Main] Descripción agregada para skill ${skillId}:`, skill.description.substring(0, 80) + '...');
            } else {
              console.warn(`⚠️ [Main] Skill ${skillId} no tiene descripción`);
            }
          });
          
          console.log("📝 [Main] Mapa final de descripciones:", {
            totalSkills: Object.keys(descriptionsMap).length,
            skillIds: Object.keys(descriptionsMap),
            preview: descriptionsMap
          });
          
          setSkillsDescriptions(descriptionsMap);
        } else {
          console.warn('⚠️ [Main] No hay skillIds para cargar descripciones');
        }

        // Recompute areas from sorted milestones
        const recomputedAreas = recomputeAreasFromMilestones(sortedMilestones);
        setAreas(recomputedAreas);
        console.log("🔍 Areas calculated:", recomputedAreas);
        console.log("📍 Area Boundaries:", recomputedAreas.map(a => `${a.area_name}: indices ${a.start_index}-${a.end_index} (${a.milestone_count} milestones)`));

        // Set mandatory age range (-2 to +4 from reference age)
        setMandatoryAgeRange({
          min: referenceAge - 2,
          max: referenceAge + 4
        });

        // Check if we should show skill intro at start
        if (currentQuestionIndex === 0 && recomputedSkills.length > 0) {
          const firstSkill = recomputedSkills[0];
          setIntroSkill(firstSkill);
          setShowSkillIntro(true);
        }

        // Set existing responses in state
        if (Object.keys(existingResponsesMap).length > 0) {
          const responsesMap: { [key: number]: string } = {};
          Object.entries(existingResponsesMap).forEach(([milestoneId, data]) => {
            responsesMap[parseInt(milestoneId)] = data.answer;
          });
          setResponses(responsesMap);
        }
      } catch (error: any) {
        console.error("Error fetching assessment data:", error);
        toast.error("Failed to load assessment");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  // Helper: Age-Equivalent interpolation - find age where median probability equals baby's progress
  const invertMedianCurveForAge = (
    medianRows: Array<{ age_months: number; probability: number }>,
    S: number
  ): number => {
    const sorted = [...medianRows].sort((a, b) => a.age_months - b.age_months);
    
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i], b = sorted[i + 1];
      const yA = a.probability, yB = b.probability;
      
      if ((S >= yA && S <= yB) || (S >= yB && S <= yA)) {
        const t = (S - yA) / (yB - yA || 1e-9);
        return a.age_months + t * (b.age_months - a.age_months);
      }
    }
    
    if (S <= sorted[0].probability) return sorted[0].age_months;
    return sorted[sorted.length - 1].age_months;
  };

  // Binomial CDF helper function
  const binomialCDF = (k: number, n: number, p: number): number => {
    if (p === 0) return k >= 0 ? 1 : 0;
    if (p === 1) return k >= n ? 1 : 0;
    
    let cdf = 0;
    for (let i = 0; i <= k; i++) {
      let coef = 1;
      for (let j = 0; j < i; j++) {
        coef *= (n - j) / (j + 1);
      }
      cdf += coef * Math.pow(p, i) * Math.pow(1 - p, n - i);
    }
    return cdf;
  };

  const calculateSkillScore = async (skill: SkillInfo, currentResponses: { [key: number]: string }, assessmentId: string): Promise<{ 
    currentRangeScore: number; 
    totalSkillScore: number; 
    percentile: number | null; 
    referencePercentile: number | null;
    probability: number | null; // Raw probability value (0-1) from database
    monthsOffset: number | null; // Months ahead/behind based on milestone ages
    masteredInRange: number; // Number of milestones completed in range
    totalInRange: number; // Total number of milestones in range
    masteredTotal: number; // Number of milestones completed in entire skill
    totalSkillMilestones: number; // Total number of milestones in the skill (original count)
  }> => {
    const referenceAge = assessment.reference_age_months;
    const offset = getAgeRangeOffset(skill.area_id);
    const minAge = referenceAge;
    const maxAge = referenceAge + offset;
    
    // Fetch milestones for this skill
    // A) In-range (±3 months)
    const { data: inRangeMilestones, error: inRangeError } = await externalSupabase
      .from('skill_milestone')
      .select('milestone_id, age')
      .eq('skill_id', skill.skill_id)
      .gte('age', minAge)
      .lte('age', maxAge);

    // B) ALL milestones for the skill (true total)
    const { data: allSkillMilestonesAll, error: allSkillError } = await externalSupabase
      .from('skill_milestone')
      .select('milestone_id, age')
      .eq('skill_id', skill.skill_id);
    
    if (allSkillError || !allSkillMilestonesAll) {
      console.error('Error fetching skill milestones (all):', allSkillError);
      // Fallback to local array built earlier
      const skillMilestones = milestones.slice(skill.start_index, skill.start_index + skill.milestone_count);
      const totalSkillMilestones = skillMilestones.length;
      
      const milestonesInRange = skillMilestones.filter(m => m.age >= minAge && m.age <= maxAge);
      
      // Calculate current range progress (milestones within age ±3)
      let masteredInRange = 0;
      let totalInRange = 0;
      
      milestonesInRange.forEach(milestone => {
        const response = currentResponses[milestone.milestone_id];
        if (response) {
          totalInRange++;
          if (response === "yes") masteredInRange++;
        }
      });
      
      const currentRangeScore = totalInRange > 0 ? Math.round((masteredInRange / totalInRange) * 100) : 0;
      
      // Calculate total skill progress (all milestones in skill)
      let masteredTotal = 0;
      let totalAnswered = 0;
      
      skillMilestones.forEach(milestone => {
        const response = currentResponses[milestone.milestone_id];
        if (response) {
          totalAnswered++;
          if (response === "yes") masteredTotal++;
        }
      });
      
      const totalSkillScore = totalAnswered > 0 ? Math.round((masteredTotal / totalAnswered) * 100) : 0;
      
      return { 
        currentRangeScore, 
        totalSkillScore, 
        percentile: totalSkillScore, 
        referencePercentile: Math.max(50, Math.round(totalSkillScore * 0.85)), 
        probability: null, 
        monthsOffset: null, 
        masteredInRange, 
        totalInRange, 
        masteredTotal,
        totalSkillMilestones
      };
    }
    
    const totalSkillMilestones = allSkillMilestonesAll.length;
    
    // Use in-range query if available, otherwise derive from ALL
    const milestonesInRange = (!inRangeError && inRangeMilestones)
      ? inRangeMilestones
      : allSkillMilestonesAll.filter(m => m.age >= minAge && m.age <= maxAge);
    
    // Merge answers: DB authoritative + local (prefer local for freshest)
    const milestoneIds = allSkillMilestonesAll.map(m => m.milestone_id);
    let dbMap: { [key: number]: string } = {};
    try {
      const { data: dbAnswers } = await supabase
        .from('assessment_responses')
        .select('milestone_id, answer')
        .eq('assessment_id', assessmentId)
        .in('milestone_id', milestoneIds);
      if (dbAnswers) {
        dbMap = dbAnswers.reduce((acc: any, r: any) => {
          acc[r.milestone_id] = r.answer;
          return acc;
        }, {} as { [key: number]: string });
      }
    } catch (e) {
      console.warn('⚠️ Could not fetch DB answers for merge, using local only');
    }

    const mergedForSkill: { [key: number]: string } = { ...dbMap };
    for (const mid of milestoneIds) {
      if (currentResponses[mid] !== undefined) mergedForSkill[mid] = currentResponses[mid];
    }

    // Calculate current range progress (milestones within age ±3)
    let masteredInRange = 0;
    let totalInRange = 0;
    milestonesInRange.forEach(milestone => {
      const response = mergedForSkill[milestone.milestone_id];
      if (response) {
        totalInRange++;
        if (response === "yes") masteredInRange++;
      }
    });
    const currentRangeScore = totalInRange > 0 ? Math.round((masteredInRange / totalInRange) * 100) : 0;

    // Calculate total skill progress (ALL milestones in skill, including Quick Check)
    let masteredTotal = 0;
    let totalAnswered = 0;
    allSkillMilestonesAll.forEach(milestone => {
      const response = mergedForSkill[milestone.milestone_id];
      if (response) {
        totalAnswered++;
        if (response === "yes") masteredTotal++;
      }
    });
    const totalSkillScore = totalAnswered > 0 ? Math.round((masteredTotal / totalAnswered) * 100) : 0;
    
    // Calculate percentile using skill_probability_curves
    let percentile: number | null = null;
    let referencePercentile: number | null = null;
    let probability: number | null = null; // Store raw probability for consistency
    
    try {
      const ageForLookup = Math.floor(referenceAge);
      
      // A) Use totalSkillScore (all milestones in skill) for percentile calculation
      const completionDecimal = totalSkillScore / 100; // Convert to 0-1 range (e.g., 14% -> 0.14)

      // Fetch percentile curves from percentile_skills table (uses baby_age)
      const tryAges = [ageForLookup, ageForLookup - 1, ageForLookup + 1, ageForLookup - 2, ageForLookup + 2];
      let allCurves: any[] = [];
      
      for (const tryAge of tryAges) {
        const { data, error } = await externalSupabase
          .from('percentile_skills')
          .select('percentile, completion_percentage')
          .eq('skill_id', skill.skill_id)
          .eq('baby_age', tryAge)
          .order('completion_percentage', { ascending: true });
        
        if (!error && data && data.length > 0) {
          allCurves = data;
          console.log(`📊 Found percentile curves for skill ${skill.skill_id} at age ${tryAge}:`, data.length);
          break;
        }
      }

      if (allCurves && allCurves.length > 0) {
        // Group by completion_percentage and take the MAXIMUM percentile for each unique completion
        const curvesByCompletion = new Map<number, number>();
        allCurves.forEach(curve => {
          const completion = Number(curve.completion_percentage);
          const perc = Number(curve.percentile);
          const currentMax = curvesByCompletion.get(completion);
          if (currentMax === undefined || perc > currentMax) {
            curvesByCompletion.set(completion, perc);
          }
        });

        // Convert to array sorted by completion_percentage
        const uniqueCurves = Array.from(curvesByCompletion.entries())
          .map(([probability, percentile]) => ({ probability, percentile }))
          .sort((a, b) => a.probability - b.probability);

        let percentileOfBaby: number | null = null;
        
        // Take the MAXIMUM percentile of the range where the baby's probability falls
        for (let i = 0; i < uniqueCurves.length - 1; i++) {
          const probL = uniqueCurves[i].probability;
          const probR = uniqueCurves[i + 1].probability;
          const percR = uniqueCurves[i + 1].percentile;
          
          // Find where completionDecimal falls in the probability distribution
          if (probL <= completionDecimal && completionDecimal <= probR) {
            // Use the maximum percentile (upper bound of the range)
            percentileOfBaby = percR;
            console.log('📊 Percentile Calculation:', {
              completionDecimal,
              probRange: [probL, probR],
              maxPercentile: percR,
              selectedPercentile: percentileOfBaby
            });
            break;
          }
        }
        
        // Edge cases: if completionDecimal is outside the available probability range
        if (percentileOfBaby === null) {
          const firstProb = uniqueCurves[0].probability;
          const lastProb = uniqueCurves[uniqueCurves.length - 1].probability;
          
          if (completionDecimal <= firstProb) {
            percentileOfBaby = uniqueCurves[0].percentile;
          } else if (completionDecimal >= lastProb) {
            percentileOfBaby = uniqueCurves[uniqueCurves.length - 1].percentile;
          } else {
            // Fallback: use 0.50 if something went wrong
            percentileOfBaby = 0.50;
          }
        }
        
        // Store the calculated percentile (0-1, higher is better)
        probability = percentileOfBaby;
        
        // For UI: percentile (0-100, higher is better)
        percentile = Math.round(percentileOfBaby * 100);
        
        // For UI: "Y% of babies have completed this"
        referencePercentile = Math.round(completionDecimal * 100);
      } else {
        // Fallback if no probability data available
        console.log('⚠️ No probability data found for skill:', {
          skill_id: skill.skill_id,
          skill_name: skill.skill_name,
          age_months: ageForLookup,
          locale: 'en'
        });
        
        // Check if we need to use a different age (fallback to closest available age)
        const { data: availableAges } = await externalSupabase
          .from('percentile_skills')
          .select('age')
          .eq('skill_id', skill.skill_id)
          .eq('locale', assessment.locale || 'en')
          .order('age', { ascending: true });
        
        const agesArray = availableAges?.map((a: any) => a.age) || [];
        const uniqueAges = [...new Set(agesArray)];
        
        if (uniqueAges.length > 0 && !uniqueAges.includes(ageForLookup)) {
          // Find closest age
          const closestAge = uniqueAges.reduce((closest, age) => {
            const currentDiff = Math.abs(age - ageForLookup);
            const closestDiff = Math.abs(closest - ageForLookup);
            return currentDiff < closestDiff ? age : closest;
          }, uniqueAges[0]);
          
          console.log(`📊 Falling back to age ${closestAge} (requested age ${ageForLookup} not found)`);
          
          // Retry with closest age
          const { data: fallbackCurves } = await externalSupabase
            .from('percentile_skills')
            .select('percentile, completion_percentage')
            .eq('skill_id', skill.skill_id)
            .eq('age', closestAge)
            .eq('locale', assessment.locale || 'en')
            .order('completion_percentage', { ascending: true });
          
          if (fallbackCurves && fallbackCurves.length > 0) {
            // Group fallback curves by completion_percentage and take maximum percentile
            const fallbackByCompletion = new Map<number, number>();
            fallbackCurves.forEach(curve => {
              const completion = Number(curve.completion_percentage);
              const perc = Number(curve.percentile);
              const currentMax = fallbackByCompletion.get(completion);
              if (currentMax === undefined || perc > currentMax) {
                fallbackByCompletion.set(completion, perc);
              }
            });

            const uniqueFallback = Array.from(fallbackByCompletion.entries())
              .map(([probability, percentile]) => ({ probability, percentile }))
              .sort((a, b) => a.probability - b.probability);

            // Re-run interpolation logic with fallback data
            let percentileOfBaby: number | null = null;
            for (let i = 0; i < uniqueFallback.length - 1; i++) {
              const probL = uniqueFallback[i].probability;
              const probR = uniqueFallback[i + 1].probability;
              const percR = uniqueFallback[i + 1].percentile;
              
              if (probL <= completionDecimal && completionDecimal <= probR) {
                // Use the maximum percentile (upper bound of the range)
                percentileOfBaby = percR;
                break;
              }
            }
            
            if (percentileOfBaby === null) {
              const firstProb = uniqueFallback[0].probability;
              const lastProb = uniqueFallback[uniqueFallback.length - 1].probability;
              if (completionDecimal <= firstProb) percentileOfBaby = uniqueFallback[0].percentile;
              else if (completionDecimal >= lastProb) percentileOfBaby = uniqueFallback[uniqueFallback.length - 1].percentile;
              else percentileOfBaby = 0.50;
            }
            
            probability = percentileOfBaby;
            percentile = Math.round(percentileOfBaby * 100);
            referencePercentile = Math.round(completionDecimal * 100);
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching probabilities for skill ${skill.skill_id}:`, error);
    }
    
    // If no percentile data available, use score as fallback
    if (percentile === null) {
      percentile = totalSkillScore;
    }
    
    if (referencePercentile === null) {
      referencePercentile = Math.max(50, Math.round(totalSkillScore * 0.85));
    }
    
    // Calculate monthsOffset using individual milestone ages
    let monthsOffset: number | null = null;
    
    // Helper functions for robust statistics
    const median = (arr: number[]) => {
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };
    
    const mean = (arr: number[]) => arr.reduce((sum, x) => sum + x, 0) / arr.length;
    
    // Filter milestones: answered "yes", with valid age, within relevant range
    const masteredMilestones = milestones.filter(m => 
      m.age != null &&
      m.age !== undefined &&
      responses[m.milestone_id] === "yes" &&
      m.age <= referenceAge + 1  // Only relevant milestones
    );
    
    if (masteredMilestones.length > 0) {
      // Calculate individual offsets: expected_age - current_age (positive = ahead, negative = behind)
      const offsets = masteredMilestones.map(milestone => {
        const expectedAge = milestone.age as number;
        const currentAge = referenceAge;
        return expectedAge - currentAge;
      });
      
      // Use robust statistic: median for <4 data points, mean for >=4
      const avgOffset = offsets.length >= 4 ? mean(offsets) : median(offsets);
      
      // Clamp to [-3, +3] for visualization
      const clamped = Math.max(-3, Math.min(3, avgOffset));
      
      // Round to 0.5 months for better UX
      monthsOffset = Math.round(clamped * 2) / 2;
      
      console.log('📊 Milestone-Based Offset Calculation:', {
        babyAge: referenceAge,
        masteredCount: masteredMilestones.length,
        individualOffsets: offsets.map((off, idx) => ({
          milestoneId: masteredMilestones[idx].milestone_id,
          description: masteredMilestones[idx].description?.substring(0, 30) + '...',
          expectedAge: masteredMilestones[idx].age,
          currentAge: referenceAge,
          offset: off
        })),
        rawAverage: avgOffset.toFixed(2),
        clampedOffset: clamped.toFixed(2),
        roundedOffset: monthsOffset
      });
    } else {
      monthsOffset = null;
      console.log('⚠️ No relevant mastered milestones for offset calculation');
    }
    
    return { currentRangeScore, totalSkillScore, percentile, referencePercentile, probability, monthsOffset, masteredInRange, totalInRange, masteredTotal, totalSkillMilestones };
  };

  const handleResponse = async (milestoneId: number, answer: string) => {
    setSaving(true);

    // Track the answer for analytics
    await analytics.trackAnswer(milestoneId, answer, currentQuestionIndex);

    try {
      // 1. Save the current response with skill_id and area_id
      const { error } = await supabase
        .from("assessment_responses")
        .upsert(
          {
            assessment_id: id,
            milestone_id: milestoneId,
            answer,
            skill_id: currentMilestone.skill_id,
            area_id: currentMilestone.area_id,
          },
          {
            onConflict: 'assessment_id,milestone_id'
          }
        );

      if (error) throw error;

      // 2. Create updated responses object
      const updatedResponses = { ...responses, [milestoneId]: answer };
      
      // 3. NEW LOGIC: If answer is "NO", check if we should continue or auto-complete
      if (answer === "no") {
        // 3a. Get current skill
        const currentSkill = skills.find(skill => 
          currentQuestionIndex >= skill.start_index && 
          currentQuestionIndex < skill.start_index + skill.milestone_count
        );

        if (currentSkill) {
          const currentMilestone = milestones[currentQuestionIndex];
          const currentAge = currentMilestone.age;
          
          // Find the next milestone after the current one
          const nextMilestoneIndex = currentQuestionIndex + 1;
          const nextMilestone = milestones[nextMilestoneIndex];
          
          // 🔒 CRITICAL RULE: Complete all milestones of the SAME AGE before stopping
          if (nextMilestone && 
              nextMilestone.skill_id === currentSkill.skill_id &&
              nextMilestone.age === currentAge) {
            console.log(`✅ Next milestone is same age (${currentAge}mo). Continuing to complete all milestones of this age...`);
            setResponses(updatedResponses);
            setCurrentQuestionIndex(nextMilestoneIndex);
            setSaving(false);
            return;
          }
          
          // Now we've completed all milestones of currentAge
          // Check if there are more milestones within mandatory range (-3 to +5)
          if (nextMilestone && 
              nextMilestone.skill_id === currentSkill.skill_id &&
              nextMilestone.age >= mandatoryAgeRange.min &&
              nextMilestone.age <= mandatoryAgeRange.max) {
            console.log(`✅ Next milestone (age ${nextMilestone.age}mo) is within mandatory range (${mandatoryAgeRange.min}-${mandatoryAgeRange.max}mo). Continuing...`);
            setResponses(updatedResponses);
            setCurrentQuestionIndex(nextMilestoneIndex);
            setSaving(false);
            return;
          }
          
          // 🛑 AUTO-COMPLETE RULE: Only check milestones with age > mandatoryAgeRange.max
          console.log(`🛑 No more mandatory milestones (age ${mandatoryAgeRange.min}-${mandatoryAgeRange.max}mo). Checking remaining (age >${mandatoryAgeRange.max}mo)...`);
          
          // Merge quick check responses with current responses
          const mergedResponses = { ...updatedResponses };
          Object.entries(checkedMilestones).forEach(([mid, isChecked]) => {
            const milestoneId = parseInt(mid);
            if (!mergedResponses[milestoneId]) {
              mergedResponses[milestoneId] = isChecked ? 'yes' : 'no';
            }
          });
          
          // 3b. Get remaining milestones in skill that are outside mandatory window (age > max)
          const remainingMilestones = milestones.filter((m, index) => {
            return index > currentQuestionIndex && 
                   index < currentSkill.start_index + currentSkill.milestone_count &&
                   m.age > mandatoryAgeRange.max &&
                   !mergedResponses[m.milestone_id];
          });

          // 3c. Instead of auto-completing, show Future Milestones Check screen
          if (remainingMilestones.length > 1) {
            console.log('🔄 User answered NO - showing Future Milestones Check');
            
            // Save pending state for processing after user confirms
            setPendingSkillCompletion({
              skill: currentSkill,
              updatedResponses: mergedResponses  // ✅ Include Quick Check + Detailed responses
            });
            
            // Configure future milestones
            setFutureMilestones(remainingMilestones);
            
            // Initialize all as unchecked (NO by default)
            const initialChecked: { [key: number]: boolean } = {};
            remainingMilestones.forEach(m => {
              initialChecked[m.milestone_id] = false;
            });
            setFutureCheckedMilestones(initialChecked);
            
            // Show intermediate screen
            setShowFutureMilestonesCheck(true);
            setSaving(false);
            return;
          } else {
            // No remaining milestones - show feedback directly
            const { currentRangeScore, totalSkillScore, percentile, referencePercentile, probability, monthsOffset, masteredInRange, totalInRange, masteredTotal, totalSkillMilestones } 
              = await calculateSkillScore(currentSkill, mergedResponses, id!);

            setResponses(mergedResponses);
            setCompletedSkill({ 
              skill: currentSkill, 
              currentRangeScore, 
              totalSkillScore, 
              percentile, 
              referencePercentile, 
              probability, 
              monthsOffset,
              masteredInRange,
              totalInRange,
              masteredTotal,
              totalSkillMilestones
            });

            setCurrentQuestionIndex(currentSkill.start_index + currentSkill.milestone_count);
            setShowSkillFeedback(true);
            setSaving(false);
            return;
          }
        }
      }

      // 4. ORIGINAL LOGIC for "YES" answers (unchanged)
      setResponses(updatedResponses);
      
      // Get current skill
      const currentSkill = skills.find(skill => 
        currentQuestionIndex >= skill.start_index && 
        currentQuestionIndex < skill.start_index + skill.milestone_count
      );
      
      // Check if we completed a skill
      const isLastQuestionOfSkill = currentSkill && 
        currentQuestionIndex === currentSkill.start_index + currentSkill.milestone_count - 1;
      
      // Auto-advance to next question after a brief delay
      setTimeout(async () => {
        if (isLastQuestionOfSkill && currentSkill) {
          // Merge Quick Check responses before calculating score
          const mergedResponses = { ...updatedResponses };
          Object.entries(checkedMilestones).forEach(([mid, isChecked]) => {
            const milestoneId = parseInt(mid);
            if (!mergedResponses[milestoneId]) {
              mergedResponses[milestoneId] = isChecked ? 'yes' : 'no';
            }
          });
          
          // Calculate skill results with ALL responses (Quick Check + Detailed)
          const { currentRangeScore, totalSkillScore, percentile, referencePercentile, probability, monthsOffset, masteredInRange, totalInRange, masteredTotal, totalSkillMilestones } = await calculateSkillScore(currentSkill, mergedResponses, id!);
          
          setCompletedSkill({ skill: currentSkill, currentRangeScore, totalSkillScore, percentile, referencePercentile, probability, monthsOffset, masteredInRange, totalInRange, masteredTotal, totalSkillMilestones });
          
          // Increment to next question index immediately so we don't double-check area completion
          // Even if this was the very last question, move the index one step forward
          // so we can detect area completion and show the 100% screen properly.
          setCurrentQuestionIndex(Math.min(currentQuestionIndex + 1, milestones.length));
          
          setShowSkillFeedback(true);
        } else if (currentQuestionIndex < milestones.length - 1) {
          const nextIndex = currentQuestionIndex + 1;
          
          // Check if next question is the start of a new skill
          const nextSkill = skills.find(skill => nextIndex === skill.start_index);
          
          if (nextSkill) {
            // Show skill intro before next question - DON'T increment index yet
            setIntroSkill(nextSkill);
            setShowSkillIntro(true);
          } else {
            setCurrentQuestionIndex(nextIndex);
          }
        }
      }, 500);
    } catch (error: any) {
      console.error("Error saving response:", error);
      toast.error("Failed to save response");
    } finally {
      setSaving(false);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex === 0) return;
    
    // Find the skill that contains the current question
    const currentSkill = skills.find(s => 
      currentQuestionIndex >= s.start_index && 
      currentQuestionIndex < s.start_index + s.milestone_count
    );
    
    // If we're at the first question of a skill, show the skill intro instead
    if (currentSkill && currentQuestionIndex === currentSkill.start_index) {
      setIntroSkill(currentSkill);
      setShowSkillIntro(true);
      return;
    }
    
    // Check if previous question belongs to a different skill
    const previousQuestionIndex = currentQuestionIndex - 1;
    const previousSkill = skills.find(s => 
      previousQuestionIndex >= s.start_index && 
      previousQuestionIndex < s.start_index + s.milestone_count
    );
    
    // If moving to a different skill, show that skill's intro first
    if (previousSkill && previousSkill.skill_id !== currentSkill?.skill_id) {
      setIntroSkill(previousSkill);
      setShowSkillIntro(true);
      return;
    }
    
    // Otherwise, just go to previous question
    setCurrentQuestionIndex(previousQuestionIndex);
  };

  const handleGoToLastQuestion = () => {
    if (!completedSkill) return;
    
    const { skill } = completedSkill;
    
    // Get all milestones for this skill
    const skillMilestones = milestones.slice(
      skill.start_index, 
      skill.start_index + skill.milestone_count
    );
    
    // Check if there were future milestones (beyond age range) that were answered
    const offset = getAgeRangeOffset(skill.area_id);
    const mandatoryAgeRange = {
      min: assessment?.reference_age_months ? Math.max(0, assessment.reference_age_months - offset) : 0,
      max: assessment?.reference_age_months ? assessment.reference_age_months + offset : 6
    };
    
    const futureMilestonesForSkill = skillMilestones.filter(m => 
      m.age > mandatoryAgeRange.max && responses[m.milestone_id]
    );
    
    const hasFutureCheck = futureMilestonesForSkill.length > 0;
    
    // Hide the feedback screen
    setShowSkillFeedback(false);
    setCompletedSkill(null);
    
    if (hasFutureCheck) {
      // Reconstruct and show the Future Check screen
      const allFutureMilestones = skillMilestones.filter(m => 
        m.age > mandatoryAgeRange.max
      );
      
      setFutureMilestones(allFutureMilestones);
      setPendingSkillCompletion({
        skill: skill,
        updatedResponses: responses
      });
      setShowFutureMilestonesCheck(true);
    } else {
      // Go to the last answered question within the 1:1 Assessment range (not Future milestones)
      const milestonesIn1to1Range = skillMilestones.filter(m => 
        m.age >= mandatoryAgeRange.min && m.age <= mandatoryAgeRange.max
      );
      
      if (milestonesIn1to1Range.length > 0) {
        // Get the last milestone in the 1:1 range
        const lastMilestoneIn1to1 = milestonesIn1to1Range[milestonesIn1to1Range.length - 1];
        // Find its actual index in the milestones array
        const lastAnsweredIndex = milestones.findIndex(m => 
          m.milestone_id === lastMilestoneIn1to1.milestone_id
        );
        setCurrentQuestionIndex(lastAnsweredIndex);
      } else {
        // Fallback to last milestone of skill if no 1:1 milestones found
        const lastAnsweredIndex = skill.start_index + skill.milestone_count - 1;
        setCurrentQuestionIndex(lastAnsweredIndex);
      }
    }
  };

  const handleSkipAssessment = async () => {
    try {
      setSaving(true);
      toast.info("Completing assessment automatically...");
      
      // Get all milestones that don't have responses yet
      const unansweredMilestones = milestones.filter(
        m => !responses[m.milestone_id]
      );
      
      // Generate random responses (70% yes, 30% no for realistic development simulation)
      const randomResponses = unansweredMilestones.map(milestone => ({
        assessment_id: id!,
        milestone_id: milestone.milestone_id,
        skill_id: milestone.skill_id,
        area_id: milestone.area_id,
        answer: Math.random() < 0.7 ? 'yes' : 'no',
        source: 'manual'
      }));
      
      // Save all responses in batch
      if (randomResponses.length > 0) {
        const { error: batchError } = await supabase
          .from('assessment_responses')
          .upsert(randomResponses, {
            onConflict: 'assessment_id,milestone_id'
          });
        
        if (batchError) throw batchError;
      }
      
      // Mark assessment as completed
      const { error: updateError } = await supabase
        .from('assessments')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', id);
      
      if (updateError) throw updateError;
      
      // Navigate to report
      // toast removed to avoid blocking report view
      setTimeout(() => {
        navigate(`/report/${id}`);
      }, 500);
      
    } catch (error) {
      console.error("Error auto-completing assessment:", error);
      toast.error("Failed to auto-complete assessment");
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < milestones.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const calculateProgress = () => {
    if (milestones.length === 0) return 22;
    // Start at 22% (from baby form steps) and fill remaining 78% based on assessment progress
    const assessmentProgress = ((currentQuestionIndex + 1) / milestones.length) * 78;
    return Math.min(100, 22 + assessmentProgress);
  };

  const handleComplete = async () => {
    const totalMilestones = milestones.length;
    const answeredCount = Object.keys(responses).length;

    if (answeredCount < totalMilestones) {
      toast.error(
        `Please answer all questions (${answeredCount}/${totalMilestones} answered)`
      );
      return;
    }

    try {
      const { error } = await supabase
        .from("assessments")
        .update({ completed_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      // Cache assessment data for signup flow
      localStorage.setItem('assessment_draft', JSON.stringify({
        baby_id: baby?.id,
        assessment_id: id,
        timestamp: new Date().toISOString()
      }));

      // toast removed to avoid blocking report view
      navigate(`/report/${id}`);
    } catch (error: any) {
      console.error("Error completing assessment:", error);
      toast.error("Failed to complete assessment");
    }
  };

  const handleFutureMilestonesConfirm = async () => {
    if (!pendingSkillCompletion) return;
    
    setSaving(true);
    
    try {
      const { skill, updatedResponses } = pendingSkillCompletion;
      const finalResponses = { ...updatedResponses };
      
      // Include Quick Check responses if not already present
      Object.entries(checkedMilestones).forEach(([mid, isChecked]) => {
        const milestoneId = parseInt(mid);
        if (!finalResponses[milestoneId]) {
          finalResponses[milestoneId] = isChecked ? 'yes' : 'no';
        }
      });
      
      // Save responses according to checkboxes
      const batchResponses = futureMilestones.map(m => ({
        assessment_id: id,
        milestone_id: m.milestone_id,
        answer: futureCheckedMilestones[m.milestone_id] ? 'yes' : 'no',
        source: 'quick_confirm',
        skill_id: m.skill_id,
        area_id: m.area_id,
      }));
      
      const { error: saveError } = await supabase
        .from("assessment_responses")
        .upsert(batchResponses, { onConflict: 'assessment_id,milestone_id' });
      
      if (saveError) throw saveError;
      
      // Update local responses with Future Check answers
      futureMilestones.forEach(m => {
        finalResponses[m.milestone_id] = futureCheckedMilestones[m.milestone_id] ? 'yes' : 'no';
      });
      
      // Calculate skill score with all responses (Quick Check + Detailed + Future)
      const scoreData = await calculateSkillScore(skill, finalResponses, id!);
      
      // Update states
      setResponses(finalResponses);
      setCompletedSkill({ skill, ...scoreData });
      setCurrentQuestionIndex(skill.start_index + skill.milestone_count);
      
      // Transition to feedback
      setShowFutureMilestonesCheck(false);
      setShowSkillFeedback(true);
      
      // Clear temporary states
      setPendingSkillCompletion(null);
      setFutureMilestones([]);
      setFutureCheckedMilestones({});
      
      const checkedCount = futureMilestones.filter(m => futureCheckedMilestones[m.milestone_id]).length;
      if (checkedCount > 0) {
        toast.success(`Great! Recorded ${checkedCount} skill${checkedCount !== 1 ? 's' : ''} your baby can already do`);
      }
    } catch (error) {
      console.error("Error processing future milestones:", error);
      toast.error("Failed to save responses");
    } finally {
      setSaving(false);
    }
  };

  const handleFutureMilestoneToggle = (milestoneId: number) => {
    setFutureCheckedMilestones(prev => ({
      ...prev,
      [milestoneId]: !prev[milestoneId]
    }));
  };

  const getAreaIcon = (areaName: string, circular = false) => {
    const key = (areaName || "").toLowerCase().trim();
    
    if (circular) {
      if (key === "cognitive") return logoCognitive;
      if (key === "linguistic" || key === "lingustic") return logoLinguistic;
      if (
        key === "socio-emotional" ||
        key === "social-emotional" ||
        key === "social emotional" ||
        key === "socio emotional"
      ) return logoEmotional;
      if (key === "physical") return logoPhysical;
      return physicalIcon;
    }
    
    if (key === "cognitive") return cognitiveIcon;
    if (key === "linguistic" || key === "lingustic") return linguisticWithText;
    if (
      key === "socio-emotional" ||
      key === "social-emotional" ||
      key === "social emotional" ||
      key === "socio emotional"
    ) return emotionalWithText;
    if (key === "physical") return physicalIcon;
    return physicalIcon;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setSwipeStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (swipeStart === null) return;
    const diff = e.touches[0].clientX - swipeStart;
    setSwipeOffset(diff);
  };

  const handleTouchEnd = () => {
    if (swipeStart === null) return;
    
    const threshold = 100;
    if (swipeOffset > threshold) {
      handleResponse(currentMilestone.milestone_id, "yes");
    } else if (swipeOffset < -threshold) {
      handleResponse(currentMilestone.milestone_id, "no");
    }
    
    setSwipeStart(null);
    setSwipeOffset(0);
  };

  const handleContinueFromSkillFeedback = () => {
    console.log("🔄 handleContinueFromSkillFeedback called", { 
      currentQuestionIndex, 
      currentMilestone: milestones[currentQuestionIndex],
      currentSkill: skills.find(s => currentQuestionIndex >= s.start_index && currentQuestionIndex < s.start_index + milestones.filter(m => m.skill_id === s.skill_id).length)
    });
    
    setShowSkillFeedback(false);
    setCompletedSkill(null);
    
    // Note: currentQuestionIndex was already incremented in handleAnswer
    // Check if we just completed an area (check the PREVIOUS index since we already moved forward)
    const previousIndex = currentQuestionIndex - 1;
    const currentArea = areas.find(area => 
      previousIndex >= area.start_index && 
      previousIndex <= area.end_index
    );
    
    const isLastQuestionOfArea = currentArea && previousIndex === currentArea.end_index;
    
    if (isLastQuestionOfArea && currentArea) {
      // Show area feedback screen
      setCompletedArea(currentArea);
      setShowAreaFeedback(true);
      
      // Fetch AI interpretation for area results
      setLoadingAreaInterpretation(true);
      setAreaInterpretation(null);
      
      (async () => {
        try {
          // Calculate skills data for this area
          const areaSkills = skills.filter(skill => {
            const skillArea = areas.find(a => 
              skill.start_index >= a.start_index && 
              skill.start_index <= a.end_index
            );
            return skillArea?.area_name === currentArea.area_name;
          });
          
          const skillsData = await Promise.all(
            areaSkills.map(async (skill) => {
              const skillScore = await calculateSkillScore(skill, responses, id!);
              return {
                skillName: skill.skill_name,
                monthsOffset: skillScore.monthsOffset || 0,
                percentile: skillScore.percentile || 0
              };
            })
          );
          
          const percentage = calculateAreaPercentage(currentArea);
          
          const { data: interpretation, error } = await supabase.functions.invoke('interpret-area-results', {
            body: {
              areaName: currentArea.area_name,
              babyAgeMonths: assessment?.reference_age_months || 0,
              areaPercentage: percentage,
              skillsData
            }
          });
          
          if (!error && interpretation?.interpretation) {
            setAreaInterpretation(interpretation.interpretation);
          }
        } catch (error) {
          console.error("Error fetching area AI interpretation:", error);
        } finally {
          setLoadingAreaInterpretation(false);
        }
      })();
    } else if (currentQuestionIndex < milestones.length) {
      // Check if current question is the start of a new skill
      const nextSkill = skills.find(skill => currentQuestionIndex === skill.start_index);
      
      if (nextSkill) {
        // Show skill intro before next question
        console.log("✨ [handleContinueFromSkillFeedback] Next skill after feedback:", { 
          skill_name: nextSkill.skill_name, 
          area_id: nextSkill.area_id,
          area_name: nextSkill.area_name,
          skill_id: nextSkill.skill_id,
          index: currentQuestionIndex 
        });
        setIntroSkill(nextSkill);
        setShowSkillIntro(true);
      } else {
        console.log("❓ [handleContinueFromSkillFeedback] No skill intro at index", currentQuestionIndex);
      }
      // No need to increment index again, it was already done in handleAnswer
    }
  };

  const handleContinueFromFeedback = async () => {
    setShowAreaFeedback(false);
    
    // Check if we just completed the LAST area (Socio-Emotional)
    const isLastArea = completedArea && areas.indexOf(completedArea) === areas.length - 1;
    
    setCompletedArea(null);
    
    if (isLastArea) {
      // Mark assessment as completed and navigate directly to report
      try {
        await supabase
          .from("assessments")
          .update({ completed_at: new Date().toISOString() })
          .eq("id", id);

        // Cache assessment data for signup flow
        localStorage.setItem('assessment_draft', JSON.stringify({
          baby_id: baby?.id,
          assessment_id: id,
          timestamp: new Date().toISOString()
        }));

        // toast removed to avoid blocking report view
        navigate(`/report/${id}`);
      } catch (error) {
        console.error("Error completing assessment:", error);
        toast.error("Failed to complete assessment");
      }
      return;
    }
    
    // Do NOT advance here; index already points to the first question of the next area
    const nextIndex = currentQuestionIndex;
    
    // Check if current question is the start of a new skill and show skill intro
    const nextSkill = skills.find(skill => nextIndex === skill.start_index);
    if (nextSkill && nextIndex < milestones.length) {
      setIntroSkill(nextSkill);
      setShowSkillIntro(true);
      return;
    }
    // Otherwise, keep the current index
  };

  const handleContinueFromIntro = () => {
    setShowAreaIntro(false);
    setIntroArea(null);
  };

  const getAreaIntroDescription = (areaName: string): string => {
    const key = areaName.toLowerCase().trim();
    
    switch(key) {
      case "physical":
        return "Encourage the development of fine and gross motor skills, crucial for mobility, coordination, and physical exploration.";
      case "cognitive":
        return "Support the development of critical thinking and problem-solving skills, essential for creativity and lifelong learning.";
      case "linguistic":
      case "lingustic":
        return "Foster language and communication development, helping children express themselves and understand their surroundings.";
      case "social-emotional":
      case "socio-emotional":
      case "social emotional":
      case "socio emotional":
        return "Facilitate the development of healthy relationships and emotional management, building a strong foundation for empathy and self-expression.";
      default:
        return "Support your baby's growth and development in this important area.";
    }
  };

  const getAreaColorVariable = (areaId: number): string => {
    // Direct mapping: area_id → color variable
    // 1 = Physical → turquesa (physical)
    // 2 = Cognitive → verde (cognitive)
    // 3 = Linguistic → naranja (linguistic)
    // 4 = Social-Emotional → rosa (emotional)
    const colorMap: Record<number, string> = {
      1: 'physical',    // turquesa
      2: 'cognitive',   // verde
      3: 'linguistic',  // naranja
      4: 'emotional'    // rosa
    };
    
    return colorMap[areaId] || 'primary';
  };

  const getAreaColor = (areaName: string) => {
    const key = areaName.toLowerCase().trim();
    
    switch(key) {
      case "physical":
        return {
          badge: "bg-blue-100 text-blue-700 border-blue-300",
          title: "text-blue-600",
          border: "border-blue-200",
          bg: "bg-blue-50"
        };
      case "cognitive":
        return {
          badge: "bg-green-100 text-green-700 border-green-300",
          title: "text-green-600",
          border: "border-green-200",
          bg: "bg-green-50"
        };
      case "linguistic":
      case "lingustic":
        return {
          badge: "bg-orange-100 text-orange-700 border-orange-300",
          title: "text-orange-600",
          border: "border-orange-200",
          bg: "bg-orange-50"
        };
      case "social-emotional":
      case "socio-emotional":
      case "social emotional":
      case "socio emotional":
        return {
          badge: "bg-pink-100 text-pink-700 border-pink-300",
          title: "text-pink-600",
          border: "border-pink-200",
          bg: "bg-pink-50"
        };
      default:
        return {
          badge: "bg-gray-100 text-gray-700 border-gray-300",
          title: "text-gray-600",
          border: "border-gray-200",
          bg: "bg-gray-50"
        };
    }
  };

  const calculateAreaPercentage = (area: AreaInfo) => {
    const areaMilestones = milestones.slice(area.start_index, area.end_index + 1);
    const yesCount = areaMilestones.filter(m => responses[m.milestone_id] === "yes").length;
    return Math.round((yesCount / areaMilestones.length) * 100);
  };

  const getAreaDescription = (areaName: string, percentage: number) => {
    if (percentage >= 80) {
      return `¡Excelente! Your baby is showing strong development in ${areaName} skills. They're mastering most milestones in this area.`;
    } else if (percentage >= 60) {
      return `Great progress! Your baby is developing well in ${areaName} skills. Continue encouraging these abilities.`;
    } else if (percentage >= 40) {
      return `Good start! Your baby is working on ${areaName} skills. Keep practicing and they'll continue to grow.`;
    } else {
      return `Keep going! ${areaName} skills are still emerging. Every baby develops at their own pace - continue supporting their growth.`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center">
        <Card className="p-6">
          <p className="text-muted-foreground">Loading assessment...</p>
        </Card>
      </div>
    );
  }

  if (!assessment || !baby) {
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

  if (milestones.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-warm py-8 px-4">
        <div className="container max-w-4xl mx-auto">
          <Button variant="ghost" asChild className="mb-6">
            <Link to="/">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
          </Button>

          <Card className="p-6 md:p-8 shadow-card text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Baby className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No Milestones Found</h2>
            <p className="text-muted-foreground mb-6">
              No visible milestones for this age. We'll continue with the next skill.
            </p>
            <Button variant="default" onClick={() => navigate("/")}>
              Back to Home
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const progress = calculateProgress();
  const answeredCount = Object.keys(responses).length;
  const totalCount = milestones.length;
  const isLastQuestion = currentQuestionIndex === milestones.length - 1;
  const currentAnswer = responses[currentMilestone?.milestone_id];
  
  // Check if we're at the start of a new skill
  const isFirstQuestionOfSkill = currentSkillInfo && currentQuestionIndex === currentSkillInfo.start_index;

  // Future Milestones Check Screen (matching Quick Check format)
  if (showFutureMilestonesCheck && futureMilestones.length > 0 && pendingSkillCompletion) {
    const skill = pendingSkillCompletion.skill;
    const areaColorKey = getAreaColorVariable(skill.area_id);
    const areaColorVar = `hsl(var(--${areaColorKey}))`;
    
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center py-8 px-4">
        <Card className="max-w-2xl w-full p-8 md:p-12 shadow-soft animate-fade-in border-0">
          {/* Skill name */}
          <div className="flex flex-col items-center mb-3">
            <h3 className="text-3xl font-bold text-center mb-2" style={{ color: areaColorVar }}>
              {skill.skill_name}
            </h3>
            <div className="w-24 h-1 rounded-full" style={{ backgroundColor: areaColorVar, opacity: 0.3 }}></div>
          </div>

          {/* Description */}
          <p className="text-base text-muted-foreground text-center mb-2">
            This skill keeps growing as your baby gets older.
          </p>

          {/* Checklist instruction */}
          <p className="text-base font-medium text-center mb-4 max-w-xl mx-auto">
            If {baby?.name || "your baby"} can already do any of the milestones below, just check the box
          </p>

          {/* Checklist - matching Quick Check style */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            {futureMilestones
              .sort((a, b) => a.age - b.age)
              .map((milestone) => (
                <label 
                  key={milestone.milestone_id} 
                  className="flex items-start gap-3 py-3 border-b border-border last:border-0 cursor-pointer hover:bg-muted/30 transition-colors rounded px-2"
                >
                  <Checkbox 
                    checked={futureCheckedMilestones[milestone.milestone_id] || false}
                    onCheckedChange={(checked) => {
                      setFutureCheckedMilestones(prev => ({
                        ...prev,
                        [milestone.milestone_id]: checked === true
                      }));
                    }}
                    className="mt-0.5"
                    style={{ 
                      borderColor: areaColorVar,
                      backgroundColor: futureCheckedMilestones[milestone.milestone_id] ? areaColorVar : 'transparent'
                    }}
                  />
                  <div className="flex-1">
                    <span className="text-sm text-foreground">{milestone.description}</span>
                  </div>
                </label>
              ))}
          </div>

          {/* Continue button */}
          <button 
            onClick={handleFutureMilestonesConfirm}
            disabled={saving}
            className="w-full py-4 rounded-xl text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
            style={{ 
              backgroundColor: areaColorVar
            }}
          >
            {saving ? "Saving..." : "See feedback"}
          </button>

          {/* Go to last question button */}
          <button 
            onClick={() => {
              setShowFutureMilestonesCheck(false);
              setFutureMilestones([]);
              setPendingSkillCompletion(null);
              // Go to the last question of the skill
              const lastAnsweredIndex = skill.start_index + skill.milestone_count - 1;
              setCurrentQuestionIndex(lastAnsweredIndex);
            }}
            className="w-full h-12 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 mt-3 bg-transparent"
            style={{ 
              borderColor: areaColorVar,
              color: areaColorVar
            }}
          >
            Go to last question
          </button>
        </Card>
      </div>
    );
  }

  // Quick Check Screen
  if (showEarlyIntro && earlyIntroSkill) {
    const referenceAge = assessment?.reference_age_months || 0;
    const quickCheckUpperBound = referenceAge - 3;
    const skillStart = earlyIntroSkill.start_index;
    const skillEnd = skillStart + earlyIntroSkill.milestone_count;
    const skillMilestones = milestones.slice(skillStart, skillEnd);
    
    // Special case: if all milestones are "early" (maxAge <= quickCheckUpperBound),
    // show Quick Check for all EXCEPT highest month, then detailed assessment for highest month
    const maxAgeInSkill = Math.max(...skillMilestones.map(m => m.age));
    const isFullyEarlySkill = maxAgeInSkill <= quickCheckUpperBound;
    const effectiveQuickCheckBound = isFullyEarlySkill ? maxAgeInSkill - 1 : quickCheckUpperBound;
    
    const earlyMilestones = skillMilestones.filter(m => m.age <= effectiveQuickCheckBound);

    const ages = earlyMilestones.map(m => m.age);
    const ageMin = ages.length ? Math.min(...ages) : 0;
    const ageMax = ages.length ? Math.max(...ages) : 0;

    const areaColorKey = getAreaColorVariable(earlyIntroSkill.area_id);
    const areaColorVar = `hsl(var(--${areaColorKey}))`;

    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center py-8 px-4">
        <Card className="max-w-2xl w-full p-8 md:p-12 shadow-soft animate-fade-in border-0">
          {/* Title */}
          
          {/* Skill name */}
          <div className="flex flex-col items-center mb-3">
            <h3 className="text-3xl font-bold text-center mb-2" style={{ color: areaColorVar }}>
              {earlyIntroSkill.skill_name}
            </h3>
            <div className="w-24 h-1 rounded-full" style={{ backgroundColor: areaColorVar, opacity: 0.3 }}></div>
          </div>

          {/* Description */}
            <p className="text-base text-muted-foreground text-center mb-2">
              These milestones are from earlier developmental stages (0 to {effectiveQuickCheckBound} months). We'll assume {baby?.name || "your baby"} has <strong>mastered</strong> them.
            </p>

          {/* Checklist instruction */}
          <p className="text-sm font-medium text-center mb-4">
            Uncheck anything {baby?.name || "they're"} still practicing.
          </p>

          {/* Checklist - Fixed, not collapsible */}
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
            {earlyMilestones.map((milestone) => (
              <label 
                key={milestone.milestone_id} 
                className="flex items-start gap-3 py-3 border-b border-border last:border-0 cursor-pointer hover:bg-muted/30 transition-colors rounded px-2"
              >
                <Checkbox 
                  checked={checkedMilestones[milestone.milestone_id] ?? true}
                  onCheckedChange={(checked) => {
                    setCheckedMilestones(prev => ({
                      ...prev,
                      [milestone.milestone_id]: checked === true
                    }));
                  }}
                  className="mt-0.5"
                  style={{ 
                    borderColor: areaColorVar,
                    backgroundColor: checkedMilestones[milestone.milestone_id] ?? true ? areaColorVar : 'transparent'
                  }}
                />
                <div className="flex-1">
                  <span className="text-sm text-foreground">{milestone.description}</span>
                </div>
              </label>
            ))}
          </div>

          {/* Continue button */}
          <button 
            onClick={async () => {
              if (!assessment) return;
              setEarlySkipDecisions({ ...earlySkipDecisions, [earlyIntroSkill.skill_id]: true });

              // Save only CHECKED milestones as 'yes' with quick_confirm
              const checkedIds: number[] = [];
              const uncheckedIds: number[] = [];
              // Build a local merged responses object to avoid async state lag
              const mergedResponses: { [key: number]: string } = { ...responses };
              
              console.log('📋 Quick Check - Processing milestones:', {
                totalEarlyMilestones: earlyMilestones.length,
                checkedMilestones: checkedMilestones
              });
              
              for (const m of earlyMilestones) {
                const isChecked = checkedMilestones[m.milestone_id] ?? true;
                if (isChecked) {
                  checkedIds.push(m.milestone_id);
                  console.log(`✅ Milestone ${m.milestone_id} (age ${m.age}mo) is CHECKED - saving as YES`);
                  await supabase
                    .from("assessment_responses")
                    .upsert(
                      {
                        assessment_id: id,
                        milestone_id: m.milestone_id,
                        answer: 'yes',
                        source: 'quick_confirm',
                        skill_id: m.skill_id,
                        area_id: m.area_id,
                      },
                      { onConflict: 'assessment_id,milestone_id' }
                    );
                  // Update local response immediately in the merged object
                  mergedResponses[m.milestone_id] = 'yes';
                } else {
                  uncheckedIds.push(m.milestone_id);
                  console.log(`⬜ Milestone ${m.milestone_id} (age ${m.age}mo) is UNCHECKED - saving as NO`);
                  // ✅ Save unchecked as 'no' with source: 'quick_confirm'
                  await supabase
                    .from("assessment_responses")
                    .upsert(
                      {
                        assessment_id: id,
                        milestone_id: m.milestone_id,
                        answer: 'no',
                        source: 'quick_confirm',
                        skill_id: m.skill_id,
                        area_id: m.area_id,
                      },
                      { onConflict: 'assessment_id,milestone_id' }
                    );
                  mergedResponses[m.milestone_id] = 'no';
                }
              }
              
              console.log('📊 Quick Check Summary:', {
                checked: checkedIds.length,
                unchecked: uncheckedIds.length,
                uncheckedMilestoneIds: uncheckedIds
              });
              // Commit merged responses once so downstream logic sees them
              setResponses(mergedResponses);

              toast.success(`✅ Recorded ${checkedIds.length} as YES and ${uncheckedIds.length} as NO`);

              // All Quick Check milestones have been answered (YES or NO)
              // Now navigate to first milestone AFTER effectiveQuickCheckBound
              console.log('🎯 Navigation: All Quick Check answered, jumping to first milestone after Quick Check range');
              console.log('📊 BEFORE filtering:', {
                skillStart: earlyIntroSkill.start_index,
                skillMilestoneCount: earlyIntroSkill.milestone_count,
                totalMilestonesInArray: milestones.length,
                skillMilestones: skillMilestones.map(m => ({ id: m.milestone_id, age: m.age })),
                effectiveQuickCheckBound,
                earlyMilestonesCount: earlyMilestones.length,
              });

              let targetIndex: number;
              const firstCurrentAgeIndex = skillMilestones.findIndex(mm => mm.age > effectiveQuickCheckBound);
              
              if (firstCurrentAgeIndex !== -1) {
                // Found milestones after Quick Check range
                targetIndex = skillStart + firstCurrentAgeIndex;
                console.log(`🎯 Navigating to first milestone after Quick Check (age >${effectiveQuickCheckBound}mo) at index ${targetIndex}`);
              } else {
                // No milestones at or after reference age - skill is complete, show feedback
                const { currentRangeScore, totalSkillScore, percentile, referencePercentile, probability, monthsOffset, masteredInRange, totalInRange, masteredTotal, totalSkillMilestones } 
                  = await calculateSkillScore(earlyIntroSkill, mergedResponses, id!);
                
                setCompletedSkill({ 
                  skill: earlyIntroSkill, 
                  currentRangeScore, 
                  totalSkillScore, 
                  percentile, 
                  referencePercentile, 
                  probability, 
                  monthsOffset,
                  masteredInRange,
                  totalInRange,
                  masteredTotal,
                  totalSkillMilestones
                });
                
                setShowEarlyIntro(false);
                setEarlyIntroSkill(null);
                setShowSkillFeedback(true);
                setCurrentQuestionIndex(skillEnd); // Move to end of skill
                return;
              }

              // Remove ALL early milestones (checked + unchecked) from local array
              // because all have been answered in the Quick Check
              const allEarlyIds = earlyMilestones.map(m => m.milestone_id);
              const removedCount = allEarlyIds.length;
              console.log(`🗑️ Removing ${removedCount} milestones (all Quick Check) from array`);
              
              if (removedCount > 0) {
                const idsToRemove = new Set(allEarlyIds);
                console.log('Removing milestone IDs:', Array.from(idsToRemove));
                
                setMilestones(prev => {
                  const filtered = prev.filter(m => !(idsToRemove.has(m.milestone_id) && m.skill_id === earlyIntroSkill.skill_id));
                  const sorted = sortWithinSkills(filtered);
                  console.log(`📉 Milestones array length: ${prev.length} -> ${sorted.length}`);
                  console.log('📊 AFTER filtering - remaining milestones:', sorted.map(m => ({ id: m.milestone_id, skill: m.skill_id, age: m.age })));
                  
                  // Recompute skills and areas based on sorted array (area-aware)
                  const nextSkills = recomputeSkillsFromMilestones(sorted, referenceAge);
                  const nextAreas = recomputeAreasFromMilestones(sorted);
                  console.log('📊 Recomputed skills:', nextSkills.map(s => ({ 
                    skill_id: s.skill_id, 
                    skill_name: s.skill_name,
                    start_index: s.start_index, 
                    milestone_count: s.milestone_count 
                  })));
                  setSkills(nextSkills);
                  setAreas(nextAreas);
                  
                  // Calculate target index using recomputed skills
                  const skillInfo = nextSkills.find(s => s.skill_id === earlyIntroSkill.skill_id);
                  if (skillInfo) {
                    // After Quick Check, show ALL remaining milestones starting from the first one
                    // Don't skip to referenceAge because we already filtered out early milestones
                    const absoluteTarget = skillInfo.start_index;
                    console.log(`🎯 Adjusted navigation to index ${absoluteTarget} (first milestone after Quick Check)`);
                    setCurrentQuestionIndex(absoluteTarget);
                  } else {
                    console.log(`🎯 Skill not found after filtering, navigating to end`);
                    setCurrentQuestionIndex(sorted.length);
                  }
                  
                  return sorted;
                });
              } else {
                console.log(`🎯 No milestones removed, navigating directly to index ${targetIndex}`);
                setCurrentQuestionIndex(targetIndex);
              }

              setShowEarlyIntro(false);
              setEarlyIntroSkill(null);
            }}
            className="w-full h-14 px-8 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-2 text-white"
            style={{ backgroundColor: areaColorVar, borderColor: areaColorVar }}
          >
            Let's keep going
          </button>
        </Card>
      </div>
    );
  }

  // Skill Introduction Screen
  if (showSkillIntro && introSkill) {
    // Re-derive area info if introSkill has "Unknown" area_name
    let resolvedAreaName = introSkill.area_name;
    let resolvedAreaId = introSkill.area_id;
    
    if (resolvedAreaName === "Unknown" || !resolvedAreaName) {
      console.warn('⚠️ [SkillIntro] introSkill has Unknown area, attempting to resolve...');
      const currentM = currentMilestone || milestones.find(m => m.skill_id === introSkill.skill_id);
      if (currentM && currentM.area_name !== "Unknown") {
        resolvedAreaName = currentM.area_name;
        resolvedAreaId = currentM.area_id;
        console.log('✅ [SkillIntro] Resolved from milestone:', { resolvedAreaName, resolvedAreaId });
      }
    }
    
    // Guard: don't render intro if we still don't have valid area info
    if (resolvedAreaName === "Unknown" || !resolvedAreaName) {
      console.error('❌ [SkillIntro] Cannot resolve area info, skipping intro');
      setShowSkillIntro(false);
      return null;
    }
    
    // Calculate skill position within area
    const currentArea = areas.find(area => 
      introSkill.start_index >= area.start_index && 
      introSkill.start_index <= area.end_index
    );
    
    const skillsInArea = skills.filter(skill => {
      const skillArea = areas.find(a => 
        skill.start_index >= a.start_index && 
        skill.start_index <= a.end_index
      );
      return skillArea?.area_name === currentArea?.area_name;
    });
    
    const skillNumberInArea = skillsInArea.findIndex(s => s.skill_id === introSkill.skill_id) + 1;
    const totalSkillsInArea = skillsInArea.length;
    
    // Get color directly from area_id
    const areaColorKey = getAreaColorVariable(resolvedAreaId);
    const areaColorVar = `hsl(var(--${areaColorKey}))`;
    
    // Get skill description from skills_locales table
    console.log('🎨 [Render] Renderizando skill intro:', {
      skillId: introSkill.skill_id,
      skillName: introSkill.skill_name,
      allDescriptions: skillsDescriptions,
      hasDescriptionForThisSkill: !!skillsDescriptions[introSkill.skill_id],
      descriptionValue: skillsDescriptions[introSkill.skill_id]
    });
    
    const skillDescription = skillsDescriptions[introSkill.skill_id] || "This skill is an important part of your baby's development.";
    
    if (!skillsDescriptions[introSkill.skill_id]) {
      console.warn(`⚠️ [Render] Usando fallback para skill ${introSkill.skill_id} - No se encontró descripción en skillsDescriptions`);
    } else {
      console.log(`✅ [Render] Usando descripción de BD para skill ${introSkill.skill_id}`);
    }
    
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center py-8 px-4">
        <Card className="max-w-2xl w-full p-8 md:p-12 shadow-soft animate-fade-in border-0">
            {/* Area Icon */}
          <div className="flex flex-col items-center mb-4">
            <img 
              src={getAreaIcon(resolvedAreaName)} 
              alt={resolvedAreaName}
              className="w-32 h-32 md:w-36 md:h-36 object-contain drop-shadow-md"
            />
            
            {/* Progress indicator */}
            <p 
              className="text-sm -mt-7 font-medium"
              style={{ color: `hsl(var(--${areaColorKey}) / 0.7)` }}
            >
              Skill {skillNumberInArea} of {totalSkillsInArea} • of this area
            </p>
          </div>

          {/* Skill Name */}
          <h2 
            className="text-2xl md:text-3xl font-bold mb-2 text-center"
            style={{ color: areaColorVar }}
          >
            {introSkill.skill_name}
          </h2>

          {/* Skill Details */}
          <p className="text-sm md:text-base text-muted-foreground mb-6 text-center">
            {introSkill.milestone_count} milestones
          </p>

          {/* Learn More Section */}
          <Collapsible
            open={isLearnMoreOpen}
            onOpenChange={setIsLearnMoreOpen}
            className="mb-6"
          >
            <CollapsibleTrigger className="flex items-center justify-center gap-2 w-full text-sm font-medium transition-colors" style={{ color: areaColorVar }}>
              Learn more about this skill
              <ChevronDown className={`w-4 h-4 transition-transform ${isLearnMoreOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <p className="text-sm text-muted-foreground leading-relaxed text-center px-4">
                {skillDescription}
              </p>
            </CollapsibleContent>
          </Collapsible>

          {/* Start Button */}
          <button 
            onClick={() => {
              // ALWAYS check if this skill has early milestones for Quick Check
              const skillStart = introSkill.start_index;
              const skillEnd = skillStart + introSkill.milestone_count;
              const skillMilestones = milestones.slice(skillStart, skillEnd);
              
              const referenceAge = assessment!.reference_age_months;
              const quickCheckUpperBound = referenceAge - 3;
              
              // Special case: if all milestones are "early" (maxAge <= quickCheckUpperBound),
              // show Quick Check for all EXCEPT highest month, then detailed assessment for highest month
              const maxAgeInSkill = Math.max(...skillMilestones.map(m => m.age));
              const isFullyEarlySkill = maxAgeInSkill <= quickCheckUpperBound;
              const effectiveQuickCheckBound = isFullyEarlySkill ? maxAgeInSkill - 1 : quickCheckUpperBound;
              
              const earlyMilestones = skillMilestones.filter(m => m.age <= effectiveQuickCheckBound);
              
              const needsQC = earlyMilestones.length > 0;
              
              setShowSkillIntro(false);
              setIntroSkill(null);
              setIsLearnMoreOpen(false);
              
              // Show Quick Check if there are early milestones (ALWAYS, even first assessment)
              if (needsQC && earlyMilestones.length > 1) {
                // Initialize all milestones as checked by default
                // User will uncheck what baby is still working on
                const initialChecked: Record<number, boolean> = {};
                earlyMilestones.forEach(m => {
                  initialChecked[m.milestone_id] = true;
                });
                setCheckedMilestones(initialChecked);
                setEarlyIntroSkill(introSkill);
                setShowEarlyIntro(true);
              } else {
                // No early milestones, go directly to questions
                if (currentQuestionIndex !== introSkill.start_index) {
                  setCurrentQuestionIndex(introSkill.start_index);
                }
              }
            }}
            className="w-full h-12 px-8 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-2 text-white"
            style={{ 
              backgroundColor: areaColorVar,
              borderColor: areaColorVar
            }}
          >
            Start Questions
          </button>
        </Card>
      </div>
    );
  }

  // Area Introduction Screen
  if (showAreaIntro && introArea) {
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center py-8 px-4">
        <Card className="max-w-2xl w-full p-8 md:p-12 shadow-card animate-fade-in text-center">
          {/* Area Logo */}
          <div className="flex justify-center mb-6">
            <img 
              src={getAreaIcon(introArea.area_name)} 
              alt={introArea.area_name}
              className="w-32 h-32 md:w-40 md:h-40 object-contain"
            />
          </div>

          {/* Area Name */}
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {introArea.area_name}
          </h2>

          {/* Area Description */}
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto mb-8">
            {getAreaIntroDescription(introArea.area_name)}
          </p>

          {/* Stats */}
          <div className="flex justify-center gap-8 mb-8 text-sm">
            <div>
              <p className="text-2xl font-bold text-primary">{introArea.milestone_count}</p>
              <p className="text-muted-foreground">Questions</p>
            </div>
          </div>

          {/* Start Button */}
          <Button 
            onClick={handleContinueFromIntro}
            size="lg"
            className="w-full sm:w-auto px-12"
          >
            Start Assessment
          </Button>
        </Card>
      </div>
    );
  }

  // Skill Feedback Screen
  if (showSkillFeedback && completedSkill) {
    const { skill, currentRangeScore, totalSkillScore, percentile, referencePercentile, probability, masteredInRange, totalInRange, masteredTotal, totalSkillMilestones } = completedSkill;
    
    // Get area color class
    // Use area_id directly for color
    const areaColorKey = getAreaColorVariable(skill.area_id);
    const areaColorVar = `hsl(var(--${areaColorKey}))`;
    
    // Check if this is the last skill of the area
    const previousIndex = currentQuestionIndex - 1;
    const currentArea = areas.find(area => 
      previousIndex >= area.start_index && 
      previousIndex <= area.end_index
    );
    const isLastSkillOfArea = currentArea && previousIndex === currentArea.end_index;

    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center py-4 px-4">
        <Card className="max-w-2xl w-full p-6 md:p-8 shadow-soft animate-fade-in border-0">
          {/* Header with Icon and Title - closer together */}
          <div className="flex flex-col items-center mb-6">
            <div className="-mb-4">
              <img 
                src={getAreaIcon(skill.area_name)} 
                alt={skill.area_name}
                className="w-28 h-28 md:w-32 md:h-32 object-contain drop-shadow-md"
              />
            </div>
            
            <h2 
              className={"text-2xl md:text-3xl font-bold text-center"}
              style={{ color: areaColorVar }}
            >
              {skill.skill_name}
            </h2>
          </div>
          
          {/* Progress Metrics - Months Ahead/Behind */}
          <div className="space-y-4 mb-6 px-4">
            {(() => {
              const referenceAge = assessment?.reference_age_months || 0;
              
              // Special case for 0-3 months: range is 0 to (age + 3)
              // Normal case: range is (age - 3) to (age + 3)
              const minRange = referenceAge <= 3 ? 0 : referenceAge - 3;
              const maxRange = referenceAge + 3;
              const rangeSpan = maxRange - minRange;
              
              // Use monthsOffset directly from calculateSkillScore (based on milestone ages)
      const monthsOffsetValue = completedSkill?.monthsOffset ?? 0;
      const monthsAhead = Math.round(monthsOffsetValue * 10) / 10;

      // Status text based on ORIGINAL offset (not rounded)
      const isAhead = monthsOffsetValue >= 1;
      const isBehind = monthsOffsetValue <= -1;
              
              let statusText;
              if (isAhead) {
                statusText = 'Eager explorer';
              } else if (isBehind) {
                statusText = 'Taking their time';
              } else {
                statusText = 'Right on rhythm';
              }
              
              console.log('📊 Status Calculation:', {
                monthsOffsetValue,
                monthsAhead,
                isAhead,
                isBehind,
                statusText
              });
              
              // Calculate bar position based on monthsOffset (consistent with text)
              // For all babies: center (50%) = on track, left = behind, right = ahead
              // Clamp monthsOffsetValue to [-3, 3] for bar positioning
              const clampedOffset = Math.max(-3, Math.min(3, monthsOffsetValue));
              const barPosition = ((clampedOffset + 3) / 6) * 100;
              
              // For 0-3 months babies, calculate where the current age sits in the range
              // This marks their actual age on the timeline
              const currentAgePosition = referenceAge <= 3 
                ? (referenceAge / rangeSpan) * 100 
                : 50;
              
              // Create descriptive status text
              const descriptiveStatus = isAhead 
                ? `Your baby is an eager explorer, developing ${Math.abs(monthsAhead)} month${Math.abs(monthsAhead) !== 1 ? 's' : ''} ahead of the average pace for this skill.`
                : isBehind
                ? `Your baby is taking their time, developing ${Math.abs(monthsAhead)} month${Math.abs(monthsAhead) !== 1 ? 's' : ''} at their own pace for this skill.`
                : `Your baby is developing right on rhythm with the average pace for this skill.`;
              
              return (
                <div>
                  <PaceGauge percentile={percentile} color={areaColorVar} />
                </div>
              );
            })()}
          </div>

          
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Card className="p-4 bg-white/90 backdrop-blur-sm border-[3px] rounded-2xl shadow-sm hover:shadow-md transition-all duration-300" style={{ borderColor: areaColorVar }}>
              <div className="flex items-start gap-3">
                <Target className="w-7 h-7 flex-shrink-0 mt-0.5" style={{ color: areaColorVar, strokeWidth: 2.5 }} />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Higher than <span className="font-bold text-base" style={{ color: areaColorVar }}>{percentile}%</span> of babies their age
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 bg-white/90 backdrop-blur-sm border-[3px] rounded-2xl shadow-sm hover:shadow-md transition-all duration-300" style={{ borderColor: areaColorVar }}>
              <div className="flex items-start gap-3">
                <BarChart3 className="w-7 h-7 flex-shrink-0 mt-0.5" style={{ color: areaColorVar, strokeWidth: 2.5 }} />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <span className="font-bold text-base" style={{ color: areaColorVar }}>{baby?.name || 'Baby'}</span> completed <span className="font-bold text-base" style={{ color: areaColorVar }}>{masteredTotal}</span> of {totalSkillMilestones} milestones
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Continue Button */}
          <button 
            onClick={handleContinueFromSkillFeedback}
            className="w-full h-12 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-2 text-white"
            style={{ 
              backgroundColor: areaColorVar,
              borderColor: areaColorVar
            }}
          >
            {isLastSkillOfArea ? 'See Area Results' : 'Continue to Next Skill'}
          </button>

          {/* Last Question Button */}
          <button 
            onClick={handleGoToLastQuestion}
            className="w-full h-12 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 mt-3 bg-transparent"
            style={{ 
              borderColor: areaColorVar,
              color: areaColorVar
            }}
          >
            Last Question
          </button>
        </Card>
      </div>
    );
  }

  // Area Feedback Screen
  if (showAreaFeedback && completedArea) {
    const percentage = calculateAreaPercentage(completedArea);
    
    // Get all skills in this area that were actually assessed
    const areaSkills = skills.filter(skill => {
      const skillArea = areas.find(a => 
        skill.start_index >= a.start_index && 
        skill.start_index <= a.end_index
      );
      return skillArea?.area_name === completedArea.area_name;
    });
    
    // Calculate score for each skill and filter out those with no milestones
    const skillScores = areaSkills
      .map(skill => {
        const skillMilestones = milestones.slice(
          skill.start_index,
          skill.start_index + skill.milestone_count
        );
        const yesCount = skillMilestones.filter(m => responses[m.milestone_id] === "yes").length;
        const noCount = skillMilestones.filter(m => responses[m.milestone_id] === "no").length;
        const totalAnswered = yesCount + noCount;
        
        // Only include skills that have at least one answered milestone
        if (totalAnswered === 0) return null;
        
        const score = Math.round((yesCount / totalAnswered) * 100);
        return { skill, score };
      })
      .filter((item): item is { skill: SkillInfo; score: number } => item !== null);
    
    // Get incomplete skills (gaps)
    const incompleteSkills = skillScores.filter(s => s.score < 100);
    const masteredCount = skillScores.filter(s => s.score === 100).length;
    
    // Get area color using area_id
    const areaColorKey = getAreaColorVariable(completedArea.area_id);
    const areaColorVar = `hsl(var(--${areaColorKey}))`;
    
    // Get area icon/emoji
    const getAreaEmoji = (areaName: string) => {
      const normalized = areaName.toLowerCase();
      if (normalized.includes('cognitive')) return '🧠';
      if (normalized.includes('linguistic')) return '💬';
      if (normalized.includes('physical')) return '⚡';
      if (normalized.includes('emotional') || normalized.includes('social')) return '❤️';
      return '✨';
    };

    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center py-8 px-4">
        <Card className="max-w-3xl w-full p-6 md:p-10 shadow-soft animate-fade-in border-0">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: areaColorVar }}>
              {completedArea.area_name} Area Overview!
            </h2>
            {loadingAreaInterpretation ? (
              <div className="flex items-center justify-center gap-2 text-sm md:text-base text-muted-foreground">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                <span>Analyzing results...</span>
              </div>
            ) : areaInterpretation ? (
              <p className="text-sm md:text-base text-muted-foreground">
                {areaInterpretation}
              </p>
            ) : (
              <p className="text-sm md:text-base text-muted-foreground">
                Great work! Your baby is growing beautifully in {completedArea.area_name} skills.
              </p>
            )}
          </div>

          {/* Unified Skill Progress Summary */}
          <div className="mb-6">
            <h3 className="text-base font-bold mb-4 flex items-center justify-center gap-2" style={{ color: areaColorVar }}>
              Skill Progress
            </h3>
            <div className="space-y-3">
              {skillScores.map(({ skill, score }) => (
                <div key={skill.skill_id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        {score === 100 && (
                          <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'hsl(var(--success))' }} />
                        )}
                         <span className="text-sm font-medium text-foreground leading-tight line-clamp-2">
                           {skill.skill_name}
                         </span>
                      </div>
                      <span className="text-xs font-semibold whitespace-nowrap flex-shrink-0" style={{ color: areaColorVar }}>
                        {score > 90 ? `Mastered (${score}%)` : score >= 11 ? `On Track (${score}%)` : `Reinforce (${score}%)`}
                      </span>
                    </div>
                    <Progress 
                      value={score} 
                      className="h-2"
                      style={{
                        '--progress-color': score === 100 ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground) / 0.6)',
                      } as React.CSSProperties}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Activities */}
          {incompleteSkills.length > 0 && (() => {
            // Normalize area name first to handle variations
            let areaNameForMapping = completedArea.area_name;
            const normalized = areaNameForMapping.toLowerCase();
            
            // Map area name to area ID
            const areaMap: Record<string, number> = {
              'cognitive': 2,
              'lingustic': 3,
              'linguistic': 3,
              'physical': 1,
              'social-emotional': 4,
              'socio-emotional': 4,
              'socioemotional': 4
            };
            
            const areaId = areaMap[normalized] || (() => {
              // Fallback logic based on keywords
              if (normalized.includes('cognitive') || normalized.includes('brain')) return 2;
              if (normalized.includes('linguistic') || normalized.includes('language')) return 3;
              if (normalized.includes('physical') || normalized.includes('motor')) return 1;
              if (normalized.includes('social') || normalized.includes('emotional')) return 4;
              console.warn('[Assessment] Unknown area name:', completedArea.area_name);
              return 1; // Default to Physical if unknown
            })();

            // Calculate baby age in months
            const babyAgeMonths = baby?.birthdate 
              ? (() => {
                  const birthdate = new Date(baby.birthdate);
                  const today = new Date();
                  let months = (today.getFullYear() - birthdate.getFullYear()) * 12 +
                    (today.getMonth() - birthdate.getMonth());
                  
                  // Adjust for prematurity if applicable
                  if (baby.gestational_weeks && baby.gestational_weeks < 37) {
                    const weeksEarly = 40 - baby.gestational_weeks;
                    const monthsAdjustment = Math.floor(weeksEarly / 4);
                    months = Math.max(0, months - monthsAdjustment);
                  }
                  
                  return Math.max(0, months);
                })()
              : 0;

            // Map incomplete skills to the format expected by RecommendedActivityCard
            const mappedSkills = incompleteSkills.map(({ skill, score }) => ({
              skillId: skill.skill_id,
              skillName: skill.skill_name,
              progress: score,
              status: score < 50 ? 'needs-practice' : 'on-track'
            }));

            // Normalize area name for activities database (has typo "Lingustic")
            let normalizedAreaName = completedArea.area_name;
            if (normalizedAreaName === "Socio-emotional" || 
                normalizedAreaName === "Social-Emotional" ||
                normalizedAreaName === "Social-emotional") {
              normalizedAreaName = "Social & Emotional";
            }
            if (normalizedAreaName === "Linguistic") {
              normalizedAreaName = "Lingustic"; // Database has typo
            }

            return (
              <Collapsible
                open={isActivitiesOpen}
                onOpenChange={setIsActivitiesOpen}
                className="mb-6"
              >
                <CollapsibleTrigger className="flex items-center justify-center gap-2 w-full text-sm font-semibold transition-all text-center" style={{ 
                  color: areaColorVar
                }}>
                  <span className="flex-1 text-center">Recommended Activities to Keep Building These Skills</span>
                  <ChevronDown className={`w-5 h-5 flex-shrink-0 transition-transform ${isActivitiesOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <RecommendedActivityCard
                    areaId={areaId}
                    areaName={normalizedAreaName}
                    areaColor={areaColorVar}
                    skills={mappedSkills}
                    babyAgeMonths={babyAgeMonths}
                    locale={assessment?.locale || 'en'}
                    assessmentId={id}
                    babyId={baby?.id}
                    kineduToken={baby?.kinedu_token || undefined}
                  />
                </CollapsibleContent>
              </Collapsible>
            );
          })()}

          {/* CTA Section */}
          <div className="text-center">
            <button 
              onClick={() => {
                handleContinueFromFeedback();
                setIsActivitiesOpen(false);
              }}
              className="w-full h-12 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-2 text-white"
              style={{ 
                backgroundColor: areaColorVar,
                borderColor: areaColorVar
              }}
            >
              {currentQuestionIndex < milestones.length - 1 ? "Continue to Next Area" : "View Full Report"}
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // 100% Completion Screen
  if (showCompletion) {
    const totalAnswered = Object.keys(responses).length;
    const totalQuestions = milestones.length;
    
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center py-8 px-4">
        <Card className="max-w-2xl w-full p-6 md:p-10 shadow-soft animate-scale-in border-0">
          {/* Title with better spacing */}
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold mb-2 leading-tight" style={{ color: 'hsl(var(--primary))' }}>
              Assessment Complete!
            </h1>
            <p className="text-base text-muted-foreground">
              for {baby.name} — {assessment.reference_age_months} months old
            </p>
          </div>

          {/* Progress Stats with visual badges */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-3 bg-success/10 border-2 border-success/30 rounded-2xl px-7 py-4 shadow-sm">
              <div className="w-12 h-12 bg-success rounded-full flex items-center justify-center flex-shrink-0 animate-scale-in shadow-lg">
                <CheckCircle2 className="w-7 h-7 text-white" strokeWidth={2.5} />
              </div>
              <div className="text-left">
                <p className="text-2xl font-bold text-success leading-none mb-1">100%</p>
                <p className="text-xs text-success/80 font-medium">Completed</p>
              </div>
            </div>
          </div>

          {/* AI-Generated Key Insight */}
          <div className="mb-8 px-2">
            {loadingCompletionInsight ? (
              <div className="flex items-center justify-center gap-2 text-muted-foreground py-8">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm">Generating key insight...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/5 border border-primary/20 rounded-2xl px-6 py-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: 'hsl(var(--primary))' }} />
                    <p className="text-base font-medium text-foreground leading-relaxed text-left">
                      {completionInsight}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground text-center px-4">
                  View the full report to see their skill-by-skill results
                </p>
              </div>
            )}
          </div>

          {/* CTA Buttons with better hierarchy */}
          <div className="space-y-3 max-w-md mx-auto">
            <Button 
              onClick={handleComplete}
              size="lg"
              variant="hero"
              className="w-full text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] h-12"
            >
              View Full Report
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Guard: If no current milestone (past the end of array), show loading while navigating
  if (!currentMilestone) {
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-warm py-4 sm:py-6 px-3 sm:px-4">
      <div className="container max-w-3xl mx-auto">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <img src={logoKinedu} alt="Kinedu" className="h-8" />
        </div>

        {/* Global Progress Bar */}
        <div className="mb-6 sm:mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-muted-foreground">Your report</span>
            <span className="text-xs font-bold text-primary">{Math.round(progress)}% complete</span>
          </div>
          <Progress
            value={progress} 
            className="h-2.5 bg-muted/50"
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">
              {baby.name || "Your baby"} • {assessment.reference_age_months} months
            </p>
            <p 
              className="text-xs font-medium"
              style={{ color: `hsl(var(--${getAreaColorVariable(currentMilestone.area_id)}))` }}
            >
              Skill {skills.findIndex(s => s.skill_id === currentSkillInfo?.skill_id) + 1} of {skills.length}
            </p>
          </div>
        </div>

        {/* Question Card */}
        <Card 
          className="p-5 sm:p-6 md:p-8 mb-6 shadow-card animate-fade-in transition-transform duration-200"
          style={{ transform: `translateX(${swipeOffset * 0.3}px)` }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Skill Name with Area Icon */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <img 
              src={getAreaIcon(currentMilestone.area_name, true)} 
              alt={currentMilestone.area_name}
              className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
            />
            <p 
              className="text-base sm:text-lg md:text-xl font-bold"
              style={{ color: `hsl(var(--${getAreaColorVariable(currentMilestone.area_id)}))` }}
            >
              {currentSkillInfo?.skill_name || currentMilestone.skill_name}
            </p>
          </div>


          {/* Question */}
          <div className="mb-7 sm:mb-10 text-center px-1">
            <h2 className="text-base sm:text-lg md:text-xl font-bold mb-3 sm:mb-3 text-center max-w-2xl mx-auto text-foreground">
              {currentMilestone.description}
            </h2>
          </div>

          {/* Answer Buttons - NO/YES */}
          <div className="flex justify-center gap-8 sm:gap-4 mb-6 sm:max-w-lg sm:mx-auto">
            {/* Mobile: Circular buttons with icons only */}
            <Button
              onClick={() => handleResponse(currentMilestone.milestone_id, "no")}
              disabled={saving}
              className={`sm:hidden w-[88px] h-[88px] rounded-full p-0 transition-all active:scale-95
                ${currentAnswer === "no"
                  ? "bg-destructive-pastel hover:bg-destructive-pastel/90 text-destructive-pastel-foreground ring-4 ring-destructive-pastel/30 ring-offset-2 shadow-lg scale-105"
                  : "bg-destructive-pastel hover:bg-destructive-pastel/90 text-destructive-pastel-foreground shadow-md"
                }`}
            >
              <X className="w-[52px] h-[52px]" strokeWidth={2.5} />
            </Button>
            
            <Button
              onClick={() => handleResponse(currentMilestone.milestone_id, "yes")}
              disabled={saving}
              className={`sm:hidden w-[88px] h-[88px] rounded-full p-0 transition-all active:scale-95
                ${currentAnswer === "yes"
                  ? "bg-success-pastel hover:bg-success-pastel/90 text-success-pastel-foreground ring-4 ring-success-pastel/30 ring-offset-2 shadow-lg scale-105"
                  : "bg-success-pastel hover:bg-success-pastel/90 text-success-pastel-foreground shadow-md"
                }`}
            >
              <Check className="w-[48px] h-[48px]" strokeWidth={2.5} />
            </Button>

            {/* Desktop: Wide buttons with text */}
            <Button
              onClick={() => handleResponse(currentMilestone.milestone_id, "no")}
              disabled={saving}
              className={`hidden sm:flex h-16 flex-1 text-lg font-semibold transition-all rounded-full
                ${currentAnswer === "no"
                  ? "bg-destructive-pastel hover:bg-destructive-pastel/90 text-destructive-pastel-foreground ring-4 ring-destructive-pastel/30 ring-offset-2 shadow-lg"
                  : "bg-destructive-pastel hover:bg-destructive-pastel/90 text-destructive-pastel-foreground shadow-md"
                }`}
            >
              <X className="w-5 h-5 mr-2" />
              NO
            </Button>
            
            <Button
              onClick={() => handleResponse(currentMilestone.milestone_id, "yes")}
              disabled={saving}
              className={`hidden sm:flex h-16 flex-1 text-lg font-semibold transition-all rounded-full
                ${currentAnswer === "yes"
                  ? "bg-success-pastel hover:bg-success-pastel/90 text-success-pastel-foreground ring-4 ring-success-pastel/30 ring-offset-2 shadow-lg"
                  : "bg-success-pastel hover:bg-success-pastel/90 text-success-pastel-foreground shadow-md"
                }`}
            >
              <Check className="w-5 h-5 mr-2" />
              YES
            </Button>
          </div>

          {/* Helper Text */}
          <Collapsible open={showHelper} onOpenChange={(open) => {
            setShowHelper(open);
            if (open) analytics.trackHelperOpen(currentMilestone.milestone_id);
          }}>
            <CollapsibleTrigger asChild>
              <button 
                className="w-full text-[13px] sm:text-sm font-medium text-center transition-all py-4 px-3 flex items-center justify-center gap-2 rounded-lg"
                style={{ 
                  color: `hsl(var(--${getAreaColorVariable(currentMilestone.area_id)}) / 0.7)`,
                  backgroundColor: `hsl(var(--${getAreaColorVariable(currentMilestone.area_id)}) / 0.05)`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = `hsl(var(--${getAreaColorVariable(currentMilestone.area_id)}))`;
                  e.currentTarget.style.backgroundColor = `hsl(var(--${getAreaColorVariable(currentMilestone.area_id)}) / 0.1)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = `hsl(var(--${getAreaColorVariable(currentMilestone.area_id)}) / 0.7)`;
                  e.currentTarget.style.backgroundColor = `hsl(var(--${getAreaColorVariable(currentMilestone.area_id)}) / 0.05)`;
                }}
              >
                <Info className="w-4 h-4 flex-shrink-0" />
                <span className="leading-tight">Help identifying this milestone?</span>
                <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${showHelper ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent 
              className="mt-3 p-4 border rounded-lg"
              style={{ 
                backgroundColor: `hsl(var(--${getAreaColorVariable(currentMilestone.area_id)}) / 0.05)`,
                borderColor: `hsl(var(--${getAreaColorVariable(currentMilestone.area_id)}) / 0.2)`,
              }}
            >
              {currentMilestone.science_fact && (
                <p className="text-[13px] sm:text-sm text-foreground leading-relaxed">
                  {decodeHtmlText(currentMilestone.science_fact)}
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Navigation */}
        <div className="flex flex-col items-center justify-center gap-4">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="h-12 px-6 text-base active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous Question
          </Button>
          
          {/* Dev-only button - Only visible in development */}
          {import.meta.env.DEV && (
            <Button
              variant="ghost"
              onClick={handleSkipAssessment}
              disabled={saving}
              className="h-10 px-4 text-sm text-muted-foreground hover:text-foreground border border-dashed border-muted-foreground/30 active:scale-95 transition-transform"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Skip Assessment (Dev)
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Assessment;
