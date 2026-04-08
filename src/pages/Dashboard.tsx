import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { 
  PremiumLayout, 
  PremiumCard, 
  SectionTitle, 
  ContentContainer 
} from "@/components/ui/premium-layout";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { WelcomeModal, useOnboarding } from "@/components/onboarding";
import { Plus, LogOut, Settings, FolderOpen, Sparkles, ChevronRight, Calendar, HelpCircle, Trash2, AlertTriangle, Loader2, Pencil, Check, X, Heart } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { projectDeletionService } from "@/services/project-deletion.service";
import { projectRenameService } from "@/services/project-rename.service";
import { AppFooter } from "@/components/ui/app-footer";
import { useProjects } from "@/hooks/use-projects";

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
  const queryClient = useQueryClient();
  const { data: projects = [], isLoading } = useProjects();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deletionStats, setDeletionStats] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  
  // Onboarding
  const { showWelcome, completeWelcome } = useOnboarding();

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

  const handleDeleteClick = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation(); // Empêcher la navigation vers le projet
    
    setProjectToDelete(project);
    
    try {
      // Charger les statistiques de suppression
      const stats = await projectDeletionService.getProjectDeletionStats(project.id);
      setDeletionStats(stats);
      setDeleteDialogOpen(true);
    } catch (error: any) {
      toast.error("Erreur lors du chargement des informations de suppression");
      console.error("Delete stats error:", error);
    }
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    
    setIsDeleting(true);
    
    try {
      const result = await projectDeletionService.deleteProject(projectToDelete.id);
      
      if (result.success) {
        toast.success(`Projet "${projectToDelete.title}" supprimé avec succès`);
        
        // Invalider le cache pour rafraîchir la liste
        queryClient.invalidateQueries({ queryKey: ["projects"] });
        
        // Fermer le dialog
        setDeleteDialogOpen(false);
        setProjectToDelete(null);
        setDeletionStats(null);
      } else {
        const errorMessage = result.error?.message || "Erreur lors de la suppression";
        
        if (result.error?.code === 'UNAUTHORIZED') {
          toast.error("Vous n'êtes pas autorisé à supprimer ce projet");
        } else if (result.error?.code === 'NOT_FOUND') {
          toast.error("Ce projet n'existe plus");
          // Recharger la liste
          queryClient.invalidateQueries({ queryKey: ["projects"] });
        } else {
          toast.error(errorMessage);
        }
      }
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
      console.error("Delete error:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setProjectToDelete(null);
    setDeletionStats(null);
  };

  const handleStartEdit = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProjectId(project.id);
    setEditTitle(project.title);
  };

  const handleCancelEdit = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingProjectId(null);
    setEditTitle("");
  };

  const handleSaveEdit = async (project: Project, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (!editTitle.trim()) {
      toast.error("Le titre ne peut pas être vide");
      return;
    }

    if (editTitle.trim() === project.title) {
      // Pas de changement, juste annuler
      handleCancelEdit();
      return;
    }

    setIsRenaming(true);

    try {
      const result = await projectRenameService.renameProject(project.id, editTitle.trim());

      if (result.success && result.newTitle) {
        toast.success(`Projet renommé en "${result.newTitle}"`);
        
        // Invalider le cache pour rafraîchir la liste
        queryClient.invalidateQueries({ queryKey: ["projects"] });
        
        setEditingProjectId(null);
        setEditTitle("");
      } else {
        const errorMessage = result.error?.message || "Erreur lors du renommage";
        
        if (result.error?.code === 'UNAUTHORIZED') {
          toast.error("Vous n'êtes pas autorisé à renommer ce projet");
        } else if (result.error?.code === 'VALIDATION_ERROR') {
          toast.error(errorMessage);
        } else {
          toast.error(errorMessage);
        }
      }
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
      console.error("Rename error:", error);
    } finally {
      setIsRenaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, project: Project) => {
    if (e.key === 'Enter') {
      handleSaveEdit(project);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <PremiumLayout backgroundImage="/images/page-projets.png">
      {/* Header Premium */}
      <header className="header-premium sticky top-0 z-50">
        <div className="container mx-auto flex h-16 md:h-20 items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img 
              src="/images/dica-logo.png" 
              alt="DICA Visual Studio" 
              className="h-14 md:h-16 w-auto" 
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

            {/* Mes Favoris - Desktop */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/favorites")}
              className="hidden sm:flex items-center gap-2 text-red-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
            >
              <Heart className="h-4 w-4 fill-current" />
              <span className="hidden md:inline">Mes Favoris</span>
            </Button>
            
            {/* Mobile: Icon only */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/favorites")}
              className="sm:hidden text-red-500"
            >
              <Heart className="h-5 w-5 fill-current" />
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
                onClick={() => {
                  if (editingProjectId !== project.id) {
                    navigate(`/project/${project.id}`);
                  }
                }}
                className="card-premium p-5 cursor-pointer group animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                    <FolderOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDeleteClick(project, e)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Supprimer le projet"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-1.5">
                  {editingProjectId === project.id ? (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, project)}
                        className="h-8 text-sm font-semibold flex-1"
                        autoFocus
                        disabled={isRenaming}
                        maxLength={200}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleSaveEdit(project, e)}
                        disabled={isRenaming || !editTitle.trim()}
                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        {isRenaming ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEdit}
                        disabled={isRenaming}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group/title">
                      <h3 
                        className="font-semibold text-lg text-foreground line-clamp-1 group-hover:text-primary transition-colors flex-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {project.title}
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleStartEdit(project, e)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-primary opacity-0 group-hover/title:opacity-100 transition-opacity"
                        title="Renommer le projet"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                  
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

      {/* Footer */}
      <AppFooter />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription>
              Cette action est <strong>irréversible</strong>. Toutes les données associées seront définitivement supprimées.
            </DialogDescription>
          </DialogHeader>
          
          {projectToDelete && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <h4 className="font-semibold mb-2">{projectToDelete.title}</h4>
                <p className="text-sm text-muted-foreground">
                  Type: {getUseCaseLabel(projectToDelete.use_case)}
                </p>
                {projectToDelete.client_reference && (
                  <p className="text-sm text-muted-foreground">
                    Référence: {projectToDelete.client_reference}
                  </p>
                )}
              </div>

              {deletionStats && deletionStats.totalItemsToDelete > 0 && (
                <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
                  <p className="text-sm font-medium mb-2">Éléments qui seront supprimés :</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {deletionStats.photosCount > 0 && (
                      <li>• {deletionStats.photosCount} photo{deletionStats.photosCount > 1 ? 's' : ''}</li>
                    )}
                    {deletionStats.rendersCount > 0 && (
                      <li>• {deletionStats.rendersCount} rendu{deletionStats.rendersCount > 1 ? 's' : ''} IA</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelDelete}
              disabled={isDeleting}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer définitivement
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PremiumLayout>
  );
};

export default Dashboard;
