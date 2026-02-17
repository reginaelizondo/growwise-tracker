import { useState } from "react";
import { Button } from "@/components/ui/button";
import { calculatePace } from "@/components/PaceGauge";
import { Star, AlertTriangle, Info } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

const getOrdinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const getPercentileColor = (percentile: number | null, areaColor: string) => {
  if (percentile === null) return areaColor;
  if (percentile >= 75) return areaColor;
  if (percentile >= 40) return areaColor;
  return "hsl(32, 98%, 50%)";
};

const getPaceDescription = (skills: SkillSummary[]) => {
  const validSkills = skills.filter(s => s.percentile !== null);
  if (validSkills.length === 0) return "Developing steadily";
  const avg = validSkills.reduce((sum, s) => sum + (s.percentile ?? 50), 0) / validSkills.length;
  if (avg >= 75) return "Ahead of most babies their age";
  if (avg >= 50) return "Right on track";
  if (avg >= 30) return "Developing at their own pace";
  return "Building foundations — keep going!";
};

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

  const validSkills = skills.filter(s => s.percentile !== null);
  const bestSkill = validSkills.length > 0
    ? validSkills.reduce((a, b) => (a.percentile ?? 0) > (b.percentile ?? 0) ? a : b)
    : null;
  const worstSkill = validSkills.length > 0
    ? validSkills.reduce((a, b) => (a.percentile ?? 100) < (b.percentile ?? 100) ? a : b)
    : null;
  const showWorst = worstSkill && (worstSkill.percentile ?? 100) < 30 && worstSkill.skill_id !== bestSkill?.skill_id;

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
            <p className="text-xs text-foreground">Represents an <span className="font-semibold">average pace</span></p>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <span className="text-xs font-bold text-muted-foreground">&lt;1.0×</span>
          </div>
          <div className="flex-1 pt-1">
            <p className="text-xs text-foreground">Developing at their <span className="font-semibold">own rhythm</span> — completely normal</p>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
            <span className="text-xs font-bold text-warning">&gt;1.0×</span>
          </div>
          <div className="flex-1 pt-1">
            <p className="text-xs text-foreground">Reaching milestones <span className="font-semibold">earlier than average</span></p>
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
              <img src={areaIcon} alt={areaName} className="w-7 h-7 object-contain" />
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

        {/* Pace of Development Card */}
        <div
          className="rounded-xl p-4 mb-5"
          style={{ backgroundColor: `${areaColor}08`, border: `1px solid ${areaColor}20` }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Pace of Development
              </span>
              {isMobile ? (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <button className="p-0.5 rounded-full hover:bg-muted/50 active:bg-muted transition-colors">
                      <Info className="w-3.5 h-3.5 text-muted-foreground" />
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
                        <Info className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-muted-foreground transition-colors" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm p-4 space-y-3" side="bottom">
                      {infoContent}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>

          <p className="text-sm font-semibold text-foreground mb-3">
            {getPaceDescription(skills)}
          </p>

          {/* Highlight Badges */}
          <div className="flex flex-wrap gap-2">
            {bestSkill && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ backgroundColor: `${areaColor}15`, color: areaColor }}>
                <Star className="w-3 h-3 fill-current" />
                <span>{bestSkill.skill_name}</span>
                <span className="opacity-70">·</span>
                <span>{getOrdinal(bestSkill.percentile ?? 50)}</span>
              </div>
            )}
            {showWorst && worstSkill && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ backgroundColor: 'hsl(32, 98%, 95%)', color: 'hsl(32, 98%, 40%)' }}>
                <AlertTriangle className="w-3 h-3" />
                <span>{worstSkill.skill_name}</span>
                <span className="opacity-70">·</span>
                <span>{getOrdinal(worstSkill.percentile ?? 0)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Skills Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-[2px] flex-1" style={{ backgroundColor: `${areaColor}30` }} />
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: areaColor }}>
            Skills
          </span>
          <div className="h-[2px] flex-1" style={{ backgroundColor: `${areaColor}30` }} />
        </div>

        {/* Skills List */}
        <div className="space-y-4 mb-6">
          {skills.map((skill) => {
            const pace = skill.percentile !== null ? calculatePace(skill.percentile) : 1.0;
            const barWidth = Math.min(Math.max((pace / 2.0) * 100, 5), 100);
            const percentileColor = getPercentileColor(skill.percentile, areaColor);

            return (
              <div key={skill.skill_id} className="rounded-xl bg-card border border-border/50 p-3.5">
                {/* Top row: name + percentile */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-foreground truncate">
                      {skill.skill_name}
                    </h3>
                    {/* Milestone dots */}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div className="flex gap-[3px]">
                        {Array.from({ length: skill.totalCount }, (_, i) => (
                          <div
                            key={i}
                            className="w-[6px] h-[6px] rounded-full"
                            style={{
                              backgroundColor: i < skill.masteredCount ? areaColor : 'hsl(var(--muted))',
                            }}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {skill.masteredCount}/{skill.totalCount}
                      </span>
                    </div>
                  </div>
                  <div className="text-right pl-3">
                    <span
                      className="text-xl font-extrabold"
                      style={{ color: percentileColor }}
                    >
                      {skill.percentile !== null ? `${Math.round(skill.percentile)}%` : '—'}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                  {/* 1.0x marker */}
                  <div
                    className="absolute top-0 bottom-0 w-[1.5px] bg-foreground/20 z-10"
                    style={{ left: '50%' }}
                  />
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: areaColor,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">0×</span>
                  <span className="text-[10px] font-semibold" style={{ color: areaColor }}>
                    {pace.toFixed(1)}×
                  </span>
                  <span className="text-[10px] text-muted-foreground">2×</span>
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
