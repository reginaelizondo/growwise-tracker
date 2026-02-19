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
    const { name, email, baby_id } = await req.json();

    if (!email || !name) {
      return new Response(
        JSON.stringify({ success: false, error: "Name and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const staticToken = Deno.env.get("KINEDU_STATIC_TOKEN");
    const baseUrl = Deno.env.get("KINEDU_API_BASE_URL") || "https://qa.kinedu.com/api/v6";

    if (!staticToken) {
      console.error("KINEDU_STATIC_TOKEN not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Get auth token — try Bearer header first, then body
    let authToken: string | null = null;

    // Attempt 1: token directly in Authorization header (no Bearer prefix), empty body
    console.log("Attempting create_auth_token with raw token in header...");
    const attempt1 = await fetch(
      `${baseUrl}/general_projects/create_session/create_auth_token`,
      {
        method: "POST",
        headers: {
          Authorization: staticToken,
        },
      }
    );

    const attempt1Data = await attempt1.json().catch(() => null);
    console.log("Attempt 1 status:", attempt1.status, "data:", JSON.stringify(attempt1Data));

    if (attempt1.ok && attempt1Data) {
      authToken =
        attempt1Data.token ||
        attempt1Data.auth_token ||
        attempt1Data.data?.token ||
        attempt1Data.data?.auth_token ||
        null;
    }

    // Attempt 2: token in body
    if (!authToken) {
      console.log("Attempting create_auth_token with token in body (no Bearer)...");
      const attempt2 = await fetch(
        `${baseUrl}/general_projects/create_session/create_auth_token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: staticToken,
          },
          body: JSON.stringify({ token: staticToken }),
        }
      );

      const attempt2Data = await attempt2.json().catch(() => null);
      console.log("Attempt 2 status:", attempt2.status, "data:", JSON.stringify(attempt2Data));

      if (attempt2.ok && attempt2Data) {
        authToken =
          attempt2Data.token ||
          attempt2Data.auth_token ||
          attempt2Data.data?.token ||
          attempt2Data.data?.auth_token ||
          null;
      }

      if (!authToken) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Could not obtain auth token from Kinedu",
            debug: { attempt1_status: attempt1.status, attempt2_status: attempt2.status },
          }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Step 2: Register user via user_validation
    console.log("Calling user_validation...");
    const validationRes = await fetch(
      `${baseUrl}/general_projects/user_validation`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authToken,
        },
        body: JSON.stringify({
          name,
          lastname: "",
          email,
          access_code: "",
          entry_name: "Lovable_Assessment",
        }),
      }
    );

    const validationData = await validationRes.json().catch(() => null);
    console.log("user_validation status:", validationRes.status, "data:", JSON.stringify(validationData));

    const isSuccess = validationRes.ok || validationRes.status === 200 || validationRes.status === 201;
    // Treat "already exists" as success too
    const isAlreadyExists =
      validationRes.status === 409 ||
      validationRes.status === 422 ||
      (validationData?.error && /already|exist|duplicate/i.test(String(validationData.error)));

    if (isSuccess || isAlreadyExists) {
      // Update baby record in Supabase
      if (baby_id) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        await supabase
          .from("babies")
          .update({ kinedu_registered: true } as any)
          .eq("id", baby_id);
      }

      return new Response(
        JSON.stringify({
          success: true,
          already_exists: isAlreadyExists,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: validationData?.error || validationData?.message || "Registration failed",
        status: validationRes.status,
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    console.error("Error in register-kinedu-user:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
