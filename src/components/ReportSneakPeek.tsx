/**
 * Report Sneak Peek - Variant B hero component
 * Shows a preview of the 4 area pace gauges to entice users
 */
import logoPhysical from "@/assets/Logo_Physical_HD.png";
import logoCognitive from "@/assets/Logo_Cognitive_HD.png";
import logoLinguistic from "@/assets/Logo_Linguistic_HD.png";
import logoEmotional from "@/assets/Logo_Emotional_HD.png";

const AREAS = [
  { id: 2, name: 'Cognitive', icon: logoCognitive, color: '#00C853', pace: 1.4 },
  { id: 1, name: 'Physical', icon: logoPhysical, color: '#00A3E0', pace: 1.1 },
  { id: 3, name: 'Linguistic', icon: logoLinguistic, color: '#FF8A00', pace: 0.8 },
  { id: 4, name: 'Socio-Emotional', icon: logoEmotional, color: '#F06292', pace: 1.2 },
];

function MiniGauge({ pace, color }: { pace: number; color: string }) {
  const totalBars = 20;
  const currentPos = Math.max(0, Math.min(1, pace / 2.0));

  return (
    <div className="flex items-end gap-[1.5px] h-4 w-full justify-center">
      {Array.from({ length: totalBars }, (_, i) => {
        const pos = i / (totalBars - 1);
        const dist = Math.abs(pos - currentPos);
        let height = 6;
        let opacity = 0.2;
        let barColor = '#CBD5E0';

        if (dist < 0.03) {
          height = 16; opacity = 1; barColor = color;
        } else if (dist < 0.1) {
          const intensity = 1 - (dist - 0.03) / 0.07;
          height = 6 + 10 * intensity;
          opacity = 0.3 + 0.7 * intensity;
          barColor = color;
        }

        return (
          <div
            key={i}
            className="rounded-t-sm"
            style={{
              width: 3,
              height,
              background: barColor,
              opacity,
              transition: 'height 0.6s ease',
            }}
          />
        );
      })}
    </div>
  );
}

export default function ReportSneakPeek() {
  return (
    <div className="w-full max-w-xs mx-auto">
      {/* Blurred report preview card */}
      <div
        className="rounded-3xl p-4 border-2 border-white/80 shadow-lg"
        style={{ background: 'linear-gradient(135deg, #f8f9ff 0%, #fff5f5 50%, #f0fdf4 100%)' }}
      >
        <p className="text-[10px] font-bold text-center text-muted-foreground uppercase tracking-wider mb-3 opacity-70">
          Sample Report Preview
        </p>

        <div className="grid grid-cols-2 gap-2.5">
          {AREAS.map((area) => (
            <div
              key={area.id}
              className="rounded-xl p-3 border"
              style={{ background: 'white', borderColor: '#E8E4DF' }}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <img src={area.icon} alt={area.name} className="w-5 h-5" />
                <span className="font-bold text-[10px] text-foreground leading-tight">{area.name}</span>
              </div>
              <div className="text-xl font-extrabold text-center" style={{ color: area.color }}>
                {area.pace.toFixed(1)}x
              </div>
              <MiniGauge pace={area.pace} color={area.color} />
              <div className="flex justify-between mt-1.5">
                <span className="text-[8px] text-muted-foreground font-semibold">0x</span>
                <span className="text-[8px] text-muted-foreground font-semibold">1x</span>
                <span className="text-[8px] text-muted-foreground font-semibold">2x</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
