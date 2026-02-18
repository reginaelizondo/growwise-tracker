import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// External Supabase for skill names (read-only, public anon key)
const EXTERNAL_SUPABASE_URL = 'https://uslivvopgsrajcxxjftw.supabase.co'
const EXTERNAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzbGl2dm9wZ3NyYWpjeHhqZnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDcyMjksImV4cCI6MjA3NjgyMzIyOX0.d2E9PPtC0j5V3qDxHHw_y9Z9cQXOi2t5LWwIe9RqJhE'

interface AreaResult {
  area_name: string
  area_id: number
  totalMilestones: number
  masteredCount: number
  percentage: number
  pace: number
  percentile: number
  skills: SkillResult[]
}

interface SkillResult {
  skill_id: number
  skill_name: string
  area_id: number
  mastered: number
  total: number
  percentage: number
}

const areaColors: Record<number, string> = {
  1: '#00A3E0',
  2: '#00C853',
  3: '#FF8A00',
  4: '#F06292',
}

const STORAGE_URL = 'https://ogyvfohbhwxwwxlwyjth.supabase.co/storage/v1/object/public/email-assets'

const areaIcons: Record<number, string> = {
  1: `${STORAGE_URL}/Logo_Physical_HD.png`,
  2: `${STORAGE_URL}/Logo_Cognitive_HD.png`,
  3: `${STORAGE_URL}/Logo_Linguistic_HD.png`,
  4: `${STORAGE_URL}/Logo_Emotional_HD.png`,
}

const areaNames: Record<number, string> = {
  1: 'Physical',
  2: 'Cognitive',
  3: 'Linguistic',
  4: 'Socio-Emotional',
}

function calculatePace(percentile: number): number {
  const P_MIN = 0.0, P_MAX = 2.0, P0 = 0.5, GAMMA_UP = 1.0, GAMMA_DOWN = 1.2
  const r = Math.max(0, Math.min(100, percentile)) / 100.0
  let pace
  if (r >= P0) {
    pace = 1 + (P_MAX - 1) * Math.pow((r - P0) / (1 - P0), GAMMA_UP)
  } else {
    pace = 1 - (1 - P_MIN) * Math.pow((P0 - r) / P0, GAMMA_DOWN)
  }
  return Math.round(Math.max(P_MIN, Math.min(P_MAX, pace)) * 10) / 10
}

function getPaceMessage(pace: number): { message: string; emoji: string } {
  if (pace <= 0.7) return { message: 'Developing steadily — targeted activities can accelerate growth', emoji: '🌱' }
  if (pace <= 0.9) return { message: 'Progressing well — daily play maintains momentum', emoji: '📈' }
  if (pace <= 1.2) return { message: 'On track — keep up the great work!', emoji: '⭐' }
  return { message: 'Ahead of pace — excellent progress!', emoji: '🚀' }
}

function getPaceColor(pace: number): string {
  if (pace <= 0.7) return '#FF9800'
  if (pace <= 0.9) return '#2196F3'
  if (pace <= 1.2) return '#4CAF50'
  return '#7C3AED'
}

function getPaceLabel(percentile: number): { label: string; emoji: string } {
  if (percentile >= 90) return { label: 'Early Bloomer', emoji: '🌟' }
  if (percentile >= 10) return { label: 'Right on schedule', emoji: '✅' }
  return { label: 'Taking their time', emoji: '🌱' }
}

