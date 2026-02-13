import kineduLogo from "@/assets/logo-kinedu-blue.png";

interface AppDownloadSectionProps {
  assessmentId?: string;
  babyId?: string;
}

const AppDownloadSection = ({ assessmentId, babyId }: AppDownloadSectionProps) => {
  const appStoreUrl = "https://apps.apple.com/us/app/kinedu-baby-development/id741277284";
  const playStoreUrl = "https://play.google.com/store/apps/details?id=com.kinedu.appkinedu&hl=es_MX";

  return (
    <div className="py-10 px-5 bg-[#F9FAFB] border-t border-b border-[#E5E7EB] text-center rounded-2xl">
      {/* Kinedu Logo */}
      <img 
        src={kineduLogo} 
        alt="Kinedu" 
        className="h-8 w-auto mx-auto mb-4" 
      />
      
      {/* Title */}
      <h3 className="text-[18px] font-semibold text-[#1F2937] mb-5">
        Download the Kinedu app
      </h3>
      
      {/* App Store Badges */}
      <div className="flex justify-center items-center gap-3 mb-3">
        <a 
          href={appStoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-opacity hover:opacity-80"
        >
          <img 
            src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
            alt="Download on the App Store"
            className="h-10"
          />
        </a>
        <a 
          href={playStoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-opacity hover:opacity-80"
        >
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
            alt="Get it on Google Play"
            className="h-10"
          />
        </a>
      </div>
      
      {/* Subtitle */}
      <p className="text-[14px] text-[#6B7280]">
        Available on iPhone and Android
      </p>
    </div>
  );
};

export default AppDownloadSection;
