import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { KINEDU_SIGNUP_URL } from "@/config/kinedu";

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

interface DomainCTAProps {
  babyName: string;
  babyGender: string | null; // 'M', 'F', or null
  domainSkills: SkillResult[];
  assessmentId?: string;
  babyId?: string;
  domainColor: string;
}

export const DomainCTA = ({ 
  babyName, 
  babyGender, 
  domainSkills, 
  assessmentId, 
  babyId,
  domainColor 
}: DomainCTAProps) => {
  if (domainSkills.length === 0) return null;

  // Get pronoun based on gender
  const pronoun = babyGender === 'M' ? 'his' : babyGender === 'F' ? 'her' : 'their';

  // Find the skill with lowest completion % in this domain
  const getSkillPercentage = (skill: SkillResult): number => {
    if (skill.total === 0) return 0;
    return Math.round((skill.mastered / skill.total) * 100);
  };

  const sortedSkills = [...domainSkills].sort((a, b) => {
    return getSkillPercentage(a) - getSkillPercentage(b);
  });

  const lowestSkill = sortedSkills[0];

  const handleClick = () => {
    // Open URL immediately to avoid popup blocker on mobile
    window.location.href = KINEDU_SIGNUP_URL;
    
    // Track event in background
    if (assessmentId && babyId) {
      supabase.from('assessment_events').insert({
        assessment_id: assessmentId,
        baby_id: babyId,
        event_type: 'domain_cta_clicked',
        event_data: { 
          domain: lowestSkill.area_name,
          skill: lowestSkill.skill_name,
          source: 'domain_section'
        }
      });
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-border/50 text-center space-y-3">
      <p className="text-sm text-foreground">
        Want to strengthen <span className="font-semibold">{lowestSkill.skill_name}</span>?
        <br />
        <span className="text-muted-foreground">
          Get daily activities designed for {babyName}'s current stage.
        </span>
      </p>
      <Button
        variant="outline"
        size="sm"
        className="border-2 font-medium hover:bg-primary/5 transition-all"
        style={{ 
          borderColor: domainColor,
          color: domainColor
        }}
        onClick={handleClick}
      >
        Get {babyName}'s daily plan
      </Button>
    </div>
  );
};
