import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecommendedActivity } from "@/hooks/useRecommendedActivity";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { InfoCard } from "@/components/InfoCard";
import { ChevronDown } from "lucide-react";
import logoKinedu from "@/assets/logo-kinedu-blue.png";

interface Skill {
  skillId: number;
  skillName: string;
  progress: number;
  status: string;
}

interface RecommendedActivityCardProps {
  areaId: number;
  areaName: string;
  areaColor: string;
  skills: Skill[];
  babyAgeMonths: number;
  locale?: 'en' | 'es';
  assessmentId?: string;
  babyId?: string;
}

// Helper function to remove "When should I seek help?" section from HTML
const removeHelpSection = (html: string): string => {
  if (!html) return html;
  
  // Create a temporary div to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Find elements containing "When should I seek help?" or Spanish equivalent
  const allElements = tempDiv.querySelectorAll('*');
  let foundHelpSection = false;
  
  allElements.forEach(element => {
    const text = element.textContent || '';
    // Check for "When should I seek help?" in English or Spanish
    if (text.includes('When should I seek help?') || 
        text.includes('¿Cuándo debo buscar ayuda?') ||
        text.includes('When should I seek help')) {
      foundHelpSection = true;
      // Remove this element and all following siblings
      let current: Element | null = element;
      while (current) {
        const next = current.nextSibling as Element | null;
        current.remove();
        current = next;
      }
    }
  });
  
  return tempDiv.innerHTML;
};

// Collapsible description component
const DescriptionCollapsible = ({ 
  html, 
  areaColor,
  locale,
  children
}: { 
  html: string | null; 
  areaColor: string;
  locale: 'en' | 'es';
  children?: React.ReactNode;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const showMoreText = locale === 'es' ? 'Ver más' : 'Show more';
  const showLessText = locale === 'es' ? 'Ver menos' : 'Show less';
  
  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80"
        style={{ color: areaColor }}
      >
        {isExpanded ? showLessText : showMoreText}
        <ChevronDown 
          className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>
      {isExpanded && (
        <div className="mt-3 space-y-4">
          {html && (
            <div 
              className="text-xs leading-relaxed prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-li:my-1"
              dangerouslySetInnerHTML={{ 
                __html: sanitizeHtml(removeHelpSection(html))
              }}
            />
          )}
          {children}
        </div>
      )}
    </div>
  );
};

export const RecommendedActivityCard = ({
  areaId,
  areaName,
  areaColor,
  skills,
  babyAgeMonths,
  locale = 'en',
  assessmentId,
  babyId
}: RecommendedActivityCardProps) => {
  // Prioritize skills that need practice (7%-49% progress = "Reinforce" or "On Track")
  const skillsNeedingPractice = skills.filter(s => s.progress >= 7 && s.progress < 50);
  
  // Sort by: 1) progress (lowest first), 2) skill_id (lowest first)
  const sortedSkills = skillsNeedingPractice.length > 0
    ? [...skillsNeedingPractice].sort((a, b) => a.progress - b.progress || a.skillId - b.skillId)
    : [...skills].sort((a, b) => a.skillId - b.skillId);
  
  const targetSkill = {
    id: sortedSkills[0].skillId,
    name: sortedSkills[0].skillName
  };

  const { activity, loading } = useRecommendedActivity({
    areaId,
    areaName,
    targetSkill,
    babyAgeMonths,
    locale
  });


  if (loading) {
    return <Skeleton className="h-96 w-full rounded-lg" />;
  }

  if (!activity) {
    return (
      <InfoCard
        title="No Activity Available"
        description={`We couldn't find a matching activity for ${areaName} right now. Activities are being added regularly to support your baby's development.`}
        type="info"
        action={{
          label: "Browse More Activities on Kinedu",
          onClick: () => window.open('https://www.kinedu.com', '_blank')
        }}
      />
    );
  }

  const copyText = locale === 'es'
    ? 'Parece que esta actividad les puede gustar'
    : 'It seems you and your baby could enjoy this activity';

  const ctaText = locale === 'es'
    ? 'Ir a actividad'
    : 'Go to activity';

  return (
    <Card className="overflow-hidden shadow-lg">
      {/* Header with activity name */}
      <div className="px-6 pt-6 pb-4">
        <h3 
          className="text-xl font-bold text-center leading-tight" 
          style={{ color: areaColor }}
        >
          {activity.activity_name}
        </h3>
      </div>
      
      {/* Content area */}
      <div className="px-6 pb-6 space-y-4">
        {/* Purpose section with badge style */}
        <div className="bg-muted/40 rounded-lg p-3 border-l-4" style={{ borderLeftColor: areaColor }}>
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1">
            Purpose
          </p>
          <p className="text-sm leading-relaxed font-medium">
            {activity.purpose_text}
          </p>
        </div>
        
        {/* Description - Collapsible with CTA inside */}
        <DescriptionCollapsible 
          html={activity.description_html} 
          areaColor={areaColor}
          locale={locale}
        >
          {/* Footer with logo and CTA - inside collapsible */}
          <div className="bg-gradient-to-b from-background to-muted/30 rounded-lg px-4 py-4 border space-y-3">
            <div className="flex justify-center">
              <img 
                src={logoKinedu} 
                alt="Kinedu" 
                className="h-5 opacity-70"
              />
            </div>
            <Button 
              style={{ backgroundColor: areaColor }}
              className="text-white hover:opacity-90 w-full h-10 text-base font-semibold shadow-md hover:shadow-lg transition-all"
              onClick={async () => {
                if (assessmentId && babyId) {
                  const { supabase } = await import('@/integrations/supabase/client');
                  await supabase.from('assessment_events').insert({
                    assessment_id: assessmentId,
                    baby_id: babyId,
                    event_type: 'kinedu_download_clicked',
                    event_data: { source: 'recommended_activity', area: areaName }
                  });
                }
                window.open('https://app.kinedu.com/ia-signuppage/?swc=ia-report', '_blank');
              }}
            >
              {ctaText}
            </Button>
          </div>
        </DescriptionCollapsible>
      </div>
    </Card>
  );
};
