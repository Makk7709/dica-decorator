/**
 * @fileoverview User Projects Dialog Component
 * 
 * Dialog permettant aux administrateurs de visualiser les projets
 * d'un utilisateur/revendeur spécifique.
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, 
  FolderOpen, 
  Calendar, 
  Image, 
  Sparkles, 
  Building2,
  User,
  Eye
} from "lucide-react";
import { toast } from "sonner";
import { 
  createAdminProjectViewerService, 
  UserProjectSummary,
  ProjectWithRenders,
  ProjectSummary
} from "@/services/admin-project-viewer.service";

interface UserProjectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
  targetUserEmail: string;
  adminUserId: string;
}

export const UserProjectsDialog = ({
  open,
  onOpenChange,
  targetUserId,
  targetUserEmail,
  adminUserId,
}: Readonly<UserProjectsDialogProps>) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userProjects, setUserProjects] = useState<UserProjectSummary | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectWithRenders | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("list");

  useEffect(() => {
    const loadProjects = async () => {
      setIsLoading(true);
      setError(null);
      setSelectedProject(null);
      setActiveTab("list"); // Reset to list tab when loading new user

      try {
        const service = createAdminProjectViewerService(supabase);
        const data = await service.getUserProjects(adminUserId, targetUserId);
        setUserProjects(data);
      } catch (err: unknown) {
        console.error("[UserProjectsDialog] Error loading projects:", err);
        const errorMessage = err instanceof Error ? err.message : "Erreur lors du chargement des projets";
        setError(errorMessage);
        toast.error("Erreur lors du chargement des projets");
      } finally {
        setIsLoading(false);
      }
    };

    if (open && targetUserId) {
      loadProjects();
    }
  }, [open, targetUserId, adminUserId]);

  const loadUserProjects = async () => {
    setIsLoading(true);
    setError(null);
    setSelectedProject(null);

    try {
      const service = createAdminProjectViewerService(supabase);
      const data = await service.getUserProjects(adminUserId, targetUserId);
      setUserProjects(data);
    } catch (err: unknown) {
      console.error("[UserProjectsDialog] Error loading projects:", err);
      const errorMessage = err instanceof Error ? err.message : "Erreur lors du chargement des projets";
      setError(errorMessage);
      toast.error("Erreur lors du chargement des projets");
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjectDetails = async (projectId: string) => {
    setIsLoadingDetails(true);
    
    try {
      const service = createAdminProjectViewerService(supabase);
      const data = await service.getProjectDetails(adminUserId, projectId);
      setSelectedProject(data);
      // Switcher automatiquement vers l'onglet détails
      setActiveTab("details");
    } catch (err: unknown) {
      console.error("[UserProjectsDialog] Error loading project details:", err);
      toast.error("Erreur lors du chargement des détails du projet");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const getUseCaseLabel = (useCase: string) => {
    const labels: Record<string, string> = {
      "ascenseur": "Ascenseur",
      "van": "Van aménagé",
      "meuble": "Meuble",
      "cuisine": "Cuisine",
      "salle_de_bain": "Salle de bain",
      "autre": "Autre"
    };
    return labels[useCase] || useCase;
  };

  const getUseCaseColor = (useCase: string) => {
    const colors: Record<string, string> = {
      "ascenseur": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      "van": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      "meuble": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
      "cuisine": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
      "salle_de_bain": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
      "autre": "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300"
    };
    return colors[useCase] || colors["autre"];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            Projets de l'utilisateur
          </DialogTitle>
          <DialogDescription>
            Visualisation des projets de {targetUserEmail}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Chargement des projets...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-destructive mb-4">{error}</p>
            <Button variant="outline" onClick={loadUserProjects}>
              Réessayer
            </Button>
          </div>
        ) : userProjects ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              {/* User Info Summary */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{userProjects.user.fullName}</span>
                </div>
                {userProjects.user.companyName && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span>{userProjects.user.companyName}</span>
                  </div>
                )}
                <Badge variant={userProjects.user.isActive ? "default" : "secondary"}>
                  {userProjects.user.isActive ? "Actif" : "Inactif"}
                </Badge>
              </div>
              
              <TabsList>
                <TabsTrigger value="list">
                  Liste ({userProjects.totalProjects})
                </TabsTrigger>
                {selectedProject && (
                  <TabsTrigger value="details">
                    Détails: {selectedProject.title}
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            <TabsContent value="list" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="h-[50vh]">
                {userProjects.totalProjects === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">Aucun projet</p>
                    <p className="text-sm text-muted-foreground/70">
                      Cet utilisateur n'a pas encore créé de projet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 pr-4">
                    {userProjects.projects.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        isLoading={isLoadingDetails && selectedProject?.id === project.id}
                        onViewDetails={() => {
                          loadProjectDetails(project.id);
                        }}
                        getUseCaseLabel={getUseCaseLabel}
                        getUseCaseColor={getUseCaseColor}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {selectedProject && (
              <TabsContent value="details" className="flex-1 overflow-hidden mt-0">
                <ScrollArea className="h-[50vh]">
                  <ProjectDetailsView 
                    project={selectedProject} 
                    getUseCaseLabel={getUseCaseLabel}
                    getUseCaseColor={getUseCaseColor}
                  />
                </ScrollArea>
              </TabsContent>
            )}
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// Sub-components
// ============================================================================

interface ProjectCardProps {
  project: ProjectSummary;
  isLoading: boolean;
  onViewDetails: () => void;
  getUseCaseLabel: (useCase: string) => string;
  getUseCaseColor: (useCase: string) => string;
}

const ProjectCard = ({ 
  project, 
  isLoading, 
  onViewDetails,
  getUseCaseLabel,
  getUseCaseColor 
}: Readonly<ProjectCardProps>) => (
  <div className="p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors">
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <h4 className="font-semibold truncate">{project.title}</h4>
          <Badge variant="outline" className={getUseCaseColor(project.useCase)}>
            {getUseCaseLabel(project.useCase)}
          </Badge>
        </div>
        
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Créé le {project.createdAt.toLocaleDateString('fr-FR')}
          </span>
          {project.clientReference && (
            <span className="flex items-center gap-1">
              Réf: {project.clientReference}
            </span>
          )}
        </div>
      </div>
      
      <Button 
        size="sm" 
        variant="outline"
        onClick={onViewDetails}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Eye className="h-4 w-4 mr-2" />
            Voir détails
          </>
        )}
      </Button>
    </div>
  </div>
);

interface ProjectDetailsViewProps {
  project: ProjectWithRenders;
  getUseCaseLabel: (useCase: string) => string;
  getUseCaseColor: (useCase: string) => string;
}

const ProjectDetailsView = ({ 
  project,
  getUseCaseLabel,
  getUseCaseColor 
}: Readonly<ProjectDetailsViewProps>) => (
  <div className="space-y-6 pr-4">
    {/* Project Header */}
    <div className="p-4 rounded-lg bg-muted/50">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold">{project.title}</h3>
          <Badge variant="outline" className={`mt-1 ${getUseCaseColor(project.useCase)}`}>
            {getUseCaseLabel(project.useCase)}
          </Badge>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <div>Créé: {project.createdAt.toLocaleDateString('fr-FR')}</div>
          <div>Modifié: {project.updatedAt.toLocaleDateString('fr-FR')}</div>
        </div>
      </div>
      
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Image className="h-4 w-4 text-muted-foreground" />
          <span>{project.totalPhotos} photo{project.totalPhotos > 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <span>{project.totalRenders} rendu{project.totalRenders > 1 ? 's' : ''}</span>
        </div>
        {project.clientReference && (
          <div className="text-muted-foreground">
            Réf client: {project.clientReference}
          </div>
        )}
      </div>
    </div>

    {/* Photos & Renders */}
    {project.photos.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Image className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">Aucune photo dans ce projet</p>
      </div>
    ) : (
      <div className="space-y-6">
        {project.photos.map((photo) => (
          <div key={photo.id} className="rounded-lg border border-border overflow-hidden">
            {/* Photo originale */}
            <div className="p-3 bg-muted/30 border-b border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2">Photo originale</p>
              <img
                src={photo.originalImageUrl}
                alt="Photo originale"
                className="w-full max-h-48 object-contain rounded-md bg-background"
              />
            </div>
            
            {/* Rendus */}
            {photo.renders.length > 0 && (
              <div className="p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  {photo.renders.length} rendu{photo.renders.length > 1 ? 's' : ''} généré{photo.renders.length > 1 ? 's' : ''}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {photo.renders.map((render) => (
                    <div key={render.id} className="relative group">
                      <img
                        src={render.resultImageUrl}
                        alt="Rendu"
                        className="w-full aspect-square object-cover rounded-md"
                      />
                      {/* Badge décor ou IA */}
                      <div className="absolute bottom-1 left-1 right-1">
                        {render.isCreativeImport ? (
                          <Badge className="bg-purple-500 text-white text-[10px] px-1.5 py-0.5">
                            <Sparkles className="h-2.5 w-2.5 mr-1" />
                            Assistant IA
                          </Badge>
                        ) : render.decor ? (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 truncate max-w-full">
                            {render.decor.name}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
);

export default UserProjectsDialog;
