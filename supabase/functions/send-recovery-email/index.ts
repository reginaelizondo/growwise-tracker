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

const AREA_COLORS: Record<number, string> = {
  1: "#5EB5EF",
  2: "#6DC185",
  3: "#F5A623",
  4: "#E96DA4",
};

const AREA_ICON_URLS: Record<number, string> = {
  2: "https://ogyvfohbhwxwwxlwyjth.supabase.co/storage/v1/object/public/email-assets/Logo_Cognitive_HD.png",
  1: "https://ogyvfohbhwxwwxlwyjth.supabase.co/storage/v1/object/public/email-assets/Logo_Physical_HD.png",
  3: "https://ogyvfohbhwxwwxlwyjth.supabase.co/storage/v1/object/public/email-assets/Logo_Linguistic_HD.png",
  4: "https://ogyvfohbhwxwwxlwyjth.supabase.co/storage/v1/object/public/email-assets/Logo_Emotional_HD.png",
};

function buildStepTracker(selectedAreas: number[], completedAreas: number[], currentAreaId: number | null): string {
  const steps = selectedAreas.map((areaId) => {
    const name = AREA_NAMES[areaId] || `Area ${areaId}`;
    const color = AREA_COLORS[areaId] || "#6b7280";
    const iconUrl = AREA_ICON_URLS[areaId] || "";
    const isCompleted = completedAreas.includes(areaId);
    const isCurrent = areaId === currentAreaId && !isCompleted;

    if (isCompleted) {
      return `<td style="text-align:center;padding:0 6px;">
        <div style="font-size:13px;color:#22c55e;font-weight:700;">✓</div>
        <img src="${iconUrl}" width="28" height="28" alt="${name}" style="width:28px;height:28px;border-radius:50%;display:block;margin:2px auto;" />
        <div style="font-size:10px;color:${color};font-weight:600;margin-top:2px;">${name}</div>
      </td>`;
    } else if (isCurrent) {
      return `<td style="text-align:center;padding:0 6px;">
        <div style="width:8px;height:8px;background-color:#2563eb;border-radius:50%;margin:4px auto 2px;"></div>
        <div style="border:2px solid #2563eb;border-radius:50%;padding:1px;display:inline-block;">
          <img src="${iconUrl}" width="28" height="28" alt="${name}" style="width:28px;height:28px;border-radius:50%;display:block;" />
        </div>
        <div style="font-size:10px;color:${color};font-weight:700;margin-top:2px;">${name}</div>
      </td>`;
    } else {
      return `<td style="text-align:center;padding:0 6px;">
        <div style="width:8px;height:8px;border-radius:50%;margin:4px auto 2px;"></div>
        <img src="${iconUrl}" width="28" height="28" alt="${name}" style="width:28px;height:28px;border-radius:50%;display:block;margin:2px auto;opacity:0.35;" />
        <div style="font-size:10px;color:#9ca3af;margin-top:2px;">${name}</div>
      </td>`;
    }
  });

  return `<tr>${steps.join("")}</tr>`;
}

