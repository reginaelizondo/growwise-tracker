import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EXTERNAL_SUPABASE_URL = 'https://uslivvopgsrajcxxjftw.supabase.co'
const EXTERNAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzbGl2dm9wZ3NyYWpjeHhqZnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDcyMjksImV4cCI6MjA3NjgyMzIyOX0.d2E9PPtC0j5V3qDxHHw_y9Z9cQXOi2t5LWwIe9RqJhE'

interface AreaResult {
  area_name: string
  area_id: number
  totalMilestones: number
  masteredCount: number
  percentage: number
}

const areaColors: Record<number, string> = {
  1: '#4CAF50', // Physical
  2: '#2196F3', // Cognitive
  3: '#FF9800', // Linguistic
  4: '#E91E63', // Socio-Emotional
}

const areaEmojis: Record<number, string> = {
  1: '🏃',
  2: '🧠',
  3: '💬',
  4: '❤️',
}

function buildEmailHtml(babyName: string, ageMonths: number, areas: AreaResult[], reportUrl: string): string {
  const areaRows = areas.map(a => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0;">
        <div style="font-size: 16px; font-weight: 600; color: ${areaColors[a.area_id] || '#333'};">
          ${areaEmojis[a.area_id] || '📊'} ${a.area_name}
        </div>
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; text-align: center;">
        <span style="font-size: 20px; font-weight: 700; color: ${areaColors[a.area_id] || '#333'};">${a.percentage}%</span>
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; text-align: right; color: #666; font-size: 14px;">
        ${a.masteredCount}/${a.totalMilestones} milestones
      </td>
    </tr>
  `).join('')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background: linear-gradient(135deg, #1a73e8, #4a90d9); padding: 32px 24px; text-align: center;">
            <img src="https://growwise-tracker.lovable.app/images/logo-kinedu-blue.png" alt="Kinedu" style="height: 32px; margin-bottom: 16px; filter: brightness(10);" />
            <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 8px 0;">${babyName}'s Development Report</h1>
            <p style="color: rgba(255,255,255,0.85); font-size: 14px; margin: 0;">Age: ${ageMonths} months</p>
          </td>
        </tr>
        <!-- Results -->
        <tr>
          <td style="padding: 24px;">
            <h2 style="font-size: 18px; color: #333; margin: 0 0 16px 0;">Assessment Results</h2>
            <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
              <tr style="background-color: #fafafa;">
                <th style="padding: 10px 16px; text-align: left; font-size: 12px; color: #888; text-transform: uppercase;">Area</th>
                <th style="padding: 10px 16px; text-align: center; font-size: 12px; color: #888; text-transform: uppercase;">Score</th>
                <th style="padding: 10px 16px; text-align: right; font-size: 12px; color: #888; text-transform: uppercase;">Progress</th>
              </tr>
              ${areaRows}
            </table>
          </td>
        </tr>
        <!-- CTA -->
        <tr>
          <td style="padding: 0 24px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f0f7ff, #e8f0fe); border-radius: 12px; padding: 24px;">
              <tr><td style="text-align: center;">
                <h3 style="color: #1a73e8; font-size: 18px; margin: 0 0 8px;">Want personalized activities?</h3>
                <p style="color: #555; font-size: 14px; margin: 0 0 16px;">Download Kinedu for 1,800+ activities tailored to ${babyName}'s development stage.</p>
                <a href="https://app.kinedu.com/ia-signuppage/?swc=ia-report" style="display: inline-block; background: #1a73e8; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Get Started Free</a>
              </td></tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding: 16px 24px; background-color: #fafafa; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Kinedu. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { assessment_id, baby_id } = await req.json()

    if (!assessment_id || !baby_id) {
      return new Response(JSON.stringify({ error: 'Missing assessment_id or baby_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendKey = Deno.env.get('RESEND_API_KEY')

    if (!resendKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch baby data
    const { data: baby, error: babyError } = await supabase
      .from('babies')
      .select('*')
      .eq('id', baby_id)
      .single()

    if (babyError || !baby?.email) {
      console.error('Baby not found or no email:', babyError)
      return new Response(JSON.stringify({ error: 'No email found for this baby' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch assessment
    const { data: assessment } = await supabase
      .from('assessments')
      .select('*')
      .eq('id', assessment_id)
      .single()

    if (!assessment) {
      return new Response(JSON.stringify({ error: 'Assessment not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch responses
    const { data: responses } = await supabase
      .from('assessment_responses')
      .select('milestone_id, answer, area_id, skill_id')
      .eq('assessment_id', assessment_id)

    if (!responses?.length) {
      return new Response(JSON.stringify({ error: 'No responses found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Calculate results by area
    const areaNames: Record<number, string> = {
      1: 'Physical',
      2: 'Cognitive',
      3: 'Linguistic',
      4: 'Socio-Emotional',
    }

    const areaResults = new Map<number, { total: number; mastered: number }>()

    for (const r of responses) {
      const areaId = r.area_id ?? 0
      if (!areaResults.has(areaId)) {
        areaResults.set(areaId, { total: 0, mastered: 0 })
      }
      const entry = areaResults.get(areaId)!
      entry.total++
      if (r.answer === 'yes') entry.mastered++
    }

    const areas: AreaResult[] = Array.from(areaResults.entries())
      .filter(([areaId]) => areaId > 0)
      .sort(([a], [b]) => a - b)
      .map(([areaId, data]) => ({
        area_id: areaId,
        area_name: areaNames[areaId] || `Area ${areaId}`,
        totalMilestones: data.total,
        masteredCount: data.mastered,
        percentage: Math.round((data.mastered / data.total) * 100),
      }))

    const reportUrl = `https://growwise-tracker.lovable.app/report/${baby_id}/${assessment_id}`
    const html = buildEmailHtml(baby.name || 'Your baby', assessment.reference_age_months, areas, reportUrl)

    // Send via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Kinedu Assessment <reports@kinedu.com>',
        to: [baby.email],
        subject: `${baby.name || 'Your baby'}'s Development Report is ready! 📊`,
        html,
      }),
    })

    const resendData = await resendResponse.json()

    if (!resendResponse.ok) {
      console.error('Resend error:', resendData)
      return new Response(JSON.stringify({ error: 'Failed to send email', details: resendData }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, email_id: resendData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
