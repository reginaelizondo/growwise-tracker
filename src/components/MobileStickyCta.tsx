import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface MobileStickyCtaProps {
  babyName: string;
  assessmentId?: string;
  babyId?: string;
  kineduRegistered?: boolean;
}

export const MobileStickyCta = ({ babyName, assessmentId, babyId, kineduRegistered }: MobileStickyCtaProps) => {
  const ctaUrl = kineduRegistered
    ? 'https://kinedu.superwall.app/ia-report'
    : 'https://app.kinedu.com/ia-signuppage/?swc=ia-report';

  const handleClick = () => {
    console.log('🔵 Mobile sticky CTA clicked', { assessmentId, babyId, kineduRegistered });
    window.location.href = ctaUrl;
    
    if (assessmentId && babyId) {
      supabase.from('assessment_events').insert({
        assessment_id: assessmentId,
        baby_id: babyId,
        event_type: 'cta_clicked',
        event_data: { 
          cta_type: 'mobile_sticky_cta',
          kinedu_registered: kineduRegistered,
          url: ctaUrl,
          timestamp: new Date().toISOString() 
        }
      });
    }
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
          Start {babyName}'s Plan — 7 Days Free
        </Button>
        <p className="text-center text-xs text-muted-foreground mt-1.5 mb-1">
          No commitment required
        </p>
      </div>
    </div>
  );
};
