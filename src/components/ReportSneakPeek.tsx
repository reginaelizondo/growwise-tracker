/**
 * Report Sneak Peek - landing hero component
 * Shows a preview of the 4 area pace gauges to entice users
 */
import logoPhysical from "@/assets/Logo_Physical_HD.png";
import logoCognitive from "@/assets/Logo_Cognitive_HD.png";
import logoLinguistic from "@/assets/Logo_Linguistic_HD.png";
import logoEmotional from "@/assets/Logo_Emotional_HD.png";

type Area = {
  id: number;
  name: string;
  icon: string;
  color: string;
  bgTint: string;
  pace: number;
  example: string;
};

const AREAS: Area[] = [
  { id: 2, name: 'Cognitive', icon: logoCognitive, color: '#00A050', bgTint: 'rgba(0,200,83,0.06)', pace: 1.4, example: 'Problem solving' },
  { id: 1, name: 'Physical', icon: logoPhysical, color: '#0090CC', bgTint: 'rgba(0,163,224,0.06)', pace: 1.1, example: 'Motor skills' },
  { id: 3, name: 'Linguistic', icon: logoLinguistic, color: '#E87A00', bgTint: 'rgba(255,138,0,0.06)', pace: 0.8, example: 'First words' },
  { id: 4, name: 'Socio-Emotional', icon: logoEmotional, color: '#D94A82', bgTint: 'rgba(240,98,146,0.06)', pace: 1.2, example: 'Social bonds' },
];

// Same logic as Report.tsx → getPaceLabel
function getPaceLabel(pace: number): { label: string; emoji: string } {
  if (pace >= 1.8) return { label: 'Mastered!', emoji: '🌟' };
  if (pace >= 1.2) return { label: 'Ahead of pace', emoji: '🚀' };
  if (pace >= 0.8) return { label: 'On track', emoji: '✓' };
  return { label: 'Building up', emoji: '🌱' };
}

/**
 * Horizontal progress bar showing the baby's pace position.
 * Left = 0x, Middle = 1x (typical), Right = 2x.
 * Filled from 0x to the pace value.
 */
function PaceBar({ pace, color }: { pace: number; color: string }) {
  const fillPct = Math.max(0, Math.min(100, (pace / 2.0) * 100));

  return (
    <div className="relative mt-2">
      {/* Bar background */}
      <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${fillPct}%`, background: color }}
        />
      </div>

      {/* Tick at 1x (middle) */}
      <div
        className="absolute top-0 w-[2px] h-1.5 bg-white/80"
        style={{ left: '50%', transform: 'translateX(-50%)' }}
      />

      {/* Labels */}
      <div className="flex justify-between mt-1 text-[8px] text-gray-500 font-semibold">
        <span>0x</span>
        <span className="text-gray-400">typical</span>
        <span>2x</span>
      </div>
    </div>
  );
}

export default function ReportSneakPeek() {
  return (
    <div className="w-full max-w-xs mx-auto">
      <div
        className="rounded-3xl p-4 border-2 border-white/80 shadow-xl"
        style={{ background: 'linear-gradient(135deg, #f8f9ff 0%, #fff5f5 50%, #f0fdf4 100%)' }}
      >
        {/* Header */}
        <div className="text-center mb-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider opacity-70">
            You'll get a report like this
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 px-2 leading-snug">
            Your baby's development across <span className="font-semibold text-foreground">4 key areas</span>, compared to peers their age.
          </p>
        </div>

        {/* Area cards */}
        <div className="grid grid-cols-2 gap-2">
          {AREAS.map((area) => {
            const { label, emoji } = getPaceLabel(area.pace);
            return (
              <div
                key={area.id}
                className="rounded-xl p-2.5 border"
                style={{ background: area.bgTint, borderColor: area.color + '30' }}
              >
                {/* Top row: icon + name */}
                <div className="flex items-center gap-1 mb-1.5">
                  <img src={area.icon} alt={area.name} className="w-4 h-4" />
                  <span className="font-bold text-[10px] text-foreground leading-tight truncate">{area.name}</span>
                </div>

                {/* Score */}
                <div className="flex items-baseline justify-center gap-0.5">
                  <span className="text-2xl font-extrabold leading-none" style={{ color: area.color }}>
                    {area.pace.toFixed(1)}
                  </span>
                  <span className="text-sm font-bold leading-none" style={{ color: area.color }}>×</span>
                </div>

                {/* Status pill */}
                <div
                  className="mt-1.5 rounded-full py-0.5 px-1.5 text-center"
                  style={{ background: area.color + '18' }}
                >
                  <span className="text-[9px] font-bold leading-none" style={{ color: area.color }}>
                    {emoji} {label}
                  </span>
                </div>

                {/* Progress bar */}
                <PaceBar pace={area.pace} color={area.color} />
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-3 pt-3 border-t border-white/60">
          <p className="text-[10px] text-center text-muted-foreground leading-snug px-1">
            <span className="font-bold text-foreground">1×</span> = typical pace for age · higher = faster development
          </p>
        </div>
      </div>
    </div>
  );
}
