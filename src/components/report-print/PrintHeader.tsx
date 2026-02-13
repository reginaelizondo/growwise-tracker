import { format } from "date-fns";
import kineduLogo from "@/assets/logo-kinedu-blue.png";

interface PrintHeaderProps {
  babyName: string;
  ageMonths: number;
  ageDays: number;
  lastUpdate: string;
  sexAtBirth?: string;
}

export const PrintHeader = ({ babyName, ageMonths, ageDays, lastUpdate, sexAtBirth }: PrintHeaderProps) => {
  const pronoun = sexAtBirth === 'male' ? 'his' : sexAtBirth === 'female' ? 'her' : 'their';
  
  return (
    <div className="print-card print-mb-1">
      <div className="flex items-center justify-between print-mb-1">
        <div>
          <h1 className="text-xl font-bold mb-0.5">{babyName}'s Development Report</h1>
          <p className="text-sm text-muted-foreground">
            Age: {ageMonths} months, {ageDays} days
          </p>
          <p className="text-sm text-muted-foreground">
            Last milestone update: {format(new Date(lastUpdate), 'MMMM d, yyyy')}
          </p>
        </div>
        <img src={kineduLogo} alt="Kinedu" className="h-10" />
      </div>
      <p className="text-sm text-muted-foreground text-center mt-1">
        See where {pronoun === 'his' ? "he's" : pronoun === 'her' ? "she's" : "they're"} thriving—and where you can help most
      </p>
    </div>
  );
};
