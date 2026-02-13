import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, Edit, X, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { differenceInMonths, differenceInDays, addMonths } from "date-fns";

const ProgressAssessmentStart = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const babyId = searchParams.get("babyId");
  const [baby, setBaby] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [editingAge, setEditingAge] = useState(false);
  const [manualMonths, setManualMonths] = useState<number | null>(null);
  const [manualDays, setManualDays] = useState<number | null>(null);

  useEffect(() => {
    if (!babyId) {
      navigate("/babies/new");
      return;
    }

    const fetchBaby = async () => {
      const { data, error } = await supabase
        .from("babies")
        .select("*")
        .eq("id", babyId)
        .single();

      if (error || !data) {
        toast.error("Baby not found");
        navigate("/babies/new");
        return;
      }

      setBaby(data);
    };

    fetchBaby();
  }, [babyId, navigate]);

  const calculateCorrectedAge = (baby: any) => {
    const birthDate = new Date(baby.birthdate);
    const today = new Date();
    let ageMonths = differenceInMonths(today, birthDate);
    
    if (baby.gestational_weeks && baby.gestational_weeks < 37) {
      const correctionWeeks = 40 - baby.gestational_weeks;
      const correctionMonths = Math.round(correctionWeeks / 4.33);
      ageMonths = Math.max(0, ageMonths - correctionMonths);
    }
    
    return ageMonths;
  };

  const calculateAgeWithDays = (baby: any) => {
    const birthDate = new Date(baby.birthdate);
    const today = new Date();
    
    let referenceDate = birthDate;
    if (baby.gestational_weeks && baby.gestational_weeks < 37) {
      const correctionWeeks = 40 - baby.gestational_weeks;
      const correctionDays = correctionWeeks * 7;
      referenceDate = new Date(birthDate.getTime() + correctionDays * 24 * 60 * 60 * 1000);
    }
    
    const months = differenceInMonths(today, referenceDate);
    const monthsDate = addMonths(referenceDate, months);
    const days = differenceInDays(today, monthsDate);
    
    return { months: Math.max(0, months), days: Math.max(0, days) };
  };

  const handleStart = async () => {
    setLoading(true);

    try {
      const referenceAgeMonths = manualMonths !== null ? manualMonths : calculateCorrectedAge(baby);

      const { data: assessment, error } = await supabase
        .from("assessments")
        .insert({
          baby_id: baby.id,
          reference_age_months: referenceAgeMonths,
          locale: "en",
        })
        .select()
        .single();

      if (error) throw error;

      navigate(`/progress-assessment/${assessment.id}`);
    } catch (error: any) {
      console.error("Error creating assessment:", error);
      toast.error(error.message || "Failed to start progress assessment");
    } finally {
      setLoading(false);
    }
  };

  const handleEditAge = () => {
    const currentAge = calculateAgeWithDays(baby);
    setManualMonths(currentAge.months);
    setManualDays(currentAge.days);
    setEditingAge(true);
  };

  const handleSaveAge = () => {
    if (manualMonths === null || manualMonths < 0) {
      toast.error("Please enter valid months");
      return;
    }
    if (manualDays === null || manualDays < 0 || manualDays > 30) {
      toast.error("Days must be between 0 and 30");
      return;
    }
    setEditingAge(false);
    toast.success("Age updated");
  };

  const handleCancelEdit = () => {
    setManualMonths(null);
    setManualDays(null);
    setEditingAge(false);
  };

  if (!baby) {
    return null;
  }

  const calculatedAge = calculateAgeWithDays(baby);
  const ageInfo = manualMonths !== null && manualDays !== null 
    ? { months: manualMonths, days: manualDays }
    : calculatedAge;
  const isPremature = baby.gestational_weeks && baby.gestational_weeks < 37;

  return (
    <div className="min-h-screen bg-gradient-warm py-8 px-4">
      <div className="container max-w-2xl mx-auto">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/dashboard">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </Button>

        <Card className="p-8 md:p-12 shadow-card animate-scale-in text-center">
          <h1 className="text-2xl md:text-3xl font-bold mb-4">
            Let's check your baby's progress!
          </h1>
          
          <div className="mb-8">
            <p className="text-lg text-muted-foreground mb-3">
              Your little one is now
            </p>
            
            {!editingAge ? (
              <>
                <p className="text-2xl md:text-3xl font-bold text-primary mb-2">
                  {ageInfo.months === 0 
                    ? `${ageInfo.days} ${ageInfo.days === 1 ? "day" : "days"}`
                    : `${ageInfo.months} ${ageInfo.months === 1 ? "month" : "months"} and ${ageInfo.days} ${ageInfo.days === 1 ? "day" : "days"}`
                  }
                </p>
                <p className="text-xl">💛</p>
                {isPremature && manualMonths === null && (
                  <p className="text-sm text-muted-foreground mt-2">
                    (corrected age)
                  </p>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 mb-4">
                <div className="flex gap-4 items-end">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="months" className="text-sm">Months</Label>
                    <Input
                      id="months"
                      type="number"
                      min="0"
                      value={manualMonths || 0}
                      onChange={(e) => setManualMonths(parseInt(e.target.value) || 0)}
                      className="w-24 text-center"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="days" className="text-sm">Days</Label>
                    <Input
                      id="days"
                      type="number"
                      min="0"
                      max="30"
                      value={manualDays || 0}
                      onChange={(e) => setManualDays(parseInt(e.target.value) || 0)}
                      className="w-24 text-center"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveAge}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          {!editingAge && (
            <Button
              variant="outline"
              size="sm"
              className="mb-8"
              onClick={handleEditAge}
            >
              <Edit className="w-4 h-4 mr-2" />
              Modify Age
            </Button>
          )}

          <Button 
            variant="hero" 
            size="lg" 
            className="w-full"
            onClick={handleStart}
            disabled={loading}
          >
            {loading ? "Starting..." : "Start Progress Assessment"}
            <ArrowRight className="w-5 h-5" />
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default ProgressAssessmentStart;
