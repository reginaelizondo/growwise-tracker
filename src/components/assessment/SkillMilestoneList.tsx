import { useState } from "react";
import { Check, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GlobalProgressBar } from "./GlobalProgressBar";

interface Milestone {
  milestone_id: number;
  age: number;
  question: string;
  description: string;
  skill_id: number;
  skill_name: string;
  area_id: number;
  area_name: string;
}

interface SkillMilestoneListProps {
  areaName: string;
  areaIcon: string;
  skillName: string;
  skillNumber: number;
  totalSkills: number;
  milestones: Milestone[];
  responses: { [key: number]: string };
  areaColor: string;
  onResponse: (milestoneId: number, answer: "yes" | "no") => void;
  onNextSkill: () => void;
  onGoToLastSkill?: () => void;
  isLastSkill: boolean;
  babyName?: string;
  babyAgeMonths?: number;
  globalProgress?: number;
}

export const SkillMilestoneList = ({
  areaName,
  areaIcon,
  skillName,
  skillNumber,
  totalSkills,
  milestones,
  responses,
  areaColor,
  onResponse,
  onNextSkill,
  onGoToLastSkill,
  isLastSkill,
  babyName,
  babyAgeMonths,
  globalProgress,
}: SkillMilestoneListProps) => {
  // Count checked (yes) milestones
  const checkedCount = milestones.filter(m => responses[m.milestone_id] === "yes").length;

  // Toggle: if already yes, set to no (uncheck), otherwise set to yes
  const handleToggle = (milestoneId: number) => {
    const currentAnswer = responses[milestoneId];
    if (currentAnswer === "yes") {
      onResponse(milestoneId, "no");
    } else {
      onResponse(milestoneId, "yes");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-warm pt-0 px-3 pb-6">
      <div className="container max-w-2xl mx-auto">
        {/* Sticky compact header */}
        <div className="sticky top-0 z-20 bg-gradient-warm pt-3 pb-2">
          {globalProgress !== undefined && <GlobalProgressBar progressPercent={globalProgress} />}
          
          {/* Compact skill header: icon + skill name + back button */}
          <div className="flex items-center gap-2 mt-1">
            {skillNumber > 1 && onGoToLastSkill && (
              <button
                onClick={onGoToLastSkill}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <img src={areaIcon} alt={areaName} className="w-6 h-6 object-contain" />
            <h2 className="text-sm font-bold truncate" style={{ color: areaColor }}>
              {skillName}
            </h2>
          </div>
        </div>

        {/* Instruction */}
        <p className="text-xs text-muted-foreground text-center mt-2 mb-3">
          Check the ones {babyName || 'baby'} can already do ✓
        </p>

        {/* Milestones List - compact */}
        <div className="space-y-1.5 mb-4">
          {milestones.map((milestone) => {
            const isChecked = responses[milestone.milestone_id] === "yes";

            return (
              <div 
                key={milestone.milestone_id} 
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all duration-150 cursor-pointer ${
                  isChecked ? 'border-current bg-opacity-5' : 'border-border bg-card'
                }`}
                style={{
                  borderColor: isChecked ? areaColor : undefined,
                  backgroundColor: isChecked ? `${areaColor}08` : undefined,
                }}
                onClick={() => handleToggle(milestone.milestone_id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground leading-snug font-medium">
                    {milestone.description || milestone.question}
                  </p>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggle(milestone.milestone_id);
                  }}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-150 flex-shrink-0 ${
                    isChecked 
                      ? 'text-white scale-105' 
                      : 'bg-muted/50 text-muted-foreground'
                  }`}
                  style={{
                    backgroundColor: isChecked ? areaColor : undefined
                  }}
                >
                  <Check className="w-3.5 h-3.5" strokeWidth={isChecked ? 3 : 2} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Next Skill Button */}
        <Button
          onClick={onNextSkill}
          className="w-full py-5 text-base font-semibold rounded-xl shadow-lg"
          style={{ backgroundColor: areaColor }}
        >
          {isLastSkill ? `Go to ${areaName} feedback` : "Next Skill →"}
        </Button>
      </div>
    </div>
  );
};