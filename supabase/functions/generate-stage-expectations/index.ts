import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { babyName, babyAgeMonths, babyAgeDays, sexAtBirth, areasData } = await req.json();

    console.log('[generate-stage-expectations] Input:', {
      babyName,
      babyAgeMonths,
      babyAgeDays,
      sexAtBirth,
      areasData
    });

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    // Build context about development areas
    const areasContext = areasData.map((area: { area: string; pace: number; percentile: number }) =>
      `${area.area}: pace ${area.pace}x (percentile ${area.percentile})`
    ).join(', ');

    // Identify weak areas (pace < 1.0)
    const weakAreas = areasData
      .filter((area: { area: string; pace: number; percentile: number }) => area.pace < 1.0)
      .map((area: { area: string; pace: number; percentile: number }) => area.area);

    const pronoun = sexAtBirth === 'male' ? 'he' : sexAtBirth === 'female' ? 'she' : 'they';
    const possessive = sexAtBirth === 'male' ? 'his' : sexAtBirth === 'female' ? 'her' : 'their';

    const systemPrompt = `You are a developmental pediatrics expert creating personalized guidance for parents. Be warm, encouraging, and specific to the baby's age and development stage. Always respond in English.`;

    const userPrompt = `Create a developmental expectations summary for ${babyName}, who is ${babyAgeMonths} months and ${babyAgeDays} days old (sex: ${sexAtBirth}).

Development status: ${areasContext}
${weakAreas.length > 0 ? `Areas needing focus: ${weakAreas.join(', ')}` : 'All areas developing well'}

Provide in English:

1. Stage Description (2-3 sentences): What parents should generally expect at this age. Be specific to ${babyAgeMonths} months. Use ${possessive} pronouns.

2. Behaviors List (3-4 items): Specific behaviors parents might start noticing. Use action verbs and be concrete. Format as short phrases.

3. Emerging Skills (for weak areas only): For each area with pace < 1.0, name ONE specific emerging skill they should focus on.

Format your response EXACTLY like this JSON (no markdown, no code blocks):
{
  "stageDescription": "Your 2-3 sentence description here using ${possessive}",
  "behaviors": ["Behavior 1", "Behavior 2", "Behavior 3", "Behavior 4"],
  "emergingSkills": {
    ${weakAreas.map((area: string) => `"${area}": "Specific skill name"`).join(',\n    ')}
  }
}`;

    console.log('[generate-stage-expectations] Calling Anthropic API...');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1024,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[generate-stage-expectations] AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('[generate-stage-expectations] AI response received');

    let content = data.content?.[0]?.text?.trim() || '';

    // Remove markdown code blocks if present
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const result = JSON.parse(content);

    console.log('[generate-stage-expectations] Parsed result:', result);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[generate-stage-expectations] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        error: errorMessage,
        stageDescription: '',
        behaviors: [],
        emergingSkills: {}
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
