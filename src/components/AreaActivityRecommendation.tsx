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
    <div className="space-y-2">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-center gap-1.5 py-2 transition-colors hover:opacity-80"
      >
        <span 
          className="text-xs font-semibold"
          style={{ color: areaColor }}
        >
          Recommended Activity
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" style={{ color: areaColor }} />
        ) : (
          <ChevronDown className="w-4 h-4" style={{ color: areaColor }} />
        )}
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <Card 
          className="border-l-3 bg-card shadow-sm overflow-hidden animate-fade-in" 
          style={{ borderLeftColor: areaColor }}
        >
          <div className="p-3 space-y-2">
            <h3 
              className="text-sm font-bold text-center"
              style={{ color: areaColor }}
            >
              {activity.activity_name}
            </h3>

            <div 
              className="border-l-3 bg-muted/30 p-2.5 rounded-r-lg"
              style={{ borderLeftColor: areaColor }}
            >
              <p className="text-[9px] uppercase tracking-wide text-muted-foreground mb-0.5 font-medium">
                PURPOSE
              </p>
              <p className="text-[11px] font-medium text-foreground leading-snug">
                {activity.purpose_text}
              </p>
            </div>

            <div 
              className="text-[11px] prose prose-xs max-w-none text-foreground/90 leading-relaxed"
              dangerouslySetInnerHTML={{ 
                __html: sanitizeHtml(activity.description_html) 
              }}
            />
          </div>

          <div className="border-t border-border/50 p-3 bg-muted/20 space-y-2">
            <div className="flex justify-center">
              <img 
                src={kineduLogo} 
                alt="Kinedu" 
                className="h-5 object-contain"
              />
            </div>
            <Button 
              className="w-full py-3 text-xs font-semibold rounded-xl"
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