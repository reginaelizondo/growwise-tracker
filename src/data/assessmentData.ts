// Sample data for the assessment (demo purposes)

export interface Milestone {
  id: string;
  text: string;
  ageOfAchievement: number; // in months (p75)
  example?: string;
}

export interface Skill {
  id: string;
  name: string;
  ageRangeStart: number; // in months
  ageRangeEnd: number; // in months
  description: string;
  milestones: Milestone[];
  percentiles?: { [key: number]: number }; // score -> percentile
}

export interface Area {
  id: string;
  name: string;
  icon: string;
  color: string;
  skills: Skill[];
}

export const assessmentData: Area[] = [
  {
    id: "physical",
    name: "Physical Development",
    icon: "💪",
    color: "primary",
    skills: [
      {
        id: "gross-motor-0-3",
        name: "Early Gross Motor",
        ageRangeStart: 0,
        ageRangeEnd: 3,
        description: "Large body movements: head control, rolling over, sitting",
        milestones: [
          {
            id: "gm1",
            text: "Lifts head when on tummy",
            ageOfAchievement: 2,
            example: "When on the floor on their tummy, can lift their head for a few seconds"
          },
          {
            id: "gm2",
            text: "Rolls from tummy to back",
            ageOfAchievement: 4,
            example: "Can roll from their tummy to their back"
          },
          {
            id: "gm3",
            text: "Sits with support",
            ageOfAchievement: 5,
            example: "Can sit with help from pillows or an adult"
          },
          {
            id: "gm4",
            text: "Sits without support",
            ageOfAchievement: 7,
            example: "Stays seated for several seconds without help"
          },
        ],
        percentiles: {
          0: 5,
          0.5: 25,
          1: 50,
          1.5: 75,
          2: 90,
        }
      },
      {
        id: "fine-motor-0-3",
        name: "Early Fine Motor",
        ageRangeStart: 0,
        ageRangeEnd: 3,
        description: "Precise hand and finger movements",
        milestones: [
          {
            id: "fm1",
            text: "Grasps objects with whole hand",
            ageOfAchievement: 4,
            example: "Can grab a rattle when you bring it close"
          },
          {
            id: "fm2",
            text: "Transfers objects from one hand to another",
            ageOfAchievement: 6,
            example: "Takes a toy with one hand and switches it to the other"
          },
          {
            id: "fm3",
            text: "Uses pincer grasp (thumb and index finger)",
            ageOfAchievement: 9,
            example: "Can pick up small cereal pieces with two fingers"
          },
        ],
        percentiles: {
          0: 10,
          0.5: 30,
          1: 55,
          1.5: 75,
          2: 85,
        }
      },
    ],
  },
  {
    id: "cognitive",
    name: "Cognitive Development",
    icon: "🧠",
    color: "accent",
    skills: [
      {
        id: "problem-solving-0-3",
        name: "Early Problem Solving",
        ageRangeStart: 0,
        ageRangeEnd: 3,
        description: "Exploration, cause-effect, object permanence",
        milestones: [
          {
            id: "ps1",
            text: "Tracks objects with eyes",
            ageOfAchievement: 2,
            example: "Can follow a colorful toy you move in front of them"
          },
          {
            id: "ps2",
            text: "Looks for partially hidden objects",
            ageOfAchievement: 6,
            example: "If you partially cover a toy, tries to find it"
          },
          {
            id: "ps3",
            text: "Looks for completely hidden objects",
            ageOfAchievement: 9,
            example: "Searches for a toy you hid under a blanket"
          },
          {
            id: "ps4",
            text: "Uses objects appropriately (e.g., comb, phone)",
            ageOfAchievement: 12,
            example: "Imitates combing or talking on the phone"
          },
        ],
        percentiles: {
          0: 5,
          1: 25,
          2: 50,
          3: 75,
          4: 95,
        }
      },
    ],
  },
  {
    id: "linguistic",
    name: "Language Development",
    icon: "💬",
    color: "success",
    skills: [
      {
        id: "receptive-language-0-3",
        name: "Early Receptive Language",
        ageRangeStart: 0,
        ageRangeEnd: 3,
        description: "Language comprehension: responds to name, understands simple words",
        milestones: [
          {
            id: "rl1",
            text: "Responds to familiar sounds",
            ageOfAchievement: 3,
            example: "Turns when hearing your voice"
          },
          {
            id: "rl2",
            text: "Responds to their name",
            ageOfAchievement: 7,
            example: "Turns or looks when you say their name"
          },
          {
            id: "rl3",
            text: "Understands 'no'",
            ageOfAchievement: 9,
            example: "Stops or looks at you when you say 'no'"
          },
          {
            id: "rl4",
            text: "Follows simple instructions with gestures",
            ageOfAchievement: 10,
            example: "Gives you an object when you ask by pointing"
          },
        ],
        percentiles: {
          0: 10,
          1: 30,
          2: 50,
          3: 75,
          4: 90,
        }
      },
      {
        id: "expressive-language-0-3",
        name: "Early Expressive Language",
        ageRangeStart: 0,
        ageRangeEnd: 3,
        description: "Sound production, babbling, first words",
        milestones: [
          {
            id: "el1",
            text: "Makes vocal sounds (coos)",
            ageOfAchievement: 2,
            example: "Makes sounds like 'ahhh' or 'ohhh'"
          },
          {
            id: "el2",
            text: "Babbles with consonants (ba, ma, da)",
            ageOfAchievement: 6,
            example: "Says 'bababa' or 'mamama' without specific meaning"
          },
          {
            id: "el3",
            text: "Says one word with meaning",
            ageOfAchievement: 12,
            example: "Says 'mama' or 'dada' to refer to parents"
          },
        ],
        percentiles: {
          0: 15,
          1: 40,
          2: 70,
          3: 95,
        }
      },
    ],
  },
  {
    id: "socio-emotional",
    name: "Social-Emotional Development",
    icon: "❤️",
    color: "warning",
    skills: [
      {
        id: "social-interaction-0-3",
        name: "Early Social Interaction",
        ageRangeStart: 0,
        ageRangeEnd: 3,
        description: "Social smiles, eye contact, response to others",
        milestones: [
          {
            id: "si1",
            text: "Smiles in response to others",
            ageOfAchievement: 2,
            example: "Smiles at you when you talk or smile at them"
          },
          {
            id: "si2",
            text: "Enjoys playing with others (e.g., peek-a-boo)",
            ageOfAchievement: 6,
            example: "Laughs and enjoys when you play hiding your face"
          },
          {
            id: "si3",
            text: "Shows preference for familiar people",
            ageOfAchievement: 8,
            example: "Smiles more or seeks mom/dad instead of strangers"
          },
          {
            id: "si4",
            text: "Imitates simple gestures (clapping, waving bye)",
            ageOfAchievement: 10,
            example: "Imitates when you clap or wave goodbye"
          },
        ],
        percentiles: {
          0: 5,
          1: 30,
          2: 55,
          3: 80,
          4: 95,
        }
      },
    ],
  },
];

