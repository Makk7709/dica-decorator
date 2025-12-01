import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  PremiumLayout, 
  PremiumCard, 
  SectionTitle, 
  ContentContainer 
} from "@/components/ui/premium-layout";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { WelcomeModal, useOnboarding } from "@/components/onboarding";
import { Plus, LogOut, Settings, FolderOpen, Sparkles, ChevronRight, Calendar, HelpCircle } from "lucide-react";
import { toast } from "sonner";

interface Project {
  id: string;
  title: string;
  use_case: string;
  client_reference: string | null;
  created_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, userRole, signOut } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Onboarding
  const { showWelcome, completeWelcome } = useOnboarding();

  useEffect(() => {
    loadProjects();
  }, [user]);

  const loadProjects = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      toast.error("Erreur lors du chargement des projets");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/auth");
    } catch (error: any) {
      toast.error("Erreur lors de la déconnexion");
    }
  };

  const handleCreateProject = () => {
    navigate("/project/new");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const getUseCaseLabel = (useCase: string) => {
    const labels: Record<string, string> = {
      "ascenseur": "Ascenseur",
      "van": "Van aménagé",
      "meuble": "Meuble",
      "autre": "Autre"
    };
    return labels[useCase] || useCase;
  };

  return (
    <PremiumLayout backgroundImage="/images/PAGE PROJETS.png">
      {/* Header Premium */}
      <header className="header-premium sticky top-0 z-50">
        <div className="container mx-auto flex h-16 md:h-20 items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img 
              src="/images/dica-logo.svg" 
              alt="DICA Visual Studio" 
              className="h-8 md:h-10 w-auto" 
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/creative")}
              className="hidden sm:flex items-center gap-2 text-primary hover:text-primary hover:bg-primary/5"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden md:inline">Assistant Créatif</span>
            </Button>
            
            {/* Mobile: Icon only */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/creative")}
              className="sm:hidden text-primary"
            >
              <Sparkles className="h-5 w-5" />
            </Button>

            {userRole === "admin" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/admin")}
                className="hidden sm:flex"
              >
                <Settings className="h-4 w-4 mr-2" />
                Admin
              </Button>
            )}
            
            <div className="w-px h-6 bg-border mx-1 hidden sm:block" />
            
            <ThemeToggle className="text-muted-foreground" />
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/help")}
              className="text-muted-foreground hover:text-foreground"
              title="Aide"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Déconnexion</span>
            </Button>
          </div>
        </div>
      </header>
      
      {/* Welcome Modal pour nouveaux utilisateurs */}
      <WelcomeModal
        open={showWelcome}
        onOpenChange={() => {}}
        onComplete={completeWelcome}
        userName={user?.email?.split('@')[0]}
      />

      {/* Main Content */}
      <ContentContainer className="pb-20">
        {/* Hero Section */}
        <div className="mb-10 md:mb-14">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div className="space-y-3 animate-fade-in">
              <SectionTitle 
                title="Mes Projets" 
                subtitle="Visualisez vos décors DICA sur vos espaces en un clic."
              />
            </div>
            
            <Button 
              onClick={handleCreateProject} 
              size="lg" 
              className="btn-primary-premium h-12 px-6 rounded-xl shrink-0 animate-slide-up"
              style={{ animationDelay: "100ms" }}
            >
              <Plus className="mr-2 h-5 w-5" />
              Nouveau Projet
            </Button>
          </div>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div 
                key={i} 
                className="card-premium p-6 animate-pulse"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-muted" />
                  <div className="h-6 w-6 rounded bg-muted" />
                </div>
                <div className="space-y-3">
                  <div className="h-6 w-3/4 rounded-lg bg-muted" />
                  <div className="h-4 w-1/2 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <PremiumCard hover={false} className="py-16 text-center animate-fade-in">
            <div className="max-w-sm mx-auto">
              <div className="mb-6 mx-auto w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                <FolderOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Aucun projet</h3>
              <p className="text-muted-foreground mb-8 text-balance">
                Créez votre premier projet pour commencer à visualiser les décors DICA sur vos espaces.
              </p>
              <Button 
                onClick={handleCreateProject} 
                size="lg"
                className="btn-primary-premium h-12 px-8 rounded-xl"
              >
                <Plus className="mr-2 h-5 w-5" />
                Créer mon premier projet
              </Button>
            </div>
          </PremiumCard>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, index) => (
              <div
                key={project.id}
                onClick={() => navigate(`/project/${project.id}`)}
                className="card-premium p-5 cursor-pointer group animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                    <FolderOpen className="h-5 w-5 text-primary" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>

                {/* Content */}
                <div className="space-y-1.5">
                  <h3 className="font-semibold text-lg text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                    {project.title}
                  </h3>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-xs font-medium">
                      {getUseCaseLabel(project.use_case)}
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(project.created_at)}
                  </div>
                  {project.client_reference && (
                    <span className="text-muted-foreground/70 truncate max-w-[120px]">
                      Réf: {project.client_reference}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ContentContainer>
    </PremiumLayout>
  );
};

export default Dashboard;
