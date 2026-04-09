import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleVideoTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (video.currentTime >= 6.840) {
      video.pause();
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black">
      {/* Full-screen background video */}
      <video 
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        muted
        playsInline
        preload="auto"
        onTimeUpdate={handleVideoTimeUpdate}
      >
        <source src="/videos/dica-landing-hero.mp4" type="video/mp4" />
        Votre navigateur ne supporte pas la lecture vidéo.
      </video>
      
      {/* Overlay for better text visibility */}
      <div className="absolute inset-0 bg-black/20" />
      
      {/* Content */}
      <div className="relative z-10 text-center px-4 mt-[48vh]">
        <Button
          size="lg"
          onClick={() => navigate(user ? "/dashboard" : "/auth")}
          className="h-14 px-24 text-xl font-semibold transition-all duration-300 bg-white text-black hover:bg-white hover:scale-105 w-full max-w-md rounded-full animate-glow-pulse hover:shadow-[0_0_30px_rgba(233,78,93,0.7),0_0_60px_rgba(233,78,93,0.4)]"
        >
          Entrer
        </Button>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 left-0 right-0 z-20 text-center">
        <Link 
          to="/mentions-legales"
          className="text-xs text-white/60 hover:text-white transition-colors underline-offset-4 hover:underline"
        >
          Mentions légales & CGU
        </Link>
      </div>
    </div>
  );
};

export default Index;
