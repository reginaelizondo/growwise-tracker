import { Star } from "lucide-react";

const testimonials = [{
  quote: "Kinedu made me feel confident I'm doing the right things for my baby.",
  name: "Maria",
  context: "mom of a 6-month-old"
}, {
  quote: "The daily activities are so easy to follow — my daughter loves them!",
  name: "Kelly",
  context: "mom of a 1-year-old"
}];

const SocialProofBlock = () => {
  return (
    <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl p-7 text-center w-full shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      {/* Stars + Rating */}
      <div className="mb-6">
        <div className="flex justify-center gap-1 mb-4">
          {[1, 2, 3, 4, 5].map(star => (
            <Star key={star} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
          ))}
        </div>
        <p className="text-sm text-[#6B7280]">Rated 5 out of 5</p>
      </div>

      {/* Testimonials */}
      <div className="space-y-7 mb-7">
        {testimonials.map((testimonial, index) => (
          <blockquote key={index} className="max-w-[85%] mx-auto">
            <p className="text-base text-[#1F2937] leading-[1.7]">
              "{testimonial.quote}"
            </p>
            <p className="text-sm text-[#6B7280] mt-3">
              — {testimonial.name}, {testimonial.context}
            </p>
          </blockquote>
        ))}
      </div>

      {/* Divider - centered, 80% width */}
      <div className="w-4/5 mx-auto border-t border-[#E5E7EB] my-5" />

      {/* Trust stat */}
      <p className="text-sm font-medium text-[#6B7280]">
        Trusted by 10M+ parents worldwide
      </p>
    </div>
  );
};

export default SocialProofBlock;
