import { Star } from "lucide-react";

const testimonials = [
  {
    quote: "I was worried about my daughter's speech. The assessment showed me exactly where she stood compared to other kids her age and gave me clear next steps. Such a relief!",
    name: "Sarah M.",
  },
  {
    quote: "Within 2 minutes I had a full picture of my son's development. Turns out he was ahead in some areas I didn't expect. Every parent should do this.",
    name: "Jessica R.",
  },
];

const SocialProofBlock = () => {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 text-center w-full shadow-sm">
      {/* Header */}
      <p className="text-lg font-bold text-primary mb-1">
        Parents love the results.
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
