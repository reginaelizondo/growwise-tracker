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
      skillName,
      areaName,
      babyAgeMonths,
      monthsOffset,
      percentile,
      referencePercentile,
      currentRangeScore
    } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    // Build context for AI
    let statusContext = "";
    if (monthsOffset > 0.5) {
      statusContext = `${Math.abs(monthsOffset).toFixed(1)} months ahead of average`;
    } else if (monthsOffset < -0.5) {
      statusContext = `${Math.abs(monthsOffset).toFixed(1)} months behind average`;
    } else {
      statusContext = "right on track with average development";
    }

    const systemPrompt = `You are a warm, encouraging child development expert. Your role is to interpret developmental assessment results for parents in a supportive, informative way.

Guidelines:
- Keep responses EXTREMELY SHORT (1 sentence max, around 10-12 words)
- Be encouraging and positive, even when baby is behind
- Use simple, clear language parents can understand
- Never be alarmist - developmental timelines vary naturally
- Use "your baby" when referring to the child
- Be conversational and warm in tone`;

    const userPrompt = `Interpret these developmental results for a ${babyAgeMonths}-month-old baby:

Skill: "${skillName}" (${areaName} area)
Performance: ${statusContext}
Percentile: Higher than ${percentile}% of babies their age
Reference: ${referencePercentile}% of babies this age have completed this skill
Score: ${currentRangeScore}% of age-appropriate milestones completed

Write a brief, encouraging interpretation (1 sentence, ~10-12 words) that explains what these results mean for the parent.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 128,
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
    const interpretation = data.content?.[0]?.text;

    return new Response(
      JSON.stringify({ interpretation }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in interpret-skill-results:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
