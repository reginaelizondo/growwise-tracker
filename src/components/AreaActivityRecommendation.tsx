import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useRecommendedActivity } from "@/hooks/useRecommendedActivity";
import { Skeleton } from "@/components/ui/skeleton";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import kineduLogo from "@/assets/logo-kinedu.png";

interface Skill {
  skill_id: number;
  skill_name: string;
  currentRangeScore: number;
  percentile: number;
}

interface AreaActivityRecommendationProps {
  areaId: number;
  areaName: string;
  areaColor: string;
  skills: Skill[];
  babyAgeMonths: number;
  locale?: 'en' | 'es';
}

export function AreaActivityRecommendation({
  areaId,
  areaName,
  areaColor,
  skills,
  babyAgeMonths,
  locale = 'en'
}: AreaActivityRecommendationProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Prioritize skills that need practice (lower percentiles)
  // Sort by: 1) currentRangeScore (lowest first), 2) skill_id (lowest first)
  const sortedSkills = [...skills].sort((a, b) => 
    a.currentRangeScore - b.currentRangeScore || a.skill_id - b.skill_id
  );
  
  const targetSkill = {
    id: sortedSkills[0].skill_id,
    name: sortedSkills[0].skill_name
  };

  const { activity, loading, error } = useRecommendedActivity({
    areaId,
    areaName,
    targetSkill,
    babyAgeMonths,
    locale
  });

  if (loading) {
    return (
      <div className="text-center py-4">
        <Skeleton className="h-6 w-3/4 mx-auto" />
      </div>
    );
  }

  if (error || !activity) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-center gap-2 py-3 transition-colors hover:opacity-80"
      >
        <span 
          className="text-xs font-medium"
          style={{ color: areaColor }}
        >
          Recommended Activity
        </span>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5" style={{ color: areaColor }} />
        ) : (
          <ChevronDown className="w-5 h-5" style={{ color: areaColor }} />
        )}
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <Card 
          className="border-l-4 bg-card shadow-sm overflow-hidden animate-fade-in" 
          style={{ borderLeftColor: areaColor }}
        >
          <div className="p-4 space-y-3">
            {/* Activity Name */}
            <h3 
              className="text-base font-bold text-center"
              style={{ color: areaColor }}
            >
              {activity.activity_name}
            </h3>

            {/* Purpose Section */}
            <div 
              className="border-l-4 bg-muted/30 p-3 rounded-r-lg"
              style={{ borderLeftColor: areaColor }}
            >
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5 font-medium">
                PURPOSE
              </p>
              <p className="text-xs font-medium text-foreground">
                {activity.purpose_text}
              </p>
            </div>

            {/* Description */}
            <div 
              className="text-xs prose prose-xs max-w-none text-foreground/90 leading-relaxed"
              dangerouslySetInnerHTML={{ 
                __html: sanitizeHtml(activity.description_html) 
              }}
            />
          </div>

          {/* Footer with Kinedu logo and CTA */}
          <div className="border-t border-border/50 p-4 bg-muted/20 space-y-3">
            <div className="flex justify-center">
              <img 
                src={kineduLogo} 
                alt="Kinedu" 
                className="h-6 object-contain"
              />
            </div>
            <Button 
              className="w-full py-4 text-sm font-semibold rounded-xl"
              style={{ 
                backgroundColor: areaColor,
                color: 'white'
              }}
              onClick={() => window.open('https://app.kinedu.com/ia-signuppage/?swc=ia-report', '_blank')}
            >
              Go to activity
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}