import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, LogOut, Settings, FolderOpen } from "lucide-react";
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

  return (
    <div className="relative min-h-screen bg-background">
      {/* Background image */}
      <div 
        className="fixed inset-0 bg-cover opacity-30"
        style={{ backgroundImage: "url('/images/dica-app-bg.jpg')", backgroundPosition: "center 45%" }}
      />
      <div className="relative z-10">
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto flex h-20 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <img src="/images/dica-logo.svg" alt="DICA" className="h-10 w-auto" />
          </div>
          <div className="flex items-center gap-3">
            {userRole === "admin" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/admin")}
                className="border-2"
              >
                <Settings className="mr-2 h-4 w-4" />
                Admin
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-12">
        <div className="mb-12 flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-bold mb-2">Mes Projets</h2>
            <p className="text-lg text-muted-foreground">
              Visualisez vos décors DICA sur vos photos
            </p>
          </div>
          <Button onClick={handleCreateProject} size="lg" className="h-12 px-6 shadow-lg hover:shadow-xl transition-all">
            <Plus className="mr-2 h-5 w-5" />
            Nouveau Projet
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 w-3/4 rounded bg-muted" />
                  <div className="h-4 w-1/2 rounded bg-muted" />
                </CardHeader>
                <CardContent>
                  <div className="h-32 rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FolderOpen className="mb-4 h-16 w-16 text-muted-foreground" />
              <h3 className="mb-2 text-xl font-semibold">Aucun projet</h3>
              <p className="mb-6 text-center text-muted-foreground">
                Créez votre premier projet pour commencer à visualiser des décors
              </p>
              <Button onClick={handleCreateProject} size="lg">
                <Plus className="mr-2 h-5 w-5" />
                Créer mon premier projet
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="group cursor-pointer border-2 transition-all hover:shadow-xl hover:border-primary/50"
                onClick={() => navigate(`/project/${project.id}`)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <FolderOpen className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                    {project.title}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {project.use_case} • {new Date(project.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {project.client_reference && (
                    <p className="text-sm text-muted-foreground">
                      Réf: {project.client_reference}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      </div>
    </div>
  );
};

export default Dashboard;
