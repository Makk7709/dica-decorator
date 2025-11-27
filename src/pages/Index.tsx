import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="relative min-h-screen flex items-center justify-center">
      {/* Full-screen background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/dica-landing-hero.jpg')" }}
      />
      
      {/* Overlay for better text visibility */}
      <div className="absolute inset-0 bg-black/20" />
      
      {/* Content */}
      <div className="relative z-10 text-center px-4">
        <Button
          size="lg"
          onClick={() => navigate(user ? "/dashboard" : "/auth")}
          className="h-16 px-12 text-xl font-semibold shadow-2xl hover:shadow-3xl transition-all backdrop-blur-sm bg-primary/95 hover:bg-primary"
        >
          Entrer
        </Button>
      </div>
    </div>
  );
};

export default Index;
