import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Home, Lightbulb, Target, BarChart3, ChevronDown, Sparkles, CheckCircle, Clock, Lock } from "lucide-react";
import SocialProofBlock from "@/components/SocialProofBlock";
import AppDownloadSection from "@/components/AppDownloadSection";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { externalSupabase } from "@/integrations/supabase/external-client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CircularProgress } from "@/components/CircularProgress";
import { PaceGauge, calculatePace } from "@/components/PaceGauge";
import { DevelopmentSnapshot } from "@/components/DevelopmentSnapshot";
import { DomainCTA } from "@/components/DomainCTA";
import { MobileStickyCta } from "@/components/MobileStickyCta";
import physicalIcon from "@/assets/Physical.png";
import linguisticIcon from "@/assets/Linguistic.png";
import emotionalIcon from "@/assets/Emotional.png";
import cognitiveIcon from "@/assets/Cognitive.png";
import masteredIcon from "@/assets/mastered-icon.png";
import onTrackIcon from "@/assets/on-track-icon.png";
import needsPracticeIcon from "@/assets/needs-practice-icon.png";
// Logo path from public folder for better mobile compatibility
const kineduLogo = "/images/logo-kinedu-blue.png";
import { PrintHeader } from "@/components/report-print/PrintHeader";
import { SkillsTable } from "@/components/report-print/SkillsTable";
import { BoostDevelopmentSection } from "@/components/report-print/BoostDevelopmentSection";
import { RecommendedActivityCard } from "@/components/RecommendedActivityCard";
import "../styles/report-print.css";
interface MilestoneResponse {
  milestone_id: number;
  answer: string;
}
interface Milestone {
  milestone_id: number;
  age: number;
  skill_id: number;
  skill_name: string;
  area_name: string;
  area_id: number;
  description: string;
  question: string;
}
interface SkillResult {
  skill_id: number;
  skill_name: string;
  area_name: string;
  area_id: number;
  mastered: number;
  total: number;
  currentRangeScore: number;
  totalSkillScore: number;
  percentile: number;
  pace: number;
}
const Report = () => {
  const {
    id
  } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<any>(null);
  const [baby, setBaby] = useState<any>(null);
  const [responses, setResponses] = useState<MilestoneResponse[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [skillResults, setSkillResults] = useState<SkillResult[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [aiInsight, setAiInsight] = useState<string>("");
  const [insightLoading, setInsightLoading] = useState(false);
  const [stageExpectations, setStageExpectations] = useState<any>(null);
  const [expectationsLoading, setExpectationsLoading] = useState(false);
  useEffect(() => {
    checkAuth();
  }, []);

  // Safety timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.error('⏱️ [Report] Loading timeout reached - forcing loading to false');
        setLoading(false);
      }
    }, 15000);
    return () => clearTimeout(timeout);
  }, [loading]);
  const checkAuth = async () => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
  };
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch assessment with baby data
        const {
          data: assessmentData,
          error: assessmentError
        } = await supabase.from("assessments").select("*, babies(*)").eq("id", id).single();
        if (assessmentError || !assessmentData) {
          toast.error("Report not found");
          navigate("/");
          return;
        }
        setAssessment(assessmentData);
        setBaby(assessmentData.babies);

        // Track report view
        await supabase.from('assessment_events').insert({
          assessment_id: id,
          baby_id: assessmentData.babies?.id,
          event_type: 'report_view',
          event_data: {
            source: 'report_page'
          }
        });

        // Fetch responses with skill_id and area_id
        const {
          data: responsesData,
          error: responsesError
        } = await supabase.from("assessment_responses").select("milestone_id, answer, skill_id, area_id").eq("assessment_id", id);
        if (responsesError) {
          console.error("Error fetching responses:", responsesError);
          toast.error("Failed to load responses");
          return;
        }
        setResponses(responsesData || []);

        // Fetch milestones data - now optimized with internal skill_id/area_id
        if (responsesData && responsesData.length > 0) {
          const milestoneIds = responsesData.map(r => r.milestone_id);

          // Get unique skill_ids from internal responses (faster!)
          const skillIds = [...new Set(responsesData.map(r => r.skill_id).filter(Boolean))];
          console.log('📊 [Report] Data overview:', {
            totalResponses: responsesData.length,
            uniqueSkills: skillIds.length,
            responsesWithSkillId: responsesData.filter(r => r.skill_id).length,
            responsesWithAreaId: responsesData.filter(r => r.area_id).length
          });
          try {
            // Step 1: Get ages from skill_milestone (external)
            const {
              data: skillMilestoneData,
              error: smError
            } = await externalSupabase.from('skill_milestone').select('milestone_id, age').in('milestone_id', milestoneIds);
            if (smError) {
              console.error('Error fetching skill_milestone:', smError);
            }

            // Step 2: Get milestone texts from milestones_locale (external)
            const {
              data: milestoneTexts,
              error: mtError
            } = await externalSupabase.from('milestones_locale').select('milestone_id, title, description, science_fact').in('milestone_id', milestoneIds).eq('locale', assessmentData.locale || 'en');
            if (mtError) {
              console.error('Error fetching milestones_locale:', mtError);
            }

            // Step 3: Get skill names from skills_locales (external) - ROBUST LOADING
            const preferredLocale = assessmentData.locale || 'en';
            let skillsRows: any[] | null = null;
            const {
              data: firstTry,
              error: firstError
            } = await externalSupabase.from('skills_locales').select('skill_id, title, locale').in('skill_id', skillIds);
            if (firstError) {
              console.warn('⚠️ skills_locales .in failed, fetching all and filtering client-side');
              const {
                data: allRows,
                error: secondError
              } = await externalSupabase.from('skills_locales').select('skill_id, title, locale');
              if (!secondError) {
                skillsRows = (allRows || []).filter((r: any) => skillIds.includes(r.skill_id));
              }
            } else {
              skillsRows = firstTry || [];
            }

            // Build skill name map with locale preference
            const skillsById = new Map<number, any[]>();
            (skillsRows || []).forEach((row: any) => {
              if (!skillsById.has(row.skill_id)) skillsById.set(row.skill_id, []);
              skillsById.get(row.skill_id)!.push(row);
            });
            const skillNameMap = new Map<number, string>();
            skillsById.forEach((rows, key) => {
              const preferred = rows.find((r: any) => r.locale === preferredLocale) || rows.find((r: any) => r.locale === 'en') || rows[0];
              skillNameMap.set(key, preferred?.title || `Skill ${key}`);
            });

            // Helper to convert area_id to area name
            const areaNameFromId = (id: number) => ({
              1: 'Physical',
              2: 'Cognitive',
              3: 'Linguistic',
              4: 'Socio-Emotional'
            })[id] || 'Unknown';

            // Step 4: Build lookup maps
            const ageMap = new Map();
            skillMilestoneData?.forEach(sm => ageMap.set(sm.milestone_id, sm.age));
            const textMap = new Map();
            milestoneTexts?.forEach(mt => textMap.set(mt.milestone_id, mt));

            // Step 5: Merge all data using INTERNAL skill_id and area_id
            const milestonesData = responsesData.filter(response => response.skill_id && response.area_id) // Filter out legacy responses
            .map(response => {
              const age = ageMap.get(response.milestone_id) || 0;
              const textInfo = textMap.get(response.milestone_id);
              const skillName = skillNameMap.get(response.skill_id) || `Skill ${response.skill_id}`;
              const areaName = areaNameFromId(response.area_id);
              return {
                milestone_id: response.milestone_id,
                age: age,
                skill_id: response.skill_id,
                // From internal DB ✅
                skill_name: skillName,
                area_id: response.area_id,
                // From internal DB ✅
                area_name: areaName,
                // Derived from area_id ✅
                description: textInfo?.description || '',
                question: textInfo?.title || '',
                science_fact: textInfo?.science_fact || ''
              };
            });
            console.log('✅ [Report] Milestones loaded:', {
              totalLoaded: milestonesData.length,
              filteredLegacy: responsesData.length - milestonesData.length,
              withValidSkillId: milestonesData.filter(m => m.skill_id > 0).length,
              withValidAreaId: milestonesData.filter(m => m.area_id > 0).length,
              uniqueSkills: new Set(milestonesData.map(m => m.skill_id)).size,
              uniqueAreas: new Set(milestonesData.map(m => m.area_id)).size
            });
            if (milestonesData.length === 0) {
              console.error('⚠️ [Report] No valid milestones with metadata');
              toast.error('Unable to load milestone data. Please try again.');
              setLoading(false);
              return;
            }
            setMilestones(milestonesData);
          } catch (error) {
            console.error('❌ [Report] Fatal error loading milestones:', error);
            toast.error('Failed to load report data');
          }
        }
      } catch (error: any) {
        console.error("Error fetching report data:", error);
        toast.error("Failed to load report");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);
  useEffect(() => {
    const loadSkillResults = async () => {
      if (!loading && milestones.length > 0 && assessment && baby) {
        const results = await calculateSkillResults();
        setSkillResults(results);
      }
    };
    loadSkillResults();
  }, [loading, milestones, responses, assessment, baby]);

  // Calculate donut data and weakest area using useMemo to avoid recalculation
  const {
    donutData,
    weakestArea
  } = useMemo(() => {
    if (skillResults.length === 0) {
      return {
        donutData: [],
        weakestArea: null
      };
    }
    const areaMetadata: Record<string, {
      color: string;
      areaId: number;
    }> = {
      "Physical": {
        color: "#00A3E0",
        areaId: 1
      },
      "Cognitive": {
        color: "#00C853",
        areaId: 2
      },
      "Linguistic": {
        color: "#FF8A00",
        areaId: 3
      },
      "Socio-Emotional": {
        color: "#F06292",
        areaId: 4
      }
    };
    const areaProgressMap = new Map<string, {
      scores: number[];
    }>();
    skillResults.forEach(skill => {
      let normalizedArea = skill.area_name;
      if (normalizedArea === "Social-Emotional" || normalizedArea === "Social-emotional") {
        normalizedArea = "Socio-Emotional";
      }
      if (normalizedArea === "Lingustic") {
        normalizedArea = "Linguistic";
      }
      if (!areaProgressMap.has(normalizedArea)) {
        areaProgressMap.set(normalizedArea, {
          scores: []
        });
      }
      areaProgressMap.get(normalizedArea)!.scores.push(skill.currentRangeScore);
    });
    const calculatedDonutData = ["Cognitive", "Physical", "Linguistic", "Socio-Emotional"].map(areaName => {
      const areaData = areaProgressMap.get(areaName);

      // Calculate pace for this area
      const areaSkills = skillResults.filter(s => {
        let normalizedArea = s.area_name;
        if (normalizedArea === "Social-Emotional" || normalizedArea === "Social-emotional") {
          normalizedArea = "Socio-Emotional";
        }
        if (normalizedArea === "Lingustic") {
          normalizedArea = "Linguistic";
        }
        return normalizedArea === areaName;
      });
      const areaPaceRaw = areaSkills.length > 0 ? areaSkills.reduce((sum, s) => sum + s.pace, 0) / areaSkills.length : 0;
      const areaPace = Math.round(areaPaceRaw * 10) / 10;
      if (!areaData || areaData.scores.length === 0) {
        return {
          name: areaName === "Socio-Emotional" ? "Socio-emotional" : areaName,
          value: 0,
          color: areaMetadata[areaName]?.color || "#00A3E0",
          areaId: areaMetadata[areaName]?.areaId || 1,
          status: "on-track" as const,
          statusText: "No data",
          pace: 0
        };
      }
      const avgScore = Math.round(areaData.scores.reduce((sum, s) => sum + s, 0) / areaData.scores.length);
      const monthsOffset = (avgScore / 100 - 0.5) * 6;
      const monthsAhead = Math.round(monthsOffset * 10) / 10;
      let status: "ahead" | "on-track" | "behind" = "on-track";
      let statusText = "On track";
      if (monthsAhead > 0.5) {
        status = "ahead";
        statusText = `${Math.abs(monthsAhead)} month${Math.abs(monthsAhead) !== 1 ? 's' : ''} ahead`;
      } else if (monthsAhead < -0.5) {
        status = "behind";
        statusText = `${Math.abs(monthsAhead)} month${Math.abs(monthsAhead) !== 1 ? 's' : ''} behind`;
      }
      return {
        name: areaName === "Socio-Emotional" ? "Socio-emotional" : areaName,
        value: avgScore,
        color: areaMetadata[areaName]?.color || "#00A3E0",
        areaId: areaMetadata[areaName]?.areaId || 1,
        status,
        statusText,
        pace: areaPace
      };
    });

    // Log area data for debugging
    console.log('📊 [Report] Area calculations:', calculatedDonutData.map(a => ({
      name: a.name,
      value: a.value,
      pace: a.pace,
      status: a.status
    })));

    // Find weakest area based on PACE (not value/score)
    // Lower pace = needs more focus
    const calculatedWeakestArea = calculatedDonutData.length > 0 ? [...calculatedDonutData].filter(a => a.pace > 0) // Only consider areas with data
    .sort((a, b) => a.pace - b.pace)[0] // Sort by pace ascending (lowest first)
    : null;
    console.log('🎯 [Report] Weakest area (lowest pace):', {
      name: calculatedWeakestArea?.name,
      pace: calculatedWeakestArea?.pace,
      value: calculatedWeakestArea?.value
    });
    return {
      donutData: calculatedDonutData,
      weakestArea: calculatedWeakestArea
    };
  }, [skillResults]);

  // Generate AI insight when skillResults are ready
  useEffect(() => {
    const generateInsight = async () => {
      if (!assessment || !baby || skillResults.length === 0 || insightLoading || aiInsight || !weakestArea) {
        return;
      }
      const ageMonths = assessment.reference_age_months || 0;
      setInsightLoading(true);
      try {
        const {
          data,
          error
        } = await supabase.functions.invoke("generate-chart-insight", {
          body: {
            babyName: baby.name,
            babyAgeMonths: ageMonths,
            donutData: donutData,
            focusArea: weakestArea?.name || "Physical"
          }
        });
        if (error) {
          console.error("Error generating AI insight:", error);
          setAiInsight("Your baby is making wonderful progress! Every child develops at their own pace, and each milestone achieved is a celebration of their unique journey.");
        } else if (data?.insight) {
          setAiInsight(data.insight);
        }
      } catch (err) {
        console.error("Exception generating AI insight:", err);
        setAiInsight("Your baby is making wonderful progress! Every child develops at their own pace, and each milestone achieved is a celebration of their unique journey.");
      } finally {
        setInsightLoading(false);
      }
    };
    generateInsight();
  }, [skillResults, assessment, baby, aiInsight, insightLoading, weakestArea, donutData]);

  // Generate stage expectations for print version (after skillResults are calculated)
  useEffect(() => {
    const generateExpectations = async () => {
      if (!baby || !assessment || skillResults.length === 0 || stageExpectations || expectationsLoading) {
        return;
      }
      setExpectationsLoading(true);
      try {
        const birthdate = new Date(baby.birthdate);
        const today = new Date();
        const ageMs = today.getTime() - birthdate.getTime();
        const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
        const ageMonths = Math.floor(ageDays / 30);
        const remainingDays = ageDays % 30;

        // Calculate area data from skillResults
        const areaMap = new Map<string, {
          paces: number[];
          percentiles: number[];
        }>();
        skillResults.forEach(skill => {
          const normalizedArea = skill.area_name === "Social-Emotional" || skill.area_name === "Social-emotional" ? "Socio-Emotional" : skill.area_name;
          if (!areaMap.has(normalizedArea)) {
            areaMap.set(normalizedArea, {
              paces: [],
              percentiles: []
            });
          }
          areaMap.get(normalizedArea)!.paces.push(skill.pace);
          areaMap.get(normalizedArea)!.percentiles.push(skill.percentile);
        });
        const areasData = Array.from(areaMap.entries()).map(([area, data]) => ({
          area,
          pace: Math.round(data.paces.reduce((a, b) => a + b, 0) / data.paces.length * 10) / 10,
          percentile: Math.round(data.percentiles.reduce((a, b) => a + b, 0) / data.percentiles.length)
        }));
        const {
          data,
          error
        } = await supabase.functions.invoke('generate-stage-expectations', {
          body: {
            babyName: baby.name,
            babyAgeMonths: ageMonths,
            babyAgeDays: remainingDays,
            sexAtBirth: baby.sex_at_birth,
            areasData
          }
        });
        if (error) {
          console.error('Error generating stage expectations:', error);
        } else {
          setStageExpectations(data);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setExpectationsLoading(false);
      }
    };
    generateExpectations();
  }, [skillResults.length, baby?.id, assessment?.id]);

  // Binomial CDF helper function
  const binomialCDF = (k: number, n: number, p: number): number => {
    if (p === 0) return k >= 0 ? 1 : 0;
    if (p === 1) return k >= n ? 1 : 0;
    let cdf = 0;
    for (let i = 0; i <= k; i++) {
      // Calculate binomial coefficient: C(n, i)
      let coef = 1;
      for (let j = 0; j < i; j++) {
        coef *= (n - j) / (j + 1);
      }
      // Add P(X = i) to cumulative sum
      cdf += coef * Math.pow(p, i) * Math.pow(1 - p, n - i);
    }
    return cdf;
  };
  const calculateSkillResults = async (): Promise<SkillResult[]> => {
    if (!baby || !assessment) return [];
    const babyAgeMonths = Math.floor(assessment.reference_age_months);
    const ageRangeMin = Math.max(0, babyAgeMonths - 3);
    const ageRangeMax = babyAgeMonths + 3;
    console.log('🔍 [calculateSkillResults] Starting calculation:', {
      totalResponses: responses.length,
      totalMilestones: milestones.length,
      babyAgeMonths
    });

    // Group milestones by skill_id
    const skillMap: {
      [key: number]: {
        skill_name: string;
        area_name: string;
        area_id: number;
        milestones: Milestone[];
      };
    } = {};
    milestones.forEach(milestone => {
      if (!skillMap[milestone.skill_id]) {
        skillMap[milestone.skill_id] = {
          skill_name: milestone.skill_name,
          area_name: milestone.area_name,
          area_id: milestone.area_id,
          milestones: []
        };
      }
      skillMap[milestone.skill_id].milestones.push(milestone);
    });
    console.log('🔍 [calculateSkillResults] Skills found:', {
      totalSkills: Object.keys(skillMap).length,
      skillIds: Object.keys(skillMap).map(id => ({
        id,
        name: skillMap[parseInt(id)].skill_name
      }))
    });

    // Calculate results for each skill
    const skillResults: SkillResult[] = [];
    for (const [skillIdStr, skillData] of Object.entries(skillMap)) {
      const skillId = parseInt(skillIdStr);

      // Use all milestones from the assessment (answered set), no age filter
      const answeredMilestones = skillData.milestones;
      if (answeredMilestones.length === 0) continue;

      // Current range score based on answered milestones
      let masteredInRange = 0;
      answeredMilestones.forEach(milestone => {
        const response = responses.find(r => r.milestone_id === milestone.milestone_id);
        if (response?.answer === "yes") masteredInRange++;
      });
      const currentRangeScore = answeredMilestones.length > 0 ? Math.round(masteredInRange / answeredMilestones.length * 100) : 0;

      // Total skill score
      let masteredTotal = 0;
      skillData.milestones.forEach(milestone => {
        const response = responses.find(r => r.milestone_id === milestone.milestone_id);
        if (response?.answer === "yes") masteredTotal++;
      });
      const totalSkillScore = skillData.milestones.length > 0 ? Math.round(masteredTotal / skillData.milestones.length * 100) : 0;

      // Calculate pace directly from completion percentage
      const skillPace = calculatePace(totalSkillScore);

      // Keep percentile as completion for UI consistency
      const percentile = totalSkillScore;

      // Diagnostic logging
      console.log(`📊 [Report] Skill calculated:`, {
        skill_id: skillId,
        skill_name: skillData.skill_name,
        area_name: skillData.area_name,
        totalSkillScore,
        percentile,
        pace: skillPace
      });
      skillResults.push({
        skill_id: skillId,
        skill_name: skillData.skill_name,
        area_name: skillData.area_name,
        area_id: skillData.area_id,
        mastered: masteredTotal,
        total: skillData.milestones.length,
        currentRangeScore,
        totalSkillScore,
        percentile,
        pace: skillPace
      });
    }
    return skillResults;
  };

  // Map area_id to color CSS variable
  const getAreaColorVariable = (areaId: number): string => {
    const colorMap: {
      [key: number]: string;
    } = {
      1: 'hsl(var(--physical))',
      // turquesa
      2: 'hsl(var(--cognitive))',
      // verde
      3: 'hsl(var(--linguistic))',
      // naranja
      4: 'hsl(var(--emotional))' // rosa
    };
    return colorMap[areaId] || 'hsl(var(--primary))';
  };
  const getAreaIcon = (areaName: string) => {
    const iconMap: {
      [key: string]: string;
    } = {
      Physical: physicalIcon,
      Cognitive: cognitiveIcon,
      Linguistic: linguisticIcon,
      "Socio-Emotional": emotionalIcon,
      "Social-Emotional": emotionalIcon,
      "Social-emotional": emotionalIcon
    };
    return iconMap[areaName] || physicalIcon;
  };

  // Helper function to get skill category based on percentile
  const getSkillCategory = (percentile: number): 'mastered' | 'on-track' | 'reinforce' => {
    if (percentile >= 75) return 'mastered';
    if (percentile >= 50) return 'on-track';
    return 'reinforce';
  };

  // Helper function to get pace description
  const getPaceDescription = (pace: number): string => {
    if (pace < 0.8) return "Developing at a slower pace";
    if (pace < 1.0) return "Slightly below typical pace";
    if (pace < 1.2) return "Developing at expected pace";
    if (pace < 1.5) return "Developing faster than typical";
    return "Significantly ahead of typical pace";
  };
  const handleDownload = async () => {
    // Track download event
    try {
      await supabase.from('assessment_events').insert({
        assessment_id: id,
        baby_id: baby?.id,
        event_type: 'report_downloaded',
        event_data: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error tracking download:', error);
    }
    window.print();
  };
  if (loading) {
    return <div className="min-h-screen bg-gradient-warm flex items-center justify-center">
        <Card className="p-6">
          <p className="text-muted-foreground">Loading report...</p>
        </Card>
      </div>;
  }
  if (!assessment || !baby) {
    return <div className="min-h-screen bg-gradient-warm flex items-center justify-center">
        <Card className="p-6 text-center">
          <p className="text-muted-foreground mb-4">Report not found</p>
          <Button asChild variant="default">
            <Link to="/">Back to home</Link>
          </Button>
        </Card>
      </div>;
  }

  // Categorize skills by current range score
  const completedSkills = skillResults.filter(skill => skill.currentRangeScore > 90);
  const onTrackSkills = skillResults.filter(skill => skill.currentRangeScore >= 11 && skill.currentRangeScore <= 90);
  const needsPracticeSkills = skillResults.filter(skill => skill.currentRangeScore <= 10);

  // Calculate overall statistics using simple average
  const overallScore = skillResults.length > 0 ? Math.round(skillResults.reduce((sum, skill) => sum + skill.currentRangeScore, 0) / skillResults.length) : 0;

  // Calculate overall pace (average of all skill paces)
  const overallPaceRaw = skillResults.length > 0 ? skillResults.reduce((sum, s) => sum + s.pace, 0) / skillResults.length : 0;
  const overallPace = Math.round(overallPaceRaw * 10) / 10;
  console.log('[Report] Overall pace:', {
    totalSkills: skillResults.length,
    skillPaces: skillResults.map(s => s.pace),
    overallPace
  });

  // Calculate progress by area for donut chart
  // Note: donutData already includes pace and areaId from useMemo calculation

  // Generate personalized recommendations based on areas needing practice
  // Group skills by area and calculate average currentRangeScore
  const areaScores: {
    [area: string]: {
      scores: number[];
      avgScore: number;
    };
  } = {};
  skillResults.forEach(skill => {
    if (!areaScores[skill.area_name]) {
      areaScores[skill.area_name] = {
        scores: [],
        avgScore: 0
      };
    }
    areaScores[skill.area_name].scores.push(skill.currentRangeScore);
  });

  // Calculate averages
  Object.keys(areaScores).forEach(area => {
    const scores = areaScores[area].scores;
    areaScores[area].avgScore = Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
  });
  const recommendations: string[] = [];

  // Physical recommendations (if average score < 50%)
  if (areaScores.Physical && areaScores.Physical.avgScore < 50) {
    recommendations.push("Aim for 20–30 minutes of tummy time a day, broken into short, playful sessions.");
    recommendations.push("Let your baby move freely on a safe surface and talk or sing to keep them motivated.");
  }

  // Linguistic recommendations
  if (areaScores.Linguistic && areaScores.Linguistic.avgScore < 50) {
    recommendations.push("More babbling time: narrate your day and take turns speaking to build language skills.");
  }

  // Cognitive recommendations
  if (areaScores.Cognitive && areaScores.Cognitive.avgScore < 50) {
    recommendations.push("Try peek-a-boo, hiding toys, and cause-and-effect games for problem-solving.");
  }

  // Socio-Emotional recommendations
  const socialEmotional = areaScores["Socio-Emotional"] || areaScores["Social-Emotional"] || areaScores["Social-emotional"];
  if (socialEmotional && socialEmotional.avgScore < 50) {
    // Recommendation removed per user request
  }

  // Calculate age for print header
  const birthdate = baby ? new Date(baby.birthdate) : new Date();
  const today = new Date();
  const ageMs = today.getTime() - birthdate.getTime();
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  const ageMonths = Math.floor(ageDays / 30);
  const remainingDays = ageDays % 30;
  return <>
      {/* SCREEN VIEW */}
      <div className="screen-only min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-amber-50/30 py-10 md:py-12 px-4 pb-32 lg:pb-12 overflow-x-hidden">
        <div className="container max-w-[600px] mx-auto px-0">
        {/* Header - Mobile optimized */}
        <div className="mb-8 text-center animate-fade-in px-5">
          <h1 className="text-[28px] font-bold text-primary leading-[1.2]">
            {baby.name || "Your baby"}'s Development Report
          </h1>
          <p className="text-base text-muted-foreground mt-3 leading-[1.6]">
            See where {baby.sex_at_birth === 'M' ? "he's" : baby.sex_at_birth === 'F' ? "she's" : "they're"} thriving—and where you can help most
          </p>
          {/* Powered by Kinedu App badge */}
          <div className="mt-3 mb-5">
            <span className="inline-block text-[13px] font-medium text-[#6B7280] bg-[#F3F4F6] px-3 py-1.5 rounded-2xl">
              Powered by 📱 Kinedu App
            </span>
          </div>
        </div>


        {/* Development Snapshot - Personalized narrative summary */}
        {skillResults.length > 0 && <div className="mb-8 mx-4">
            <DevelopmentSnapshot babyName={baby?.name || "Your baby"} babyGender={baby?.sex_at_birth} skillResults={skillResults} />
          </div>}

        {/* Kinedu Sign Up CTA */}
        {!isAuthenticated && <div className="mb-8 mx-4">
            <Card className="p-6 text-center bg-white border-2 border-primary/20 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
              <h2 className="text-[22px] font-semibold text-primary mb-6 leading-[1.3] px-4">
                Get {baby?.name || "your baby"}'s personalized daily play plan
              </h2>
              
              <Button size="lg" className="w-[calc(100%-32px)] h-14 mx-4 shadow-lg hover:shadow-xl transition-all font-semibold text-[17px] rounded-xl bg-primary hover:bg-primary/90 text-white mb-4" onClick={() => {
              console.log('🔵 Start personalized plan clicked', {
                assessmentId: id,
                babyId: baby?.id
              });
              window.location.href = 'https://app.kinedu.com/ia-signuppage/?swc=ia-report';
              supabase.from('assessment_events').insert({
                assessment_id: id,
                baby_id: baby?.id,
                event_type: 'cta_clicked',
                event_data: {
                  cta_type: 'start_personalized_plan',
                  url: 'https://app.kinedu.com/ia-signuppage/?swc=ia-report',
                  timestamp: new Date().toISOString()
                }
              }).then(result => {
                if (result.error) console.error('🔴 CTA tracking error:', result.error);
              });
            }}>
                Start 7-day free trial
              </Button>
              
              <p className="text-sm font-medium text-primary mb-2">
                📱 Download the Kinedu App
              </p>
              <p className="text-sm font-light text-muted-foreground">
                5-10 min/day • Cancel anytime • No credit card
              </p>
            </Card>
          </div>}

        {/* Overall Pace Development */}
        {skillResults.length > 0 && <div className="mb-8 mx-4 animate-fade-in">
            <Card className="p-6 bg-card border-2 border-primary/20 shadow-[0_2px_8px_rgba(0,0,0,0.06)] rounded-2xl">
              <div className="mb-3 text-center">
                <h2 className="text-[22px] font-semibold text-primary leading-[1.3]">
                  Development Progress
                </h2>
              </div>
              <PaceGauge pace={overallPace} color="#2563eb" hideGauge={true} showContextualMessage={true} />
            </Card>
          </div>}

        {/* Area Pace Cards with Activity Recommendations */}
        <div className="grid grid-cols-1 gap-3 mb-8 mx-4">
          {donutData.map(area => {
            // Normalize area name to match activities_database
            // Important: activities_database has typo "Lingustic" instead of "Linguistic"
            let normalizedAreaName = area.name;
            if (normalizedAreaName.includes("Socio") || normalizedAreaName.includes("Social") || normalizedAreaName.includes("Emotional")) {
              normalizedAreaName = "Social & Emotional";
            }
            if (normalizedAreaName === "Linguistic") {
              // Database has typo, must use "Lingustic" to match
              normalizedAreaName = "Lingustic";
            }

            // Get skills for this area
            const areaSkills = skillResults.filter(s => {
              let normalizedArea = s.area_name;
              if (normalizedArea === "Social-Emotional" || normalizedArea === "Social-emotional") {
                normalizedArea = "Socio-Emotional";
              }
              if (normalizedArea === "Lingustic") {
                normalizedArea = "Linguistic";
              }
              const areaDisplayName = normalizedArea === "Socio-Emotional" ? "Socio-emotional" : normalizedArea;
              return areaDisplayName === area.name;
            });

            // Categorize skills
            const masteredSkills = areaSkills.filter(s => {
              const progressPercent = s.total > 0 ? s.mastered / s.total * 100 : 0;
              return progressPercent > 90;
            });
            const onTrackSkillsArea = areaSkills.filter(s => {
              const progressPercent = s.total > 0 ? s.mastered / s.total * 100 : 0;
              return progressPercent >= 11 && progressPercent <= 90;
            });
            const reinforceSkillsArea = areaSkills.filter(s => {
              const progressPercent = s.total > 0 ? s.mastered / s.total * 100 : 0;
              return progressPercent < 11;
            });
            return <Collapsible key={area.name} defaultOpen={true} className="space-y-3">
                {/* Area Pace Card */}
                <Card className="bg-card border-t-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden rounded-2xl" style={{
                borderTopColor: area.color
              }}>
                  <CollapsibleTrigger className="w-full group">
                    <div className="p-6">
                      <PaceGauge pace={area.pace} color={area.color} compact={true} areaName={area.name} />
                      <div className="flex items-center justify-center gap-1 mt-5">
                        <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180" style={{
                        color: area.color
                      }} />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="border-t border-border px-6 pb-6 pt-6 bg-muted/10">
                      
                      {/* Key Skills Header - Mobile optimized */}
                      <div className="flex items-center gap-2 mb-6">
                        <span className="text-[17px]">🎯</span>
                        <span className="text-[17px] font-semibold text-foreground">Key Skills</span>
                      </div>
                      
                      {/* Skills organized by category */}
                      <div className="space-y-3">
                        {/* Mastered Skills */}
                        {masteredSkills.length > 0 && <div>
                            <div className="flex items-center gap-2 mb-3">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                              </svg>
                              <span className="text-sm font-bold" style={{
                            color: '#f59e0b'
                          }}>Mastered</span>
                            </div>
                            <div className="space-y-3">
                              {masteredSkills.map(skill => {
                            const progressPercent = skill.total > 0 ? skill.mastered / skill.total * 100 : 0;
                            // Color coding: 0-35% orange, 36-65% blue, 66-100% green
                            const percentColor = progressPercent <= 35 ? '#FF6B35' : progressPercent <= 65 ? '#4169E1' : '#10B981';
                            return <div key={skill.skill_id} className="flex items-center justify-between">
                                    <span className="text-sm text-foreground flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-foreground/60 flex-shrink-0"></span>
                                      {skill.skill_name}
                                    </span>
                                    <span className="text-sm font-medium" style={{
                                color: percentColor
                              }}>{Math.round(progressPercent)}%</span>
                                  </div>;
                          })}
                            </div>
                          </div>}

                        {/* Key Skills (formerly On Track) */}
                        {onTrackSkillsArea.length > 0 && <div>
                            <div className="space-y-3">
                              {onTrackSkillsArea.map(skill => {
                            const progressPercent = skill.total > 0 ? skill.mastered / skill.total * 100 : 0;
                            // Color coding: 0-35% orange, 36-65% blue, 66-100% green
                            const percentColor = progressPercent <= 35 ? '#FF6B35' : progressPercent <= 65 ? '#4169E1' : '#10B981';
                            return <div key={skill.skill_id} className="flex items-center justify-between">
                                    <span className="text-sm text-foreground flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-foreground/60 flex-shrink-0"></span>
                                      {skill.skill_name}
                                    </span>
                                    <span className="text-sm font-medium" style={{
                                color: percentColor
                              }}>{Math.round(progressPercent)}%</span>
                                  </div>;
                          })}
                            </div>
                          </div>}

                        {/* Reinforce Skills */}
                        {reinforceSkillsArea.length > 0 && <div>
                            <div className="flex items-center gap-2 mb-3 mt-4">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" x2="12" y1="5" y2="19" />
                                <polyline points="5 12 12 5 19 12" />
                              </svg>
                              <span className="text-sm font-bold" style={{
                            color: '#3b82f6'
                          }}>Reinforce</span>
                            </div>
                            <div className="space-y-3">
                              {reinforceSkillsArea.map(skill => {
                            const progressPercent = skill.total > 0 ? skill.mastered / skill.total * 100 : 0;
                            // Color coding: 0-35% orange, 36-65% blue, 66-100% green
                            const percentColor = progressPercent <= 35 ? '#FF6B35' : progressPercent <= 65 ? '#4169E1' : '#10B981';
                            return <div key={skill.skill_id} className="flex items-center justify-between">
                                    <span className="text-sm text-foreground flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-foreground/60 flex-shrink-0"></span>
                                      {skill.skill_name}
                                    </span>
                                    <span className="text-sm font-medium" style={{
                                color: percentColor
                              }}>{Math.round(progressPercent)}%</span>
                                  </div>;
                          })}
                            </div>
                          </div>}
                      </div>
                      
                      {areaSkills.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">
                          No skills data available for this area
                        </p>}

                      {/* Domain CTA - contextual call to action */}
                      {areaSkills.length > 0 && !isAuthenticated && <div className="mt-7">
                        <DomainCTA babyName={baby?.name || "your baby"} babyGender={baby?.sex_at_birth} domainSkills={areaSkills} assessmentId={id} babyId={baby?.id} domainColor={area.color} />
                      </div>}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>;
          })}
        </div>


        {/* How it Works Section - Mobile optimized */}
        <div className="mb-12 mx-4 bg-muted/50 rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <h2 className="text-[22px] font-semibold text-foreground text-center mb-5 leading-[1.3]">
            How Kinedu helps {baby?.name || "your baby"} grow
          </h2>
          
          <div className="space-y-7">
            {/* Step 1 */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-11 h-11 rounded-full bg-green-500 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 pt-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-[17px] text-foreground leading-[1.3]">Take the assessment</span>
                  <span className="text-xs bg-[#D1FAE5] text-[#065F46] px-2.5 py-1 rounded-xl font-medium">Done!</span>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-11 h-11 rounded-full bg-primary flex items-center justify-center">
                <span className="text-white font-bold text-[18px]">2</span>
              </div>
              <div className="flex-1 pt-0.5">
                <p className="font-semibold text-[17px] text-foreground leading-[1.3]">Get your personalized daily activities plan</p>
                <p className="text-sm text-[#6B7280] mt-1.5 leading-[1.6]">
                  5-10 minute activities designed for {baby?.sex_at_birth === 'male' ? 'his' : baby?.sex_at_birth === 'female' ? 'her' : 'their'} exact developmental stage
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-11 h-11 rounded-full bg-primary flex items-center justify-center">
                <span className="text-white font-bold text-[18px]">3</span>
              </div>
              <div className="flex-1 pt-0.5">
                <p className="font-semibold text-[17px] text-foreground leading-[1.3]">Track progress as {baby?.sex_at_birth === 'male' ? 'he' : baby?.sex_at_birth === 'female' ? 'she' : 'they'} develops</p>
                <p className="text-sm text-[#6B7280] mt-1.5 leading-[1.6]">
                  We adapt recommendations as {baby?.name || "your baby"} grows
                </p>
              </div>
            </div>
          </div>

          {/* CTA inside the section for natural flow */}
          <div className="mt-8 text-center">
            <Button size="lg" className="w-[calc(100%-32px)] h-14 mx-4 bg-primary hover:bg-primary/90 text-white font-semibold text-[17px] rounded-xl shadow-md hover:shadow-lg transition-all" onClick={() => window.location.href = 'https://app.kinedu.com/ia-signuppage/?swc=ia-report'}>
              Start 7-day free trial
            </Button>
            <p className="text-sm text-[#6B7280] mt-3">No commitment required</p>
          </div>
        </div>

        {/* Recommended Activities Section - Mobile optimized */}
        <div className="text-center mb-4 px-5">
          <h2 className="text-[26px] font-bold text-primary mb-4 leading-[1.2]">Recommended Activities</h2>
          <p className="text-sm italic text-[#6B7280] mb-1 leading-[1.6]">
            These are just examples.
          </p>
          <p className="text-sm text-[#6B7280] leading-[1.6]">
            Your free trial unlocks a full daily plan personalized for {baby?.name || "your baby"}'s development.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 mx-4 mb-6">
          {donutData.map((area, index) => {
            // Get the weakest skill for this area to recommend activity
            const areaSkills = skillResults.filter(s => {
              let normalizedArea = s.area_name;
              if (normalizedArea === "Social-Emotional" || normalizedArea === "Social-emotional") {
                normalizedArea = "Socio-Emotional";
              }
              if (normalizedArea === "Lingustic") {
                normalizedArea = "Linguistic";
              }
              const areaDisplayName = normalizedArea === "Socio-Emotional" ? "Socio-emotional" : normalizedArea;
              return areaDisplayName === area.name;
            });

            // Find the skill with lowest progress
            const sortedSkills = [...areaSkills].sort((a, b) => {
              const aProgress = a.total > 0 ? a.mastered / a.total * 100 : 0;
              const bProgress = b.total > 0 ? b.mastered / b.total * 100 : 0;
              return aProgress - bProgress;
            });
            const targetSkill = sortedSkills[0];
            if (!targetSkill) return null;
            const isLocked = index > 0;
            return <div key={area.areaId} className="relative">
                {/* Card content with stronger blur for locked cards */}
                <div className={isLocked ? "filter blur-[4px] pointer-events-none select-none" : ""}>
                  <RecommendedActivityCard areaId={area.areaId} areaName={area.name === "Socio-emotional" ? "Social & Emotional" : area.name} areaColor={area.color} skills={areaSkills.map(s => ({
                  skillId: s.skill_id,
                  skillName: s.skill_name,
                  progress: s.total > 0 ? Math.round(s.mastered / s.total * 100) : 0,
                  status: s.total > 0 && s.mastered / s.total * 100 > 90 ? 'mastered' : s.total > 0 && s.mastered / s.total * 100 >= 11 ? 'on-track' : 'reinforce'
                }))} babyAgeMonths={assessment?.reference_age_months || 0} assessmentId={id} babyId={baby?.id} />
                </div>
                
                {/* Lock overlay with PREMIUM badge for locked cards */}
                {isLocked && <>
                    {/* PREMIUM badge */}
                    <div className="absolute top-2 right-2 z-10">
                      <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md uppercase tracking-wider">
                        Premium
                      </span>
                    </div>
                    
                    {/* Lock overlay */}
                    <div className="absolute inset-0 bg-white/70 rounded-xl flex items-center justify-center">
                      <div className="bg-white rounded-full p-3 shadow-lg hover:scale-110 transition-transform cursor-pointer group">
                        <Lock className="w-8 h-8 text-muted-foreground group-hover:animate-[shake_0.5s_ease-in-out]" />
                      </div>
                    </div>
                  </>}
              </div>;
          })}
        </div>

        {/* Unlock CTA below cards - Mobile optimized */}
        <div className="text-center mt-8 mb-12 mx-4">
          <Button size="lg" className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-semibold text-[17px] rounded-xl mb-3 shadow-lg" onClick={() => {
            window.location.href = 'https://app.kinedu.com/ia-signuppage/?swc=ia-report';
          }}>
            Unlock all activities for {baby?.name || "your baby"}
          </Button>
          <p className="text-sm text-[#6B7280]">
            1,700+ activities • 7 days free • No credit card
          </p>
        </div>

        {/* Social Proof Block - Mobile optimized */}
        <div className="mb-8 mx-4">
          <SocialProofBlock />
        </div>

        {/* App Download Section */}
        <div className="mb-8 mx-4">
          <AppDownloadSection assessmentId={id} babyId={baby?.id} />
        </div>

        {/* Final CTA - Value Summary - Mobile optimized */}
        <div className="mb-12 mx-4 text-center">
          <h2 className="text-[26px] font-bold text-foreground mb-5 leading-[1.2] px-4">
            Ready to start {baby?.name || "your baby"}'s development plan?
          </h2>
          <p className="text-[17px] font-medium text-[#374151] mb-8 px-6 leading-[1.5]">
            👉 Your personalized plan is ready — start today
          </p>
          
          <Button size="xl" className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-semibold text-[17px] rounded-xl mb-8 shadow-lg hover:shadow-xl transition-all" onClick={() => window.location.href = 'https://app.kinedu.com/ia-signuppage/?swc=ia-report'}>
            Start {baby?.name || "your baby"}'s free 7-day plan
          </Button>
          
          <div className="space-y-3.5 mb-6 max-w-[280px] mx-auto">
            <div className="flex items-center gap-2 text-base text-foreground">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span>Personalized daily activities</span>
            </div>
            <div className="flex items-center gap-2 text-base text-foreground">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span>5-10 minutes a day</span>
            </div>
            <div className="flex items-center gap-2 text-base text-foreground">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span>Cancel anytime</span>
            </div>
          </div>
          
          <p className="text-[17px] font-semibold text-foreground mt-6 mb-4 text-center">
            Your plan is ready to go ✨
          </p>
          <p className="text-sm text-[#6B7280] text-center">
            Join 10M+ parents worldwide
          </p>
        </div>

        {/* Disclaimer */}
        <p className="text-sm text-[#6B7280] italic text-center mb-10 mx-4 animate-fade-in leading-[1.5]" style={{
          animationDelay: "0.2s"
        }}>
          Remember: every baby develops at their own pace. These results show current progress, not future potential.
        </p>



        {/* Go to Dashboard - Prominent for authenticated users */}
        {isAuthenticated && <div className="flex justify-center mb-6">
            <Button variant="hero" size="lg" asChild className="w-full sm:w-auto">
              <Link to="/dashboard" className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                Go to Dashboard
              </Link>
            </Button>
          </div>}
      </div>

      {/* Mobile Sticky CTA - only for unauthenticated users */}
      {!isAuthenticated && <MobileStickyCta babyName={baby?.name || "your baby"} assessmentId={id} babyId={baby?.id} />}
    </div>

      {/* PRINT VIEW - Kinedu Inspired Layout */}
      <div className="print-only">
        <div className="print-first-page">
          <PrintHeader babyName={baby?.name || "Baby"} ageMonths={ageMonths} ageDays={remainingDays} lastUpdate={assessment?.created_at || new Date().toISOString()} sexAtBirth={baby?.sex_at_birth} />

          {stageExpectations && <Card className="print-card print-card-large print-mb-3 border-l-4 border-l-primary">
              <CardContent className="p-4">
                <h2 className="text-lg font-bold mb-2 text-primary">What to expect this month</h2>
                <p className="text-sm mb-2 leading-snug text-foreground/90">{stageExpectations.stageDescription}</p>
                <div className="bg-blue-50/50 rounded-lg p-2">
                  <h3 className="text-sm font-bold mb-2 text-primary">Behaviors you might start to notice:</h3>
                  <ul className="text-sm space-y-1">
                    {stageExpectations.behaviors?.map((behavior: string, idx: number) => <li key={idx} className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span className="text-foreground/90">{behavior}</span>
                      </li>)}
                  </ul>
                </div>
              </CardContent>
            </Card>}

          {/* Developmental Categories Explanation */}
          <Card className="print-card print-card-large print-mb-3 bg-gradient-to-br from-blue-50 to-indigo-50/30 border-none shadow-sm">
            <CardContent className="p-4">
              <div className="text-center mb-1">
                <h2 className="text-lg font-bold text-primary mb-1">Kinedu's developmental categories</h2>
                <p className="text-sm text-foreground/80 max-w-2xl mx-auto">
                  To provide even more effective support on this journey, Kinedu classifies your baby's skills according to their developmental level.
                </p>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mb-2">
                {/* Mastered */}
                <div className="bg-white rounded-lg p-2 shadow-sm border border-yellow-200">
                  <div className="flex justify-center mb-1">
                    <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-yellow-600" />
                    </div>
                  </div>
                  <h3 className="text-center text-sm font-bold text-yellow-700 mb-1">Mastered</h3>
                  <p className="text-xs text-center text-foreground/80 leading-tight">Excelling with skills above what's typical for their age.</p>
                </div>

                {/* On Track */}
                <div className="bg-white rounded-lg p-2 shadow-sm border border-green-200">
                  <div className="flex justify-center mb-1">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <h3 className="text-center text-sm font-bold text-green-700 mb-1">On track</h3>
                  <p className="text-xs text-center text-foreground/80 leading-tight">Achieving what is expected at their age.</p>
                </div>

                {/* Reinforce */}
                <div className="bg-white rounded-lg p-2 shadow-sm border border-blue-200">
                  <div className="flex justify-center mb-1">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Target className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <h3 className="text-center text-sm font-bold text-blue-700 mb-1">Reinforce</h3>
                  <p className="text-xs text-center text-foreground/80 leading-tight">You can support your baby's growth with our activities!</p>
                </div>
              </div>

              <div className="text-center pt-2 border-t border-primary/20">
                <p className="text-xs text-foreground/70 italic">
                  Every baby has their own unique journey!
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Overall Pace */}
          <Card className="print-card print-card-large">
            <CardContent className="p-3 text-center">
              <h2 className="text-base font-bold mb-1">Overall Pace of Development</h2>
              <div className="text-2xl font-bold text-primary mb-0.5">
                {donutData.length > 0 ? Math.round(donutData.reduce((sum, area) => sum + (area.pace || 0), 0) / donutData.length * 10) / 10 : 0}x
              </div>
              <p className="text-xs text-muted-foreground">
                {getPaceDescription(donutData.length > 0 ? Math.round(donutData.reduce((sum, area) => sum + (area.pace || 0), 0) / donutData.length * 10) / 10 : 0)}
              </p>
            </CardContent>
          </Card>
          </div>

          {/* Area Progress with Gauges and Skills */}
        {/* Page 2: Physical + Cognitive */}
        {donutData.slice(0, 2).map(area => {
        const areaSkills = skillResults.filter(s => s.area_name === area.name || s.area_name === "Social-Emotional" && area.name === "Socio-emotional" || s.area_name === "Socio-Emotional" && area.name === "Socio-emotional");

        // Group skills by category
        const masteredSkills = areaSkills.filter(s => getSkillCategory(s.percentile) === 'mastered');
        const onTrackSkills = areaSkills.filter(s => getSkillCategory(s.percentile) === 'on-track');
        const reinforceSkills = areaSkills.filter(s => getSkillCategory(s.percentile) === 'reinforce');
        return <Card key={area.name} className="print-card print-mb-4 page-break-inside-avoid" style={{
          borderTopColor: area.color,
          borderTopWidth: '4px'
        }}>
              <CardContent className="p-6">
                {/* Pace Gauge with Area Name */}
                <div className="flex justify-center mb-6 pace-gauge-container">
                  <PaceGauge pace={area.pace || 0} color={area.color} compact={true} areaName={area.name} hideGauge={false} />
                </div>

                {/* Skills Progress in 3 Columns */}
                <div className="mt-6">
                  <h4 className="text-base font-bold mb-4">Skills Progress:</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {/* Mastered Column */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-yellow-600" />
                        </div>
                        <div>
                          <h5 className="text-sm font-bold text-yellow-700">Mastered</h5>
                          <p className="text-xs text-muted-foreground">{masteredSkills.length} skills</p>
                        </div>
                      </div>
                      <ul className="space-y-2 pl-2">
                        {masteredSkills.map(skill => {
                      const completionPercent = Math.round(skill.mastered / skill.total * 100);
                      return <li key={skill.skill_id} className="text-xs flex items-start gap-1">
                              <span className="text-yellow-600 mt-0.5">•</span>
                              <div className="flex-1">
                                <span className="font-medium">{skill.skill_name}</span>
                                <span className="text-muted-foreground ml-1">({completionPercent}%)</span>
                              </div>
                            </li>;
                    })}
                        {masteredSkills.length === 0 && <li className="text-xs text-muted-foreground italic">No skills yet</li>}
                      </ul>
                    </div>

                    {/* On Track Column */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h5 className="text-sm font-bold text-green-700">On Track</h5>
                          <p className="text-xs text-muted-foreground">{onTrackSkills.length} skills</p>
                        </div>
                      </div>
                      <ul className="space-y-2 pl-2">
                        {onTrackSkills.map(skill => {
                      const completionPercent = Math.round(skill.mastered / skill.total * 100);
                      return <li key={skill.skill_id} className="text-xs flex items-start gap-1">
                              <span className="text-green-600 mt-0.5">•</span>
                              <div className="flex-1">
                                <span className="font-medium">{skill.skill_name}</span>
                                <span className="text-muted-foreground ml-1">({completionPercent}%)</span>
                              </div>
                            </li>;
                    })}
                        {onTrackSkills.length === 0 && <li className="text-xs text-muted-foreground italic">No skills yet</li>}
                      </ul>
                    </div>

                    {/* Reinforce Column */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <Target className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h5 className="text-sm font-bold text-blue-700">Reinforce</h5>
                          <p className="text-xs text-muted-foreground">{reinforceSkills.length} skills</p>
                        </div>
                      </div>
                      <ul className="space-y-2 pl-2">
                        {reinforceSkills.map(skill => {
                      const completionPercent = Math.round(skill.mastered / skill.total * 100);
                      return <li key={skill.skill_id} className="text-xs flex items-start gap-1">
                              <span className="text-blue-600 mt-0.5">•</span>
                              <div className="flex-1">
                                <span className="font-medium">{skill.skill_name}</span>
                                <span className="text-muted-foreground ml-1">({completionPercent}%)</span>
                              </div>
                            </li>;
                    })}
                        {reinforceSkills.length === 0 && <li className="text-xs text-muted-foreground italic">No skills yet</li>}
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>;
      })}

        <div className="page-break" />

        {/* Page 3: Linguistic + Socio-emotional */}
        {donutData.slice(2, 4).map(area => {
        const areaSkills = skillResults.filter(s => s.area_name === area.name || s.area_name === "Social-Emotional" && area.name === "Socio-emotional" || s.area_name === "Socio-Emotional" && area.name === "Socio-emotional");

        // Group skills by category
        const masteredSkills = areaSkills.filter(s => getSkillCategory(s.percentile) === 'mastered');
        const onTrackSkills = areaSkills.filter(s => getSkillCategory(s.percentile) === 'on-track');
        const reinforceSkills = areaSkills.filter(s => getSkillCategory(s.percentile) === 'reinforce');
        return <Card key={area.name} className="print-card print-mb-4 page-break-inside-avoid" style={{
          borderTopColor: area.color,
          borderTopWidth: '4px'
        }}>
              <CardContent className="p-6">
                {/* Pace Gauge with Area Name */}
                <div className="flex justify-center mb-6 pace-gauge-container">
                  <PaceGauge pace={area.pace || 0} color={area.color} compact={true} areaName={area.name} hideGauge={false} />
                </div>

                {/* Skills Progress in 3 Columns */}
                <div className="mt-6">
                  <h4 className="text-base font-bold mb-4">Skills Progress:</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {/* Mastered Column */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-yellow-600" />
                        </div>
                        <div>
                          <h5 className="text-sm font-bold text-yellow-700">Mastered</h5>
                          <p className="text-xs text-muted-foreground">{masteredSkills.length} skills</p>
                        </div>
                      </div>
                      <ul className="space-y-2 pl-2">
                        {masteredSkills.map(skill => {
                      const completionPercent = Math.round(skill.mastered / skill.total * 100);
                      return <li key={skill.skill_id} className="text-xs flex items-start gap-1">
                              <span className="text-yellow-600 mt-0.5">•</span>
                              <div className="flex-1">
                                <span className="font-medium">{skill.skill_name}</span>
                                <span className="text-muted-foreground ml-1">({completionPercent}%)</span>
                              </div>
                            </li>;
                    })}
                        {masteredSkills.length === 0 && <li className="text-xs text-muted-foreground italic">No skills yet</li>}
                      </ul>
                    </div>

                    {/* On Track Column */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h5 className="text-sm font-bold text-green-700">On Track</h5>
                          <p className="text-xs text-muted-foreground">{onTrackSkills.length} skills</p>
                        </div>
                      </div>
                      <ul className="space-y-2 pl-2">
                        {onTrackSkills.map(skill => {
                      const completionPercent = Math.round(skill.mastered / skill.total * 100);
                      return <li key={skill.skill_id} className="text-xs flex items-start gap-1">
                              <span className="text-green-600 mt-0.5">•</span>
                              <div className="flex-1">
                                <span className="font-medium">{skill.skill_name}</span>
                                <span className="text-muted-foreground ml-1">({completionPercent}%)</span>
                              </div>
                            </li>;
                    })}
                        {onTrackSkills.length === 0 && <li className="text-xs text-muted-foreground italic">No skills yet</li>}
                      </ul>
                    </div>

                    {/* Reinforce Column */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <Target className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h5 className="text-sm font-bold text-blue-700">Reinforce</h5>
                          <p className="text-xs text-muted-foreground">{reinforceSkills.length} skills</p>
                        </div>
                      </div>
                      <ul className="space-y-2 pl-2">
                        {reinforceSkills.map(skill => {
                      const completionPercent = Math.round(skill.mastered / skill.total * 100);
                      return <li key={skill.skill_id} className="text-xs flex items-start gap-1">
                              <span className="text-blue-600 mt-0.5">•</span>
                              <div className="flex-1">
                                <span className="font-medium">{skill.skill_name}</span>
                                <span className="text-muted-foreground ml-1">({completionPercent}%)</span>
                              </div>
                            </li>;
                    })}
                        {reinforceSkills.length === 0 && <li className="text-xs text-muted-foreground italic">No skills yet</li>}
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>;
      })}

        <div className="page-break" />

        {/* Page 4: Boost Development Section - Always show all 4 areas */}
        <BoostDevelopmentSection babyName={baby?.name || "Baby"} weakAreas={[]} // No longer used, component shows all areas
      skillResults={skillResults} babyAgeMonths={ageMonths} />
      </div>
    </>;
};
export default Report;