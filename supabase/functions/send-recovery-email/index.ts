import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AREA_NAMES: Record<number, string> = {
  2: "Cognitive",
  1: "Physical",
  3: "Linguistic",
  4: "Social",
};

const AREA_ICON_URLS: Record<number, string> = {
  2: "https://ogyvfohbhwxwwxlwyjth.supabase.co/storage/v1/object/public/email-assets/Logo_Cognitive_HD.png",
  1: "https://ogyvfohbhwxwwxlwyjth.supabase.co/storage/v1/object/public/email-assets/Logo_Physical_HD.png",
  3: "https://ogyvfohbhwxwwxlwyjth.supabase.co/storage/v1/object/public/email-assets/Logo_Linguistic_HD.png",
  4: "https://ogyvfohbhwxwwxlwyjth.supabase.co/storage/v1/object/public/email-assets/Logo_Emotional_HD.png",
};

let KINEDU_SIGNUP_URL = Deno.env.get('KINEDU_CTA_URL') || 'https://kinedu.superwall.app/ia-report';

const AREA_COLORS: Record<number, string> = {
  2: "#34A853", // Cognitive - green
  1: "#4A90D9", // Physical - blue
  3: "#F5A623", // Linguistic - orange
  4: "#E91E8C", // Social - pink/magenta
};

