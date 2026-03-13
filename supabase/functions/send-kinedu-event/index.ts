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
    const {
      event_name,
      event_data,
      fbp,
      fbc,
      fb_event_id,
      kinedu_api_base_url,
      auth_token: providedAuthToken,
    } = await req.json();

    if (!event_name) {
      return new Response(
        JSON.stringify({ success: false, error: "event_name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Environment detection (same as register-kinedu-user)
    const baseUrl = kinedu_api_base_url
      || Deno.env.get("KINEDU_API_BASE_URL")
      || "https://qa.kinedu.com/api/v6";

    const isProduction = baseUrl.includes("api.kinedu.com");
    const staticToken = isProduction
      ? (Deno.env.get("KINEDU_STATIC_TOKEN_PROD") || Deno.env.get("KINEDU_STATIC_TOKEN"))
      : (Deno.env.get("KINEDU_STATIC_TOKEN_QA") || Deno.env.get("KINEDU_STATIC_TOKEN"));

    console.log("send-kinedu-event:", event_name, "| env:", isProduction ? "PROD" : "QA");

    if (!staticToken) {
      return new Response(
        JSON.stringify({ success: false, error: `Missing Kinedu static token for ${isProduction ? "production" : "QA"}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Get auth token — reuse if provided (singleton), otherwise create new
    let authToken = providedAuthToken || null;
    let tokenCreated = false;

    if (!authToken) {
      console.log("No auth_token provided, calling create_auth_token...");
      const tokenRes = await fetch(
        `${baseUrl}/general_projects/create_session/create_auth_token`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: staticToken },
        }
      );

      const tokenText = await tokenRes.text();
      console.log("create_auth_token status:", tokenRes.status);

      let tokenData: any;
      try {
        tokenData = JSON.parse(tokenText);
      } catch {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid JSON from create_auth_token", raw: tokenText }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      authToken =
        tokenData.token ||
        tokenData.auth_token ||
        tokenData.data?.token ||
        tokenData.data?.auth_token ||
        tokenData.session?.token ||
        null;

      if (!authToken) {
        return new Response(
          JSON.stringify({ success: false, error: "No auth token found", keys: Object.keys(tokenData) }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      tokenCreated = true;
    } else {
      console.log("Reusing provided auth_token (singleton)");
    }

    // Step 2: Call send_event endpoint
    const sendEventBody: Record<string, any> = {
      event_name,
      ...(event_data || {}),
      FB: {
        ...(fbp ? { fbp } : {}),
        ...(fbc ? { fbc } : {}),
      },
    };

    if (fb_event_id) {
      sendEventBody.fb_event_id = fb_event_id;
    }

    console.log("send_event body:", JSON.stringify(sendEventBody));

    const eventRes = await fetch(
      `${baseUrl}/general_projects/send_event`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authToken,
        },
        body: JSON.stringify(sendEventBody),
      }
    );

    const eventText = await eventRes.text();
    console.log("send_event status:", eventRes.status, "response:", eventText);

    let eventData_parsed: any;
    try {
      eventData_parsed = JSON.parse(eventText);
    } catch {
      eventData_parsed = { raw: eventText };
    }

    return new Response(
      JSON.stringify({
        success: eventRes.status >= 200 && eventRes.status < 300,
        status: eventRes.status,
        data: eventData_parsed,
        auth_token: authToken,
        token_created: tokenCreated,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    console.error("Error in send-kinedu-event:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
