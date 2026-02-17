import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { calculatePace } from "@/components/PaceGauge";
import { CheckCircle2, TrendingUp, Award, Star, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { AreaActivityRecommendation } from "@/components/AreaActivityRecommendation";

const getAreaFeedback = (avgPercentile: number, babyName: string, areaColor: string) => {
  if (avgPercentile >= 80) return { text: `${babyName} is ahead of pace!`, color: 'hsl(142, 70%, 42%)', icon: <Star className="w-4 h-4 fill-current" /> };
  if (avgPercentile >= 40) return { text: `${babyName} is developing right on track`, color: areaColor, icon: <CheckCircle2 className="w-4 h-4" /> };
  return { text: `${babyName} is building up — keep going!`, color: 'hsl(32, 95%, 52%)', icon: <TrendingUp className="w-4 h-4" /> };
};

// Mini half-circle pace gauge for table view
const MiniPaceGauge = ({ pace, color }: { pace: number; color: string }) => {
  const size = 56;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const centerX = size / 2;
  const centerY = size / 2 + 4;
  
  // Half circle from 180° to 0° (left to right, top arc)
  const startAngle = Math.PI;
  const endAngle = 0;
  const normalizedPace = Math.max(0, Math.min(2, pace)) / 2; // 0-1
  const currentAngle = startAngle - (normalizedPace * Math.PI);
  
  const arcStartX = centerX + radius * Math.cos(startAngle);
  const arcStartY = centerY - radius * Math.sin(startAngle);
  const arcEndX = centerX + radius * Math.cos(endAngle);
  const arcEndY = centerY - radius * Math.sin(endAngle);
  const currentX = centerX + radius * Math.cos(currentAngle);
  const currentY = centerY - radius * Math.sin(currentAngle);
  
  const largeArc = normalizedPace > 0.5 ? 1 : 0;
  
  const bgPath = `M ${arcStartX} ${arcStartY} A ${radius} ${radius} 0 1 1 ${arcEndX} ${arcEndY}`;
  const valuePath = `M ${arcStartX} ${arcStartY} A ${radius} ${radius} 0 ${largeArc} 1 ${currentX} ${currentY}`;
  
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 10} viewBox={`0 0 ${size} ${size / 2 + 12}`}>
        <path d={bgPath} fill="none" stroke="hsl(var(--border))" strokeWidth={strokeWidth} strokeLinecap="round" />
        <path d={valuePath} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      </svg>
      <span className="text-[11px] font-bold -mt-2" style={{ color }}>{pace.toFixed(1)}×</span>
    </div>
  );
};

// Mastery dots indicator
const MasteryDots = ({ mastered, total, color }: { mastered: number; total: number; color: string }) => {
  const maxDots = Math.min(total, 14);
  const filledDots = Math.min(mastered, maxDots);
  
  return (
    <div className="flex items-center gap-0.5">
      <div className="flex gap-[3px]">
        {Array.from({ length: maxDots }).map((_, i) => (
          <div
            key={i}
            className="w-[6px] h-[6px] rounded-full"
            style={{ backgroundColor: i < filledDots ? color : 'hsl(var(--muted-foreground) / 0.25)' }}
          />
        ))}
      </div>
      {total > maxDots && (
        <span className="text-[10px] text-muted-foreground ml-0.5">+{total - maxDots}</span>
      )}
      <span className="text-[10px] text-muted-foreground ml-1">{mastered}/{total}</span>
    </div>
  );
};

const getRankColor = (percentile: number, areaColor: string): string => {
  if (percentile >= 80) return 'hsl(142, 70%, 42%)'; // green
  if (percentile >= 40) return areaColor;
  return 'hsl(32, 95%, 52%)'; // orange
};

interface SkillSummary {
  skill_id: number;
  skill_name: string;
  percentile: number | null;
  masteredCount: number;
  totalCount: number;
}

interface AreaSummaryProps {
  areaName: string;
  areaId: number;
  areaIcon: string;
  areaColor: string;
  skills: SkillSummary[];
  onContinue: () => void;
  isLastArea: boolean;
  babyAgeMonths: number;
  babyName?: string;
}

