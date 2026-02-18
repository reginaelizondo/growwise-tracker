import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // First pass: sessions idle > 30 min, first email not sent
    const { data: firstEmailSessions } = await supabase
      .from("abandoned_sessions")
      .select("session_id")
      .eq("completed", false)
      .eq("email_sent", false)
      .not("email", "is", null)
      .lt("abandoned_at", new Date(Date.now() - 30 * 60 * 1000).toISOString());

    let firstCount = 0;
    if (firstEmailSessions?.length) {
      for (const s of firstEmailSessions) {
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-recovery-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ session_id: s.session_id }),
          });
          firstCount++;
        } catch (err) {
          console.error(`Error sending first email for ${s.session_id}:`, err);
        }
      }
    }

    // Second pass: first email sent > 24h ago, second not sent
    const { data: secondEmailSessions } = await supabase
      .from("abandoned_sessions")
      .select("session_id")
      .eq("completed", false)
      .eq("email_sent", true)
      .eq("second_email_sent", false)
      .not("email", "is", null)
      .lt("email_sent_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    let secondCount = 0;
    if (secondEmailSessions?.length) {
      for (const s of secondEmailSessions) {
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-recovery-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ session_id: s.session_id, is_second_email: true }),
          });
          secondCount++;
        } catch (err) {
          console.error(`Error sending second email for ${s.session_id}:`, err);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        first_emails_sent: firstCount, 
        second_emails_sent: secondCount 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
