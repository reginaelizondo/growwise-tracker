import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb } from "lucide-react";
import { useRecommendedActivity } from "@/hooks/useRecommendedActivity";

interface AreaData {
  name: string;
  pace: number;
  color: string;
  areaId: number;
}

interface SkillResult {
  skill_id: number;
  skill_name: string;
  area_name: string;
  percentile: number;
}

interface BoostDevelopmentSectionProps {
  babyName: string;
  weakAreas: AreaData[];
  skillResults: SkillResult[];
  babyAgeMonths: number;
}

const AreaActivityRecommendations = ({ 
  areaName, 
  areaColor, 
  targetSkill, 
  babyAgeMonths,
  areaId 
}: { 
  areaName: string; 
  areaColor: string; 
  targetSkill: { id?: number; name: string };
  babyAgeMonths: number;
  areaId: number;
}) => {
  const { activity, loading } = useRecommendedActivity({
    areaId,
    areaName,
    targetSkill,
    babyAgeMonths,
    locale: 'en'
  });

  if (loading) {
    return (
      <div className="print-activity" style={{ borderLeftColor: areaColor }}>
        <p className="text-sm">Loading activity recommendations...</p>
      </div>
    );
  }

  if (!activity) {
    return null;
  }

  return (
    <div className="print-activity" style={{ borderLeftColor: areaColor }}>
      <h4 className="font-semibold text-sm mb-1">{activity.activity_name}</h4>
      <p className="text-xs text-muted-foreground mb-1">
        Age: {activity.min_age || activity.age} months+
      </p>
      {activity.purpose_text && (
        <p className="text-xs">{activity.purpose_text.slice(0, 100)}...</p>
      )}
    </div>
  );
};

export const BoostDevelopmentSection = ({ 
  babyName, 
  weakAreas, 
  skillResults,
  babyAgeMonths 
}: BoostDevelopmentSectionProps) => {
  // Always show all 4 areas with their weakest skill
  const allAreas = [
    { name: "Physical", color: "#00A3E0", areaId: 1 },
    { name: "Cognitive", color: "#00C853", areaId: 2 },
    { name: "Linguistic", color: "#FF8A00", areaId: 3 },
    { name: "Socio-emotional", color: "#F06292", areaId: 4 }
  ];

  return (
    <Card className="print-card">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Boost {babyName}'s Development</h2>
        </div>
        
        <p className="text-sm text-muted-foreground mb-4">
          Each milestone opens new opportunities to learn. Look up these suggested activities in the app to guide your baby's growth.
        </p>

        {allAreas.map((area) => {
          // Find the weakest skill in this area
          const areaSkills = skillResults.filter(s => 
            s.area_name === area.name || 
            (s.area_name === "Social-Emotional" && area.name === "Socio-emotional") ||
            (s.area_name === "Socio-Emotional" && area.name === "Socio-emotional")
          );
          
          const weakestSkill = areaSkills.length > 0
            ? [...areaSkills].sort((a, b) => a.percentile - b.percentile)[0]
            : null;

          if (!weakestSkill) return null;

          return (
            <div key={area.name} className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge style={{ backgroundColor: area.color, color: 'white' }}>
                  {area.name}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Target: {weakestSkill.skill_name}
                </span>
              </div>
              
              <AreaActivityRecommendations
                areaName={area.name}
                areaColor={area.color}
                targetSkill={{ id: weakestSkill.skill_id, name: weakestSkill.skill_name }}
                babyAgeMonths={babyAgeMonths}
                areaId={area.areaId}
              />
            </div>
          );
        })}

        <div className="print-footer mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground italic">
            Remember that every little effort counts—enjoy each milestone together on this exciting learning journey!
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
