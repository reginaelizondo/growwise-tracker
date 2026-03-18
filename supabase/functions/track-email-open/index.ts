import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// 1x1 transparent PNG pixel (68 bytes)
const PIXEL = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
  0x54, 0x78, 0x9c, 0x62, 0x00, 0x00, 0x00, 0x02,
  0x00, 0x01, 0xe2, 0x21, 0xbc, 0x33, 0x00, 0x00,
  0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42,
  0x60, 0x82,
])

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const assessmentId = url.searchParams.get('aid')

  // Always return the pixel immediately (don't block on DB write)
  const pixelResponse = new Response(PIXEL, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': PIXEL.length.toString(),
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Access-Control-Allow-Origin': '*',
    },
  })

  if (assessmentId) {
    // Fire-and-forget: record the open in the background
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseKey)

      // Only set email_opened_at if it hasn't been set yet (first open)
      await supabase
        .from('assessments')
        .update({ email_opened_at: new Date().toISOString() })
        .eq('id', assessmentId)
        .is('email_opened_at', null)

      console.log('Email open tracked for assessment:', assessmentId)
    } catch (err) {
      console.error('Error tracking email open:', err)
    }
  }

  return pixelResponse
})
