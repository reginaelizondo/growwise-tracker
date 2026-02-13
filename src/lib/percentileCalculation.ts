import { externalSupabase } from '@/integrations/supabase/external-client';

/**
 * Calculate percentile for a skill based on completion percentage and age.
 * Uses curve inversion from percentile_skills table with age tolerance and linear interpolation.
 */
export async function calculatePercentile(
  skillId: number,
  babyAgeMonths: number,
  completionPercentage: number // 0-100
): Promise<number | null> {
  try {
    // Age tolerance: try exact age first, then ±1, ±2 months
    const tryAges = [
      babyAgeMonths,
      babyAgeMonths - 1,
      babyAgeMonths + 1,
      babyAgeMonths - 2,
      babyAgeMonths + 2,
    ].filter(age => age >= 0);

    console.log('[calculatePercentile]', {
      skillId,
      babyAgeMonths,
      completionPercentage,
      tryAges
    });

    // Query percentile_skills table (the correct table name)
    let allCurves: any[] = [];
    for (const tryAge of tryAges) {
      const { data, error } = await externalSupabase
        .from('percentile_skills')
        .select('percentile, completion_percentage')
        .eq('skill_id', skillId)
        .eq('baby_age', tryAge)  // Column name is correct ✅
        .order('completion_percentage', { ascending: true });
      
      if (!error && data && data.length > 0) {
        allCurves = data;
        console.log(`📊 Found percentile curves for skill ${skillId} at age ${tryAge}:`, data.length);
        break;
      }
    }

    // If no data found after trying all age ranges
    if (!allCurves || allCurves.length === 0) {
      console.log('[calculatePercentile] No curve data found for skill', skillId);
      return null;
    }

    // Convert completionPercentage (0-100) to decimal (0-1)
    const completionDecimal = completionPercentage / 100;

    // Group by completion_percentage and take the MAXIMUM percentile
    const curvesByCompletion = new Map<number, number>();
    allCurves.forEach(curve => {
      const completion = Number(curve.completion_percentage);
      const perc = Number(curve.percentile);
      const currentMax = curvesByCompletion.get(completion);
      if (currentMax === undefined || perc > currentMax) {
        curvesByCompletion.set(completion, perc);
      }
    });

    // Convert to array and sort
    const uniqueCurves = Array.from(curvesByCompletion.entries())
      .map(([completion_percentage, percentile]) => ({ completion_percentage, percentile }))
      .sort((a, b) => a.completion_percentage - b.completion_percentage);

    let percentileOfBaby: number | null = null;

    // Find where completionDecimal falls in the distribution
    for (let i = 0; i < uniqueCurves.length - 1; i++) {
      const probL = uniqueCurves[i].completion_percentage;
      const probR = uniqueCurves[i + 1].completion_percentage;
      const percR = uniqueCurves[i + 1].percentile;
      
      if (probL <= completionDecimal && completionDecimal <= probR) {
        percentileOfBaby = percR; // Use the maximum (upper bound)
        console.log('[calculatePercentile] Found percentile:', {
          completionDecimal,
          completionRange: [probL, probR],
          percentile: percR
        });
        break;
      }
    }

    // Handle edge cases
    if (percentileOfBaby === null) {
      const firstCompletion = uniqueCurves[0].completion_percentage;
      const lastCompletion = uniqueCurves[uniqueCurves.length - 1].completion_percentage;
      
      if (completionDecimal <= firstCompletion) {
        percentileOfBaby = uniqueCurves[0].percentile;
      } else if (completionDecimal >= lastCompletion) {
        percentileOfBaby = uniqueCurves[uniqueCurves.length - 1].percentile;
      } else {
        percentileOfBaby = 0.50; // Fallback
      }
    }

    console.log('[calculatePercentile] Result:', {
      completionPercentage,
      completionDecimal,
      percentileOfBaby: percentileOfBaby * 100
    });

    // Convert to 0-100 scale
    return Math.round(percentileOfBaby * 100);

  } catch (err) {
    console.error('[calculatePercentile] Error:', err);
    return null;
  }
}