function buildGaugeHtml(pace: number, color: string): string {
  const totalBars = 30
  const currentPos = Math.max(0, Math.min(1, pace / 2.0))
  let bars = ''
  for (let i = 0; i < totalBars; i++) {
    const pos = i / (totalBars - 1)
    const dist = Math.abs(pos - currentPos)
    let h = 12, opacity = 0.2, barColor = '#CBD5E0'
    if (dist < 0.02) {
      h = 24; opacity = 1; barColor = color
    } else if (dist < 0.08) {
      const intensity = 1 - (dist - 0.02) / 0.06
      h = 12 + 12 * intensity; opacity = 0.3 + 0.7 * intensity; barColor = color
    }
    bars += `<td style="width:3px;height:${h}px;background:${barColor};opacity:${opacity.toFixed(2)};border-radius:1px 1px 0 0;"></td>`
    if (i < totalBars - 1) bars += `<td style="width:1px;"></td>`
  }
  return `
    <div style="margin-top: 8px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td><table cellpadding="0" cellspacing="0" style="width:100%;"><tr style="vertical-align: bottom;">${bars}</tr></table></td>
      </tr></table>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:2px;">
        <tr>
          <td style="font-size:9px;color:#A0AEC0;font-weight:600;">0×</td>
          <td style="font-size:9px;color:#A0AEC0;font-weight:600;text-align:center;">1×</td>
          <td style="font-size:9px;color:#A0AEC0;font-weight:600;text-align:right;">2×</td>
        </tr>
      </table>
    </div>`
}

function getSkillStatusIcon(percentage: number): string {
  if (percentage >= 75) return '✅'
  if (percentage >= 40) return '🔄'
  return '⚠️'
}

function getSkillStatusLabel(percentage: number): string {
  if (percentage >= 75) return 'Mastered'
  if (percentage >= 40) return 'On Track'
  return 'Needs Practice'
}

function getSkillContext(skillName: string): string {
  const l = skillName.toLowerCase()
  if (l.includes('imitation') || l.includes('pretend') || l.includes('play')) return 'Key for language development'
  if (l.includes('problem') || l.includes('solving') || l.includes('logic')) return 'Critical for learning'
  if (l.includes('spatial') || l.includes('object') || l.includes('permanence') || l.includes('cause')) return 'Foundation for STEM skills'
  if (l.includes('balance') || l.includes('coordination') || l.includes('motor') || l.includes('physical') || l.includes('movement') || l.includes('crawl') || l.includes('walk') || l.includes('head') || l.includes('control')) return 'Important for confidence'
  if (l.includes('focus') || l.includes('memory') || l.includes('attention') || l.includes('sensory')) return 'Essential for learning'
  if (l.includes('emotion') || l.includes('social') || l.includes('attachment') || l.includes('secure') || l.includes('self') || l.includes('regulation')) return 'Crucial for social development'
  if (l.includes('babbl') || l.includes('language') || l.includes('communication') || l.includes('speak') || l.includes('word') || l.includes('linguistic')) return 'Vital for communication'
  return 'Important for overall development'
}

const LOGO_URL = 'https://ogyvfohbhwxwwxlwyjth.supabase.co/storage/v1/object/public/email-assets/logo-kinedu-blue.png'
const CTA_URL = 'https://app.kinedu.com/ia-signuppage/?swc=ia-report'

