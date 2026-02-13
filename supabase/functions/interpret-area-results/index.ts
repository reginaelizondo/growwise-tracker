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
      areaName, 
      babyAgeMonths, 
      areaPercentage,
      skillsData // array of { skillName, monthsOffset, percentile }
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build skills summary for context
    const skillsSummary = skillsData
      .map((s: any) => {
        let status = "on track";
        if (s.monthsOffset > 0.5) status = `${s.monthsOffset.toFixed(1)}mo ahead`;
        else if (s.monthsOffset < -0.5) status = `${Math.abs(s.monthsOffset).toFixed(1)}mo behind`;
        return `- ${s.skillName}: ${status}`;
      })
      .join("\n");

    const systemPrompt = `You are a warm, encouraging child development expert. Your role is to interpret developmental assessment results for parents in a supportive, informative way.

Guidelines:
- Keep responses SHORT (1-2 sentences, around 15-20 words)
- Be encouraging and positive, even when baby is behind
- Use simple, clear language parents can understand
- Never be alarmist - developmental timelines vary naturally
- Use "your baby" when referring to the child
- Be conversational and warm in tone`;

    const userPrompt = `Interpret these ${areaName} area developmental results for a ${babyAgeMonths}-month-old baby:

Area Completion: ${areaPercentage.toFixed(1)}% complete
Skills Performance:
${skillsSummary}

Write a brief, encouraging interpretation (1-2 sentences, ~15-20 words) that summarizes the baby's overall development in this area.`;

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
    const interpretation = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ interpretation }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in interpret-area-results:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
