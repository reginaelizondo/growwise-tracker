import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface MobileStickyCtaProps {
  babyName: string;
  assessmentId?: string;
  babyId?: string;
}

export const MobileStickyCta = ({ babyName, assessmentId, babyId }: MobileStickyCtaProps) => {
  const handleClick = () => {
    console.log('🔵 Mobile sticky CTA clicked', { assessmentId, babyId });
    // Open URL immediately to avoid popup blocker on mobile
    window.location.href = 'https://app.kinedu.com/ia-signuppage/?swc=ia-report';
    
    // Track event in background
    if (assessmentId && babyId) {
      supabase.from('assessment_events').insert({
        assessment_id: assessmentId,
        baby_id: babyId,
        event_type: 'cta_clicked',
        event_data: { 
          cta_type: 'mobile_sticky_cta',
          url: 'https://app.kinedu.com/ia-signuppage/?swc=ia-report',
          timestamp: new Date().toISOString() 
        }
      });
    }
  };

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-[1000] lg:hidden animate-[slide-in-bottom_0.4s_ease-out_0.5s_both]"
      style={{
        boxShadow: '0 -2px 16px rgba(0,0,0,0.15)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
    >
      <div 
        className="bg-card px-4 py-3"
        style={{
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px'
        }}
      >
        <Button
          size="lg"
          className="w-full h-[60px] shadow-lg hover:shadow-xl transition-all font-semibold text-[17px] rounded-none bg-primary hover:bg-primary/90 text-white"
          style={{
            borderRadius: '0'
          }}
          onClick={handleClick}
        >
          Start {babyName}'s free 7-day plan
        </Button>
      </div>
    </div>
  );
};