export const AreaSummary = ({
  areaName,
  areaId,
  areaIcon,
  areaColor,
  skills,
  onContinue,
  isLastArea,
  babyAgeMonths,
  babyName,
}: AreaSummaryProps) => {
  const isMobile = useIsMobile();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const getPercentileText = (percentile: number | null): React.ReactNode => {
    if (percentile === null) return "On track with their development";
    if (percentile >= 99) return <>Higher than <span className="font-bold">99%</span> of babies their age</>;
    if (percentile >= 90) return <>Higher than <span className="font-bold">{Math.round(percentile)}%</span> of babies their age</>;
    if (percentile >= 50) return <>On track with <span className="font-bold">{Math.round(percentile)}%</span> of babies their age</>;
    return <>Developing at their own pace (<span className="font-bold">{Math.round(percentile)}th</span> percentile)</>;
  };

  const getPercentileEmoji = (percentile: number | null) => {
    if (percentile === null) return null;
    if (percentile >= 90) return <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />;
    if (percentile >= 50) return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    return <Award className="w-4 h-4 text-blue-500" />;
  };

  // Calculate overall progress for this area
  const totalMastered = skills.reduce((sum, s) => sum + s.masteredCount, 0);
  const totalMilestones = skills.reduce((sum, s) => sum + s.totalCount, 0);
  const progressPercent = totalMilestones > 0 ? (totalMastered / totalMilestones) * 100 : 0;

  const infoContent = (
    <>
      <div>
        <h4 className="text-sm font-bold mb-1.5">Pace of Development</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">
          This value reflects your baby's natural development rhythm compared to others their age.
        </p>
      </div>
      
      <div className="space-y-2.5 pt-1.5 border-t border-border/50">
        <div className="flex items-start gap-2.5">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
            <span className="text-sm font-bold text-success">1.0×</span>
          </div>
          <div className="flex-1 pt-1">
            <p className="text-xs text-foreground">
              Represents an <span className="font-semibold">average pace</span>
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <span className="text-xs font-bold text-muted-foreground">&lt;1.0×</span>
          </div>
          <div className="flex-1 pt-1">
            <p className="text-xs text-foreground">
              Developing at their <span className="font-semibold">own rhythm</span> — completely normal
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
            <span className="text-xs font-bold text-warning">&gt;1.0×</span>
          </div>
          <div className="flex-1 pt-1">
            <p className="text-xs text-foreground">
              Reaching milestones <span className="font-semibold">earlier than average</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-warm py-4 px-4">
      <div className="container max-w-2xl mx-auto">
        {/* Baby Info */}
        {babyName && (
          <p className="text-center text-xs text-muted-foreground font-medium mb-1">
            {babyName} • {babyAgeMonths} {babyAgeMonths === 1 ? 'month' : 'months'}
          </p>
        )}

        {/* Header Card */}
        <div 
          className="rounded-2xl p-3 mb-4"
          style={{ backgroundColor: `${areaColor}10` }}
        >
          <div className="flex items-center justify-center gap-3">
            <div 
              className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm"
              style={{ backgroundColor: `${areaColor}15` }}
            >
              <img 
                src={areaIcon} 
                alt={areaName} 
                className="w-7 h-7 object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight" style={{ color: areaColor }}>
                {areaName}
              </h1>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">
                Summary
              </p>
            </div>
          </div>
        </div>

        {/* Pace of Development subtitle with info */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-sm font-semibold text-foreground/70">
            Pace of Development
          </span>
          {isMobile ? (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <button className="inline-flex items-center justify-center p-1 rounded-full hover:bg-muted/50 active:bg-muted transition-colors">
                  <Info className="w-4 h-4 text-muted-foreground" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <div className="space-y-3">
                  {infoContent}
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="inline-flex items-center justify-center">
                    <Info className="w-4 h-4 text-muted-foreground/60 hover:text-muted-foreground transition-colors" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm p-4 space-y-3" side="bottom">
                  {infoContent}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Personalized Feedback */}
        {(() => {
          const validSkills = skills.filter(s => s.percentile !== null);
          const avgPercentile = validSkills.length > 0 ? validSkills.reduce((sum, s) => sum + (s.percentile ?? 0), 0) / validSkills.length : 50;
          const feedback = getAreaFeedback(avgPercentile, babyName || 'Your baby', areaColor);
          return (
            <div className="flex items-center justify-center gap-2 mb-5">
              <span style={{ color: feedback.color }}>{feedback.icon}</span>
              <span className="text-base font-semibold" style={{ color: feedback.color }}>
                {feedback.text}
              </span>
            </div>
          );
        })()}

        {/* Skills Table */}
        <div className="mb-6">
          {/* Table header */}
          <div className="flex items-center px-1 pb-2 border-b border-border/40">
            <span className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Skill</span>
            <span className="w-16 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pace</span>
            <span className="w-14 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Rank</span>
          </div>

          {skills.map((skill, index) => {
            const pace = skill.percentile !== null ? calculatePace(skill.percentile) : 1.0;
            const percentile = skill.percentile ?? 50;
            const rankColor = getRankColor(percentile, areaColor);
            
            return (
              <div 
                key={skill.skill_id} 
                className="flex items-center py-3 px-1"
                style={{ borderBottom: index < skills.length - 1 ? '1px solid hsl(var(--border) / 0.3)' : 'none' }}
              >
                {/* Skill info */}
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="text-sm font-bold mb-1 truncate">{skill.skill_name}</h3>
                  <MasteryDots mastered={skill.masteredCount} total={skill.totalCount} color={areaColor} />
                </div>

                {/* Mini gauge */}
                <div className="w-16 flex justify-center">
                  <MiniPaceGauge pace={pace} color={areaColor} />
                </div>

                {/* Rank */}
                <div className="w-14 text-right">
                  <span className="text-xl font-extrabold" style={{ color: rankColor }}>
                    {Math.round(percentile)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Activity Recommendation */}
        <div className="mb-4">
          <AreaActivityRecommendation
            areaId={areaId}
            areaName={areaName}
            areaColor={areaColor}
            skills={skills.map(s => ({
              skill_id: s.skill_id,
              skill_name: s.skill_name,
              currentRangeScore: s.masteredCount / Math.max(s.totalCount, 1),
              percentile: s.percentile ?? 50
            }))}
            babyAgeMonths={babyAgeMonths}
          />
        </div>

        {/* Spacer for fixed bottom */}
        <div className="h-24" />
      </div>

      {/* Fixed bottom button */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-background via-background to-transparent pt-4 pb-4 px-4">
        <div className="container max-w-2xl mx-auto">
          <Button
            onClick={onContinue}
            className="w-full py-6 text-lg font-semibold rounded-xl shadow-lg hover:scale-[1.02] transition-transform"
            style={{ backgroundColor: areaColor }}
          >
            {isLastArea ? "See Full Report" : "Continue to Next Area →"}
          </Button>
        </div>
      </div>
    </div>
  );
};
