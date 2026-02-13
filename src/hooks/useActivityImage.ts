import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseActivityImageParams {
  activityId?: number;
  activityName?: string;
  skillName?: string;
  areaName?: string;
  babyAge?: number;
  locale?: string;
  imageUrl?: string | null;
}

export function useActivityImage({
  activityId,
  activityName,
  skillName,
  areaName,
  babyAge,
  locale = 'en',
  imageUrl
}: UseActivityImageParams) {
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrGenerateImage() {
      // If activity has image_url in database, use it
      if (imageUrl) {
        setGeneratedImageUrl(imageUrl);
        return;
      }

      // If no activity data, skip
      if (!activityId || !activityName || !skillName || !areaName || babyAge === undefined) {
        return;
      }

      try {
        setGenerating(true);
        setError(null);

        console.log('Calling generate-activity-image function...');

        const { data, error: functionError } = await supabase.functions.invoke(
          'generate-activity-image',
          {
            body: {
              activity_id: activityId,
              activity_name: activityName,
              skill_name: skillName,
              area_name: areaName,
              baby_age: babyAge,
              locale
            }
          }
        );

        if (functionError) {
          console.error('Error generating image:', functionError);
          setError(functionError.message);
          setGenerating(false);
          return;
        }

        if (data?.image) {
          console.log('Image generated/retrieved successfully');
          setGeneratedImageUrl(data.image);
        } else {
          console.warn('No image in response');
        }

        setGenerating(false);
      } catch (err) {
        console.error('Error in useActivityImage:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setGenerating(false);
      }
    }

    loadOrGenerateImage();
  }, [activityId, activityName, skillName, areaName, babyAge, locale, imageUrl]);

  return { 
    imageUrl: generatedImageUrl, 
    generating, 
    error 
  };
}
