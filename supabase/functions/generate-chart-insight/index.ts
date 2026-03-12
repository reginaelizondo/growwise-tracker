import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      babyName,
      babyAgeMonths,
      donutData, // array of { name, value, pace, status, statusText }
      focusArea
    } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    // Build a summary of the chart data using PACE (not value)
    const chartSummary = donutData
      .map((area: any) => {
        const paceText = area.pace > 0 ? `${area.pace}x pace` : 'no data';
        return `${area.name}: ${paceText} (${area.statusText})`;
      })
      .join(", ");

    // Find areas by pace (higher pace = developing faster)
    const sortedByPace = [...donutData]
      .filter((a: any) => a.pace > 0) // Only areas with data
      .sort((a: any, b: any) => b.pace - a.pace); // Sort descending (highest pace first)

    const fastestArea = sortedByPace[0];
    const slowestArea = sortedByPace[sortedByPace.length - 1];

    const systemPrompt = `You are a seasoned child development expert. Provide SPECIFIC, ACTIONABLE advice for parents.

COMMUNICATION STYLE:
- Direct and warm
- Focus on CONCRETE ACTIONS parents can do TODAY
- Use practical examples
- Tone: Experienced pediatrician talking to a friend

REQUIRED STRUCTURE (40-60 words):
1. Quick opening about the baby (1 sentence)
2. Strongest area + why it matters (1 sentence)
3. Area needing attention with 1-2 specific activities (2 sentences)
4. How to use strength to improve weakness (1 sentence)

CRITICAL RULES:
- NO generic phrases
- YES to specific actions and frequencies (e.g., "2-3 times daily")
- FOCUS area is SLOWEST (needs attention)
- FASTEST area is STRONGEST`;

    const userPrompt = `${babyName} (${babyAgeMonths} months):

✨ STRONGEST: ${fastestArea.name} (${fastestArea.pace}x pace)
⚠️ NEEDS WORK: ${focusArea} (${slowestArea.pace}x pace)

All areas: ${chartSummary}

Write 40-60 words that:
1. Opens with something specific about ${babyName}
2. Celebrates ${fastestArea.name} - why it's valuable at ${babyAgeMonths} months
3. Addresses ${focusArea}: why important + 1-2 SPECIFIC activities for TODAY
4. Connects: how ${fastestArea.name} can boost ${focusArea}

Keep conversational, actionable, no clichés.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 256,
        system: systemPrompt,
        messages: [
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI API error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const insight = data.content?.[0]?.text;

    return new Response(
      JSON.stringify({ insight }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-chart-insight:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
