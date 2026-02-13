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
      areasData // array of { areaName, percentage, skillsCount }
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build areas summary for context
    const areasSummary = areasData
      .map((a: any) => `${a.areaName}: ${a.percentage.toFixed(0)}% complete`)
      .join(", ");

    const systemPrompt = `You are an enthusiastic child development expert who creates exciting, personalized insights for parents. Your role is to craft a memorable "key insight" that celebrates the baby's unique developmental journey.

Guidelines:
- Keep it EXTREMELY SHORT (10-15 words max)
- Be creative, warm, and exciting - make parents feel proud
- Focus on the baby's unique strengths and growth patterns
- Use the baby's name to make it personal
- Make it feel like a special discovery or celebration
- Avoid generic phrases - be specific to this baby's results
- Use vivid, positive language that parents will remember`;

    const userPrompt = `Create an exciting key insight for ${babyName}, a ${babyAgeMonths}-month-old baby who just completed their developmental assessment:

Areas: ${areasSummary}

Write a creative, memorable key insight (10-15 words) that celebrates ${babyName}'s unique developmental journey.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
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
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const insight = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ insight }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-completion-insight:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
