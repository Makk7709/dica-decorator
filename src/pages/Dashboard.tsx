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
import { motion } from "framer-motion";
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
    e.stopPropagation();
    setProjectToDelete(project);
    try {
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
        queryClient.invalidateQueries({ queryKey: ["projects"] });
        setDeleteDialogOpen(false);
        setProjectToDelete(null);
        setDeletionStats(null);
      } else {
        const errorMessage = result.error?.message || "Erreur lors de la suppression";
        if (result.error?.code === 'UNAUTHORIZED') {
          toast.error("Vous n'êtes pas autorisé à supprimer ce projet");
        } else if (result.error?.code === 'NOT_FOUND') {
          toast.error("Ce projet n'existe plus");
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
      handleCancelEdit();
      return;
    }
    setIsRenaming(true);
    try {
      const result = await projectRenameService.renameProject(project.id, editTitle.trim());
      if (result.success && result.newTitle) {
        toast.success(`Projet renommé en "${result.newTitle}"`);
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
    <PremiumLayout>
      {/* Header */}
      <motion.header 
        className="header-premium sticky top-0 z-50"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="container mx-auto flex h-16 md:h-18 items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img 
              src="/images/dica-logo.png" 
              alt="DICA Visual Studio" 
              className="h-14 md:h-16 w-auto" 
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/creative")}
              className="hidden sm:flex items-center gap-2 text-primary hover:text-primary hover:bg-primary/5 rounded-xl"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden md:inline font-medium">Assistant Créatif</span>
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/creative")}
              className="sm:hidden text-primary rounded-xl"
            >
              <Sparkles className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/favorites")}
              className="hidden sm:flex items-center gap-2 text-primary hover:text-primary hover:bg-primary/5 rounded-xl"
            >
              <Heart className="h-4 w-4 fill-current" />
              <span className="hidden md:inline font-medium">Favoris</span>
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/favorites")}
              className="sm:hidden text-primary rounded-xl"
            >
              <Heart className="h-5 w-5 fill-current" />
            </Button>

            {userRole === "admin" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/admin")}
                className="hidden sm:flex rounded-xl"
              >
                <Settings className="h-4 w-4 mr-2" />
                Admin
              </Button>
            )}
            
            <div className="w-px h-5 bg-border/60 mx-1 hidden sm:block" />
            
            <ThemeToggle className="text-muted-foreground rounded-xl" />
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/help")}
              className="text-muted-foreground hover:text-foreground rounded-xl"
              title="Aide"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground rounded-xl"
            >
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Déconnexion</span>
            </Button>
          </div>
        </div>
      </motion.header>
      
      <WelcomeModal
        open={showWelcome}
        onOpenChange={() => {}}
        onComplete={completeWelcome}
        userName={user?.email?.split('@')[0]}
      />

      {/* Main Content */}
      <ContentContainer className="pb-20">
        {/* Hero Section */}
        <motion.div 
          className="mb-10 md:mb-14"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div className="space-y-2">
              <SectionTitle 
                title="Mes Projets" 
                subtitle="Visualisez vos décors DICA sur vos espaces en un clic."
              />
            </div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.25 }}
            >
              <Button 
                onClick={handleCreateProject} 
                size="lg" 
                className="btn-primary-premium h-12 px-7 rounded-xl shrink-0"
              >
                <Plus className="mr-2 h-5 w-5" />
                Nouveau Projet
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div 
                key={i} 
                className="card-premium p-6 animate-pulse"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="h-11 w-11 rounded-xl bg-muted" />
                  <div className="h-5 w-5 rounded bg-muted" />
                </div>
                <div className="space-y-3">
                  <div className="h-5 w-3/4 rounded-lg bg-muted" />
                  <div className="h-4 w-1/2 rounded-lg bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <PremiumCard hover={false} className="py-20 text-center">
              <div className="max-w-sm mx-auto">
                <div className="mb-6 mx-auto w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center">
                  <FolderOpen className="h-8 w-8 text-primary/40" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Aucun projet</h3>
                <p className="text-muted-foreground mb-8 text-balance leading-relaxed">
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
          </motion.div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.4, 
                  delay: 0.15 + index * 0.06,
                  ease: [0.22, 1, 0.36, 1]
                }}
                onClick={() => {
                  if (editingProjectId !== project.id) {
                    navigate(`/project/${project.id}`);
                  }
                }}
                className="card-premium p-5 cursor-pointer group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl bg-primary/8 flex items-center justify-center group-hover:bg-primary/12 transition-colors duration-300">
                    <FolderOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDeleteClick(project, e)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all duration-200 rounded-lg"
                      title="Supprimer le projet"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <ChevronRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-300" />
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-2">
                  {editingProjectId === project.id ? (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, project)}
                        className="h-8 text-sm font-semibold flex-1 rounded-lg"
                        autoFocus
                        disabled={isRenaming}
                        maxLength={200}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleSaveEdit(project, e)}
                        disabled={isRenaming || !editTitle.trim()}
                        className="h-8 w-8 p-0 text-success hover:text-success hover:bg-success/10 rounded-lg"
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
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-lg"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group/title">
                      <h3 
                        className="font-semibold text-base text-foreground line-clamp-1 group-hover:text-primary transition-colors duration-200 flex-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {project.title}
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleStartEdit(project, e)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-primary opacity-0 group-hover/title:opacity-100 transition-all duration-200 rounded-lg"
                        title="Renommer le projet"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-muted/80 text-xs font-medium tracking-wide">
                      {getUseCaseLabel(project.use_case)}
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-5 pt-4 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(project.created_at)}
                  </div>
                  {project.client_reference && (
                    <span className="text-muted-foreground/60 truncate max-w-[120px]">
                      Réf: {project.client_reference}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </ContentContainer>

      <AppFooter />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl">
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
              <div className="rounded-xl border border-border bg-muted/50 p-4">
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
                <div className="rounded-xl border border-warning/20 bg-warning/5 p-4">
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
              className="rounded-xl"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="rounded-xl"
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
