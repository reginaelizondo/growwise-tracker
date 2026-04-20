import harvardLogo from "@/assets/harvard-center-logo.png";
import stanfordLogo from "@/assets/stanford-university-logo.png";

const AcademicLogosBar = () => {
  return (
    <div className="flex items-center justify-center gap-6 mb-6 opacity-70">
      <span className="text-3xl">🏆</span>
      <img src={harvardLogo} alt="Harvard" className="h-12 md:h-14 object-contain grayscale" />
      <img src={stanfordLogo} alt="Stanford" className="h-12 md:h-14 object-contain grayscale" />
    </div>
  );
};

export default AcademicLogosBar;