function buildStepTracker(selectedAreas: number[], completedAreas: number[], currentAreaId: number | null): string {
  const steps = selectedAreas.map((areaId) => {
    const name = AREA_NAMES[areaId] || `Area ${areaId}`;
    const iconUrl = AREA_ICON_URLS[areaId] || "";
    const isCompleted = completedAreas.includes(areaId);
    const isCurrent = areaId === currentAreaId && !isCompleted;
    const areaColor = AREA_COLORS[areaId] || "#34A853";

    if (isCompleted) {
      return `<td align="center" style="padding:0 4px;">
          <div style="border:3px solid ${areaColor};border-radius:50%;padding:1px;display:inline-block;">
            <img src="${iconUrl}" width="36" height="36" alt="${name}" style="width:36px;height:36px;border-radius:50%;display:block;" />
          </div>
          <div style="font-size:9px;color:${areaColor};font-weight:700;margin-top:2px;">${name}</div>
        </td>`;
    } else if (isCurrent) {
      return `<td align="center" style="padding:0 4px;">
          <div style="border:3px solid ${areaColor};border-radius:50%;padding:1px;display:inline-block;">
            <img src="${iconUrl}" width="36" height="36" alt="${name}" style="width:36px;height:36px;border-radius:50%;display:block;" />
          </div>
          <div style="font-size:9px;color:${areaColor};font-weight:700;margin-top:2px;">${name}</div>
        </td>`;
    } else {
      return `<td align="center" style="padding:0 4px;">
          <div style="border:2px solid #e5e7eb;border-radius:50%;padding:1px;display:inline-block;">
            <img src="${iconUrl}" width="36" height="36" alt="${name}" style="width:36px;height:36px;border-radius:50%;display:block;opacity:0.4;" />
          </div>
          <div style="font-size:9px;color:#9ca3af;margin-top:2px;">${name}</div>
        </td>`;
    }
  });

  const withLines: string[] = [];
  steps.forEach((step, i) => {
    withLines.push(step);
    if (i < steps.length - 1) {
      withLines.push(`<td style="vertical-align:middle;padding-bottom:12px;"><div style="width:18px;height:2px;background-color:#d1d5db;margin:0 auto;"></div></td>`);
    }
  });

  return `<tr>${withLines.join("")}</tr>`;
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
  const storageBase = "https://ogyvfohbhwxwwxlwyjth.supabase.co/storage/v1/object/public/email-assets";

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
<span style="display:none;max-height:0;overflow:hidden;">${babyName}'s development report is waiting — finish in 2 minutes &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</span>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f6;">
<tr><td align="center" style="padding:16px 12px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

<!-- Logo -->
<tr><td align="center" style="padding:24px 20px 8px;">
  <img src="${storageBase}/logo-kinedu-blue.png" alt="Kinedu" height="28" style="height:28px;" />
</td></tr>

<!-- Headline -->
<tr><td align="center" style="padding:4px 20px;">
  <h1 style="margin:0;font-size:22px;font-weight:800;color:#1A3C7A;line-height:1.2;">${headline}</h1>
</td></tr>

<!-- Subtext -->
<tr><td align="center" style="padding:4px 24px 12px;">
  <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.5;">${subText}</p>
</td></tr>

<!-- CTA -->
<tr><td style="padding:0 20px;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center">
      <a href="${resumeLink}" style="display:block;background-color:#34A853;color:#ffffff;text-decoration:none;font-size:16px;font-weight:800;padding:16px 0;border-radius:12px;text-align:center;">
        Finish ${babyName}'s Report →
      </a>
    </td></tr>
  </table>
</td></tr>
<tr><td align="center" style="padding:4px 20px 12px;">
  <p style="margin:0;font-size:11px;color:#9ca3af;">Takes 2 min · 100% free</p>
</td></tr>

<!-- Progress Card -->
<tr><td style="padding:0 16px 10px;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F8F9FA;border-radius:10px;border:1px solid #EEEEF0;">
    <tr><td style="padding:12px 14px 4px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="font-size:11px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Your progress</td>
        <td align="right" style="font-size:11px;color:#1A3C7A;font-weight:700;">${progress}% complete</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:0 6px 6px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        ${stepTrackerHtml}
      </table>
    </td></tr>
    <tr><td style="padding:0 14px;border-top:1px solid #E8E8E5;">
      <p style="margin:8px 0 6px;font-size:11px;color:#6b7280;text-align:center;">
        <strong>Full report</strong> &nbsp;·&nbsp; <strong>Focus areas</strong> &nbsp;·&nbsp; <strong>Daily activities</strong>
      </p>
    </td></tr>
  </table>
</td></tr>

<!-- Kinedu App Section -->
<tr><td style="padding:2px 16px 0;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F0F7FF;border:1px solid #E0E8F5;border-radius:10px;">
    <tr><td align="center" style="padding:14px 16px 4px;">
      <img src="${storageBase}/app-awards.png" alt="App of the day · Editor's Choice" width="220" style="width:220px;height:auto;display:block;" />
    </td></tr>
    <tr><td align="center" style="padding:6px 16px 4px;">
      <table cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border-radius:100px;border:1px solid #E5E7EB;">
        <tr><td style="padding:4px 12px;font-size:12px;color:#374151;font-weight:700;">⭐ 4.7 rating · 6.7k+ reviews</td></tr>
      </table>
    </td></tr>
    <tr><td align="center" style="padding:4px 16px 0;">
      <p style="margin:0;font-size:9px;color:#9ca3af;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">The #1 app recommended by pediatricians</p>
    </td></tr>
    <tr><td align="center" style="padding:4px 16px 4px;">
      <h2 style="margin:0;font-size:18px;font-weight:800;color:#1A3C7A;line-height:1.3;">Know EXACTLY what to do with ${babyName} every day</h2>
    </td></tr>
    <tr><td align="center" style="padding:6px 16px 8px;">
      <img src="${storageBase}/kinedu-app-preview.png" alt="Kinedu App" width="230" style="width:230px;height:auto;display:block;border-radius:8px;" />
    </td></tr>
    <tr><td style="padding:2px 16px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="width:22px;vertical-align:top;padding-top:3px;">
            <div style="width:16px;height:16px;border-radius:50%;background-color:#34A853;text-align:center;line-height:16px;font-size:9px;color:#fff;">✓</div>
          </td>
          <td style="font-size:13px;color:#374151;line-height:1.35;padding:0 0 7px 4px;">
            <strong>Ensure a healthy development</strong> with personalized daily activities
          </td>
        </tr>
        <tr>
          <td style="width:22px;vertical-align:top;padding-top:3px;">
            <div style="width:16px;height:16px;border-radius:50%;background-color:#34A853;text-align:center;line-height:16px;font-size:9px;color:#fff;">✓</div>
          </td>
          <td style="font-size:13px;color:#374151;line-height:1.35;padding:0 0 7px 4px;">
            <strong>Unlock full potential</strong> with more than 1,800+ expert activities
          </td>
        </tr>
        <tr>
          <td style="width:22px;vertical-align:top;padding-top:3px;">
            <div style="width:16px;height:16px;border-radius:50%;background-color:#34A853;text-align:center;line-height:16px;font-size:9px;color:#fff;">✓</div>
          </td>
          <td style="font-size:13px;color:#374151;line-height:1.35;padding:0 0 7px 4px;">
            <strong>Create a deeper bond</strong> through guided playtime every day
          </td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="padding:6px 16px 4px;">
      <a href="${KINEDU_SIGNUP_URL}" style="display:block;background-color:#34A853;color:#ffffff;text-decoration:none;font-size:15px;font-weight:800;padding:14px 0;border-radius:10px;text-align:center;">
        Start 7 Day Free Trial
      </a>
    </td></tr>
    <tr><td align="center" style="padding:3px 16px 6px;">
      <p style="margin:0;font-size:10px;color:#9ca3af;">No commitment · Cancel anytime</p>
    </td></tr>
    <tr><td align="center" style="padding:2px 16px 10px;">
      <table cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="padding-right:6px;">
          <a href="https://apps.apple.com/mx/app/kinedu-desarrollo-del-beb%C3%A9/id741277284">
            <img src="${storageBase}/app-store-badge-final.png" alt="App Store" width="105" style="width:105px;height:auto;display:block;" />
          </a>
        </td>
        <td>
          <a href="https://play.google.com/store/apps/details?id=com.kinedu.appkinedu&hl=es_MX">
            <img src="${storageBase}/google-play-badge.png" alt="Google Play" width="115" style="width:115px;height:auto;display:block;" />
          </a>
        </td>
      </tr></table>
    </td></tr>
  </table>
</td></tr>

<!-- Footer -->
<tr><td style="padding:6px 20px 4px;">
  <p style="margin:0;font-size:12px;color:#374151;font-weight:700;text-align:center;">Trusted by 10M+ families</p>
  <p style="margin:2px 0 0;font-size:11px;color:#9ca3af;text-align:center;">🏆 MIT Solve &nbsp;·&nbsp; 🏛️ Harvard &nbsp;·&nbsp; 🌲 Stanford</p>
</td></tr>
<tr><td style="padding:10px 20px 18px;border-top:1px solid #f0f0ed;">
  <p style="margin:0;font-size:10px;color:#bcc0c7;text-align:center;line-height:1.5;">
    This assessment is for informational purposes only and does not replace professional medical consultation.<br/>
    © 2026 Kinedu. All rights reserved. · <a href="#" style="color:#bcc0c7;text-decoration:underline;">Unsubscribe</a>
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
    const { session_id, is_second_email, kinedu_signup_url } = await req.json();
    // Override signup URL if passed (env-aware)
    if (kinedu_signup_url) {
      KINEDU_SIGNUP_URL = kinedu_signup_url;
    }
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
    const selectedAreas: number[] = session.selected_areas || [2, 1, 3, 4];

    // Recalculate progress from actual assessment_responses data
    let completedAreas: number[] = [];
    let currentAreaId = session.current_area_id;
    let progress = Math.round(session.progress_percentage || 0);

    if (session.assessment_id) {
      const { data: areaResponses } = await supabase
        .from("assessment_responses")
        .select("area_id")
        .eq("assessment_id", session.assessment_id);

      if (areaResponses && areaResponses.length > 0) {
        const areasWithResponses = new Set(areaResponses.map((r: any) => r.area_id));
        completedAreas = selectedAreas.filter(a => areasWithResponses.has(a));
        
        // Find the first area without responses as the current area
        const firstIncomplete = selectedAreas.find(a => !areasWithResponses.has(a));
        currentAreaId = firstIncomplete ?? selectedAreas[selectedAreas.length - 1];

        // Progress: 22% base (baby form) + up to 78% based on areas completed
        const areaProgress = completedAreas.length / selectedAreas.length;
        progress = Math.round(22 + areaProgress * 78);
      }
    }
    const resumeLink = `https://growwise-tracker.lovable.app/resume?session=${session_id}`;

    const stepTrackerHtml = buildStepTracker(selectedAreas, completedAreas, currentAreaId);

    const headline = is_second_email
      ? `${babyName}'s report expires in 24h`
      : `${babyName}'s report is almost ready`;

    const subText = is_second_email
      ? `After 48 hours, you'll need to start over. Pick up where you left off — only <strong style="color:#111827;">2 more minutes</strong>.`
      : `You started but didn't finish. Pick up where you left off — only <strong style="color:#111827;">2 more minutes</strong>.`;

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
  } catch (err: unknown) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