function buildCtaButton(babyName: string, resumeLink: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center">
      <a href="${resumeLink}" style="display:block;background-color:#34A853;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 0;border-radius:12px;text-align:center;">
        Finish ${babyName}'s Report →
      </a>
    </td></tr>
  </table>`;
}

function buildAppSection(babyName: string): string {
  const storageBase = "https://ogyvfohbhwxwwxlwyjth.supabase.co/storage/v1/object/public/email-assets";
  const appStoreUrl = `${storageBase}/app-store-badge-final.png`;
  const googlePlayUrl = `${storageBase}/google-play-badge.png`;

  return `
  <tr><td style="padding:4px 20px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F0F7FF;border:1px solid #E0E8F5;border-radius:12px;">
      <tr><td align="center" style="padding:14px 16px 0;">
        <table cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border-radius:16px;">
          <tr><td style="padding:4px 12px;font-size:12px;color:#374151;font-weight:600;">⭐ 4.7 rating · 6.7k+ reviews</td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:6px 16px 0;">
        <p style="margin:0;font-size:9px;color:#6b7280;font-weight:700;letter-spacing:1px;text-transform:uppercase;text-align:center;">THE #1 APP RECOMMENDED BY PEDIATRICIANS</p>
      </td></tr>
      <tr><td style="padding:6px 16px 0;">
        <p style="margin:0;font-size:18px;font-weight:800;color:#1B2B4B;text-align:center;line-height:1.3;">Know exactly what to do with ${babyName} every day</p>
      </td></tr>
      <tr><td style="padding:10px 16px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding:3px 0;font-size:13px;color:#374151;">✓ Ensure ${babyName}'s healthy development</td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#374151;">✓ Unlock ${babyName}'s full potential — 1,800+ activities</td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#374151;">✓ Create a deeper bond through daily playtime</td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:10px 16px 0;">
        <a href="https://app.kinedu.com/ia-signuppage/?swc=ia-report" style="display:block;background-color:#1B2B4B;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 0;border-radius:12px;text-align:center;">Start 7 Days Free Trial</a>
      </td></tr>
      <tr><td align="center" style="padding:4px 16px 0;">
        <p style="margin:0;font-size:11px;color:#9ca3af;">No commitment · Cancel anytime</p>
      </td></tr>
      <tr><td align="center" style="padding:8px 16px 14px;">
        <table cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="padding-right:6px;"><a href="https://apps.apple.com/mx/app/kinedu-desarrollo-del-beb%C3%A9/id741277284"><img src="${appStoreUrl}" alt="App Store" width="110" style="width:110px;height:auto;display:block;" /></a></td>
          <td><a href="https://play.google.com/store/apps/details?id=com.kinedu.appkinedu&hl=es_MX"><img src="${googlePlayUrl}" alt="Google Play" width="120" style="width:120px;height:auto;display:block;" /></a></td>
        </tr></table>
      </td></tr>
    </table>
  </td></tr>`;
}

function buildEmailHtml(params: {
  subject: string;
  babyName: string;
  headline: string;
  subText: string;
  progress: number;
  stepTrackerHtml: string;
  resumeLink: string;
}): string {
  const { subject, babyName, headline, subText, progress, stepTrackerHtml, resumeLink } = params;

  return `<!DOCTYPE html>
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
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<span style="display:none;max-height:0;overflow:hidden;">${babyName}'s development report is waiting — finish in 2 minutes</span>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f6;">
<tr><td align="center" style="padding:16px 12px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

<!-- Logo -->
<tr><td align="center" style="padding:24px 20px 8px;">
  <img src="https://ogyvfohbhwxwwxlwyjth.supabase.co/storage/v1/object/public/email-assets/logo-kinedu-blue.png" alt="Kinedu" height="28" style="height:28px;" />
</td></tr>

<!-- Headline -->
<tr><td align="center" style="padding:4px 20px;">
  <h1 style="margin:0;font-size:22px;font-weight:800;color:#111827;line-height:1.2;">${headline}</h1>
</td></tr>

<!-- Subtext -->
<tr><td align="center" style="padding:4px 24px 12px;">
  <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.5;">${subText}</p>
</td></tr>

<!-- CTA -->
<tr><td style="padding:0 20px;">
  ${buildCtaButton(babyName, resumeLink)}
</td></tr>
<tr><td align="center" style="padding:4px 20px 12px;">
  <p style="margin:0;font-size:11px;color:#9ca3af;">Takes 2 min · 100% free</p>
</td></tr>

<!-- Progress Step Tracker -->
<tr><td style="padding:0 20px 8px;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F8F9FA;border-radius:12px;">
    <tr><td style="padding:10px 12px 4px;">
      <p style="margin:0;font-size:11px;color:#6b7280;font-weight:600;">${progress}% complete</p>
    </td></tr>
    <tr><td style="padding:0 8px 6px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        ${stepTrackerHtml}
      </table>
    </td></tr>
    <tr><td align="center" style="padding:0 8px 10px;border-top:1px solid #e5e7eb;">
      <p style="margin:6px 0 0;font-size:12px;color:#6b7280;">📊 Full report · 🎯 Focus areas · 🧸 Daily activities</p>
    </td></tr>
  </table>
</td></tr>

<!-- Kinedu App Section -->
${buildAppSection(babyName)}

<!-- Footer -->
<tr><td style="padding:12px 20px;border-top:1px solid #f3f4f6;">
  <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">Trusted by 10M+ families · ⭐ 4.7 rating · 6.7k+ reviews</p>
  <p style="margin:6px 0 0;font-size:10px;color:#bcc0c7;text-align:center;line-height:1.5;">
    This assessment is for informational purposes only and does not replace professional medical consultation.<br/>
    © 2026 Kinedu. All rights reserved.
  </p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

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

    const stepTrackerHtml = buildStepTracker(selectedAreas, completedAreas, currentAreaId);

    const headline = is_second_email
      ? `${babyName}'s report expires in 24h`
      : `${babyName}'s report is almost ready`;

    const subText = is_second_email
      ? `After 48 hours, you'll need to start over. Pick up where you left off — it only takes <strong>2 more minutes</strong>.`
      : `You started the assessment but didn't finish. Pick up right where you left off — it only takes <strong>2 more minutes</strong>.`;

    const subject = is_second_email
      ? `Last chance — ${babyName}'s assessment expires soon`
      : `${babyName}'s development report is ${progress}% done`;

    const emailHtml = buildEmailHtml({
      subject,
      babyName,
      headline,
      subText,
      progress,
      stepTrackerHtml,
      resumeLink,
    });

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
