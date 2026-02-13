import { Star } from "lucide-react";

const testimonials = [
  {
    quote: "This is an app every first-time mom should have. Beyond tracking my baby's milestones and getting daily activity suggestions, the real gem is the masterclasses. They truly guide you through learning to be a mom.",
    name: "Victoria",
  },
  {
    quote: "After using it for three months, I realized it's totally worth it. Live classes where experts share knowledge, data tracking from diapers to sleep patterns — it helps me stay organized and on top of everything!",
    name: "Angela",
  },
];

const SocialProofBlock = () => {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 text-center w-full shadow-sm">
      {/* Header */}
      <p className="text-lg font-bold text-foreground mb-1">
        You're in good company.
      </p>
      <p className="text-sm text-muted-foreground mb-5">
        Trusted by <span className="font-bold text-primary">10M+ families</span> worldwide
      </p>

      {/* Testimonials */}
      <div className="space-y-5 mb-5">
        {testimonials.map((testimonial, index) => (
          <blockquote key={index} className="bg-muted/30 rounded-xl p-4 text-left">
            <div className="flex gap-0.5 mb-2">
              {[1, 2, 3, 4, 5].map(star => (
                <Star key={star} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <p className="text-sm text-foreground leading-relaxed">
              "{testimonial.quote}"
            </p>
            <p className="text-xs text-muted-foreground mt-2 text-right">
              — {testimonial.name}
            </p>
          </blockquote>
        ))}
      </div>

      {/* App Store badges */}
      <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
        <span className="font-medium">🏆 App of the Day</span>
        <span className="font-medium">⭐ Editor's Choice</span>
      </div>
    </div>
  );
};

export default SocialProofBlock;
