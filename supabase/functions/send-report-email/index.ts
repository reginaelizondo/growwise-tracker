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
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;"><tr>
        <td><table cellpadding="0" cellspacing="0" style="width:100%;"><tr style="vertical-align: bottom;">${bars}</tr></table></td>
      </tr></table>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:2px;">
        <tr>
          <td style="font-size:9px;color:#A0AEC0;font-weight:600;">0×</td>
          <td style="font-size:9px;color:#A0AEC0;font-weight:600;text-align:center;">1×</td>
          <td style="font-size:9px;color:#A0AEC0;font-weight:600;text-align:right;">2×</td>
        </tr>
      </table>`
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
const CTA_URL = Deno.env.get('KINEDU_SIGNUP_URL') || 'https://app.kinedu.com/ia-signuppage/?swc=ia-report'

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
      <table width="100%" cellpadding="0" cellspacing="0" style="background: #FBF9F6; border-radius: 16px; border: 1.5px solid #E8E4DF;">
        
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
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px;"><tr><td style="font-size: 11px; color: #718096; font-weight: 700; text-align: center;">${pl.emoji} ${pl.label}</td></tr></table>
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

        <!-- HOW KINEDU HELPS -->
        <tr>
          <td style="padding: 4px 20px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background: #FBF9F6; border-radius: 18px; border: 1.5px solid #E8E4DF; overflow: hidden;">
              <tr>
                <td style="padding: 22px 20px;">
                  <h2 style="font-size: 19px; font-weight: 800; color: #2D3748; text-align: center; margin: 0 0 20px;">How Kinedu helps ${babyName} grow</h2>
                  <!-- Step 1 -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
                    <tr>
                      <td style="width: 44px; vertical-align: top;">
                        <div style="width: 38px; height: 38px; border-radius: 50%; background: #48BB78; text-align: center; line-height: 38px;">
                          <span style="color: #fff; font-size: 16px;">✓</span>
                        </div>
                      </td>
                      <td style="padding-left: 12px; vertical-align: middle;">
                        <span style="font-size: 15px; font-weight: 700; color: #2D3748;">Take the assessment</span>
                        <span style="display: inline-block; margin-left: 6px; background: #C6F6D5; color: #276749; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 8px;">Done!</span>
                      </td>
                    </tr>
                  </table>
                  <!-- Step 2 -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
                    <tr>
                      <td style="width: 44px; vertical-align: top;">
                        <div style="width: 38px; height: 38px; border-radius: 50%; background: #3182CE; text-align: center; line-height: 38px;">
                          <span style="color: #fff; font-size: 16px; font-weight: 800;">2</span>
                        </div>
                      </td>
                      <td style="padding-left: 12px; vertical-align: top;">
                        <div style="font-size: 15px; font-weight: 700; color: #2D3748;">Get your personalized daily activities plan</div>
                        <div style="font-size: 13px; color: #A0AEC0; margin-top: 2px;">5-10 minute activities designed for ${babyName}'s exact developmental stage</div>
                      </td>
                    </tr>
                  </table>
                  <!-- Step 3 -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                    <tr>
                      <td style="width: 44px; vertical-align: top;">
                        <div style="width: 38px; height: 38px; border-radius: 50%; background: #3182CE; text-align: center; line-height: 38px;">
                          <span style="color: #fff; font-size: 16px; font-weight: 800;">3</span>
                        </div>
                      </td>
                      <td style="padding-left: 12px; vertical-align: top;">
                        <div style="font-size: 15px; font-weight: 700; color: #2D3748;">Track progress as ${babyName} develops</div>
                        <div style="font-size: 13px; color: #A0AEC0; margin-top: 2px;">We adapt recommendations as ${babyName} grows</div>
                      </td>
                    </tr>
                  </table>
                  <!-- CTA -->
                  <a href="${CTA_URL}" style="display: block; background-color: #22C55E; color: #ffffff; text-decoration: none; padding: 15px 24px; border-radius: 14px; font-weight: 800; font-size: 16px; text-align: center;">
                    Start 7-Day Free Trial
                  </a>
                  <p style="font-size: 12px; color: #A0AEC0; margin: 8px 0 0; text-align: center;">No commitment required</p>
                </td>
              </tr>
            </table>
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

        <!-- PERSONALIZED PLAN -->
        <tr>
          <td style="padding: 0 20px 6px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #EEF6FF; border: 1.5px solid #BDD8F7; border-radius: 18px;">
              <tr>
                <td style="padding: 22px 20px; text-align: center;">
                  <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #1A3A6B; margin: 0 0 6px; font-weight: 900;">✨ Your Personalized Plan</p>
                  <p style="font-size: 14px; color: #4A6FA5; margin: 0 0 18px; line-height: 1.4;">
                    Kinedu created a daily play plan<br/>targeting ${babyName}'s focus areas.
                  </p>
                  <table width="100%" cellpadding="0" cellspacing="0" style="text-align: left; margin-bottom: 20px;">
                    <tr><td style="padding: 5px 0;"><table cellpadding="0" cellspacing="0"><tr>
                      <td style="width: 28px; vertical-align: middle;"><span style="font-size: 16px;">🎯</span></td>
                      <td><span style="font-size: 13px; color: #2D3748; font-weight: 700;">Daily activities for ${babyName}'s specific needs</span></td>
                    </tr></table></td></tr>
                    <tr><td style="padding: 5px 0;"><table cellpadding="0" cellspacing="0"><tr>
                      <td style="width: 28px; vertical-align: middle;"><span style="font-size: 16px;">⏱️</span></td>
                      <td><span style="font-size: 13px; color: #2D3748; font-weight: 700;">Just 5-10 minutes a day</span></td>
                    </tr></table></td></tr>
                    <tr><td style="padding: 5px 0;"><table cellpadding="0" cellspacing="0"><tr>
                      <td style="width: 28px; vertical-align: middle;"><span style="font-size: 16px;">🧸</span></td>
                      <td><span style="font-size: 13px; color: #2D3748; font-weight: 700;">1,800+ expert-designed activities</span></td>
                    </tr></table></td></tr>
                    <tr><td style="padding: 5px 0;"><table cellpadding="0" cellspacing="0"><tr>
                      <td style="width: 28px; vertical-align: middle;"><span style="font-size: 16px;">📈</span></td>
                      <td><span style="font-size: 13px; color: #2D3748; font-weight: 700;">Parents see results in 2-4 weeks</span></td>
                    </tr></table></td></tr>
                  </table>
                  <a href="${CTA_URL}" style="display: block; background-color: #22C55E; color: #ffffff; text-decoration: none; padding: 15px 24px; border-radius: 14px; font-weight: 800; font-size: 16px; text-align: center;">
                    Start 7-Day Free Trial
                  </a>
                  <p style="font-size: 12px; color: #90A4B8; margin: 8px 0 0;">No commitment required</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- App Store badges -->
        <tr>
          <td style="padding: 10px 20px 20px; text-align: center;">
            <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
              <tr>
                <td style="padding-right: 8px; vertical-align: middle;">
                  <a href="https://apps.apple.com/app/kinedu-baby-development/id740356884">
                    <img src="${STORAGE_URL}/app-store-badge.png" alt="Download on the App Store" style="width: 135px; height: auto;" />
                  </a>
                </td>
                <td style="padding-left: 8px; vertical-align: middle;">
                  <a href="https://play.google.com/store/apps/details?id=com.kinedu">
                    <img src="${STORAGE_URL}/google-play-badge.png" alt="Get it on Google Play" style="width: 150px; height: auto;" />
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding: 0 24px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top: 1.5px solid #F0EDE8;"></td></tr></table></td></tr>

        <!-- TESTIMONIAL -->
        <tr>
          <td style="padding: 20px 20px 16px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background: #FBF9F6; border-radius: 16px; border: 1.5px solid #E8E4DF;">
              <tr>
                <td style="padding: 18px 18px;">
                  <div style="font-size: 14px; margin-bottom: 8px;">⭐⭐⭐⭐⭐</div>
                  <p style="font-size: 14px; color: #4A5568; margin: 0 0 8px; line-height: 1.5; font-style: italic;">
                    "This is an app every first-time mom should have. In addition to tracking my baby's developmental milestones, getting daily activity suggestions, and accessing helpful articles, the real gem of the app is the masterclasses. They truly guide and teach you throughout the journey of learning to be a mom. I get so much out of the live classes — I've taken courses on baby sleep, introducing solids, baby yoga, and more."
                  </p>
                  <p style="font-size: 13px; font-weight: 700; color: #2D3748; margin: 0;">— Victoria</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- TRUST BADGES -->
        <tr>
          <td style="padding: 0 20px 24px; text-align: center;">
            <p style="font-size: 13px; font-weight: 700; color: #4A5568; margin: 0 0 4px;">Trusted by 10M+ families</p>
            <p style="font-size: 12px; color: #A0AEC0; margin: 0 0 12px;">⭐ 4.8 rating · App of the Day</p>
            <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
              <tr>
                <td style="padding: 0 10px; text-align: center;">
                  <span style="font-size: 18px;">🏆</span>
                  <div style="font-size: 10px; color: #A0AEC0; font-weight: 600;">MIT Solve</div>
                </td>
                <td style="padding: 0 10px; text-align: center;">
                  <span style="font-size: 18px;">🎓</span>
                  <div style="font-size: 10px; color: #A0AEC0; font-weight: 600;">Harvard</div>
                </td>
                <td style="padding: 0 10px; text-align: center;">
                  <span style="font-size: 18px;">📚</span>
                  <div style="font-size: 10px; color: #A0AEC0; font-weight: 600;">Stanford</div>
                </td>
              </tr>
            </table>
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

  } catch (error: unknown) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
