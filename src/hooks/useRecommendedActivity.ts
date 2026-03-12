import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseRecommendedActivityParams {
  areaId: number; // 1=Physical, 2=Cognitive, 3=Linguistic, 4=Social & Emotional
  areaName: string; // 'Physical' | 'Cognitive' | 'Linguistic' | 'Social & Emotional'
  targetSkill: { id?: number; name: string };
  babyAgeMonths: number;
  locale?: 'en' | 'es';
}

interface Activity {
  id: number;
  activity_name: string;
  description_en: string | null;
  purpose_en: string | null;
  age: number;
  min_age: number | null;
  skill_name: string;
  skill_id: number;
  area_name: string;
  area_id: number;
  image_url: string | null;
  material?: number | boolean | null;
}

interface ActivityWithMetadata extends Activity {
  __score: number;
  __diff: number;
  purpose_text: string;
  description_html: string;
}

const FIELDS_BASE = 'id,activity_name,description_en,purpose_en,min_age,area_id,area_name,skill_id,skill_name,age';
const FIELDS_WITH_OPTIONALS = FIELDS_BASE + ',material,image_url';

export function useRecommendedActivity({
  areaId,
  areaName,
  targetSkill,
  babyAgeMonths,
  locale = 'en'
}: UseRecommendedActivityParams) {
  const [activity, setActivity] = useState<ActivityWithMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadActivity() {
      try {
        setLoading(true);
        setError(null);

        console.log('[useRecommendedActivity] Loading activity for:', {
          areaId,
          areaName,
          targetSkill,
          babyAgeMonths,
          locale
        });

        // First attempt: filter by area_id + (optional) skill_id with optional columns
        let baseQuery = supabase
          .from('activities_database')
          .select(FIELDS_WITH_OPTIONALS)
          .eq('area_id', areaId);

        if (targetSkill?.id != null) {
          baseQuery = baseQuery.eq('skill_id', targetSkill.id);
        }

        let { data, error: queryError }: any = await baseQuery;

        // Handle missing columns (42703): retry without material/image_url
        if (queryError && (queryError as any).code === '42703') {
          console.warn('[useRecommendedActivity] Optional columns missing, retrying with base fields');
          let retryQuery = supabase
            .from('activities_database')
            .select(FIELDS_BASE)
            .eq('area_id', areaId);
          if (targetSkill?.id != null) {
            retryQuery = retryQuery.eq('skill_id', targetSkill.id);
          }
          const retryRes = await retryQuery;
          data = retryRes.data ?? [];
          queryError = retryRes.error ?? null;
        }

        console.log('[acts:first-attempt]', { areaId, targetSkill, rows: data?.length });

        // Fallback: retry with only area_id if no results (with optional -> base fallback)
        if (!queryError && (!data || data.length === 0)) {
          let fbRes: any = await supabase
            .from('activities_database')
            .select(FIELDS_WITH_OPTIONALS)
            .eq('area_id', areaId);

          if (fbRes.error && (fbRes.error as any).code === '42703') {
            console.warn('[useRecommendedActivity] Optional columns missing (fallback), retrying with base fields');
            fbRes = await supabase
              .from('activities_database')
              .select(FIELDS_BASE)
              .eq('area_id', areaId);
          }

          data = fbRes.data ?? [];
          console.log('[acts:fallback-area-only]', { areaId, rows: data.length });
        }

        if (queryError) {
          console.error('[useRecommendedActivity] Query error:', queryError);
          setError(queryError.message);
          setLoading(false);
          return;
        }

        if (!data || data.length === 0) {
          console.log('[useRecommendedActivity] No activities found');
          setActivity(null);
          setLoading(false);
          return;
        }

        // Normalize types (age, min_age, material can come as strings/null)
        const acts: Activity[] = data.map((a: any) => ({
          ...a,
          age: Number(a.age),
          min_age: a.min_age == null ? null : Number(a.min_age),
          material: a.material == null ? null : (typeof a.material === 'string' ? Number(a.material) : a.material),
          image_url: a.image_url ?? null,
        }));

        console.log(`[useRecommendedActivity] Found ${acts.length} activities`);

        // Score activities - more lenient age filtering
        const scoreActivity = (a: Activity): number => {
          const ageDiff = Math.abs(babyAgeMonths - a.age);
          let score = 0;

          // Age compatibility (relaxed to ±6 months)
          if (ageDiff === 0) score += 5; // Perfect match
          else if (ageDiff === 1) score += 4; // Very close
          else if (ageDiff <= 2) score += 3; // Close
          else if (ageDiff <= 4) score += 2; // Acceptable
          else if (ageDiff <= 6) score += 1; // Fallback
          else return -1; // Too far

          // Check min_age if available - penalize if baby is too young
          const hasMin = typeof a.min_age === 'number' && !Number.isNaN(a.min_age);
          if (hasMin && babyAgeMonths < (a.min_age as number)) {
            score -= 2;
          }

          // Bonus for image
          if (a.image_url) score += 1;
          
          // Bonus for no materials needed (easy to execute)
          if (a.material === 0 || a.material === false) score += 1;

          return score;
        };

        // Create candidates with scores and age diff
        let candidates = acts
          .map(a => ({ 
            ...a, 
            __score: scoreActivity(a),
            __diff: Math.abs(babyAgeMonths - a.age)
          }))
          .filter(a => a.__score >= 0);

        // Fallback: if no strict matches, use all activities sorted by age proximity
        if (candidates.length === 0) {
          console.log('[useRecommendedActivity] No compatible activities, using fallback');
          candidates = acts.map(a => ({
            ...a,
            __score: 1,
            __diff: Math.abs(babyAgeMonths - a.age),
          }));
        }

        // Sort: score DESC → age diff ASC → material (prefer 0) → id ASC
        candidates.sort((a, b) =>
          (b.__score - a.__score) ||
          (a.__diff - b.__diff) ||
          ((a.material === 0 ? 0 : 1) - (b.material === 0 ? 0 : 1)) ||
          (a.id - b.id)
        );

        const top = candidates[0];
        if (!top) {
          setActivity(null);
          setLoading(false);
          return;
        }

        console.log('[useRecommendedActivity] Selected activity:', top.activity_name, 'with score:', top.__score);

        // Use English descriptions (Spanish not available in database)
        const purpose_text = top.purpose_en ?? '';
        const description_html = top.description_en ?? '';

        setActivity({
          ...top,
          purpose_text,
          description_html,
        });
        setLoading(false);

      } catch (err) {
        console.error('[useRecommendedActivity] Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    }

    loadActivity();
  }, [areaId, areaName, targetSkill.id, targetSkill.name, babyAgeMonths, locale]);

  return { activity, loading, error };
}
