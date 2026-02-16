import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  1: '#00A3E0', // Physical - blue
  2: '#00C853', // Cognitive - green
  3: '#FF8A00', // Linguistic - orange
  4: '#F06292', // Socio-Emotional - pink
}

const areaEmojis: Record<number, string> = {
  1: '🏃',
  2: '🧠',
  3: '💬',
  4: '❤️',
}

const areaNames: Record<number, string> = {
  1: 'Physical',
  2: 'Cognitive',
  3: 'Linguistic',
  4: 'Socio-Emotional',
}

function calculatePace(percentile: number): number {
  const P_MIN = 0.0
  const P_MAX = 2.0
  const P0 = 0.5
  const GAMMA_UP = 1.0
  const GAMMA_DOWN = 1.2
  const r = Math.max(0, Math.min(100, percentile)) / 100.0
  let pace
  if (r >= P0) {
    const s = (r - P0) / (1 - P0)
    pace = 1 + (P_MAX - 1) * Math.pow(s, GAMMA_UP)
  } else {
    const t = (P0 - r) / P0
    pace = 1 - (1 - P_MIN) * Math.pow(t, GAMMA_DOWN)
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

function buildEmailHtml(babyName: string, ageMonths: number, areas: AreaResult[], overallPace: number): string {
  const paceInfo = getPaceMessage(overallPace)
  const paceColor = getPaceColor(overallPace)

  // Find 2 weakest skills across all areas
  const allSkills = areas.flatMap(a => a.skills)
  const sortedSkills = [...allSkills].sort((a, b) => a.percentage - b.percentage)
  const weakestSkills = sortedSkills.slice(0, 2)

  // Snapshot intro text
  const snapshotText = overallPace >= 1.0
    ? `${babyName} is progressing well overall.`
    : `${babyName} is developing steadily.`

  // Build area cards
  const areaCardsHtml = areas.map(a => {
    const color = areaColors[a.area_id] || '#333'
    const emoji = areaEmojis[a.area_id] || '📊'
    const areaPaceColor = getPaceColor(a.pace)

    const skillRows = a.skills.map(s => {
      const icon = getSkillStatusIcon(s.percentage)
      const barWidth = Math.max(5, s.percentage)
      return `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0;">
            <div style="font-size: 14px; font-weight: 600; color: #333;">${icon} ${s.skill_name}</div>
            <div style="margin-top: 6px; background: #f0f0f0; border-radius: 4px; height: 8px; overflow: hidden;">
              <div style="width: ${barWidth}%; height: 8px; background: ${color}; border-radius: 4px;"></div>
            </div>
            <div style="font-size: 12px; color: #888; margin-top: 4px;">${s.percentage}% · ${getSkillStatusLabel(s.percentage)}</div>
          </td>
        </tr>`
    }).join('')

    return `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;">
        <tr>
          <td style="height: 4px; background: ${color};"></td>
        </tr>
        <tr>
          <td style="padding: 16px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="font-size: 18px; font-weight: 700; color: ${color};">${emoji} ${a.area_name}</span>
                </td>
                <td style="text-align: right;">
                  <span style="font-size: 16px; font-weight: 700; color: ${areaPaceColor};">${a.pace.toFixed(1)}x</span>
                </td>
              </tr>
            </table>
            <div style="font-size: 13px; color: #888; margin-top: 4px;">${a.masteredCount}/${a.totalMilestones} milestones mastered · ${a.percentage}%</div>
          </td>
        </tr>
        ${skillRows}
      </table>`
  }).join('')

  // Weakest skills list for snapshot
  const weakSkillsList = weakestSkills.map(s => `
    <tr>
      <td style="padding: 6px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width: 8px; vertical-align: top; padding-top: 6px;">
              <div style="width: 8px; height: 8px; border-radius: 50%; background: #F59E0B;"></div>
            </td>
            <td style="padding-left: 12px;">
              <div style="font-size: 15px; font-weight: 700; color: #333;">${s.skill_name} <span style="font-weight: 400; color: #D97706;">${s.percentage}%</span></div>
              <div style="font-size: 13px; color: #6B7280; margin-top: 2px;">${getSkillContext(s.skill_name)}</div>
            </td>
          </tr>
        </table>
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
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <tr>
          <td style="background: linear-gradient(135deg, #1a73e8, #4a90d9); padding: 32px 24px; text-align: center;">
            <img src="https://growwise-tracker.lovable.app/images/logo_kinedu.png" alt="Kinedu" style="height: 36px; margin-bottom: 16px;" />
            <h1 style="color: #ffffff; font-size: 26px; margin: 0 0 8px 0; font-weight: 800;">${babyName}'s Development Report</h1>
            <p style="color: rgba(255,255,255,0.85); font-size: 15px; margin: 0;">Age: ${ageMonths} months</p>
          </td>
        </tr>

        <!-- Snapshot Card -->
        <tr>
          <td style="padding: 24px 24px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #FFFBEB, #FEF3C7); border: 1px solid #FDE68A; border-radius: 12px; overflow: hidden;">
              <tr><td style="padding: 24px; text-align: center;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: #FEF3C7; margin: 0 auto 12px; line-height: 40px; font-size: 20px;">📈</div>
                <h2 style="font-size: 20px; font-weight: 700; color: #333; margin: 0 0 8px;">${babyName}'s Snapshot</h2>
                <p style="font-size: 15px; color: #333; margin: 0 0 16px;">${snapshotText} Right now, the biggest growth opportunities are:</p>
                <table width="90%" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                  ${weakSkillsList}
                </table>
                <div style="border-top: 1px solid rgba(245,158,11,0.3); margin-top: 16px; padding-top: 16px;">
                  <p style="font-size: 15px; color: #333; margin: 0;"><strong>The next 60 days are key.</strong> Daily guided play can significantly accelerate these skills.</p>
                </div>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- Overall Pace -->
        <tr>
          <td style="padding: 24px 24px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f8fafc, #eef2ff); border: 1px solid #e0e7ff; border-radius: 12px; overflow: hidden;">
              <tr><td style="padding: 24px; text-align: center;">
                <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #888; margin: 0 0 8px;">Overall Development Pace</p>
                <div style="font-size: 56px; font-weight: 900; color: ${paceColor}; margin: 0; line-height: 1.1;">${overallPace.toFixed(1)}x</div>
                <p style="font-size: 15px; color: #555; margin: 12px 0 0;">${paceInfo.emoji} ${paceInfo.message}</p>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- Area Breakdown Title -->
        <tr>
          <td style="padding: 24px 24px 12px;">
            <h2 style="font-size: 18px; color: #333; margin: 0; font-weight: 700;">Development by Area</h2>
          </td>
        </tr>

        <!-- Area Cards -->
        <tr>
          <td style="padding: 0 24px;">
            ${areaCardsHtml}
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding: 8px 24px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f0f7ff, #e8f0fe); border-radius: 12px; overflow: hidden;">
              <tr><td style="padding: 28px; text-align: center;">
                <h3 style="color: #1a73e8; font-size: 20px; margin: 0 0 8px; font-weight: 700;">Want personalized activities?</h3>
                <p style="color: #555; font-size: 14px; margin: 0 0 20px;">Download Kinedu for 1,800+ activities tailored to ${babyName}'s development stage.</p>
                <a href="https://app.kinedu.com/ia-signuppage/?swc=ia-report" style="display: inline-block; background: #1a73e8; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 10px; font-weight: 700; font-size: 16px;">Start 7-Day Free Trial</a>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding: 16px 24px; background-color: #fafafa; text-align: center; border-top: 1px solid #f0f0f0;">
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
    const externalSupabase = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY)

    // Fetch baby, assessment, and responses in parallel
    const [babyResult, assessmentResult, responsesResult] = await Promise.all([
      supabase.from('babies').select('*').eq('id', baby_id).single(),
      supabase.from('assessments').select('*').eq('id', assessment_id).single(),
      supabase.from('assessment_responses').select('milestone_id, answer, area_id, skill_id').eq('assessment_id', assessment_id),
    ])

    const baby = babyResult.data
    if (babyResult.error || !baby?.email) {
      return new Response(JSON.stringify({ error: 'No email found for this baby' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const assessment = assessmentResult.data
    if (!assessment) {
      return new Response(JSON.stringify({ error: 'Assessment not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const responses = responsesResult.data
    if (!responses?.length) {
      return new Response(JSON.stringify({ error: 'No responses found' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get unique skill IDs and fetch skill names from external DB
    const skillIds = [...new Set(responses.map(r => r.skill_id).filter(Boolean))] as number[]
    
    let skillNameMap = new Map<number, string>()
    if (skillIds.length > 0) {
      const { data: skillsData } = await externalSupabase
        .from('milestones')
        .select('skill_id, skill_name')
        .in('skill_id', skillIds)
      
      if (skillsData) {
        for (const s of skillsData) {
          if (!skillNameMap.has(s.skill_id)) {
            skillNameMap.set(s.skill_id, s.skill_name)
          }
        }
      }
    }

    // Group by area and skill
    const areaSkillMap = new Map<number, Map<number, { total: number; mastered: number }>>()
    const areaTotals = new Map<number, { total: number; mastered: number }>()

    for (const r of responses) {
      const areaId = r.area_id ?? 0
      const skillId = r.skill_id ?? 0
      if (areaId === 0) continue

      // Area totals
      if (!areaTotals.has(areaId)) areaTotals.set(areaId, { total: 0, mastered: 0 })
      const at = areaTotals.get(areaId)!
      at.total++
      if (r.answer === 'yes') at.mastered++

      // Skill within area
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
          pace: calculatePace(percentage),
          skills,
        }
      })

    // Calculate overall pace
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
