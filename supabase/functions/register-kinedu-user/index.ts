import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, baby_id, kinedu_api_base_url } = await req.json();

    if (!email || !name) {
      return new Response(
        JSON.stringify({ success: false, error: "Name and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prefer URL passed from frontend (env-aware), fall back to Supabase secret, then QA default
    const baseUrl = kinedu_api_base_url || Deno.env.get("KINEDU_API_BASE_URL") || "https://qa.kinedu.com/api/v6";
    console.log("Using Kinedu API base URL:", baseUrl);

    // Pick the right static token based on the API URL being used
    const isProduction = baseUrl.includes("api.kinedu.com");
    const staticToken = isProduction
      ? (Deno.env.get("KINEDU_STATIC_TOKEN_PROD") || Deno.env.get("KINEDU_STATIC_TOKEN"))
      : (Deno.env.get("KINEDU_STATIC_TOKEN_QA") || Deno.env.get("KINEDU_STATIC_TOKEN"));
    console.log("Environment:", isProduction ? "PRODUCTION" : "QA");

    if (!staticToken) {
      console.error("KINEDU_STATIC_TOKEN not configured for", isProduction ? "PROD" : "QA");
      return new Response(
        JSON.stringify({ success: false, error: `Server configuration error: missing token for ${isProduction ? "production" : "QA"}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Get auth token
    console.log("=== STEP 1: create_auth_token ===");
    const tokenRes = await fetch(
      `${baseUrl}/general_projects/create_session/create_auth_token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: staticToken },
      }
    );

    const tokenText = await tokenRes.text();
    console.log("create_auth_token status:", tokenRes.status);
    console.log("create_auth_token FULL response:", tokenText);

    let tokenData: any;
    try {
      tokenData = JSON.parse(tokenText);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON from create_auth_token", raw: tokenText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract token - try multiple paths
    const authToken =
      tokenData.token ||
      tokenData.auth_token ||
      tokenData.data?.token ||
      tokenData.data?.auth_token ||
      tokenData.session?.token ||
      null;

    console.log("Extracted authToken:", authToken ? `${authToken.substring(0, 20)}...` : "NULL");

    if (!authToken) {
      return new Response(
        JSON.stringify({ success: false, error: "No auth token found in response", keys: Object.keys(tokenData) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: user_validation - try 3 strategies
    const baseBody = {
      name,
      lastname: "",
      email,
      access_code: "",
      entry_name: "Lovable_Assessment",
    };

    const strategies = [
      {
        label: "A: raw token in Authorization",
        headers: { "Content-Type": "application/json", Authorization: authToken },
        body: baseBody,
      },
      {
        label: "B: Bearer token in Authorization",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: baseBody,
      },
      {
        label: "C: token in body",
        headers: { "Content-Type": "application/json", Authorization: authToken },
        body: { ...baseBody, auth_token: authToken },
      },
    ];

    for (const strategy of strategies) {
      console.log(`=== STEP 2 Strategy ${strategy.label} ===`);
      const res = await fetch(
        `${baseUrl}/general_projects/user_validation`,
        {
          method: "POST",
          headers: strategy.headers,
          body: JSON.stringify(strategy.body),
        }
      );

      const resText = await res.text();
      console.log(`Strategy ${strategy.label} status:`, res.status);
      console.log(`Strategy ${strategy.label} FULL response:`, resText);

      let resData: any;
      try { resData = JSON.parse(resText); } catch { resData = { raw: resText }; }

      const isSuccess = res.status === 200 || res.status === 201;
      const isAlreadyExists =
        res.status === 409 ||
        res.status === 422 ||
        (resData?.error && /already|exist|duplicate/i.test(String(resData.error)));

      if (isSuccess || isAlreadyExists) {
        console.log(`SUCCESS with strategy ${strategy.label}`);

        // Extract the user validation token from the response
        const userToken =
          resData?.data?.token ||
          resData?.token ||
          resData?.data?.auth_token ||
          null;
        console.log("Extracted userToken:", userToken ? `${String(userToken).substring(0, 20)}...` : "NULL");

        // Update baby record with registration flag and token
        if (baby_id) {
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          const supabase = createClient(supabaseUrl, supabaseKey);
          await supabase.from("babies").update({
            kinedu_registered: true,
            kinedu_token: userToken,
          } as any).eq("id", baby_id);
        }

        return new Response(
          JSON.stringify({ success: true, already_exists: isAlreadyExists, strategy: strategy.label, token: userToken }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // All strategies failed
    return new Response(
      JSON.stringify({
        success: false,
        error: "All 3 auth strategies failed for user_validation. Check edge function logs for details.",
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    console.error("Error in register-kinedu-user:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
