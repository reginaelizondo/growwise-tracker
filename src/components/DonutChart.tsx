import { useState } from "react";
import iconCognitive from "@/assets/icon-cognitive.png";
import iconLinguistic from "@/assets/icon-linguistic.png";
import iconPhysical from "@/assets/icon-physical.png";
import iconSocioemotional from "@/assets/icon-socioemotional.png";
import masteredIcon from "@/assets/mastered-icon.png";
import onTrackIcon from "@/assets/on-track-icon.png";
import needsPracticeIcon from "@/assets/needs-practice-icon.png";

interface DonutChartProps {
  data: Array<{
    name: string;
    value: number;
    color: string;
    status?: "ahead" | "on-track" | "behind";
    statusText?: string;
  }>;
  size?: number;
  strokeWidth?: number;
  onSegmentHover?: (segment: { name: string; value: number } | null) => void;
  showGlobalProgress?: boolean;
}

const areaIcons = {
  "Physical": iconPhysical,
  "Cognitive": iconCognitive,
  "Linguistic": iconLinguistic,
  "Socio-emotional": iconSocioemotional,
};

// Order for concentric rings (inner to outer)
const ringOrder = ["Cognitive", "Physical", "Linguistic", "Socio-emotional"];

export const DonutChart = ({ 
  data, 
  size = 320, 
  strokeWidth = 20,
  onSegmentHover,
  showGlobalProgress = false
}: DonutChartProps) => {
  const [hoveredArea, setHoveredArea] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  
  const center = size / 2;

  // Calculate average - prevent NaN
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const average = data.length > 0 ? Math.round(total / data.length) : 0;

  // Reorder data to match ring order (inner to outer)
  const orderedData = ringOrder.map(name => 
    data.find(item => item.name === name)!
  ).filter(Boolean);

  // Create rings with calculated radii (from inner to outer)
  const rings = orderedData.map((item, index) => {
    // Radius multipliers for each ring (inner to outer) - pushed further outward to avoid center overlap
    const radiusMultipliers = [0.48, 0.62, 0.76, 0.90];
    const ringRadius = (size / 2) * radiusMultipliers[index];
    const circumference = 2 * Math.PI * ringRadius;
    const progressLength = (item.value / 100) * circumference;

    // Calculate icon position at the end of progress arc (top of circle, rotated by progress)
    const progressAngle = (item.value / 100) * 360 - 90; // Start from top (12 o'clock)
    const iconX = center + ringRadius * Math.cos((progressAngle * Math.PI) / 180);
    const iconY = center + ringRadius * Math.sin((progressAngle * Math.PI) / 180);

    return {
      ...item,
      radius: ringRadius,
      circumference,
      progressLength,
      iconX,
      iconY,
      index,
    };
  });

  // Calculate which ring is being hovered based on mouse distance from center
  const getHoveredRing = (mouseX: number, mouseY: number) => {
    const dx = mouseX - center;
    const dy = mouseY - center;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Define ring boundaries - updated to match new radiusMultipliers
    const boundaries = [
      { min: 0, max: (size / 2) * 0.55, name: "Cognitive" },
      { min: (size / 2) * 0.55, max: (size / 2) * 0.69, name: "Physical" },
      { min: (size / 2) * 0.69, max: (size / 2) * 0.83, name: "Linguistic" },
      { min: (size / 2) * 0.83, max: size / 2, name: "Socio-emotional" },
    ];

    const ring = boundaries.find(b => distance >= b.min && distance < b.max);
    return ring ? ring.name : null;
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative inline-flex items-center justify-center">
        <svg 
          width={size} 
          height={size} 
          className="filter drop-shadow-lg"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            setMousePosition({ x, y });
            
            const hoveredRing = getHoveredRing(x, y);
            if (hoveredRing !== hoveredArea) {
              setHoveredArea(hoveredRing);
              const ringData = data.find(d => d.name === hoveredRing);
              onSegmentHover?.(ringData ? { name: ringData.name, value: ringData.value } : null);
            }
          }}
          onMouseLeave={() => {
            setMousePosition(null);
            setHoveredArea(null);
            onSegmentHover?.(null);
          }}
        >
          {/* White center circle */}
          {showGlobalProgress && (
            <g>
              <circle
                cx={center}
                cy={center}
                r={(size / 2) * 0.40}
                fill="white"
                className="drop-shadow-md"
              />
            </g>
          )}

          {/* Render rings from outer to inner for proper layering */}
          {[...rings].reverse().map((ring) => (
            <g key={ring.name}>
              {/* Background circle (light) */}
              <circle
                cx={center}
                cy={center}
                r={ring.radius}
                fill="none"
                stroke={ring.color}
                strokeWidth={strokeWidth}
                opacity={0.15}
              />
              
              {/* Glow effect on hover */}
              {hoveredArea === ring.name && (
                <circle
                  cx={center}
                  cy={center}
                  r={ring.radius}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth={strokeWidth}
                  opacity={0.3}
                  style={{ filter: 'blur(12px)' }}
                  strokeDasharray={`${ring.progressLength} ${ring.circumference}`}
                  strokeDashoffset={0}
                  transform={`rotate(-90 ${center} ${center})`}
                  strokeLinecap="round"
                />
              )}
              
              {/* Progress circle (solid) */}
              <circle
                cx={center}
                cy={center}
                r={ring.radius}
                fill="none"
                stroke={ring.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${ring.progressLength} ${ring.circumference}`}
                strokeDashoffset={0}
                transform={`rotate(-90 ${center} ${center})`}
                className="transition-all duration-300 cursor-pointer"
                style={{
                  opacity: hoveredArea === ring.name ? 1 : 0.95,
                }}
                strokeLinecap="round"
              />
            </g>
          ))}

          {/* Icons at end of progress arcs */}
          {rings.map((ring) => {
            const iconSrc = areaIcons[ring.name as keyof typeof areaIcons];
            if (!iconSrc) return null;
            
            return (
              <g key={`icon-${ring.name}`}>
                {/* Icon image */}
                <image
                  href={iconSrc}
                  x={ring.iconX - 18}
                  y={ring.iconY - 18}
                  width={36}
                  height={36}
                  className="drop-shadow-sm"
                />
              </g>
            );
          })}

          {/* Center text - Global Progress - Rendered last to stay on top */}
          {showGlobalProgress && (
            <g style={{ pointerEvents: 'none' }}>
              <foreignObject
                x={center - (size / 2) * 0.25}
                y={center - (size / 2) * 0.17}
                width={(size / 2) * 0.5}
                height={(size / 2) * 0.34}
              >
                <div className="flex flex-col items-center justify-center w-full h-full relative z-50">
                  <p className="text-2xl sm:text-3xl font-bold text-foreground leading-none mb-1">
                    {average}%
                  </p>
                  <p className="text-[8px] sm:text-[9px] font-semibold text-muted-foreground uppercase tracking-wider text-center leading-tight">
                    Global
                  </p>
                  <p className="text-[8px] sm:text-[9px] font-semibold text-muted-foreground uppercase tracking-wider text-center leading-tight">
                    Progress
                  </p>
                </div>
              </foreignObject>
            </g>
          )}
        </svg>
        
        {/* Tooltip on hover */}
        {hoveredArea && mousePosition && (() => {
          const hoveredData = data.find(area => area.name === hoveredArea);
          const iconSrc = hoveredData ? areaIcons[hoveredData.name as keyof typeof areaIcons] : null;
          
          if (!hoveredData || !iconSrc) return null;
          
          // Calculate tooltip dimensions (approximate)
          const tooltipWidth = 200; // Smaller width
          const tooltipHeight = 50; // Smaller height
          
          // Calculate initial position
          let left = mousePosition.x + 16;
          let top = mousePosition.y - 50;
          
          // Adjust if tooltip goes beyond right edge
          if (left + tooltipWidth > size) {
            left = mousePosition.x - tooltipWidth - 16;
          }
          
          // Adjust if tooltip goes beyond left edge
          if (left < 0) {
            left = 8;
          }
          
          // Adjust if tooltip goes beyond top edge
          if (top < 0) {
            top = mousePosition.y + 16;
          }
          
          // Adjust if tooltip goes beyond bottom edge
          if (top + tooltipHeight > size) {
            top = size - tooltipHeight - 8;
          }
          
          const statusIcon = 
            hoveredData.status === "ahead" ? masteredIcon :
            hoveredData.status === "on-track" ? onTrackIcon :
            hoveredData.status === "behind" ? needsPracticeIcon :
            onTrackIcon;
          
          const statusColor = 
            hoveredData.status === "ahead" ? "#FFD700" :
            hoveredData.status === "on-track" ? "#4CAF50" :
            "#2196F3";
          
          return (
            <div 
              className="absolute bg-popover border border-border rounded-lg shadow-lg px-3 py-2 z-50 pointer-events-none"
              style={{
                left: `${left}px`,
                top: `${top}px`,
                animation: "fade-in 0.15s ease-out"
              }}
            >
              <div className="flex items-center gap-2">
                <img src={iconSrc} alt={hoveredData.name} className="w-5 h-5" />
                <span className="text-sm font-semibold text-foreground">
                  {hoveredData.name}
                </span>
                <span className="text-sm text-muted-foreground">—</span>
                <span className="text-sm font-bold" style={{ color: hoveredData.color }}>
                  {hoveredData.value}% completed
                </span>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
