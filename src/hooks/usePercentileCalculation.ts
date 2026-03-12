import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UsePercentileCalculationParams {
  skillId: number;
  babyAgeMonths: number;
  completionPercentage: number; // 0-100
}

/**
 * Hook to calculate percentile for a skill based on completion percentage and age.
 * Uses curve inversion from percentile_skills table with age tolerance and linear interpolation.
 */
export function usePercentileCalculation({
  skillId,
  babyAgeMonths,
  completionPercentage
}: UsePercentileCalculationParams) {
  const [percentile, setPercentile] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function calculatePercentile() {
      try {
        setLoading(true);
        setError(null);

        // Age tolerance: try exact age first, then ±1, ±2 months
        const agesToTry = [
          babyAgeMonths,
          babyAgeMonths - 1,
          babyAgeMonths + 1,
          babyAgeMonths - 2,
          babyAgeMonths + 2,
        ].filter(age => age >= 0);

        console.log('[usePercentileCalculation]', {
          skillId,
          babyAgeMonths,
          completionPercentage,
          agesToTry
        });

        // Fetch percentile curve data for this skill and ages
        // Using skill_percentile_curves table with baby_age column
        const { data: curveData, error: queryError } = await supabase
          .from('skill_percentile_curves')
          .select('baby_age, probability, percentile')
          .eq('skill_id', skillId)
          .in('baby_age', agesToTry)
          .order('baby_age', { ascending: true })
          .order('probability', { ascending: true });

        if (queryError) {
          console.error('[usePercentileCalculation] Query error:', queryError);
          setError(queryError.message);
          setLoading(false);
          return;
        }

        if (!curveData || curveData.length === 0) {
          console.log('[usePercentileCalculation] No curve data found for skill', skillId);
          setPercentile(null);
          setLoading(false);
          return;
        }

        // Prefer data for exact age, fallback to closest age
        let ageToUse = babyAgeMonths;
        const agesAvailable = [...new Set(curveData.map(d => d.baby_age))];
        
        if (!agesAvailable.includes(babyAgeMonths)) {
          // Find closest age
          ageToUse = agesAvailable.reduce((prev, curr) =>
            Math.abs(curr - babyAgeMonths) < Math.abs(prev - babyAgeMonths) ? curr : prev
          );
          console.log('[usePercentileCalculation] Using closest age:', ageToUse, 'instead of', babyAgeMonths);
        }

        // Filter to selected age and sort by probability
        const ageData = curveData
          .filter(d => d.baby_age === ageToUse)
          .sort((a, b) => a.probability - b.probability);

        if (ageData.length === 0) {
          setPercentile(null);
          setLoading(false);
          return;
        }

        // Convert completion percentage to decimal (0-1)
        const targetCompletion = completionPercentage / 100;

        // Group by probability and take the maximum percentile
        const curvesByCompletion = new Map<number, number>();
        ageData.forEach(curve => {
          const completion = Number(curve.probability);
          const perc = Number(curve.percentile);
          const currentMax = curvesByCompletion.get(completion);
          if (currentMax === undefined || perc > currentMax) {
            curvesByCompletion.set(completion, perc);
          }
        });

        // Convert to array and sort
        const uniqueCurves = Array.from(curvesByCompletion.entries())
          .map(([probability, percentile]) => ({ probability, percentile }))
          .sort((a, b) => a.probability - b.probability);

        let calculatedPercentile: number | null = null;

        // Find where targetCompletion falls in the distribution
        for (let i = 0; i < uniqueCurves.length - 1; i++) {
          const probL = uniqueCurves[i].probability;
          const probR = uniqueCurves[i + 1].probability;
          const percR = uniqueCurves[i + 1].percentile;
          
          if (probL <= targetCompletion && targetCompletion <= probR) {
            calculatedPercentile = percR;
            break;
          }
        }

        // Handle edge cases
        if (calculatedPercentile === null) {
          const firstProb = uniqueCurves[0].probability;
          const lastProb = uniqueCurves[uniqueCurves.length - 1].probability;
          
          if (targetCompletion <= firstProb) {
            calculatedPercentile = uniqueCurves[0].percentile;
          } else if (targetCompletion >= lastProb) {
            calculatedPercentile = uniqueCurves[uniqueCurves.length - 1].percentile;
          } else {
            calculatedPercentile = 0.50;
          }
        }

        // Clamp to [0, 1]
        calculatedPercentile = Math.max(0, Math.min(1, calculatedPercentile));

        console.log('[usePercentileCalculation] Result:', {
          targetCompletion,
          calculatedPercentile: calculatedPercentile * 100
        });

        // Convert to 0-100 scale
        setPercentile(calculatedPercentile * 100);
        setLoading(false);

      } catch (err) {
        console.error('[usePercentileCalculation] Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    }

    if (skillId && babyAgeMonths >= 0) {
      calculatePercentile();
    }
  }, [skillId, babyAgeMonths, completionPercentage]);

  return { percentile, loading, error };
}
