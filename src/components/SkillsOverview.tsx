import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TrendingUp, Baby, CheckCircle, Play } from "lucide-react";

import iconCognitive from "@/assets/icon-cognitive.png";
import iconLinguistic from "@/assets/icon-linguistic.png";
import iconPhysical from "@/assets/icon-physical.png";
import iconSocioemotional from "@/assets/icon-socioemotional.png";

interface SkillArea {
  id: string;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  iconBg: string;
  count: number;
  description: string;
}

const skillsData: SkillArea[] = [
  {
    id: "physical",
    name: "Physical",
    icon: iconPhysical,
    color: "text-sky-600 dark:text-sky-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
    iconBg: "bg-blue-100 dark:bg-blue-900/50",
    count: 20,
    description: "Motor control, balance, coordination, strength, and both large and small muscle development."
  },
  {
    id: "cognitive",
    name: "Cognitive",
    icon: iconCognitive,
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    borderColor: "border-green-200 dark:border-green-800",
    iconBg: "bg-green-100 dark:bg-green-900/50",
    count: 19,
    description: "Learning, thinking, problem-solving, and understanding the world through exploration and discovery."
  },
  {
    id: "linguistic",
    name: "Linguistic",
    icon: iconLinguistic,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    borderColor: "border-orange-200 dark:border-orange-800",
    iconBg: "bg-orange-100 dark:bg-orange-900/50",
    count: 18,
    description: "Communication skills, language comprehension, vocabulary building, and early literacy development."
  },
  {
    id: "social-emotional",
    name: "Social-Emotional",
    icon: iconSocioemotional,
    color: "text-pink-700 dark:text-pink-400",
    bgColor: "bg-pink-50 dark:bg-pink-950/30",
    borderColor: "border-pink-200 dark:border-pink-800",
    iconBg: "bg-pink-100 dark:bg-pink-900/50",
    count: 17,
    description: "Building relationships, self-awareness, emotional regulation, empathy, and social interaction skills."
  }
];

export const SkillsOverview = () => {
  const [showVideoDialog, setShowVideoDialog] = useState(false);

  return (
    <>
      <section id="skills-section" className="container mx-auto px-4 pt-0 pb-0 md:pt-0 md:pb-0">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6 animate-fade-in">
            <h2 className="text-lg md:text-xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
              Milestones are the foundation of your baby's growth
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground max-w-3xl mx-auto mb-4">
              Explore 74 research-based skills across four key developmental areas
            </p>
          </div>

        {/* Skills Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {skillsData.map((area, index) => (
            <Card 
              key={area.id}
              className={`${area.bgColor} ${area.borderColor} border-2 overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 animate-fade-in p-3`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center gap-3 mb-2">
                <img src={area.icon} alt={`${area.name} icon`} className="w-8 h-8 flex-shrink-0" />
                <div className="flex-1 text-left min-w-0">
                  <h3 className={`text-sm font-semibold leading-tight ${area.color}`}>{area.name}</h3>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground leading-snug">
                {area.description}
              </p>
            </Card>
          ))}
        </div>

        {/* Methodology Statement */}
        <div className="mt-8 mb-4 text-center animate-fade-in">
          <div className="max-w-3xl mx-auto px-4">
            <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 text-sm md:text-base">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-accent flex-shrink-0" />
                <span className="text-foreground/70">Percentiles</span>
              </div>
              
              <span className="text-foreground/50">•</span>
              
              <div className="flex items-center gap-2">
                <Baby className="w-4 h-4 text-success flex-shrink-0" />
                <span className="text-foreground/70">Corrected Age</span>
              </div>
              
              <span className="text-foreground/50">•</span>
              
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-foreground/70">Prematurity Adjusted</span>
              </div>
            </div>
          </div>
        </div>

        {/* View Demo Button */}
        <div className="text-center mb-6">
          <Button 
            variant="outline" 
            size="default" 
            onClick={() => setShowVideoDialog(true)}
            className="rounded-full px-6 border-2"
          >
            <Play className="w-4 h-4 mr-1" />
            View Demo
          </Button>
        </div>

      </div>
    </section>

    <Dialog open={showVideoDialog} onOpenChange={setShowVideoDialog}>
      <DialogContent className="max-w-4xl w-[95vw] p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Assessment Demo Video</DialogTitle>
        </DialogHeader>
        <div className="relative w-full aspect-video bg-black">
          <video 
            className="w-full h-full"
            controls
            autoPlay
            src="/videos/assessment-demo.mp4"
          >
            Tu navegador no soporta el elemento de video.
          </video>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};
