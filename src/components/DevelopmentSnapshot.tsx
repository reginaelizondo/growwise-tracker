import { TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";

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

interface DevelopmentSnapshotProps {
  babyName: string;
  babyGender: string | null; // 'M', 'F', or null
  skillResults: SkillResult[];
}

// Skill context mapping - explains why each skill matters
const getSkillContext = (skillName: string): string => {
  const lowerName = skillName.toLowerCase();

  // Imitation / Pretend Play
  if (lowerName.includes('imitation') || lowerName.includes('pretend') || lowerName.includes('play')) {
    return "Key for language development";
  }

  // Problem Solving
  if (lowerName.includes('problem') || lowerName.includes('solving') || lowerName.includes('logic')) {
    return "Critical for learning";
  }

  // Spatial / Logical Thinking / STEM related
  if (lowerName.includes('spatial') || lowerName.includes('object') || lowerName.includes('permanence') || lowerName.includes('cause')) {
    return "Foundation for STEM skills";
  }

  // Balance / Coordination / Motor skills
  if (lowerName.includes('balance') || lowerName.includes('coordination') || lowerName.includes('motor') || lowerName.includes('physical') || lowerName.includes('movement') || lowerName.includes('crawl') || lowerName.includes('walk') || lowerName.includes('head') || lowerName.includes('control')) {
    return "Important for confidence";
  }

  // Focus / Memory / Attention
  if (lowerName.includes('focus') || lowerName.includes('memory') || lowerName.includes('attention') || lowerName.includes('sensory')) {
    return "Essential for learning";
  }

  // Emotional / Social skills
  if (lowerName.includes('emotion') || lowerName.includes('social') || lowerName.includes('attachment') || lowerName.includes('secure') || lowerName.includes('self') || lowerName.includes('regulation')) {
    return "Crucial for social development";
  }

  // Communication / Language
  if (lowerName.includes('babbl') || lowerName.includes('language') || lowerName.includes('communication') || lowerName.includes('speak') || lowerName.includes('word') || lowerName.includes('linguistic')) {
    return "Vital for communication";
  }

  // Default fallback
  return "Important for overall development";
};

// Calculate completion percentage for a skill
const getSkillPercentage = (skill: SkillResult): number => {
  if (skill.total === 0) return 0;
  return Math.round(skill.mastered / skill.total * 100);
};

export const DevelopmentSnapshot = ({
  babyName,
  babyGender,
  skillResults
}: DevelopmentSnapshotProps) => {
  if (skillResults.length === 0) return null;

  // Get pronoun based on gender
  const pronoun = babyGender === 'M' ? 'his' : babyGender === 'F' ? 'her' : 'their';

  // Sort skills by completion percentage (ascending - lowest first)
  const sortedSkills = [...skillResults].sort((a, b) => {
    const aPercent = getSkillPercentage(a);
    const bPercent = getSkillPercentage(b);
    return aPercent - bPercent;
  });

  // Get the 2 skills with lowest completion %
  // Prioritize skills at 0%, then take lowest overall
  const zeroPercentSkills = sortedSkills.filter(s => getSkillPercentage(s) === 0);
  const lowSkills: SkillResult[] = [];
  if (zeroPercentSkills.length >= 2) {
    lowSkills.push(zeroPercentSkills[0], zeroPercentSkills[1]);
  } else if (zeroPercentSkills.length === 1) {
    lowSkills.push(zeroPercentSkills[0]);
    // Find next lowest that isn't the zero percent one
    const remaining = sortedSkills.filter(s => s.skill_id !== zeroPercentSkills[0].skill_id);
    if (remaining.length > 0) {
      lowSkills.push(remaining[0]);
    }
  } else {
    // No zero percent skills, take 2 lowest
    if (sortedSkills.length >= 2) {
      lowSkills.push(sortedSkills[0], sortedSkills[1]);
    } else if (sortedSkills.length === 1) {
      lowSkills.push(sortedSkills[0]);
    }
  }

  return (
    <Card className="w-full animate-fade-in overflow-hidden border border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50/50 to-yellow-50/30 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      <div className="p-5 md:p-6">
        {/* Centered layout for mobile-first */}
        <div className="flex flex-col items-center text-center space-y-3">
          {/* Icon */}
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-amber-600" />
          </div>
          
          {/* Title */}
          <h3 className="font-semibold text-foreground text-xl leading-tight">
            {babyName}'s Snapshot
          </h3>
          
          {/* Intro paragraph - centered */}
          <p className="text-foreground leading-relaxed text-base max-w-[90%]">
            <span className="font-medium">{babyName}</span> is progressing well overall. Right now, {pronoun} biggest growth opportunities are:
          </p>
          
          {/* Skills to focus on - centered container with left-aligned list */}
          <div className="w-[90%] max-w-sm">
            <ul className="space-y-3">
              {lowSkills.map(skill => {
                const percentage = getSkillPercentage(skill);
                const context = getSkillContext(skill.skill_name);
                return (
                  <li key={skill.skill_id} className="flex items-start gap-3">
                    <span className="text-amber-500 mt-1.5 text-lg leading-none flex-shrink-0">•</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="text-base font-bold text-foreground text-left">{skill.skill_name}</span>
                        <span className="text-base font-normal text-amber-600 flex-shrink-0">{percentage}%</span>
                      </div>
                      <p className="text-sm text-[#6B7280] mt-1 leading-relaxed text-left">
                        {context}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          
          {/* Closing statement with emphasized urgency */}
          <p className="text-base text-foreground pt-4 border-t border-amber-200/50 mt-3 w-full leading-relaxed max-w-[90%]">
            <span className="font-bold">The next 60 days are key.</span> Daily guided play can significantly accelerate these skills.
          </p>
        </div>
      </div>
    </Card>
  );
};
