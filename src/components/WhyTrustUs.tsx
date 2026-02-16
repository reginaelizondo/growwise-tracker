import harvardLogo from "@/assets/harvard-center-logo.png";
import stanfordLogo from "@/assets/stanford-university-logo.png";

const credentials = [
  {
    icon: "🏆",
    text: "MIT-Solve Early Childhood Development Solver 2019",
  },
  {
    logo: harvardLogo,
    alt: "Harvard Center on the Developing Child",
    text: "Recommended by Harvard's Center on the Developing Child",
  },
  {
    logo: stanfordLogo,
    alt: "Stanford University",
    text: "Stanford research (2016) found these activities significantly improve parent-child connection",
  },
];

const WhyTrustUs = () => {
  return (
    <div className="text-center">
      <h2 className="text-xl font-bold text-primary mb-1">
        Science-backed.
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Kinedu works with international experts to ensure content based on the latest science.
      </p>

      <div className="space-y-3">
        {credentials.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-4 bg-card border border-border rounded-xl p-4 text-left shadow-sm"
          >
            {item.logo ? (
              <img src={item.logo} alt={item.alt} className="w-10 h-10 object-contain flex-shrink-0" />
            ) : (
              <span className="text-2xl flex-shrink-0">{item.icon}</span>
            )}
            <p className="text-sm font-medium text-foreground leading-snug">
              {item.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WhyTrustUs;
