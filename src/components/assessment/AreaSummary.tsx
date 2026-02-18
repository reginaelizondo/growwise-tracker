import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PaceGauge, calculatePace } from "@/components/PaceGauge";
import { CheckCircle2, TrendingUp, Award, Star, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { AreaActivityRecommendation } from "@/components/AreaActivityRecommendation";

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

        {/* Pace of Development card */}
        {(() => {
          const avgPercentile = skills.reduce((sum, s) => sum + (s.percentile ?? 50), 0) / skills.length;
          const avgPace = calculatePace(avgPercentile);
          
          const getFeedback = (pace: number, name?: string): string => {
            const n = name || 'your baby';
            if (pace <= 0.7) return `${n} is developing at their own pace`;
            if (pace <= 0.9) return `${n} is progressing steadily`;
            if (pace <= 1.1) return `${n} is developing right on track`;
            if (pace <= 1.3) return `${n} is developing ahead of the curve`;
            return `${n} is developing at an advanced pace`;
          };

          return (
            <div className="rounded-xl bg-card border border-border/20 px-3 py-2.5 mb-3 flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground whitespace-nowrap">
                Pace of Development
              </span>
              {isMobile ? (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <button className="inline-flex items-center justify-center p-0.5 rounded-full hover:bg-muted/50 active:bg-muted transition-colors">
                      <Info className="w-3 h-3 text-muted-foreground/50" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <div className="space-y-3">{infoContent}</div>
                  </DialogContent>
                </Dialog>
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="inline-flex items-center justify-center">
                        <Info className="w-3 h-3 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm p-4 space-y-3" side="bottom">
                      {infoContent}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <span className="text-[11px] font-semibold ml-auto" style={{ color: areaColor }}>
                {getFeedback(avgPace, babyName?.toLowerCase())}
              </span>
            </div>
          );
        })()}

        {/* Skills List - flat list, no card */}
        <div className="mb-6">
          {skills.map((skill, index) => {
            const pace = skill.percentile !== null ? calculatePace(skill.percentile) : 1.0;
            
            return (
              <div 
                key={skill.skill_id} 
                className="flex items-center gap-2.5 px-1"
                style={{ paddingTop: '6px', paddingBottom: '6px' }}
              >
                {/* Left: Skill name + percentile — allow wrap */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-[12px] font-bold text-foreground leading-tight">
                    {skill.skill_name}
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Percentile <span className="font-semibold" style={{ color: areaColor }}>
                      {skill.percentile !== null ? `${Math.round(skill.percentile)}th` : '—'}
                    </span>
                  </p>
                </div>

                {/* Center: Compact gauge — fixed 140px */}
                <div className="flex-shrink-0" style={{ width: '140px' }}>
                  <PaceGauge
                    percentile={skill.percentile ?? 50}
                    color={areaColor}
                    compact={true}
                    hideGauge={false}
                    hideValue={true}
                  />
                </div>

                {/* Right: Pace badge */}
                <div 
                  className="flex-shrink-0 w-[46px] text-center py-1 rounded-lg text-xs font-bold tabular-nums"
                  style={{ 
                    color: areaColor,
                    backgroundColor: `${areaColor}12`
                  }}
                >
                  {pace.toFixed(1)}×
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
