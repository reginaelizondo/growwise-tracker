import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Target, TrendingUp } from "lucide-react";

export const DevelopmentalCategoriesCard = () => {
  return (
    <Card className="print-card print-mb-4">
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-3 text-center">Understanding Your Baby's Progress</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-yellow-600" />
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Mastered</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Excelling with skills above what's typical for their age
            </p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <Badge className="bg-green-100 text-green-800 border-green-300">On track</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Achieving what is expected at their age
            </p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Target className="w-4 h-4 text-blue-600" />
              <Badge className="bg-blue-100 text-blue-800 border-blue-300">Continue to reinforce</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              You can support your baby's growth with our activities
            </p>
          </div>
        </div>
        <p className="text-xs text-center text-muted-foreground italic mt-3">
          Every baby has their own unique journey!
        </p>
      </CardContent>
    </Card>
  );
};
