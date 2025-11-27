import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sparkles, Image, Zap, CheckCircle } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background relative">
      {/* Hero background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-5"
        style={{ backgroundImage: "url('/images/dica-hero-bg.jpg')" }}
      />
      
      <div className="container mx-auto px-4 py-16 relative z-10">
        {/* Hero Section */}
        <div className="mb-20 text-center">
          <div className="mx-auto mb-8 flex items-center justify-center">
            <img src="/images/dica-logo.svg" alt="DICA Logo" className="h-24 w-auto" />
          </div>
          <h1 className="mb-6 text-6xl font-bold tracking-tight text-foreground">
            DICA Visual Studio
          </h1>
          <p className="mx-auto mb-4 max-w-3xl text-2xl font-light text-foreground/80">
            Des produits pour valoriser votre créativité
          </p>
          <p className="mx-auto mb-12 max-w-2xl text-lg text-muted-foreground">
            Visualisez instantanément vos décors stratifiés DICA sur vos projets grâce à l'intelligence artificielle
          </p>
          <div className="flex justify-center gap-4">
            {user ? (
              <Button 
                size="lg" 
                onClick={() => navigate("/dashboard")} 
                className="h-12 px-8 text-base shadow-lg hover:shadow-xl transition-all"
              >
                Accéder au tableau de bord
              </Button>
            ) : (
              <>
                <Button 
                  size="lg" 
                  onClick={() => navigate("/auth")} 
                  className="h-12 px-8 text-base shadow-lg hover:shadow-xl transition-all"
                >
                  Commencer maintenant
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  onClick={() => navigate("/auth")}
                  className="h-12 px-8 text-base border-2"
                >
                  Se connecter
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="mb-20 grid gap-8 md:grid-cols-3">
          <div className="group rounded-2xl border-2 border-border bg-card p-8 shadow-card hover:shadow-lg transition-all hover:border-primary/50">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Image className="h-7 w-7 text-primary" />
            </div>
            <h3 className="mb-3 text-2xl font-semibold">Upload Facile</h3>
            <p className="text-muted-foreground leading-relaxed">
              Importez vos photos de cabines d'ascenseur, vans ou terrasses en un clic
            </p>
          </div>

          <div className="group rounded-2xl border-2 border-border bg-card p-8 shadow-card hover:shadow-lg transition-all hover:border-primary/50">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Zap className="h-7 w-7 text-primary" />
            </div>
            <h3 className="mb-3 text-2xl font-semibold">IA Instantanée</h3>
            <p className="text-muted-foreground leading-relaxed">
              L'IA applique automatiquement le décor choisi sur les surfaces en moins de 10 secondes
            </p>
          </div>

          <div className="group rounded-2xl border-2 border-border bg-card p-8 shadow-card hover:shadow-lg transition-all hover:border-primary/50">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <CheckCircle className="h-7 w-7 text-primary" />
            </div>
            <h3 className="mb-3 text-2xl font-semibold">Résultats Pro</h3>
            <p className="text-muted-foreground leading-relaxed">
              Obtenez des rendus réalistes prêts à présenter à vos clients
            </p>
          </div>
        </div>

        {/* CTA Footer */}
        <div className="rounded-3xl bg-primary p-12 text-center shadow-xl">
          <h2 className="mb-4 text-4xl font-bold text-primary-foreground">
            Prêt à transformer vos projets ?
          </h2>
          <p className="mb-8 text-xl text-primary-foreground/95">
            Rejoignez les professionnels qui utilisent DICA Visual Studio
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => navigate(user ? "/dashboard" : "/auth")}
            className="h-12 px-8 text-base shadow-md hover:shadow-lg transition-all"
          >
            {user ? "Mon tableau de bord" : "Créer un compte gratuit"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
