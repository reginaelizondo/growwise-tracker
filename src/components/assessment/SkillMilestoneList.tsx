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
    <div className="min-h-screen bg-gradient-warm py-6 px-4">
      <div className="container max-w-2xl mx-auto">
        {/* Global Progress Bar */}
        {globalProgress !== undefined && <GlobalProgressBar progressPercent={globalProgress} />}

        {/* Baby info - plain text */}
        {babyName && (
          <p className="text-center text-sm text-muted-foreground font-semibold mb-2">
            {babyName} • {babyAgeMonths} {babyAgeMonths === 1 ? 'month' : 'months'}
          </p>
        )}

        {/* Go to Last Skill - only show if not on first skill */}
        {skillNumber > 1 && onGoToLastSkill && (
          <div className="flex justify-center">
            <Button
              onClick={onGoToLastSkill}
              variant="ghost"
              size="sm"
              className="mb-3 text-xs text-muted-foreground font-bold"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Go to Last Skill
            </Button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <img 
            src={areaIcon} 
            alt={areaName} 
            className="w-10 h-10 object-contain"
          />
          <div className="text-center">
            <h2 className="text-lg font-semibold" style={{ color: areaColor }}>
              {areaName}
            </h2>
            <p className="text-sm text-muted-foreground">
              Skill {skillNumber} of {totalSkills}
            </p>
          </div>
        </div>

        {/* Skill Name */}
        <Card className="p-6 mb-4 border-0 shadow-soft">
          <h1 className="text-2xl md:text-3xl font-bold text-center" style={{ color: areaColor }}>
            {skillName}
          </h1>
          <div 
            className="w-20 h-1 mx-auto mt-3 rounded-full opacity-40"
            style={{ backgroundColor: areaColor }}
          />
        </Card>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-3 px-1">
          <span className="text-sm font-medium" style={{ color: areaColor }}>
            {checkedCount} of {milestones.length} checked
          </span>
          <div className="flex gap-1">
            {milestones.map((m) => (
              <div
                key={m.milestone_id}
                className="w-2 h-2 rounded-full transition-all"
                style={{
                  backgroundColor: responses[m.milestone_id] === "yes"
                    ? areaColor 
                    : 'hsl(var(--muted))',
                  opacity: responses[m.milestone_id] === "yes" ? 1 : 0.4
                }}
              />
            ))}
          </div>
        </div>

        {/* Milestones List */}
        <div className="space-y-3 mb-6">
          {milestones.map((milestone) => {
            const isChecked = responses[milestone.milestone_id] === "yes";

            return (
              <Card 
                key={milestone.milestone_id} 
                className={`p-3 border-2 transition-all duration-200 cursor-pointer hover:shadow-md ${
                  isChecked ? 'shadow-sm' : 'shadow-soft'
                }`}
                style={{
                  borderColor: isChecked ? areaColor : 'hsl(var(--border))',
                }}
                onClick={() => handleToggle(milestone.milestone_id)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-foreground leading-relaxed font-medium">
                      {milestone.description || milestone.question}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Usually seen between {Math.max(0, milestone.age - 1)}–{milestone.age + 1} months
                    </p>
                  </div>
                  
                  {/* Check button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(milestone.milestone_id);
                    }}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                      isChecked 
                        ? 'text-white shadow-md scale-105' 
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                    }`}
                    style={{
                      backgroundColor: isChecked ? areaColor : undefined
                    }}
                  >
                    <Check className="w-4 h-4" strokeWidth={isChecked ? 3 : 2} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>


        {/* Next Skill Button */}
        <Button
          onClick={onNextSkill}
          className="w-full py-6 text-lg font-semibold rounded-xl shadow-lg"
          style={{ backgroundColor: areaColor }}
        >
          {isLastSkill ? `Go to ${areaName} feedback` : "Next Skill →"}
        </Button>
      </div>
    </div>
  );
};