// Helper function to get skill status based on corrected age
export const getSkillStatus = (skill: Skill, correctedAge: number): "past" | "current" | "upcoming" => {
  if (correctedAge > skill.ageRangeEnd) return "past";
  if (correctedAge >= skill.ageRangeStart && correctedAge <= skill.ageRangeEnd) return "current";
  return "upcoming";
};

// Helper function to filter visible milestones based on corrected age
export const getVisibleMilestones = (skill: Skill, correctedAge: number): Milestone[] => {
  return skill.milestones.filter(m => m.ageOfAchievement <= correctedAge);
};

// Helper function to calculate skill score
export const calculateSkillScore = (responses: { [milestoneId: string]: "yes" | "sometimes" | "no" }): number => {
  const values = Object.values(responses);
  if (values.length === 0) return 0;
  
  let total = 0;
  values.forEach(v => {
    if (v === "yes") total += 1;
    else if (v === "sometimes") total += 0.5;
  });
  
  return total / values.length;
};

// Helper function to get status from score
export const getSkillStatusFromScore = (score: number): "mastered" | "on-track" | "reinforce" => {
  if (score >= 0.8) return "mastered";
  if (score >= 0.5) return "on-track";
  return "reinforce";
};

// Sample recommendations by status
export const recommendations = {
  mastered: [
    "Excellent! Your baby is mastering this skill. Keep offering opportunities to practice.",
    "Very good! Continue reinforcing with similar activities and start introducing slightly more advanced challenges.",
  ],
  "on-track": [
    "Your baby is on track. Keep practicing these activities regularly.",
    "Good progress. Stay consistent and you'll see more advances soon.",
  ],
  reinforce: [
    "This skill is still developing. Practice these activities daily in a playful way.",
    "Needs more practice. Try incorporating these activities into your daily routine naturally.",
  ],
};
