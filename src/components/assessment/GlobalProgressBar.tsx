import { Progress } from "@/components/ui/progress";
import logoKinedu from "@/assets/logo-kinedu-blue.png";

interface GlobalProgressBarProps {
  progressPercent: number;
}

export const GlobalProgressBar = ({ progressPercent }: GlobalProgressBarProps) => (
  <div className="w-full max-w-3xl mx-auto mb-6">
    <div className="flex justify-center mb-4">
      <img src={logoKinedu} alt="Kinedu" className="h-8" />
    </div>
    <div className="flex justify-between items-center mb-2">
      <span className="text-xs font-medium text-muted-foreground">Your report</span>
      <span className="text-xs font-bold text-primary">{Math.round(progressPercent)}% complete</span>
    </div>
    <Progress value={progressPercent} className="h-2.5 bg-muted/50" />
  </div>
);
