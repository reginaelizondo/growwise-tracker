import { useState } from "react";
import { Info, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
interface PaceGaugeProps {
  percentile?: number;
  pace?: number;
  color: string;
  compact?: boolean;
  areaName?: string;
  hideGauge?: boolean;
  hideValue?: boolean;
  showContextualMessage?: boolean;
}
/**
 * Convert percentile (0-100) to pace multiplier (0.0x - 2.0x)
 * Uses exponential curves with gamma to create a smooth, non-linear mapping
 * 
 * Key anchor point: percentile 50 = pace 1.0x (average)
 * 
 * Examples:
 * - p0   → 0.0×
 * - p10  → 0.2×
 * - p20  → 0.4×
 * - p30  → 0.6×
 * - p40  → 0.8×
 * - p50  → 1.0× (average) ✓
 * - p60  → 1.2×
 * - p70  → 1.4×
 * - p80  → 1.6×
 * - p90  → 1.8×
 * - p95  → 1.9×
 * - p100 → 2.0×
 */
export const calculatePace = (percentile: number): number => {
  const P_MIN = 0.0;      // Floor: 0.0x
  const P_MAX = 2.0;      // Ceiling: 2.0x
  const P0 = 0.5;         // 0.5 (50%) → 1.0x
  
  // Gamma controls curve shape
  const GAMMA_UP = 1.0;   // Linear progression from 33.3% to 100%
  const GAMMA_DOWN = 1.2; // Smooth decline below 33%

  // Normalize percentile to [0, 1]
  const r = Math.max(0, Math.min(100, percentile)) / 100.0;

  let pace;
  if (r >= P0) {
    // Upper segment [50%..100%] → [1.0x..2.0x]
    const s = (r - P0) / (1 - P0);
    pace = 1 + (P_MAX - 1) * Math.pow(s, GAMMA_UP);
  } else {
    // Lower segment [0%..50%] → [0.0x..1.0x]
    const t = (P0 - r) / P0;
    pace = 1 - (1 - P_MIN) * Math.pow(t, GAMMA_DOWN);
  }

  // Clamp and round to 1 decimal for UI
  pace = Math.max(P_MIN, Math.min(P_MAX, pace));
  return Math.round(pace * 10) / 10;
};
const getPaceDescription = (pace: number, color: string): JSX.Element => {
  const Highlight = ({
    children
  }: {
    children: React.ReactNode;
  }) => <span className="font-bold" style={{
    color
  }}>{children}</span>;
  if (pace <= 0.7) {
    return <>
        Your baby is developing <Highlight>at their own pace</Highlight>, <Highlight>taking a bit more time</Highlight> to reach milestones for this skill.
      </>;
  }
  if (pace <= 0.9) {
    return <>
        Your baby is developing <Highlight>on their own rhythm</Highlight>, progressing steadily at a <Highlight>slightly slower pace</Highlight> for this skill.
      </>;
  }
  if (pace <= 1.1) {
    return <>
        Your baby is developing <Highlight>right on track</Highlight> with the <Highlight>average pace</Highlight> for this skill.
      </>;
  }
  if (pace <= 1.3) {
    return <>
        Your baby is developing at an <Highlight>accelerated pace</Highlight>, reaching milestones <Highlight>a bit earlier</Highlight> than average for this skill.
      </>;
  }
  if (pace <= 1.5) {
    return <>
        Your baby is developing <Highlight>ahead of the curve</Highlight>, mastering skills <Highlight>notably faster than average</Highlight> for this skill.
      </>;
  }
  return <>
      Your baby is developing at a <Highlight>remarkably advanced pace</Highlight>, reaching milestones <Highlight>significantly earlier than average</Highlight> for this skill.
    </>;
};

// Get contextual message based on pace value
const getContextualMessage = (pace: number): { message: string; emoji: string } => {
  if (pace < 0.3) {
    return { message: "Developing steadily — targeted activities can accelerate growth", emoji: "🌱" };
  }
  if (pace <= 0.7) {
    return { message: "Developing steadily — targeted activities can accelerate growth", emoji: "🌱" };
  }
  if (pace <= 0.9) {
    return { message: "Progressing well — daily play maintains momentum", emoji: "💪" };
  }
  if (pace <= 1.2) {
    return { message: "On track — keep up the great work!", emoji: "⭐" };
  }
  return { message: "Ahead of pace — excellent progress!", emoji: "🚀" };
};

const getColorForPace = (pace: number): string => {
  if (pace < 0.9) return "hsl(220, 15%, 60%)"; // blue-gray for slower
  if (pace <= 1.1) return "hsl(142, 76%, 36%)"; // green for on track
  return "hsl(32, 98%, 56%)"; // warm orange for ahead
};
export const PaceGauge = ({
  percentile,
  pace: providedPace,
  color,
  compact = false,
  areaName,
  hideGauge = false,
  hideValue = false,
  showContextualMessage = false
}: PaceGaugeProps) => {
  const isMobile = useIsMobile();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Visual display constants (gauge scale)
  const MIN_PACE_DISPLAY = 0;
  const MAX_PACE_DISPLAY = 2;
  const DISPLAY_RANGE = MAX_PACE_DISPLAY - MIN_PACE_DISPLAY;
  
  // If pace is provided directly, use it; otherwise calculate from percentile
  const pace = providedPace !== undefined ? providedPace : calculatePace(percentile ?? 0);
  const paceColor = getColorForPace(pace);
  const paceDescription = getPaceDescription(pace, color);
  const contextualMessage = getContextualMessage(pace);

  // Calculate position on gauge - map real pace to visual scale (0 to 3)
  const gaugePosition = Math.max(0, Math.min(100, 
    ((pace - MIN_PACE_DISPLAY) / DISPLAY_RANGE) * 100
  ));
  
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
              Developing at their <span className="font-semibold">own rhythm</span> — completely normal, as every baby progresses differently
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
            <span className="text-xs font-bold text-warning">&gt;1.0×</span>
          </div>
          <div className="flex-1 pt-1">
            <p className="text-xs text-foreground">
              May be reaching milestones <span className="font-semibold">earlier than average</span>
            </p>
          </div>
        </div>
      </div>

      <div className="pt-1.5 border-t border-border/50">
        <p className="text-xs text-muted-foreground italic">
          Most babies are between <span className="font-semibold text-foreground">0.8× and 1.2×</span>. These values aren't good or bad — they simply show your baby's unique pace within the expected range.
        </p>
      </div>
    </>
  );
  
  return <div className={compact ? "space-y-1.5" : hideGauge ? "space-y-2" : "space-y-3"}>
      {/* Title with tooltip/dialog - Hide in compact mode AND when hideGauge is true (used in overall progress section) */}
      {!compact && !hideGauge && (
        <div className="flex items-center justify-center gap-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Pace of Development</h3>
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
      )}

      {/* Pace value with info icon when hideGauge is true */}
      {!hideValue && (
      <div className="text-center mb-0">
        <div className="flex items-center justify-center gap-2">
          <div className={compact ? "text-xl font-semibold" : hideGauge ? "text-4xl font-bold" : "text-4xl font-bold"} style={{
            color: color
          }}>
            {compact && areaName ? `${areaName} - ` : ''}{pace.toFixed(1)}×
          </div>
          {hideGauge && (
            isMobile ? (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <button className="inline-flex items-center justify-center p-1.5 rounded-full hover:bg-muted/50 active:bg-muted transition-colors">
                    <Info className="w-5 h-5 text-muted-foreground" />
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
                    <button className="inline-flex items-center justify-center p-1">
                      <Info className="w-5 h-5 text-muted-foreground/60 hover:text-muted-foreground transition-colors" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm p-4 space-y-3" side="bottom">
                    {infoContent}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          )}
        </div>
      </div>
      )}

      {/* Contextual message - only show when showContextualMessage is true */}
      {showContextualMessage && (
        <div className="text-center mt-2">
          <p className="text-base text-muted-foreground">
            {contextualMessage.message}
          </p>
        </div>
      )}

      {/* Gauge visualization with vertical lines - Hide if hideGauge is true */}
      {!hideGauge && (
        <div className={compact ? "relative px-2 -mt-2" : "relative px-2 -mt-4"}>
        {/* Labels */}
        <div className="flex justify-between text-xs text-muted-foreground mb-3">
          
          
          
        </div>

        {/* Vertical lines gauge */}
      <div className={compact ? "relative h-[22px] flex items-end justify-between gap-[1.5px]" : "relative h-16 flex items-end justify-between gap-[2px]"}>
          {Array.from({
          length: compact ? 30 : 60
        }).map((_, i) => {
          const totalBars = compact ? 30 : 60;
          const position = i / (totalBars - 1);
          
          const currentPacePosition = (pace - MIN_PACE_DISPLAY) / DISPLAY_RANGE;
          const visualDistance = Math.abs(position - currentPacePosition);
          const isCurrentPosition = visualDistance < 0.025;
          
          const gradientRange = compact ? 0.08 : 0.05;
          const isInGradient = visualDistance > 0.025 && visualDistance <= gradientRange;
          
          const baseHeight = compact ? 10 : 40;
          const maxHeight = compact ? 22 : 60;
          let lineHeight = baseHeight;
          let lineOpacity = compact ? 0.45 : 0.2;
          let lineColor = compact ? "#E8E9ED" : "hsl(220, 15%, 50%)";
          
          if (isCurrentPosition) {
            lineHeight = maxHeight;
            lineOpacity = 1;
            lineColor = color;
          } else if (isInGradient) {
            const intensity = 1 - (visualDistance - 0.025) / (gradientRange - 0.025);
            lineHeight = baseHeight + ((maxHeight - baseHeight) * intensity);
            lineOpacity = compact ? 0.5 + (0.5 * intensity) : 0.3 + (0.7 * intensity);
            lineColor = color;
          }
          
          return <div key={i} className="flex-1 rounded-t-sm" style={{
            height: `${lineHeight}px`,
            backgroundColor: lineColor,
            opacity: lineOpacity,
            minWidth: compact ? '3px' : undefined,
            boxShadow: isCurrentPosition ? `0 0 ${compact ? '6' : '12'}px ${color}40` : 'none'
          }} />;
        })}
        </div>

        {/* Tick marks - hide in compact */}
        {!compact && (
          <div className="relative h-2 mt-1">
            <div className="absolute top-0 left-0 w-0.5 h-2 bg-muted-foreground/40" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-muted-foreground/60" />
            <div className="absolute top-0 right-0 w-0.5 h-2 bg-muted-foreground/40" />
          </div>
        )}

        {/* Scale labels — compact: only 0× and 2× */}
        <div className={compact ? "flex justify-between text-[8px] text-muted-foreground/40 mt-0 leading-none" : "flex justify-between text-[10px] text-muted-foreground/70 mt-1"}>
          <span>0×</span>
          {!compact && <span>1×</span>}
          <span>2×</span>
        </div>
      </div>
      )}
    </div>;
};