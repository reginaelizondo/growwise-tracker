import { useState } from "react";
import { Check, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import kineduLogo from "@/assets/logo-kinedu-blue.png";

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
  overallProgress?: number;
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
  overallProgress,
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
    <div className="min-h-screen bg-gradient-warm py-4 px-4">
      <div className="container max-w-2xl mx-auto">
        {/* Global Progress Bar */}
        {overallProgress !== undefined && (
          <div className="mb-4">
            <div className="flex justify-center mb-2">
              <img src={kineduLogo} alt="Kinedu" className="h-6" />
            </div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">Your report</span>
              <span className="text-[11px] font-bold text-primary">{Math.round(overallProgress)}% complete</span>
            </div>
            <Progress value={overallProgress} className="h-2 bg-muted/40" />
          </div>
        )}

        {/* Combined Area Header Card */}
        <div 
          className="rounded-2xl p-4 mb-4"
          style={{ backgroundColor: `hsl(var(--${areaName === 'Cognitive' ? 'cognitive' : areaName === 'Physical' ? 'physical' : areaName === 'Linguistic' ? 'linguistic' : 'emotional'}) / 0.08)` }}
        >
          {/* Baby info + Area - gray text */}
          <p className="text-center text-xs text-muted-foreground font-medium mb-1">
            {babyName || 'Baby'} • {babyAgeMonths} {babyAgeMonths === 1 ? 'month' : 'months'}
          </p>
          <p className="text-center text-xs text-muted-foreground mb-3">
            {areaName} Area
          </p>

          {/* Skill Name with icon */}
          <div className="flex items-center justify-center gap-2.5">
            <img src={areaIcon} alt={areaName} className="w-8 h-8 object-contain" />
            <h1 className="text-lg font-bold" style={{ color: areaColor }}>
              {skillName}
            </h1>
          </div>
        </div>

        {/* Go to Last Skill */}
        {skillNumber > 1 && onGoToLastSkill && (
          <div className="flex justify-center">
            <Button
              onClick={onGoToLastSkill}
              variant="ghost"
              size="sm"
              className="mb-2 text-xs text-muted-foreground font-bold"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous Skill
            </Button>
          </div>
        )}

        {/* Instruction text */}
        <p className="text-center text-sm text-muted-foreground mb-3 font-medium">
          Check all the milestones {babyName || 'baby'} can do
        </p>

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