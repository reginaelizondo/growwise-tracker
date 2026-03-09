import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useRecommendedActivity } from "@/hooks/useRecommendedActivity";
import { Skeleton } from "@/components/ui/skeleton";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import kineduLogo from "@/assets/logo-kinedu.png";
import { KINEDU_SUPERWALL_URL } from "@/config/kinedu";

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
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-colors hover:bg-muted/20"
      >
        <span 
          className="text-sm font-semibold"
          style={{ color: areaColor }}
        >
          Recommended Activities
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" style={{ color: areaColor }} />
        ) : (
          <ChevronDown className="w-4 h-4" style={{ color: areaColor }} />
        )}
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <Card className="bg-card border border-border/30 rounded-2xl shadow-none overflow-hidden animate-fade-in">
          <div className="p-5 space-y-4">
            {/* Activity Name */}
            <h3 
              className="text-lg font-bold text-center"
              style={{ color: areaColor }}
            >
              {activity.activity_name}
            </h3>

            {/* Divider */}
            <div style={{ height: '1px', backgroundColor: '#ECEEF2' }} />

            {/* Purpose Section */}
            <div 
              className="border-l-[3px] bg-muted/20 px-3 py-2.5 rounded-r-lg"
              style={{ borderLeftColor: areaColor }}
            >
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1 font-semibold">
                Purpose
              </p>
              <p className="text-sm font-medium text-foreground leading-snug">
                {activity.purpose_text}
              </p>
            </div>

            {/* Description */}
            <div 
              className="text-sm max-w-none text-foreground/80 leading-relaxed"
              style={{ fontFamily: 'inherit' }}
              dangerouslySetInnerHTML={{ 
                __html: sanitizeHtml(activity.description_html) 
              }}
            />
          </div>

          {/* Footer */}
          <div className="border-t border-border/30 px-5 py-4 space-y-3">
            <div className="flex justify-center">
              <img 
                src={kineduLogo} 
                alt="Kinedu" 
                className="h-7 object-contain"
              />
            </div>
            <Button 
              className="w-full py-5 text-sm font-semibold rounded-xl shadow-sm"
              style={{ 
                backgroundColor: areaColor,
                color: 'white'
              }}
              onClick={() => window.open(KINEDU_SUPERWALL_URL, '_blank')}
            >
              Go to activity
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}