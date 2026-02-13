import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      activity_id, 
      activity_name, 
      skill_name, 
      area_name, 
      baby_age, 
      locale 
    } = await req.json();

    console.log('Generating image for activity:', { activity_id, activity_name, baby_age, locale });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Check cache first
    const { data: cached, error: cacheError } = await supabase
      .from('activity_images')
      .select('image_base64')
      .eq('activity_id', activity_id)
      .eq('locale', locale)
      .single();
    
    if (cached && !cacheError) {
      console.log('Image found in cache');
      return new Response(JSON.stringify({ 
        image: cached.image_base64,
        cached: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. Generate with Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const prompt = locale === 'es' 
      ? `Foto de alta calidad de un bebé de ${baby_age} meses realizando "${activity_name}" para el área ${area_name}, relacionado con la habilidad "${skill_name}". Iluminación natural, fondo neutro, entorno seguro en casa.`
      : `High-quality photo of a baby around ${baby_age} months practicing "${activity_name}" for the ${area_name} area, related to the "${skill_name}" skill. Natural lighting, neutral background, safe home setting.`;

    console.log('Calling AI gateway with prompt:', prompt.substring(0, 100) + '...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [{ role: 'user', content: prompt }],
        modalities: ['image', 'text']
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const imageBase64 = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageBase64) {
      console.error('No image in response:', JSON.stringify(data));
      throw new Error('No image generated');
    }

    console.log('Image generated successfully, caching...');

    // 3. Cache the result
    const { error: insertError } = await supabase
      .from('activity_images')
      .insert({
        activity_id,
        locale,
        image_base64: imageBase64
      });

    if (insertError) {
      console.error('Error caching image:', insertError);
    }

    return new Response(JSON.stringify({ 
      image: imageBase64,
      cached: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in generate-activity-image:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
