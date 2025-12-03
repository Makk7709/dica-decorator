import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleVideoTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (video.duration - video.currentTime <= 1) {
      video.pause();
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center">
      {/* Full-screen background video */}
      <video 
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        muted
        playsInline
        onTimeUpdate={handleVideoTimeUpdate}
      >
        <source src="/videos/dica-landing-hero.mp4" type="video/mp4" />
      </video>
      
      {/* Overlay for better text visibility */}
      <div className="absolute inset-0 bg-black/20" />
      
      {/* Logo DICA en haut */}
      <div className="absolute top-6 left-6 z-20">
        <img 
          src="/images/dica-logo.svg" 
          alt="DICA" 
          width={140}
          height={48}
          fetchPriority="high"
          className="h-10 md:h-12 w-auto opacity-90"
        />
      </div>
      
      {/* Content */}
      <div className="relative z-10 text-center px-4 mt-[48vh]">
        <Button
          size="lg"
          onClick={() => navigate(user ? "/dashboard" : "/auth")}
          className="h-14 px-24 text-xl font-semibold transition-all duration-300 bg-white text-black hover:bg-white hover:scale-105 w-full max-w-md rounded-full btn-halo-pulse"
        >
          Entrer
        </Button>
      </div>
    </div>
  );
};

export default Index;
