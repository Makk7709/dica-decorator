import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="relative min-h-screen flex items-center justify-center">
      {/* Full-screen background video */}
      <video 
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src="/videos/dica-landing-hero.mp4" type="video/mp4" />
      </video>
      
      {/* Overlay for better text visibility */}
      <div className="absolute inset-0 bg-black/20" />
      
      {/* Content */}
      <div className="relative z-10 text-center px-4 mt-[60vh]">
        <Button
          size="lg"
          onClick={() => navigate(user ? "/dashboard" : "/auth")}
          className="h-16 px-12 text-xl font-semibold shadow-2xl hover:shadow-3xl transition-all bg-white text-black hover:bg-white/90 animate-fade-in hover:scale-105"
        >
          Entrer
        </Button>
      </div>
    </div>
  );
};

export default Index;
