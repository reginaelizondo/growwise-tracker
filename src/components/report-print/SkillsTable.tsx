import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";

interface SkillResult {
  skill_id: number;
  skill_name: string;
  area_name: string;
  percentile: number;
  pace: number;
}

interface SkillsTableProps {
  skills: SkillResult[];
  areaName: string;
  areaColor: string;
  emergingSkill?: string;
}

const getSkillCategory = (percentile: number): 'mastered' | 'on-track' | 'reinforce' => {
  if (percentile >= 75) return 'mastered';
  if (percentile >= 50) return 'on-track';
  return 'reinforce';
};

export const SkillsTable = ({ skills, areaName, areaColor, emergingSkill }: SkillsTableProps) => {
  return (
    <div className="print-mb-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-semibold">Skill</TableHead>
            <TableHead className="text-center w-32">Continue to reinforce</TableHead>
            <TableHead className="text-center w-32">On track</TableHead>
            <TableHead className="text-center w-32">Mastered</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {skills.map((skill) => {
            const category = getSkillCategory(skill.percentile);
            return (
              <TableRow key={skill.skill_id}>
                <TableCell className="font-medium">{skill.skill_name}</TableCell>
                <TableCell className="text-center">
                  {category === 'reinforce' && <CheckCircle className="w-5 h-5 text-blue-600 inline" />}
                </TableCell>
                <TableCell className="text-center">
                  {category === 'on-track' && <CheckCircle className="w-5 h-5 text-green-600 inline" />}
                </TableCell>
                <TableCell className="text-center">
                  {category === 'mastered' && <CheckCircle className="w-5 h-5 text-yellow-600 inline" />}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      
      {emergingSkill && (
        <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
          <Badge className="bg-blue-100 text-blue-800 border-blue-300 mb-1">Emerging skill</Badge>
          <p className="text-sm font-medium">{emergingSkill}</p>
        </div>
      )}
    </div>
  );
};
