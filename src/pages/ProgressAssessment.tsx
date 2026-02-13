import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Baby, Save, ChevronDown, Check, X, Info, Target, BarChart3, CheckCircle2, Home, Sparkles, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { externalSupabase } from "@/integrations/supabase/external-client";
import { cn } from "@/lib/utils";
import { CircularProgress } from "@/components/CircularProgress";
import { PaceGauge } from "@/components/PaceGauge";
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

interface MilestoneGroup {
  type: 'early' | 'detailed' | 'future';
  milestones: Milestone[];
  ageRange: { min: number; max: number };
  allAnswered: boolean;
  hasNo: boolean;
  hasUnanswered: boolean;
}

interface SkillInfo {
  skill_id: number;
  skill_name: string;
  area_name: string;
  area_id: number;
  milestone_count: number;
  start_index: number;
  is_new: boolean; // true if skill is NEW, false if it's INCOMPLETE
  completed_count?: number; // only for incomplete skills
  total_count?: number; // only for incomplete skills
  groups?: {
    early: MilestoneGroup | null;
    detailed: MilestoneGroup;
    future: MilestoneGroup | null;
  };
  needsEarlyIntro?: boolean;
}

const ProgressAssessment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<any>(null);
  const [baby, setBaby] = useState<any>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<{ [key: number]: string }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showHelper, setShowHelper] = useState(false);
  const [swipeStart, setSwipeStart] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [showSkillIntro, setShowSkillIntro] = useState(false);
  const [introSkill, setIntroSkill] = useState<SkillInfo | null>(null);
  const [showSkillFeedback, setShowSkillFeedback] = useState(false);
  const [isLearnMoreOpen, setIsLearnMoreOpen] = useState(false);
  const [completedSkill, setCompletedSkill] = useState<{
    skill: SkillInfo;
    currentRangeScore: number;
    totalSkillScore: number;
    percentile: number | null;
    referencePercentile: number | null;
    probability: number | null;
    isFullyCompleted?: boolean;
    monthsOffset: number | null;
  } | null>(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const [previousResponses, setPreviousResponses] = useState<{ [key: number]: string }>({});
  const [earlySkipDecisions, setEarlySkipDecisions] = useState<{ [skillId: number]: boolean }>({});
  const [showEarlyIntro, setShowEarlyIntro] = useState(false);
  const [earlyIntroSkill, setEarlyIntroSkill] = useState<SkillInfo | null>(null);
  
  // Milestone grouping parameters
  const K = 3; // months before current age to show in detail
  const F = 3; // months after current age

  // Helper function to group milestones by age
  const groupMilestonesByAge = (
    skillMilestones: Milestone[],
    currentAge: number,
    responsesMap: { [key: number]: string }
  ): {
    early: MilestoneGroup | null;
    detailed: MilestoneGroup;
    future: MilestoneGroup | null;
  } => {
    const effectiveK = Math.min(K, currentAge); // Prevent negative ages
    const earlyThreshold = Math.max(0, currentAge - effectiveK);
    
    const earlyMilestones = skillMilestones.filter(m => m.age < earlyThreshold);
    const detailedMilestones = skillMilestones.filter(m => m.age >= earlyThreshold && m.age <= currentAge);
    const futureMilestones = skillMilestones.filter(m => m.age > currentAge && m.age <= currentAge + F);
    
    const createGroup = (milestones: Milestone[], type: 'early' | 'detailed' | 'future'): MilestoneGroup | null => {
      if (milestones.length === 0) return null;
      
      const ages = milestones.map(m => m.age);
      const ageRange = { min: Math.min(...ages), max: Math.max(...ages) };
      
      const allAnswered = milestones.every(m => responsesMap[m.milestone_id] !== undefined);
      const hasNo = milestones.some(m => responsesMap[m.milestone_id] === 'no');
      const hasUnanswered = milestones.some(m => responsesMap[m.milestone_id] === undefined);
      
      return {
        type,
        milestones,
        ageRange,
        allAnswered,
        hasNo,
        hasUnanswered
      };
    };
    
    return {
      early: createGroup(earlyMilestones, 'early'),
      detailed: createGroup(detailedMilestones, 'detailed'),
      future: createGroup(futureMilestones, 'future')
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch current assessment
        const { data: assessmentData, error: assessmentError } = await supabase
          .from("assessments")
          .select("*, babies(*)")
          .eq("id", id)
          .single();

        if (assessmentError || !assessmentData) {
          toast.error("Assessment not found");
          navigate("/dashboard");
          return;
        }

        setAssessment(assessmentData);
        setBaby(assessmentData.babies);

        const currentReferenceAge = assessmentData.reference_age_months;
        // All areas use current age to +1 month range only
        const minAge = currentReferenceAge;
        const maxAge = currentReferenceAge + 1;

        // Get the last COMPLETED assessment for this baby (excluding current one)
        const { data: lastAssessment, error: lastAssessmentError } = await supabase
          .from("assessments")
          .select("*, assessment_responses(*)")
          .eq("baby_id", assessmentData.baby_id)
          .not("id", "eq", id)
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: false })
          .limit(1)
          .single();

        if (lastAssessmentError && lastAssessmentError.code !== 'PGRST116') {
          console.error("Error fetching last assessment:", lastAssessmentError);
        }

        // Get responses from the CURRENT assessment (to filter out milestones already answered)
        const { data: currentResponses } = await supabase
          .from("assessment_responses")
          .select("milestone_id, answer")
          .eq("assessment_id", id);
        
        const answeredMilestoneIds = new Set<number>();
        currentResponses?.forEach((r: any) => {
          answeredMilestoneIds.add(r.milestone_id);
        });

        let newSkillIds: number[] = [];
        let incompleteSkillData: Map<number, { completed: number; total: number; milestoneIds: number[] }> = new Map();
        const previousResponsesMap: { [key: number]: string } = {};
        let hasPreviousAssessment = false;

        if (lastAssessment) {
          hasPreviousAssessment = true;
          // Get all milestones from last assessment
          const lastAssessmentMilestoneIds = lastAssessment.assessment_responses.map((r: any) => r.milestone_id);
          
          // Get those milestones' details
          const { data: lastAssessmentMilestones } = await externalSupabase
            .from("milestones")
            .select("*")
            .in("milestone_id", lastAssessmentMilestoneIds)
            .eq("locale", "en");

          const lastSkillIds = new Set(lastAssessmentMilestones?.map(m => m.skill_id) || []);

          // Store previous responses for later use
          lastAssessment.assessment_responses.forEach((r: any) => {
            previousResponsesMap[r.milestone_id] = r.answer;
          });
          setPreviousResponses(previousResponsesMap);

          // Find NEW skills (in current age range but NOT in last assessment)
          const { data: skillsInRange } = await externalSupabase
            .from("milestones")
            .select("skill_id")
            .eq("locale", "en")
            .gte("age", minAge)
            .lte("age", maxAge);

          const currentRangeSkillIds = new Set(skillsInRange?.map(s => s.skill_id) || []);
          newSkillIds = Array.from(currentRangeSkillIds).filter(id => !lastSkillIds.has(id));

          // Find INCOMPLETE skills from last assessment
          const skillGroups = new Map<number, { milestones: any[]; responses: any[] }>();
          
          lastAssessmentMilestones?.forEach((milestone: any) => {
            if (!skillGroups.has(milestone.skill_id)) {
              skillGroups.set(milestone.skill_id, { milestones: [], responses: [] });
            }
            skillGroups.get(milestone.skill_id)!.milestones.push(milestone);
          });

          lastAssessment.assessment_responses.forEach((response: any) => {
            const milestone = lastAssessmentMilestones?.find((m: any) => m.milestone_id === response.milestone_id);
            if (milestone) {
              skillGroups.get(milestone.skill_id)!.responses.push(response);
            }
          });

          // Check milestone_updates for more recent statuses
          const allMilestoneIds = lastAssessmentMilestones?.map((m: any) => m.milestone_id) || [];
          const { data: updates } = await supabase
            .from("milestone_updates")
            .select("*")
            .eq("baby_id", assessmentData.baby_id)
            .in("milestone_id", allMilestoneIds);

          const updatesByMilestone = new Map<number, any>();
          updates?.forEach((u) => {
            const existing = updatesByMilestone.get(u.milestone_id);
            if (!existing || new Date(u.created_at) > new Date(existing.created_at)) {
              updatesByMilestone.set(u.milestone_id, u);
            }
          });

          // Identify incomplete skills
          skillGroups.forEach((group, skillId) => {
            const totalMilestones = group.milestones.length;
            let completedCount = 0;
            const incompleteMilestoneIds: number[] = [];

            group.milestones.forEach((milestone: any) => {
              const update = updatesByMilestone.get(milestone.milestone_id);
              const response = group.responses.find((r: any) => r.milestone_id === milestone.milestone_id);
              
              const isCompleted = update ? update.status === "yes" : (response && response.answer === "yes");
              
              if (isCompleted) {
                completedCount++;
              } else {
                incompleteMilestoneIds.push(milestone.milestone_id);
              }
            });

            if (completedCount < totalMilestones) {
              incompleteSkillData.set(skillId, {
                completed: completedCount,
                total: totalMilestones,
                milestoneIds: incompleteMilestoneIds
              });
            }
          });
        } else {
          // No previous assessment, all skills in range are NEW
          const { data: skillsInRange } = await externalSupabase
            .from("milestones")
            .select("skill_id")
            .eq("locale", "en")
            .gte("age", minAge)
            .lte("age", maxAge);

          newSkillIds = [...new Set(skillsInRange?.map(s => s.skill_id) || [])];
        }

        // Fetch milestones for NEW skills (all milestones)
        let newMilestones: Milestone[] = [];
        if (newSkillIds.length > 0) {
          const { data } = await externalSupabase
            .from("milestones")
            .select("*")
            .eq("locale", "en")
            .in("skill_id", newSkillIds)
            .order("age", { ascending: true });

          newMilestones = data || [];
        }

        // Fetch milestones for INCOMPLETE skills (ALL milestones for those skills)
        let incompleteMilestones: Milestone[] = [];
        const incompleteSkillIds = Array.from(incompleteSkillData.keys());
        
        if (incompleteSkillIds.length > 0) {
          // Fetch ALL milestones for incomplete skills, not just the incomplete ones
          // This ensures that quick check milestones are included
          const { data } = await externalSupabase
            .from("milestones")
            .select("*")
            .eq("locale", "en")
            .in("skill_id", incompleteSkillIds)
            .order("age", { ascending: true });

          incompleteMilestones = data || [];
        }

        // Combine milestones and filter out:
        // 1. Milestones already answered in current assessment
        // 2. Milestones answered "yes" in previous assessment (no need to reassess mastered milestones)
        const allMilestonesRaw = [...newMilestones, ...incompleteMilestones]
          .filter(m => {
            // Filter out if answered in current assessment
            if (answeredMilestoneIds.has(m.milestone_id)) return false;
            
            // Filter out if answered "yes" in previous assessment (already mastered)
            if (previousResponsesMap[m.milestone_id] === 'yes') return false;
            
            return true;
          });
        
        // Define desired area order: Cognitive (2) → Linguistic (3) → Physical (1) → Socio-Emotional (4)
        const areaOrder: { [key: number]: number } = {
          2: 0, // Cognitive first
          3: 1, // Linguistic second
          1: 2, // Physical third
          4: 3, // Socio-Emotional fourth
        };
        
        // Group milestones by skill to calculate ordering metrics
        interface SkillOrderInfo {
          skill_id: number;
          skill_name: string;
          area_id: number;
          area_order: number;
          min_age_in_window: number;
          max_age_in_window: number;
          pending_count: number;
          total_count: number;
          milestones: Milestone[];
        }
        
        const skillGroups = new Map<number, SkillOrderInfo>();
        
        allMilestonesRaw.forEach((milestone) => {
          if (!skillGroups.has(milestone.skill_id)) {
            skillGroups.set(milestone.skill_id, {
              skill_id: milestone.skill_id,
              skill_name: milestone.skill_name,
              area_id: milestone.area_id,
              area_order: areaOrder[milestone.area_id] ?? 999,
              min_age_in_window: Infinity,
              max_age_in_window: -Infinity,
              pending_count: 0,
              total_count: 0,
              milestones: [],
            });
          }
          
          const group = skillGroups.get(milestone.skill_id)!;
          group.milestones.push(milestone);
          group.total_count++;
          
          // Calculate min/max age for milestones within the age window
          if (milestone.age >= minAge && milestone.age <= maxAge) {
            group.min_age_in_window = Math.min(group.min_age_in_window, milestone.age);
            group.max_age_in_window = Math.max(group.max_age_in_window, milestone.age);
          }
          
          // All milestones in allMilestonesRaw are pending (new or incomplete)
          group.pending_count++;
        });
        
        // Sort skills by: area → min_age_in_window → max_age_in_window → pending_percentage (desc) → skill_name
        const sortedSkills = Array.from(skillGroups.values()).sort((a, b) => {
          // 1. Area order
          if (a.area_order !== b.area_order) return a.area_order - b.area_order;
          
          // 2. Min age in window (ascending - younger first)
          if (a.min_age_in_window !== b.min_age_in_window) {
            return a.min_age_in_window - b.min_age_in_window;
          }
          
          // 3. Max age in window (ascending - younger first)
          if (a.max_age_in_window !== b.max_age_in_window) {
            return a.max_age_in_window - b.max_age_in_window;
          }
          
          // 4. Pending percentage (descending - more pending first)
          const pendingPercentA = a.pending_count / a.total_count;
          const pendingPercentB = b.pending_count / b.total_count;
          if (pendingPercentA !== pendingPercentB) {
            return pendingPercentB - pendingPercentA;
          }
          
          // 5. Skill name (alphabetical)
          return a.skill_name.localeCompare(b.skill_name);
        });
        
        // Reconstruct allMilestones in the new skill order, sorting milestones within each skill by age
        const allMilestones: Milestone[] = [];
        sortedSkills.forEach((skillInfo) => {
          const sortedMilestones = skillInfo.milestones.sort((a, b) => {
            if (a.age !== b.age) return a.age - b.age;
            return a.milestone_id - b.milestone_id;
          });
          allMilestones.push(...sortedMilestones);
        });

        if (allMilestones.length === 0) {
          toast.info("No new milestones to assess!");
          setMilestones([]);
          setLoading(false);
          return;
        }

        setMilestones(allMilestones);

        // Calculate skill information with grouping
        const skillsInfo: SkillInfo[] = [];
        let currentSkillId = -1;
        
        // Get all milestones for all skills (including already answered ones) for proper grouping
        const allSkillIds = [...new Set(allMilestones.map(m => m.skill_id))];
        const { data: allSkillMilestones } = await externalSupabase
          .from("milestones")
          .select("*")
          .eq("locale", "en")
          .in("skill_id", allSkillIds)
          .order("age", { ascending: true });
        
        allMilestones.forEach((milestone, index) => {
          if (milestone.skill_id !== currentSkillId) {
            if (currentSkillId !== -1) {
              const prevSkill = skillsInfo[skillsInfo.length - 1];
              if (prevSkill) {
                prevSkill.milestone_count = index - prevSkill.start_index;
              }
            }
            
            const isNew = newSkillIds.includes(milestone.skill_id);
            const incompleteData = incompleteSkillData.get(milestone.skill_id);
            
            // Get ALL milestones for this skill (not just pending ones) to create proper groups
            const skillMilestones = (allSkillMilestones || []).filter(m => m.skill_id === milestone.skill_id);
            const groups = groupMilestonesByAge(skillMilestones, currentReferenceAge, previousResponsesMap);
            
            // Determine if we need to show early intro
            // Show Quick check whenever there's an early group with milestones and no "No" answers
            const needsEarlyIntro = groups.early !== null && 
                                   groups.early.milestones.length > 0 &&
                                   !groups.early.hasNo;
            
            skillsInfo.push({
              skill_id: milestone.skill_id,
              skill_name: milestone.skill_name,
              area_name: milestone.area_name,
              area_id: milestone.area_id,
              milestone_count: 0,
              start_index: index,
              is_new: isNew,
              completed_count: incompleteData?.completed,
              total_count: incompleteData?.total,
              groups,
              needsEarlyIntro
            });
            
            currentSkillId = milestone.skill_id;
          }
        });
        
        if (skillsInfo.length > 0) {
          const lastSkill = skillsInfo[skillsInfo.length - 1];
          lastSkill.milestone_count = allMilestones.length - lastSkill.start_index;
        }
        
        setSkills(skillsInfo);

        // Show first skill intro or early intro
        if (skillsInfo.length > 0) {
          const firstSkill = skillsInfo[0];
          
          // Check if we need to show early milestone intro first
          if (firstSkill.needsEarlyIntro) {
            setEarlyIntroSkill(firstSkill);
            setShowEarlyIntro(true);
          } else {
            setIntroSkill(firstSkill);
            setShowSkillIntro(true);
          }
        }

        // Fetch existing responses for current assessment (reuse answeredMilestoneIds for filtering)
        const { data: responsesData } = await supabase
          .from("assessment_responses")
          .select("milestone_id, answer")
          .eq("assessment_id", id);

        if (responsesData) {
          const responsesMap: { [key: number]: string } = {};
          responsesData.forEach((r) => {
            responsesMap[r.milestone_id] = r.answer;
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

  const calculateSkillScore = async (skill: SkillInfo, currentResponses: { [key: number]: string }): Promise<{ 
    currentRangeScore: number; 
    totalSkillScore: number; 
    percentile: number | null; 
    referencePercentile: number | null;
    probability: number | null;
    isFullyCompleted: boolean;
    monthsOffset: number | null;
  }> => {
    const referenceAge = assessment.reference_age_months;
    // All areas use current age to +1 month range only
    const minAge = referenceAge;
    const maxAge = referenceAge + 1;
    
    // Get ALL milestones for this skill (not just the ones in progress assessment)
    const { data: allSkillMilestones } = await externalSupabase
      .from("milestones")
      .select("*")
      .eq("skill_id", skill.skill_id)
      .eq("locale", "en");

    const skillMilestones = allSkillMilestones || [];
    const milestonesInRange = skillMilestones.filter(m => m.age >= minAge && m.age <= maxAge);
    
    let masteredInRange = 0;
    let totalInRange = 0;
    
    milestonesInRange.forEach(milestone => {
      const response = currentResponses[milestone.milestone_id] || previousResponses[milestone.milestone_id];
      if (response) {
        totalInRange++;
        if (response === "yes") masteredInRange++;
      }
    });
    
    const currentRangeScore = totalInRange > 0 ? Math.round((masteredInRange / totalInRange) * 100) : 0;
    
    // Check if ALL milestones in the entire skill now have "yes"
    let masteredTotal = 0;
    let totalAnswered = 0;
    let allMilestonesCompleted = true;
    
    skillMilestones.forEach(milestone => {
      const response = currentResponses[milestone.milestone_id] || previousResponses[milestone.milestone_id];
      if (response) {
        totalAnswered++;
        if (response === "yes") {
          masteredTotal++;
        } else {
          allMilestonesCompleted = false;
        }
      } else {
        allMilestonesCompleted = false;
      }
    });
    
    const totalSkillScore = totalAnswered > 0 ? Math.round((masteredTotal / totalAnswered) * 100) : 0;
    const isFullyCompleted = allMilestonesCompleted && skillMilestones.length > 0;
    
    let percentile: number | null = null;
    let referencePercentile: number | null = null;
    let probability: number | null = null;
    
    try {
      const ageForLookup = Math.floor(referenceAge);
      const rangeCompletionRatio = currentRangeScore / 100;
      
      let bucket: number;
      if (rangeCompletionRatio === 0) {
        bucket = 0.01;
      } else if (rangeCompletionRatio <= 0.375) {
        bucket = 0.25;
      } else if (rangeCompletionRatio <= 0.625) {
        bucket = 0.5;
      } else if (rangeCompletionRatio <= 0.875) {
        bucket = 0.75;
      } else {
        bucket = 0.99;
      }
      
      let { data: probabilities } = await externalSupabase
        .from('skill_probability_curves')
        .select('probability, mark_key, age_months')
        .eq('skill_id', skill.skill_id)
        .eq('age_months', ageForLookup)
        .eq('locale', 'en')
        .eq('mark_key', bucket.toFixed(2));

      if (!probabilities || probabilities.length === 0) {
        const { data: availableAges } = await externalSupabase
          .from('skill_probability_curves')
          .select('age_months')
          .eq('skill_id', skill.skill_id)
          .eq('locale', 'en')
          .order('age_months', { ascending: true });
        
        const agesArray = availableAges?.map((a: any) => a.age_months) || [];
        const uniqueAges = [...new Set(agesArray)];
        
        if (uniqueAges.length > 0 && !uniqueAges.includes(ageForLookup)) {
          const closestAge = uniqueAges.reduce((closest, age) => {
            const currentDiff = Math.abs(age - ageForLookup);
            const closestDiff = Math.abs(closest - ageForLookup);
            if (currentDiff === closestDiff) {
              return age > closest ? age : closest;
            }
            return currentDiff < closestDiff ? age : closest;
          }, uniqueAges[0]);
          
          const { data: fallbackData } = await externalSupabase
            .from('skill_probability_curves')
            .select('probability, mark_key, age_months')
            .eq('skill_id', skill.skill_id)
            .eq('age_months', closestAge)
            .eq('locale', 'en')
            .eq('mark_key', bucket.toFixed(2));
          
          probabilities = fallbackData;
        }
      }

      if (probabilities && probabilities.length > 0) {
        const matchingProb = probabilities[0];
        const probabilityValue = Number(matchingProb.probability);
        
        // Store percentile (0-1, higher is better)
        probability = probabilityValue;
        referencePercentile = Math.round(probabilityValue * 100);
        // For UI: percentile (0-100, higher is better)
        percentile = Math.round(probabilityValue * 100);
      }
    } catch (error) {
      console.error(`Error fetching probabilities for skill ${skill.skill_id}:`, error);
    }
    
    if (percentile === null) {
      percentile = totalSkillScore;
    }
    
    if (referencePercentile === null) {
      referencePercentile = Math.max(50, Math.round(totalSkillScore * 0.85));
    }
    
    // Calculate monthsOffset using Age-Equivalent method
    let monthsOffset: number | null = null;
    if (probability !== null) {
      try {
        const { data: medianCurve, error: medianError } = await externalSupabase
          .from('skill_percentile_curves')
          .select('age_months, probability')
          .eq('skill_id', skill.skill_id)
          .eq('percentile', 0.5)
          .eq('locale', 'en')
          .order('age_months', { ascending: true });

        if (!medianError && medianCurve && medianCurve.length > 0) {
          const medianRows = medianCurve.map(row => ({
            age_months: Number(row.age_months),
            probability: Number(row.probability)
          }));
          
          const completionDecimal = totalSkillScore / 100;
          const equivalentAge = invertMedianCurveForAge(medianRows, completionDecimal);
          const rawMonthsDiff = equivalentAge - referenceAge;
          monthsOffset = Math.max(-6, Math.min(6, rawMonthsDiff));
          
          console.log('📊 Age-Equivalent Calculation (Progress):', {
            babyAge: referenceAge,
            babyProgress: completionDecimal,
            babyPercentile: probability,
            equivalentMedianAge: equivalentAge,
            rawMonthsDiff,
            clampedMonths: monthsOffset
          });
        } else {
          console.warn('⚠️ Median curve not available, using fallback formula');
          monthsOffset = 6 * (probability - 0.5);
          monthsOffset = Math.max(-6, Math.min(6, monthsOffset));
        }
      } catch (error) {
        console.error('Error calculating age-equivalent months:', error);
        monthsOffset = 6 * (probability - 0.5);
        monthsOffset = Math.max(-6, Math.min(6, monthsOffset));
      }
    }
    
    return { currentRangeScore, totalSkillScore, percentile, referencePercentile, probability, isFullyCompleted, monthsOffset };
  };

  const handleResponse = async (milestoneId: number, answer: string) => {
    setSaving(true);

    try {
      // Save to assessment_responses
      const { error } = await supabase
        .from("assessment_responses")
        .upsert(
          {
            assessment_id: id,
            milestone_id: milestoneId,
            answer,
            source: 'manual'
          },
          {
            onConflict: 'assessment_id,milestone_id'
          }
        );

      if (error) throw error;

      // Update milestone_updates
      const currentMilestone = milestones[currentQuestionIndex];
      const { error: updateError } = await supabase
        .from("milestone_updates")
        .insert({
          baby_id: baby.id,
          milestone_id: milestoneId,
          skill_id: currentMilestone.skill_id,
          area_id: currentMilestone.area_id,
          status: answer,
        });

      if (updateError) console.error("Error updating milestone_updates:", updateError);

      const updatedResponses = { ...responses, [milestoneId]: answer };
      setResponses(updatedResponses);
      
      const currentSkill = skills.find(skill => 
        currentQuestionIndex >= skill.start_index && 
        currentQuestionIndex < skill.start_index + skill.milestone_count
      );
      
      const isLastQuestionOfSkill = currentSkill && 
        currentQuestionIndex === currentSkill.start_index + currentSkill.milestone_count - 1;
      
      setTimeout(async () => {
        if (isLastQuestionOfSkill && currentSkill) {
          const skillScore = await calculateSkillScore(currentSkill, updatedResponses);
          setCompletedSkill({ 
            skill: currentSkill, 
            currentRangeScore: skillScore.currentRangeScore,
            totalSkillScore: skillScore.totalSkillScore,
            percentile: skillScore.percentile,
            referencePercentile: skillScore.referencePercentile,
            probability: skillScore.probability,
            isFullyCompleted: skillScore.isFullyCompleted,
            monthsOffset: skillScore.monthsOffset
          });
          
          setCurrentQuestionIndex(Math.min(currentQuestionIndex + 1, milestones.length));
          setShowSkillFeedback(true);
        } else if (currentQuestionIndex < milestones.length - 1) {
          const nextIndex = currentQuestionIndex + 1;
          const nextSkill = skills.find(skill => nextIndex === skill.start_index);
          
          if (nextSkill) {
            // Check if we need to show early intro first
            if (nextSkill.needsEarlyIntro && earlySkipDecisions[nextSkill.skill_id] === undefined) {
              setEarlyIntroSkill(nextSkill);
              setShowEarlyIntro(true);
            } else {
              setIntroSkill(nextSkill);
              setShowSkillIntro(true);
            }
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
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleGoToLastQuestion = () => {
    if (!completedSkill) return;
    
    const { skill } = completedSkill;
    
    // Hide the feedback screen
    setShowSkillFeedback(false);
    setCompletedSkill(null);
    
    // Go to the last answered question of the skill
    const lastAnsweredIndex = skill.start_index + skill.milestone_count - 1;
    setCurrentQuestionIndex(lastAnsweredIndex);
  };

  const calculateProgress = () => {
    if (milestones.length === 0) return 0;
    return ((currentQuestionIndex + 1) / milestones.length) * 100;
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

      toast.success("Progress assessment completed!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error completing assessment:", error);
      toast.error("Failed to complete assessment");
    }
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
    const currentMilestone = milestones[currentQuestionIndex];
    if (swipeOffset > threshold) {
      handleResponse(currentMilestone.milestone_id, "yes");
    } else if (swipeOffset < -threshold) {
      handleResponse(currentMilestone.milestone_id, "no");
    }
    
    setSwipeStart(null);
    setSwipeOffset(0);
  };

  const handleContinueFromSkillFeedback = () => {
    setShowSkillFeedback(false);
    setCompletedSkill(null);
    
    if (currentQuestionIndex >= milestones.length) {
      setShowCompletion(true);
      return;
    }
    
    const nextSkill = skills.find(skill => currentQuestionIndex === skill.start_index);
    
    if (nextSkill) {
      // Check if we need to show early intro first
      if (nextSkill.needsEarlyIntro && earlySkipDecisions[nextSkill.skill_id] === undefined) {
        setEarlyIntroSkill(nextSkill);
        setShowEarlyIntro(true);
      } else {
        setIntroSkill(nextSkill);
        setShowSkillIntro(true);
      }
    }
  };

  const getAreaColorVariable = (areaName: string): string => {
    const key = areaName.toLowerCase().trim();
    
    switch(key) {
      case "physical":
        return "physical";
      case "cognitive":
        return "cognitive";
      case "linguistic":
      case "lingustic":
        return "linguistic";
      case "social-emotional":
      case "socio-emotional":
      case "social emotional":
      case "socio emotional":
        return "emotional";
      default:
        return "primary";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center">
        <Card className="p-6">
          <p className="text-muted-foreground">Loading progress assessment...</p>
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
            <Link to="/dashboard">Back to dashboard</Link>
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
            <Link to="/dashboard">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
          </Button>

          <Card className="p-6 md:p-8 shadow-card text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-2xl font-bold mb-2">All Caught Up!</h2>
            <p className="text-muted-foreground mb-6">
              No new milestones to assess at this time. Great job keeping up with {baby.name}'s development!
            </p>
            <Button variant="default" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const progress = calculateProgress();
  const answeredCount = Object.keys(responses).length;
  const totalCount = milestones.length;
  const currentMilestone = milestones[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === milestones.length - 1;
  const currentAnswer = responses[currentMilestone?.milestone_id];
  
  const currentSkillInfo = skills.find(skill => 
    currentQuestionIndex >= skill.start_index && 
    currentQuestionIndex < skill.start_index + skill.milestone_count
  );
  
  const questionInSkill = currentSkillInfo 
    ? currentQuestionIndex - currentSkillInfo.start_index + 1 
    : 1;

  // Early Milestone Skip Screen
  if (showEarlyIntro && earlyIntroSkill && earlyIntroSkill.groups?.early) {
    const earlyGroup = earlyIntroSkill.groups.early;
    const areaColorKey = getAreaColorVariable(earlyIntroSkill.area_name);
    const areaColorVar = `hsl(var(--${areaColorKey}))`;
    const [showMilestoneList, setShowMilestoneList] = useState(false);
    
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center py-8 px-4">
        <Card className="max-w-2xl w-full p-8 md:p-12 shadow-soft animate-fade-in border-0">
          {/* Icon */}
          <div className="flex flex-col items-center mb-6">
            <img 
              src={getAreaIcon(earlyIntroSkill.area_name)} 
              alt={earlyIntroSkill.area_name}
              className="w-24 h-24 md:w-28 md:h-28 object-contain drop-shadow-md mb-4"
            />
            
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">
              Chequeo rápido antes de empezar
            </h2>
            
            <p className="text-base text-muted-foreground text-center mb-2">
              Podemos saltar los pasos de meses anteriores si {baby.name} ya los domina.
            </p>
            
            <Badge 
              variant="outline"
              className="mt-2 px-4 py-2 text-sm font-semibold"
              style={{ 
                borderColor: areaColorVar,
                color: areaColorVar
              }}
            >
              Cubre {earlyGroup.ageRange.min}–{earlyGroup.ageRange.max} meses
            </Badge>
          </div>

          {/* Expandable milestone list */}
          <Collapsible
            open={showMilestoneList}
            onOpenChange={setShowMilestoneList}
            className="mb-6"
          >
            <CollapsibleTrigger className="flex items-center justify-center gap-2 w-full text-sm font-medium transition-colors mb-4" style={{ color: areaColorVar }}>
              See what's included in this group
              <ChevronDown className={`w-4 h-4 transition-transform ${showMilestoneList ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="bg-muted/50 rounded-lg p-4 max-h-64 overflow-y-auto">
                {earlyGroup.milestones.map((milestone) => (
                  <div key={milestone.milestone_id} className="flex items-start gap-2 py-2 border-b border-border last:border-0">
                    <span className="text-xs font-medium text-muted-foreground min-w-[40px]">
                      {milestone.age}m
                    </span>
                    <p className="text-sm text-foreground">
                      {milestone.description}
                    </p>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Primary button - Skip */}
          <button 
            onClick={async () => {
              // Mark all early milestones as completed with special flag
              setEarlySkipDecisions({ ...earlySkipDecisions, [earlyIntroSkill.skill_id]: true });
              
              // Save all early milestones as "yes" with source flag
              for (const milestone of earlyGroup.milestones) {
                await supabase
                  .from("assessment_responses")
                  .upsert(
                    {
                      assessment_id: id,
                      milestone_id: milestone.milestone_id,
                      answer: 'yes',
                      source: 'quick_confirm'
                    },
                    {
                      onConflict: 'assessment_id,milestone_id'
                    }
                  );
                
                // Also update milestone_updates
                await supabase
                  .from("milestone_updates")
                  .insert({
                    baby_id: baby.id,
                    milestone_id: milestone.milestone_id,
                    skill_id: milestone.skill_id,
                    area_id: milestone.area_id,
                    status: 'yes',
                  });
                
                // Update local responses
                setResponses(prev => ({ ...prev, [milestone.milestone_id]: 'yes' }));
              }
              
              toast.success(`✅ Got it! We'll skip ${earlyGroup.ageRange.min}–${earlyGroup.ageRange.max} months for this skill.`);
              
              // CRITICAL FIX: Filter milestones and recalculate indices
              const earlyMilestoneIds = new Set(earlyGroup.milestones.map(m => m.milestone_id));
              
              // Remove answered early milestones from the array
              const filteredMilestones = milestones.filter(m => !earlyMilestoneIds.has(m.milestone_id));
              
              // Recalculate start_index and milestone_count for all skills
              const updatedSkills = skills.map(skill => {
                // Count how many milestones remain for this skill after filtering
                const skillMilestonesRemaining = filteredMilestones.filter(m => 
                  m.skill_id === skill.skill_id
                );
                
                // Find the new start_index in the filtered array
                const newStartIndex = filteredMilestones.findIndex(m => 
                  m.skill_id === skill.skill_id
                );
                
                return {
                  ...skill,
                  start_index: newStartIndex >= 0 ? newStartIndex : skill.start_index,
                  milestone_count: skillMilestonesRemaining.length
                };
              });
              
              // Update states with filtered data
              setMilestones(filteredMilestones);
              setSkills(updatedSkills);
              
              // Find the updated skill info
              const updatedSkill = updatedSkills.find(s => s.skill_id === earlyIntroSkill.skill_id);
              
              setShowEarlyIntro(false);
              setEarlyIntroSkill(null);
              
              if (updatedSkill && updatedSkill.milestone_count > 0) {
                // There are still pending milestones, show the skill intro
                setIntroSkill(updatedSkill);
                setShowSkillIntro(true);
              } else {
                // All milestones were answered via quick check, show skill feedback directly
                const skillScore = await calculateSkillScore(earlyIntroSkill, responses);
                setCompletedSkill({ skill: earlyIntroSkill, ...skillScore });
                setShowSkillFeedback(true);
              }
            }}
            className="w-full h-14 px-8 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-2 text-white mb-3"
            style={{ 
              backgroundColor: areaColorVar,
              borderColor: areaColorVar
            }}
          >
            <div className="flex flex-col items-center">
              <span className="text-lg">Sí, continuar</span>
              <span className="text-xs opacity-80">Ya los domina</span>
            </div>
          </button>

          {/* Secondary button - Review */}
          <button 
            onClick={() => {
              setEarlySkipDecisions({ ...earlySkipDecisions, [earlyIntroSkill.skill_id]: false });
              setShowEarlyIntro(false);
              setEarlyIntroSkill(null);
              
              // Show the skill intro now
              setIntroSkill(earlyIntroSkill);
              setShowSkillIntro(true);
            }}
            className="w-full h-14 px-8 rounded-xl font-semibold border-2 transition-all duration-300 hover:scale-[1.02]"
            style={{ 
              borderColor: areaColorVar,
              color: areaColorVar,
              backgroundColor: 'transparent'
            }}
          >
            <div className="flex flex-col items-center">
              <span className="text-lg">No, revisarlos</span>
              <span className="text-xs opacity-70">Aún no los hace todos</span>
            </div>
          </button>
        </Card>
      </div>
    );
  }

  // Skill Introduction Screen
  if (showSkillIntro && introSkill) {
    const areaColorKey = getAreaColorVariable(introSkill.area_name);
    const areaColorVar = `hsl(var(--${areaColorKey}))`;
    
    const skillMilestonesData = milestones.filter(m => m.skill_id === introSkill.skill_id);
    const skillDescription = skillMilestonesData[0]?.description || "This skill is an important part of your baby's development.";
    
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center py-8 px-4">
        <Card className="max-w-2xl w-full p-8 md:p-12 shadow-soft animate-fade-in border-0">
          <div className="flex flex-col items-center mb-4">
            <img 
              src={getAreaIcon(introSkill.area_name)} 
              alt={introSkill.area_name}
              className="w-32 h-32 md:w-36 md:h-36 object-contain drop-shadow-md"
            />
            
            {introSkill.is_new ? (
              <Badge 
                className="mt-2 px-4 py-1 text-sm font-semibold"
                style={{ 
                  backgroundColor: areaColorVar,
                  color: 'white'
                }}
              >
                <Sparkles className="w-4 h-4 mr-1" />
                New Milestone
              </Badge>
            ) : (
              <Badge 
                variant="outline"
                className="mt-2 px-4 py-1 text-sm font-semibold"
                style={{ 
                  borderColor: areaColorVar,
                  color: areaColorVar
                }}
              >
                {introSkill.completed_count}/{introSkill.total_count} milestones completed
              </Badge>
            )}
          </div>

          <h2 
            className="text-2xl md:text-3xl font-bold mb-2 text-center"
            style={{ color: areaColorVar }}
          >
            {introSkill.skill_name}
          </h2>

          <p className="text-sm md:text-base text-muted-foreground mb-6 text-center">
            {introSkill.milestone_count} questions
          </p>

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

          <button 
            onClick={() => {
              setShowSkillIntro(false);
              setIntroSkill(null);
              setIsLearnMoreOpen(false);
              if (introSkill && currentQuestionIndex !== introSkill.start_index) {
                setCurrentQuestionIndex(introSkill.start_index);
              }
            }}
            className="w-full h-12 px-8 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-2 text-white"
            style={{ 
              backgroundColor: areaColorVar,
              borderColor: areaColorVar
            }}
          >
            {introSkill.is_new ? "Start Questions" : "Continue"}
          </button>
        </Card>
      </div>
    );
  }

  // Skill Feedback Screen  
  if (showSkillFeedback && completedSkill) {
    const { skill, currentRangeScore, totalSkillScore, percentile, referencePercentile, probability, isFullyCompleted } = completedSkill;
    const areaColorKey = getAreaColorVariable(skill.area_name);
    const areaColorVar = `hsl(var(--${areaColorKey}))`;

    // Check if skill is 100% complete (ALL milestones have "yes")
    const shouldShowCelebration = isFullyCompleted === true;

    // If 100% complete, show special celebration screen
    if (shouldShowCelebration) {
      return (
        <div className="min-h-screen bg-gradient-warm flex items-center justify-center py-4 px-4">
          <Card className="max-w-2xl w-full p-6 md:p-8 shadow-soft animate-scale-in border-0">

            {/* Celebration Icon and Title */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${areaColorVar}15` }}
              >
                <Trophy className="w-10 h-10" style={{ color: areaColorVar }} strokeWidth={2} />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold" style={{ color: areaColorVar }}>
                Congratulations!
              </h1>
            </div>
            
            {/* Achievement Text */}
            <div className="text-center mb-6">
              <h2
                className="text-2xl md:text-3xl font-bold mb-6"
                style={{ color: areaColorVar }}
              >
                {skill.skill_name}
              </h2>
              
              <div className="inline-flex items-center gap-2 bg-success/10 border-2 border-success rounded-full px-6 py-3 mb-6">
                <CheckCircle2 className="w-6 h-6 text-success" strokeWidth={2.5} />
                <span className="text-lg font-bold text-success">100% Complete!</span>
              </div>
            </div>

            {/* Encouraging message */}
            <div className="text-center mb-8 px-4">
              <p className="text-base text-muted-foreground leading-relaxed">
                Amazing progress! {baby.name} has mastered all the milestones for this skill. Keep up the great work!
              </p>
            </div>

            {/* Continue Button */}
            <button 
              onClick={handleContinueFromSkillFeedback}
              className="w-full h-14 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-2 text-white"
              style={{ 
                backgroundColor: areaColorVar,
                borderColor: areaColorVar
              }}
            >
              Continue
            </button>
          </Card>
        </div>
      );
    }

    // Regular feedback screen (not 100%)
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center py-4 px-4">
        <Card className="max-w-2xl w-full p-6 md:p-8 shadow-soft animate-fade-in border-0">
          <div className="flex flex-col items-center mb-6">
            <div className="-mb-4">
              <img 
                src={getAreaIcon(skill.area_name)} 
                alt={skill.area_name}
                className="w-28 h-28 md:w-32 md:h-32 object-contain drop-shadow-md"
              />
            </div>
            
            <h2 
              className={"text-2xl md:text-3xl font-bold text-center mb-1"}
              style={{ color: areaColorVar }}
            >
              {skill.skill_name}
            </h2>
            <p 
              className="text-sm md:text-base font-semibold opacity-60"
              style={{ color: areaColorVar }}
            >
              Complete! ✨
            </p>
          </div>
          
          {/* Progress visualization */}
          <div className="space-y-4 mb-6 px-4">
            {(() => {
              const referenceAge = assessment?.reference_age_months || 0;
              const minRange = referenceAge <= 3 ? 0 : referenceAge - 3;
              const maxRange = referenceAge + 3;
              const rangeSpan = maxRange - minRange;
              
              // Use monthsOffset directly from calculateSkillScore
              const monthsOffsetValue = completedSkill?.monthsOffset ?? 0;
              const monthsAhead = Math.round(monthsOffsetValue * 10) / 10;
              const isAhead = monthsAhead > 0.5;
              const isBehind = monthsAhead < -0.5;
              
              const clampedOffset = Math.max(-3, Math.min(3, monthsOffsetValue));
              const barPosition = ((clampedOffset + 3) / 6) * 100;
              
              return (
                <div>
                  <PaceGauge percentile={percentile} color={areaColorVar} />
                </div>
              );
            })()}
          </div>

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
                    <span className="font-bold text-base" style={{ color: areaColorVar }}>{referencePercentile}%</span> of babies this age have completed this skill
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <button 
            onClick={handleContinueFromSkillFeedback}
            className="w-full h-12 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-2 text-white"
            style={{ 
              backgroundColor: areaColorVar,
              borderColor: areaColorVar
            }}
          >
            {currentQuestionIndex < milestones.length ? "Continue" : "View Results"}
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
            Go to last question
          </button>
        </Card>
      </div>
    );
  }

  // Completion Screen
  if (showCompletion) {
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center py-8 px-4">
        <Card className="max-w-2xl w-full p-8 md:p-12 shadow-soft animate-scale-in border-0 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 leading-tight">
            Progress Assessment<br/>Complete!
          </h1>
          <p className="text-lg text-muted-foreground mb-10">
            for {baby.name} — {assessment.reference_age_months} months old
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <div className="flex items-center gap-3 bg-success/10 border-2 border-success/30 rounded-2xl px-6 py-4 min-w-[200px]">
              <div className="w-12 h-12 bg-success rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-7 h-7 text-white" strokeWidth={2.5} />
              </div>
              <div className="text-left">
                <p className="text-2xl font-bold text-success">100%</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-primary/10 border-2 border-primary/30 rounded-2xl px-6 py-4 min-w-[200px]">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-white">{totalCount}</span>
              </div>
              <div className="text-left">
                <p className="text-base font-semibold text-foreground">Questions</p>
                <p className="text-xs text-muted-foreground">Answered</p>
              </div>
            </div>
          </div>

          <div className="mb-10 px-4 max-w-lg mx-auto">
            <p className="text-base text-muted-foreground leading-relaxed">
              You've completed the progress assessment! Your baby's development progress has been updated.
            </p>
          </div>

          <div className="space-y-3 max-w-md mx-auto">
            <Button 
              onClick={handleComplete}
              size="lg"
              variant="hero"
              className="w-full text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] h-14"
            >
              Back to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Guard: Check if current milestone is from early group and needs Quick check
  if (currentMilestone && currentSkillInfo && assessment) {
    const K = 3;
    const earlyThreshold = Math.max(0, assessment.reference_age_months - K);
    const isEarlyMilestone = currentMilestone.age < earlyThreshold;
    
    const needsQC = currentSkillInfo.groups.early !== null &&
                    currentSkillInfo.groups.early.milestones.length > 0 &&
                    !currentSkillInfo.groups.early.hasNo;
    
    const hasDecision = earlySkipDecisions[currentSkillInfo.skill_id] !== undefined;
    
    // If this is an early milestone AND we need Quick check AND user hasn't decided yet
    if (isEarlyMilestone && needsQC && !hasDecision) {
      setEarlyIntroSkill(currentSkillInfo);
      setShowEarlyIntro(true);
      // Return null to prevent rendering the question card
      return null;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-warm py-4 sm:py-6 px-3 sm:px-4">
      <div className="container max-w-3xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-3 sm:mb-4 py-2">
            <Button variant="ghost" size="sm" asChild className="h-8 px-2 sm:px-3">
              <Link to="/dashboard">
                <ArrowLeft className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Exit</span>
              </Link>
            </Button>

            <div className="text-center flex-1 mx-2 sm:mx-4">
              <p 
                className="text-sm sm:text-base font-semibold"
                style={{ color: `hsl(var(--${getAreaColorVariable(currentMilestone.area_name)}))` }}
              >
                Skill {skills.findIndex(s => s.skill_id === currentSkillInfo?.skill_id) + 1} of {skills.length}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {baby.name || "Your baby"} • {assessment.reference_age_months} months
              </p>
            </div>

            <Button variant="ghost" size="sm" onClick={handleComplete} className="h-8 px-2 sm:px-3">
              <Save className="w-4 h-4" />
            </Button>
          </div>

          <Progress 
            value={progress} 
            className="h-2"
            style={{
              '--progress-color': `hsl(var(--${getAreaColorVariable(currentMilestone.area_name)}))`,
            } as React.CSSProperties}
          />
        </div>

        <Card 
          className="p-5 sm:p-6 md:p-8 mb-6 shadow-card animate-fade-in transition-transform duration-200"
          style={{ transform: `translateX(${swipeOffset * 0.3}px)` }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <img 
              src={getAreaIcon(currentMilestone.area_name, true)} 
              alt={currentMilestone.area_name}
              className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
            />
            <p 
              className="text-base sm:text-lg md:text-xl font-bold"
              style={{ color: `hsl(var(--${getAreaColorVariable(currentMilestone.area_name)}))` }}
            >
              {currentSkillInfo?.skill_name || currentMilestone.skill_name}
            </p>
          </div>

          <div className="mb-3 text-center">
            <p className="text-xs sm:text-sm text-muted-foreground px-2">
              <span className="font-bold">Question {questionInSkill} of {currentSkillInfo?.milestone_count}</span>
            </p>
          </div>

          <div className="mb-7 sm:mb-10 text-center px-1">
            <h2 className="text-base sm:text-lg md:text-xl font-bold mb-3 sm:mb-3 text-center max-w-2xl mx-auto text-foreground">
              {currentMilestone.description}
            </h2>
          </div>

          <div className="flex justify-center gap-8 sm:gap-4 mb-6 sm:max-w-lg sm:mx-auto">
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

          <Collapsible open={showHelper} onOpenChange={setShowHelper}>
            <CollapsibleTrigger asChild>
              <button 
                className="w-full text-[13px] sm:text-sm font-medium text-center transition-all py-4 px-3 flex items-center justify-center gap-2 rounded-lg"
                style={{ 
                  color: `hsl(var(--${getAreaColorVariable(currentMilestone.area_name)}) / 0.7)`,
                  backgroundColor: `hsl(var(--${getAreaColorVariable(currentMilestone.area_name)}) / 0.05)`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = `hsl(var(--${getAreaColorVariable(currentMilestone.area_name)}))`;
                  e.currentTarget.style.backgroundColor = `hsl(var(--${getAreaColorVariable(currentMilestone.area_name)}) / 0.1)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = `hsl(var(--${getAreaColorVariable(currentMilestone.area_name)}) / 0.7)`;
                  e.currentTarget.style.backgroundColor = `hsl(var(--${getAreaColorVariable(currentMilestone.area_name)}) / 0.05)`;
                }}
              >
                <Info className="w-4 h-4 flex-shrink-0" />
                <span className="leading-tight">Help identifying this skill?</span>
                <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${showHelper ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent 
              className="mt-3 p-4 border rounded-lg"
              style={{ 
                backgroundColor: `hsl(var(--${getAreaColorVariable(currentMilestone.area_name)}) / 0.05)`,
                borderColor: `hsl(var(--${getAreaColorVariable(currentMilestone.area_name)}) / 0.2)`,
              }}
            >
              {currentMilestone.science_fact && (
                <p className="text-[13px] sm:text-sm text-foreground leading-relaxed">
                  {currentMilestone.science_fact}
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>
        </Card>

        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="h-12 px-6 text-base active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous Question
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProgressAssessment;
