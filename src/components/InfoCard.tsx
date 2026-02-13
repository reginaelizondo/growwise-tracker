import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Info, Lightbulb } from "lucide-react";

interface InfoCardProps {
  title: string;
  description: string;
  type?: 'info' | 'warning' | 'tip';
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const InfoCard = ({ 
  title, 
  description, 
  type = 'info',
  action 
}: InfoCardProps) => {
  const icons = {
    info: <Info className="w-12 h-12 text-muted-foreground opacity-50" />,
    warning: <AlertCircle className="w-12 h-12 text-warning opacity-50" />,
    tip: <Lightbulb className="w-12 h-12 text-primary opacity-50" />
  };

  return (
    <Card className="p-8 border-2 border-dashed bg-muted/30">
      <div className="text-center max-w-md mx-auto">
        <div className="flex justify-center mb-4">
          {icons[type]}
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6">
          {description}
        </p>
        {action && (
          <Button 
            variant="outline"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )}
      </div>
    </Card>
  );
};
