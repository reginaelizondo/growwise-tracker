import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PaceGauge, calculatePace } from "@/components/PaceGauge";
import { CheckCircle2, TrendingUp, Award, Star, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { AreaActivityRecommendation } from "@/components/AreaActivityRecommendation";
import { GlobalProgressBar } from "./GlobalProgressBar";

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
  globalProgress?: number;
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
  globalProgress,
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
    <div className="min-h-screen bg-gradient-warm py-6 px-4">
      <div className="container max-w-2xl mx-auto">
        {/* Global Progress Bar */}
        {globalProgress !== undefined && <GlobalProgressBar progressPercent={globalProgress} />}

        {/* Baby Info */}
        {babyName && (
          <p className="text-center text-sm text-muted-foreground font-semibold mb-4">
            {babyName} • {babyAgeMonths} {babyAgeMonths === 1 ? 'month' : 'months'}
          </p>
        )}

        {/* Header */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div 
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md bg-white"
          >
            <img 
              src={areaIcon} 
              alt={areaName} 
              className="w-9 h-9 object-contain"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: areaColor }}>
              {areaName}
            </h1>
            <p className="text-sm text-muted-foreground font-medium">Summary</p>
          </div>
        </div>

        {/* Pace of Development subtitle with info */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-sm font-medium text-muted-foreground">
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

        {/* Skills List */}
        <div className="space-y-3 mb-6">
          {skills.map((skill, index) => {
            const pace = skill.percentile !== null ? calculatePace(skill.percentile) : 1.0;
            const progressPercent = skill.totalCount > 0 
              ? (skill.masteredCount / skill.totalCount) * 100 
              : 0;
            
            return (
              <Card 
                key={skill.skill_id} 
                className="p-3 border-0 shadow-soft overflow-hidden relative"
              >
                {/* Decorative accent */}
                <div 
                  className="absolute top-0 left-0 w-1 h-full"
                  style={{ backgroundColor: areaColor }}
                />

                {/* Skill header */}
                <div className="flex items-center gap-2 mb-2">
                  <span 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: areaColor }}
                  >
                    {index + 1}
                  </span>
                  <h3 className="text-base font-semibold" style={{ color: areaColor }}>
                    {skill.skill_name}
                  </h3>
                </div>

                {/* Pace Gauge - compact version */}
                <div className="mb-1">
                  <PaceGauge
                    percentile={skill.percentile ?? 50}
                    color={areaColor}
                    compact={true}
                    hideGauge={false}
                  />
                </div>

                {/* Percentile text */}
                <p className="text-xs text-muted-foreground text-center mb-2">
                  {getPercentileText(skill.percentile)}
                </p>

                {/* Milestones progress */}
                <div className="bg-muted/30 rounded-md p-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-muted-foreground">Milestones</span>
                    <span className="text-[10px] font-semibold" style={{ color: areaColor }}>
                      {skill.masteredCount} of {skill.totalCount}
                    </span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${progressPercent}%`,
                        backgroundColor: areaColor 
                      }}
                    />
                  </div>
                </div>
              </Card>
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

        {/* Continue Button */}
        <Button
          onClick={onContinue}
          className="w-full py-6 text-lg font-semibold rounded-xl shadow-lg hover:scale-[1.02] transition-transform"
          style={{ backgroundColor: areaColor }}
        >
          {isLastArea ? "See Full Report" : "Continue to Next Area →"}
        </Button>
      </div>
    </div>
  );
};
