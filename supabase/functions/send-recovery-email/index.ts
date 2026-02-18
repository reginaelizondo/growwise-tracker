import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AREA_NAMES: Record<number, string> = {
  2: "Cognitive",
  1: "Physical",
  3: "Linguistic",
  4: "Socio-Emotional",
};

const AREA_EMOJIS: Record<number, string> = {
  2: "🧠",
  1: "💪",
  3: "🗣️",
  4: "❤️",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id, is_second_email } = await req.json();
    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: session, error: fetchErr } = await supabase
      .from("abandoned_sessions")
      .select("*")
      .eq("session_id", session_id)
      .single();

    if (fetchErr || !session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (session.completed || !session.email) {
      return new Response(JSON.stringify({ error: "Session completed or no email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (is_second_email && session.second_email_sent) {
      return new Response(JSON.stringify({ error: "Second email already sent" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!is_second_email && session.email_sent) {
      return new Response(JSON.stringify({ error: "Email already sent" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const babyName = session.baby_name || "Baby";
    const progress = Math.round(session.progress_percentage || 0);
    const selectedAreas: number[] = session.selected_areas || [2, 1, 3, 4];
    const completedAreas: number[] = session.completed_areas || [];
    const currentAreaId = session.current_area_id;
    const resumeLink = `https://growwise-tracker.lovable.app/resume?session=${session_id}`;

    // Build area checklist HTML
    let areaChecklistHtml = "";
    selectedAreas.forEach((areaId, idx) => {
      const name = AREA_NAMES[areaId] || `Area ${areaId}`;
      const emoji = AREA_EMOJIS[areaId] || "📋";
      const stepNum = idx + 1;
      const isCompleted = completedAreas.includes(areaId);
      const isCurrent = areaId === currentAreaId && !isCompleted;

      if (isCompleted) {
        areaChecklistHtml += `
          <tr>
            <td style="padding: 8px 0;">
              <table cellpadding="0" cellspacing="0" border="0"><tr>
                <td style="width: 32px; height: 32px; border-radius: 50%; background-color: #22c55e; text-align: center; vertical-align: middle; color: white; font-weight: bold; font-size: 14px;">✓</td>
                <td style="padding-left: 12px; color: #9ca3af; text-decoration: line-through; font-size: 15px;">${emoji} ${name}</td>
              </tr></table>
            </td>
          </tr>`;
      } else if (isCurrent) {
        areaChecklistHtml += `
          <tr>
            <td style="padding: 8px 0;">
              <table cellpadding="0" cellspacing="0" border="0"><tr>
                <td style="width: 32px; height: 32px; border-radius: 50%; background-color: #e5e7eb; text-align: center; vertical-align: middle; color: #6b7280; font-weight: bold; font-size: 14px;">${stepNum}</td>
                <td style="padding-left: 12px; font-weight: 700; color: #111827; font-size: 15px;">${emoji} ${name} <span style="background-color: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; margin-left: 6px;">← You stopped here</span></td>
              </tr></table>
            </td>
          </tr>`;
      } else {
        areaChecklistHtml += `
          <tr>
            <td style="padding: 8px 0;">
              <table cellpadding="0" cellspacing="0" border="0"><tr>
                <td style="width: 32px; height: 32px; border-radius: 50%; background-color: #e5e7eb; text-align: center; vertical-align: middle; color: #6b7280; font-weight: bold; font-size: 14px;">${stepNum}</td>
                <td style="padding-left: 12px; color: #9ca3af; font-size: 15px;">${emoji} ${name}</td>
              </tr></table>
            </td>
          </tr>`;
      }
    });

    const headline = is_second_email
      ? `${babyName}'s report will expire in 24 hours`
      : `${babyName}'s report is<br/>almost ready`;

    const subText = is_second_email
      ? `After 48 hours, you'll need to start over. Pick up right where you left off — it only takes 2 more minutes.`
      : `You started the assessment but didn't finish.<br/>Pick up right where you left off — it only takes<br/><strong>2 more minutes</strong>.`;

    const subject = is_second_email
      ? `Last chance — ${babyName}'s assessment expires soon`
      : `${babyName}'s development report is ${progress}% done 📋`;

    const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${subject}</title>
<style>
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  body { margin: 0; padding: 0; width: 100% !important; }
  img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
</style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
<span style="display: none; max-height: 0; overflow: hidden;">${babyName}'s development report is waiting — finish in just 2 minutes</span>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6;">
<tr><td align="center" style="padding: 24px 16px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">

<!-- Logo -->
<tr><td align="center" style="padding: 32px 24px 16px;">
  <img src="https://ogyvfohbhwxwwxlwyjth.supabase.co/storage/v1/object/public/email-assets/logo-kinedu-blue.png" alt="Kinedu" height="32" style="height: 32px;" />
</td></tr>

<!-- Emoji -->
<tr><td align="center" style="padding: 8px 24px 0;">
  <span style="font-size: 48px;">📋</span>
</td></tr>

<!-- Headline -->
<tr><td align="center" style="padding: 16px 24px 8px;">
  <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #111827; line-height: 1.3;">${headline}</h1>
</td></tr>

<!-- Subtext -->
<tr><td align="center" style="padding: 0 32px 24px;">
  <p style="margin: 0; font-size: 15px; color: #6b7280; line-height: 1.6;">${subText}</p>
</td></tr>

<!-- Progress Section -->
<tr><td style="padding: 0 24px 8px;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9fafb; border-radius: 12px; padding: 20px;">
  <tr><td style="padding: 16px 20px 8px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="font-size: 13px; color: #6b7280; font-weight: 600;">Your progress</td>
      <td align="right" style="font-size: 13px; color: #2563eb; font-weight: 700;">${progress}% complete</td>
    </tr>
    </table>
  </td></tr>
  <tr><td style="padding: 0 20px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td style="background-color: #e5e7eb; border-radius: 8px; height: 10px;">
      <table cellpadding="0" cellspacing="0" border="0" style="width: ${progress}%; height: 10px;">
      <tr><td style="background: linear-gradient(90deg, #3b82f6, #2563eb); border-radius: 8px; height: 10px;"></td></tr>
      </table>
    </td></tr>
    </table>
  </td></tr>
  
  <!-- Area Checklist -->
  <tr><td style="padding: 0 20px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
    ${areaChecklistHtml}
    </table>
  </td></tr>
  </table>
</td></tr>

<!-- Benefits -->
<tr><td style="padding: 16px 24px 0;">
  <p style="margin: 0 0 12px; font-size: 16px; font-weight: 700; color: #111827; text-align: center;">What you'll unlock:</p>
</td></tr>
<tr><td style="padding: 0 24px;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td style="padding: 8px 0; font-size: 14px; color: #374151;">📊 Full development report comparing ${babyName} to 10M+ babies</td></tr>
  <tr><td style="padding: 8px 0; font-size: 14px; color: #374151;">🎯 Strengths & areas to focus on — know exactly where to help</td></tr>
  <tr><td style="padding: 8px 0; font-size: 14px; color: #374151;">🧸 Personalized daily activities to support ${babyName}'s growth</td></tr>
  </table>
</td></tr>

<!-- CTA Button -->
<tr><td align="center" style="padding: 24px;">
  <a href="${resumeLink}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #2563eb); color: #ffffff; text-decoration: none; font-size: 17px; font-weight: 700; padding: 16px 40px; border-radius: 50px; box-shadow: 0 4px 12px rgba(37,99,235,0.4);">
    Finish ${babyName}'s Report →
  </a>
</td></tr>

<tr><td align="center" style="padding: 0 24px 24px;">
  <p style="margin: 0; font-size: 12px; color: #9ca3af;">Takes less than 2 minutes · 100% free</p>
</td></tr>

<!-- Trust badges -->
<tr><td style="padding: 0 24px 16px; border-top: 1px solid #f3f4f6;">
  <p style="margin: 16px 0 8px; font-size: 13px; color: #6b7280; text-align: center; font-weight: 600;">Trusted by 10M+ families</p>
  <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">⭐ 4.8 rating · App of the Day</p>
</td></tr>

<!-- Footer -->
<tr><td style="padding: 16px 24px 24px; background-color: #f9fafb; border-top: 1px solid #f3f4f6;">
  <p style="margin: 0; font-size: 11px; color: #9ca3af; text-align: center; line-height: 1.6;">
    This assessment is for informational purposes only and does not replace professional medical consultation.<br/>
    © 2026 Kinedu. All rights reserved.
  </p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

    // Send via Resend
    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "Kinedu <noreply@kinedu.com>",
        to: [session.email],
        subject,
        html: emailHtml,
      }),
    });

    if (!resendResp.ok) {
      const errText = await resendResp.text();
      console.error("Resend error:", errText);
      return new Response(JSON.stringify({ error: "Failed to send email", details: errText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update flags
    const updatePayload = is_second_email
      ? { second_email_sent: true }
      : { email_sent: true, email_sent_at: new Date().toISOString() };

    await supabase
      .from("abandoned_sessions")
      .update(updatePayload)
      .eq("session_id", session_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
