import { useState } from "react";
import { HelpCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface MilestoneHelpButtonProps {
  milestoneDescription: string;
  babyAgeMonths?: number;
  areaColor: string;
}

export const MilestoneHelpButton = ({
  milestoneDescription,
  babyAgeMonths,
  areaColor,
}: MilestoneHelpButtonProps) => {
  const [open, setOpen] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchExplanation = async () => {
    if (explanation) {
      setOpen(true);
      return;
    }
    setOpen(true);
    setLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(`${supabaseUrl}/functions/v1/explain-milestone`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          milestone_description: milestoneDescription,
          baby_age_months: babyAgeMonths || 6,
        }),
      });
      const data = await res.json();
      setExplanation(data.explanation || "Could not get explanation.");
    } catch {
      setExplanation("Could not get explanation right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          fetchExplanation();
        }}
        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
        aria-label="Explain this milestone"
      >
        <HelpCircle className="w-4 h-4 text-muted-foreground" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold" style={{ color: areaColor }}>
              What does this mean?
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-muted-foreground mt-1">
              {milestoneDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <p className="text-sm text-foreground leading-relaxed">{explanation}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
