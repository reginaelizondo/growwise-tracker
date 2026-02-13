interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: { line1: string; line2: string };
}

export const CircularProgress = ({ 
  percentage, 
  size = 200, 
  strokeWidth = 12,
  color = "hsl(var(--primary))",
  label
}: CircularProgressProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          fill="none"
          opacity={0.2}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl md:text-4xl font-bold" style={{ color }}>
          {percentage}%
        </span>
        <span className="text-xs text-muted-foreground mt-0.5 text-center leading-tight">
          {label ? (
            <>
              {label.line1}<br/><span className="font-bold">{label.line2}</span>
            </>
          ) : (
            <>
              of this skill<br/><span className="font-bold">mastered</span>
            </>
          )}
        </span>
      </div>
    </div>
  );
};
