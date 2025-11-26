import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sparkles, Image, Zap, CheckCircle } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="mb-16 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary shadow-lg">
            <Sparkles className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="mb-4 text-5xl font-bold tracking-tight">
            DICA Visual Studio
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-muted-foreground">
            Visualisez vos décors DICA sur vos produits en quelques secondes grâce à l'intelligence artificielle
          </p>
          <div className="flex justify-center gap-4">
            {user ? (
              <Button size="lg" onClick={() => navigate("/dashboard")} className="shadow-md">
                Accéder au tableau de bord
              </Button>
            ) : (
              <>
                <Button size="lg" onClick={() => navigate("/auth")} className="shadow-md">
                  Commencer maintenant
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
                  Se connecter
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="mb-16 grid gap-8 md:grid-cols-3">
          <div className="rounded-xl border bg-card p-6 shadow-card">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Image className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Upload Facile</h3>
            <p className="text-muted-foreground">
              Importez vos photos de cabines d'ascenseur, vans ou terrasses en un clic
            </p>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-card">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
              <Zap className="h-6 w-6 text-accent" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">IA Instantanée</h3>
            <p className="text-muted-foreground">
              L'IA applique automatiquement le décor choisi sur les surfaces en moins de 10 secondes
            </p>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-card">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Résultats Pro</h3>
            <p className="text-muted-foreground">
              Obtenez des rendus réalistes prêts à présenter à vos clients
            </p>
          </div>
        </div>

        {/* CTA Footer */}
        <div className="rounded-2xl border bg-gradient-primary p-8 text-center shadow-lg">
          <h2 className="mb-4 text-3xl font-bold text-primary-foreground">
            Prêt à transformer vos projets ?
          </h2>
          <p className="mb-6 text-lg text-primary-foreground/90">
            Rejoignez les professionnels qui utilisent DICA Visual Studio
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => navigate(user ? "/dashboard" : "/auth")}
            className="shadow-md"
          >
            {user ? "Mon tableau de bord" : "Créer un compte gratuit"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
