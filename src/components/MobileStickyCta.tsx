import { Button } from "@/components/ui/button";
import { getKineduRedirectUrl } from "@/config/kinedu";

interface MobileStickyCtaProps {
  babyName: string;
  assessmentId?: string;
  babyId?: string;
  kineduRegistered?: boolean;
  email?: string;
  kineduToken?: string;
  locale?: string;
}

export const MobileStickyCta = ({ babyName, assessmentId, babyId, kineduRegistered, email, kineduToken, locale }: MobileStickyCtaProps) => {
  const ctaUrl = getKineduRedirectUrl({ email, token: kineduToken, locale });

  const handleClick = async () => {
    console.log('🔵 Mobile sticky CTA clicked', { assessmentId, babyId, kineduRegistered });
    console.log('🔵 CTA URL:', ctaUrl);
    console.log('🔵 Token:', kineduToken ? kineduToken.substring(0, 20) + '...' : 'NULL');

    // Track event BEFORE navigating — use fetch with keepalive so it survives navigation
    if (assessmentId && babyId) {
      try {
        const payload = {
          assessment_id: assessmentId,
          baby_id: babyId,
          event_type: 'cta_clicked',
          event_data: {
            cta_type: 'mobile_sticky_cta',
            kinedu_registered: kineduRegistered,
            url: ctaUrl,
            timestamp: new Date().toISOString()
          }
        };
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        // fetch + keepalive: true supports Content-Type: application/json AND survives navigation
        await fetch(`${supabaseUrl}/rest/v1/assessment_events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify(payload),
          keepalive: true,
        });
      } catch (err) {
        console.error('CTA tracking error:', err);
      }
    }

    window.location.href = ctaUrl;
  };

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-[1000] animate-[slide-in-bottom_0.4s_ease-out_0.5s_both]"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
    >
      <div 
        className="bg-card/95 backdrop-blur-md px-4 pt-3 pb-2"
        style={{
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
          boxShadow: '0 -2px 16px rgba(0,0,0,0.15)',
        }}
      >
        <Button
          size="lg"
          className="w-full h-[56px] shadow-lg hover:shadow-xl transition-all font-bold text-[17px] text-white"
          style={{
            borderRadius: '14px',
            background: 'hsl(210, 80%, 45%)',
          }}
          onClick={handleClick}
        >
          Start {babyName ? `${babyName}'s` : 'Your'} Plan — 7 Days Free
        </Button>
        <p className="text-center text-xs text-muted-foreground mt-1.5 mb-1">
          No commitment required
        </p>
      </div>
    </div>
  );
};