function buildEmailHtml(babyName: string, ageMonths: number, areas: AreaResult[], overallPace: number): string {
  // Find weakest skills (up to 4)
  const allSkills = areas.flatMap(a => a.skills)
  const weakestSkills = [...allSkills].sort((a, b) => a.percentage - b.percentage).slice(0, 4)

  // Find strongest area
  const sortedAreas = [...areas].sort((a, b) => b.percentage - a.percentage)
  const strongestArea = sortedAreas[0]

  // Area display names for the 2x2 grid
  const areaDisplayNames: Record<number, string> = { 1: 'Physical', 2: 'Cognitive', 3: 'Language', 4: 'Social' }
  const areaEmojiFallback: Record<number, string> = { 1: '🏃', 2: '🧠', 3: '💬', 4: '❤️' }

  // Build 2x2 area grid
  const areaById = new Map(areas.map(a => [a.area_id, a]))
  
  function areaCard(areaId: number): string {
    const a = areaById.get(areaId)
    if (!a) return ''
    const color = areaColors[areaId] || '#333'
    const iconUrl = areaIcons[areaId] || ''
    const name = areaDisplayNames[areaId] || a.area_name
    const pl = getPaceLabel(a.percentile)
    return `
      <table width="100%" cellpadding="0" cellspacing="0" style="background: #FBF9F6; border-radius: 16px; overflow: hidden; border: 1.5px solid #E8E4DF;">
        <tr><td style="height: 3px; background: ${color};"></td></tr>
        <tr><td style="padding: 14px 14px 12px;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="vertical-align: middle;">
              <img src="${iconUrl}" alt="${name}" style="width: 20px; height: 20px; vertical-align: middle;" />
              <span style="font-size: 14px; font-weight: 800; color: ${color}; vertical-align: middle; margin-left: 4px;">${name}</span>
            </td>
            <td style="text-align: right; vertical-align: middle;">
              <span style="font-size: 18px; font-weight: 800; color: ${color};">${a.pace.toFixed(1)}×</span>
            </td>
          </tr></table>
          ${buildGaugeHtml(a.pace, color)}
          <div style="margin-top: 6px; font-size: 11px; color: #718096; font-weight: 700; text-align: center;">${pl.emoji} ${pl.label}</div>
        </td></tr>
      </table>`
  }

  // Focus skills rows
  const focusRows = weakestSkills.map((s, i) => {
    const pctColor = s.percentage <= 15 ? '#E53E3E' : '#DD6B20'
    const isLast = i === weakestSkills.length - 1
    return `
      <tr>
        <td style="padding: 7px 0;${!isLast ? ' border-bottom: 1px solid #FEEBC8;' : ''}">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td><span style="font-size: 13px; font-weight: 700; color: #2D3748;">${s.skill_name}</span></td>
            <td style="text-align: right; width: 50px;"><span style="font-size: 13px; font-weight: 800; color: ${pctColor};">${s.percentage}%</span></td>
          </tr></table>
        </td>
      </tr>`
  }).join('')

  // Preheader text
  const preheader = `${babyName} has strengths in ${areaDisplayNames[strongestArea?.area_id] || 'social'} skills — but ${weakestSkills.length} areas need your attention in the next 60 days.`

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${babyName}'s Development Report</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FBF9F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; -webkit-font-smoothing: antialiased;">
  <div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #FBF9F6;">
    ${preheader}
  </div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FBF9F6; padding: 16px 0 32px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 1px 16px rgba(0,0,0,0.04);">

        <!-- HEADER -->
        <tr>
          <td style="padding: 24px 24px 0; text-align: center;">
            <img src="${LOGO_URL}" alt="Kinedu" style="height: 30px;" />
          </td>
        </tr>

        <!-- EMOTIONAL HERO -->
        <tr>
          <td style="padding: 24px 24px 20px; text-align: center;">
            <h1 style="font-size: 26px; font-weight: 800; color: #2D3748; margin: 0 0 10px; line-height: 1.25;">
              Good news — ${babyName} is<br/>doing great in some areas 🌟
            </h1>
            <p style="font-size: 15px; color: #718096; margin: 0; line-height: 1.5;">
              But there are a few skills that need<br/>your help in the next 60 days.
            </p>
          </td>
        </tr>


        <!-- RESULTS OVERVIEW - 2x2 grid -->
        <tr>
          <td style="padding: 0 20px 20px;">
            <!-- Row 1 -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
              <tr>
                <td width="49%" style="padding-right: 4px;">${areaCard(1)}</td>
                <td width="49%" style="padding-left: 4px;">${areaCard(2)}</td>
              </tr>
            </table>
            <!-- Row 2 -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="49%" style="padding-right: 4px;">${areaCard(3)}</td>
                <td width="49%" style="padding-left: 4px;">${areaCard(4)}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- FOCUS AREAS -->
        <tr>
          <td style="padding: 0 20px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background: #FFFBEB; border: 1.5px solid #FEEBC8; border-radius: 18px; overflow: hidden;">
              <tr>
                <td style="padding: 18px 18px 14px;">
                  <p style="font-size: 14px; font-weight: 800; color: #975A16; margin: 0 0 4px;">🎯 Skills that need attention</p>
                  <p style="font-size: 13px; color: #B7791F; margin: 0 0 14px;">These respond quickly to guided play:</p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    ${focusRows}
                  </table>
                  <div style="margin-top: 14px; padding-top: 14px; border-top: 1.5px solid #FEEBC8;">
                    <p style="font-size: 13px; color: #975A16; margin: 0; text-align: center; font-weight: 700;">
                      At ${ageMonths} months, ${babyName}'s brain forms <strong style="color: #C05621;">1M+ connections per second</strong>.
                    </p>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- KINEDU CONVERSION SECTION -->
        <tr>
          <td style="padding: 0 16px 10px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F0F7FF;border:1px solid #E0E8F5;border-radius:10px;">
              <tr><td align="center" style="padding:14px 16px 4px;">
                <img src="${STORAGE_URL}/app-awards.png" alt="App of the day · Editor's Choice" width="220" style="width:220px;height:auto;display:block;" />
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
                <img src="${STORAGE_URL}/kinedu-app-preview.png" alt="Kinedu App" width="230" style="width:230px;height:auto;display:block;border-radius:8px;" />
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
                <a href="${CTA_URL}" style="display:block;background-color:#34A853;color:#ffffff;text-decoration:none;font-size:15px;font-weight:800;padding:14px 0;border-radius:10px;text-align:center;">
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
                      <img src="${STORAGE_URL}/app-store-badge-final.png" alt="App Store" width="105" style="width:105px;height:auto;display:block;" />
                    </a>
                  </td>
                  <td>
                    <a href="https://play.google.com/store/apps/details?id=com.kinedu.appkinedu&hl=es_MX">
                      <img src="${STORAGE_URL}/google-play-badge.png" alt="Google Play" width="115" style="width:115px;height:auto;display:block;" />
                    </a>
                  </td>
                </tr></table>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- TRUST FOOTER -->
        <tr>
          <td style="padding: 6px 20px 4px;">
            <p style="margin:0;font-size:12px;color:#374151;font-weight:700;text-align:center;">Trusted by 10M+ families</p>
            <p style="margin:2px 0 0;font-size:11px;color:#9ca3af;text-align:center;">🏆 MIT Solve &nbsp;·&nbsp; 🏛️ Harvard &nbsp;·&nbsp; 🌲 Stanford</p>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="padding: 14px 24px; background: #FBF9F6; text-align: center; border-top: 1px solid #F0EDE8;">
            <p style="font-size: 10px; color: #A0AEC0; margin: 0 0 3px;">This assessment is for informational purposes only and does not replace professional medical consultation.</p>
            <p style="font-size: 10px; color: #CBD5E0; margin: 0;">© ${new Date().getFullYear()} Kinedu</p>
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
      console.log('SKIP: Missing assessment_id or baby_id', { assessment_id, baby_id })
      return new Response(JSON.stringify({ error: 'Missing assessment_id or baby_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendKey = Deno.env.get('RESEND_API_KEY')

    if (!resendKey) {
      console.log('SKIP: RESEND_API_KEY not configured')
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const externalSupabase = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY)

    // Fetch baby, assessment, and responses in parallel
    const [babyResult, assessmentResult, responsesResult] = await Promise.all([
      supabase.from('babies').select('*').eq('id', baby_id).single(),
      supabase.from('assessments').select('*').eq('id', assessment_id).single(),
      supabase.from('assessment_responses').select('milestone_id, answer, area_id, skill_id').eq('assessment_id', assessment_id),
    ])

    const baby = babyResult.data
    if (babyResult.error || !baby) {
      console.log('SKIP: Baby not found', { baby_id, error: babyResult.error?.message })
      return new Response(JSON.stringify({ error: 'Baby not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // If no email, skip sending — this is valid for Path B (email captured later)
    if (!baby.email) {
      console.log('SKIP: No email on file for baby', baby_id)
      return new Response(JSON.stringify({ skipped: true, reason: 'No email on file yet' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const assessment = assessmentResult.data
    if (!assessment) {
      console.log('SKIP: Assessment not found', { assessment_id, error: assessmentResult.error?.message })
      return new Response(JSON.stringify({ error: 'Assessment not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Deduplication: skip if email already sent for this assessment
    if (assessment.email_sent_at) {
      console.log('Email already sent for assessment', assessment_id, 'at', assessment.email_sent_at)
      return new Response(JSON.stringify({ skipped: true, reason: 'Email already sent', sent_at: assessment.email_sent_at }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const responses = responsesResult.data
    if (!responses?.length) {
      console.log('SKIP: No responses found for assessment', assessment_id, '- likely race condition, responses not yet written')
      return new Response(JSON.stringify({ error: 'No responses found' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get unique skill IDs and fetch skill names from external DB
    const skillIds = [...new Set(responses.map(r => r.skill_id).filter(Boolean))] as number[]
    
    const skillNameMap = new Map<number, string>()
    if (skillIds.length > 0) {
      // Query external Supabase - skills_locales has skill_id + title
      const { data: skillsData, error: skillsError } = await externalSupabase
        .from('skills_locales')
        .select('skill_id, title')
        .in('skill_id', skillIds)
        .eq('locale', 'en')
      
      console.log('External skills query result:', JSON.stringify({ skillIds, count: skillsData?.length, error: skillsError?.message }))
      
      if (skillsData) {
        for (const s of skillsData) {
          if (!skillNameMap.has(s.skill_id)) {
            skillNameMap.set(s.skill_id, s.title)
          }
        }
      }

      // Fallback: if skills_locales didn't work, try milestones table
      if (skillNameMap.size === 0) {
        const { data: milestonesData } = await externalSupabase
          .from('milestones')
          .select('skill_id, skill_name')
          .in('skill_id', skillIds)
        
        console.log('External milestones fallback:', JSON.stringify({ count: milestonesData?.length }))
        
        if (milestonesData) {
          for (const s of milestonesData) {
            if (!skillNameMap.has(s.skill_id)) {
              skillNameMap.set(s.skill_id, s.skill_name)
            }
          }
        }
      }
    }

    console.log('Skill name map:', JSON.stringify(Object.fromEntries(skillNameMap)))

    // Group by area and skill
    const areaSkillMap = new Map<number, Map<number, { total: number; mastered: number }>>()
    const areaTotals = new Map<number, { total: number; mastered: number }>()

    for (const r of responses) {
      const areaId = r.area_id ?? 0
      const skillId = r.skill_id ?? 0
      if (areaId === 0) continue

      if (!areaTotals.has(areaId)) areaTotals.set(areaId, { total: 0, mastered: 0 })
      const at = areaTotals.get(areaId)!
      at.total++
      if (r.answer === 'yes') at.mastered++

      if (skillId > 0) {
        if (!areaSkillMap.has(areaId)) areaSkillMap.set(areaId, new Map())
        const skillMap = areaSkillMap.get(areaId)!
        if (!skillMap.has(skillId)) skillMap.set(skillId, { total: 0, mastered: 0 })
        const sk = skillMap.get(skillId)!
        sk.total++
        if (r.answer === 'yes') sk.mastered++
      }
    }

    // Build area results with skills
    const areas: AreaResult[] = Array.from(areaTotals.entries())
      .sort(([a], [b]) => a - b)
      .map(([areaId, data]) => {
        const percentage = Math.round((data.mastered / data.total) * 100)
        const skills: SkillResult[] = []
        const skillMap = areaSkillMap.get(areaId)
        if (skillMap) {
          for (const [skillId, sData] of skillMap.entries()) {
            skills.push({
              skill_id: skillId,
              skill_name: skillNameMap.get(skillId) || `Skill ${skillId}`,
              area_id: areaId,
              mastered: sData.mastered,
              total: sData.total,
              percentage: Math.round((sData.mastered / sData.total) * 100),
            })
          }
          skills.sort((a, b) => a.percentage - b.percentage)
        }
        return {
          area_id: areaId,
          area_name: areaNames[areaId] || `Area ${areaId}`,
          totalMilestones: data.total,
          masteredCount: data.mastered,
          percentage,
          percentile: percentage,
          pace: calculatePace(percentage),
          skills,
        }
      })

    const avgPercentage = areas.length > 0
      ? areas.reduce((sum, a) => sum + a.percentage, 0) / areas.length
      : 50
    const overallPace = calculatePace(avgPercentage)

    const html = buildEmailHtml(baby.name || 'Your baby', assessment.reference_age_months, areas, overallPace)

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
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Mark email as sent for deduplication
    await supabase
      .from('assessments')
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', assessment_id)

    console.log('Email sent and marked for assessment', assessment_id)

    return new Response(JSON.stringify({ success: true, email_id: resendData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
