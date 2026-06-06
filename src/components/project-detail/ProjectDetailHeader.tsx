import type { User } from "@supabase/supabase-js";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ShareLinkDialog } from "@/components/ui/share-link-dialog";
import { ResellerBrochureExportButton } from "@/components/ui/reseller-brochure-export-button";
import { MagazineDecoExportButton } from "@/components/ui/magazine-deco-export-button";
import { type ProjectType } from "@/hooks/use-catalogs";
import type { ResellerBranding } from "@/types/plaquette.types";
import { getUseCaseLabel, buildBrochureImages, buildMagazineImages } from "./project-detail.helpers";
import type { CreativeImport, Decor, Project, ProjectPhoto, RendersByPhoto } from "./project-detail.types";

interface ProjectDetailHeaderProps {
  project: Project;
  user: User | null;
  decors: Decor[];
  photos: ProjectPhoto[];
  renders: RendersByPhoto;
  creativeImports: CreativeImport[];
  favoriteRenderIds: Set<string>;
  selectedRenderIds: Set<string>;
  resellerBranding: ResellerBranding | null;
  onClearSelection: () => void;
  onNavigateDashboard: () => void;
}

/**
 * En-tête de la page ProjectDetail (navigation, partage, exports PDF).
 * Extrait de ProjectDetail (LOT 4) afin d'alléger la complexité du composant
 * principal. Markup, libellés et a11y préservés à l'identique.
 */
export const ProjectDetailHeader = ({
  project,
  user,
  decors,
  photos,
  renders,
  creativeImports,
  favoriteRenderIds,
  selectedRenderIds,
  resellerBranding,
  onClearSelection,
  onNavigateDashboard,
}: Readonly<ProjectDetailHeaderProps>) => {
  const hasImages = Object.values(renders).flat().length > 0 || creativeImports.length > 0;
  const canExportMagazine = hasImages && decors.length > 0;

  return (
    <header className="header-premium sticky top-0 z-50">
      <div className="container mx-auto flex h-16 md:h-20 items-center justify-between px-4 sm:px-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onNavigateDashboard}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Retour</span>
        </Button>

        <div className="flex items-center gap-2 md:gap-3">
          <img src="/images/dica-logo.svg" alt="DICA" className="h-7 md:h-8 w-auto" />
          <div className="text-left hidden sm:block">
            <h1 className="text-base md:text-lg font-semibold leading-tight tracking-tight">{project.title}</h1>
            <p className="text-xs text-muted-foreground">{getUseCaseLabel(project.use_case)}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle className="text-muted-foreground" />

          {/* Share Link Dialog */}
          {project && user && (
            <ShareLinkDialog
              projectId={project.id}
              projectTitle={project.title}
              userId={user.id}
              variant="ghost"
              showLabel={false}
              className="text-muted-foreground hover:text-foreground h-8 px-2"
            />
          )}

          {/* Plaquette Premium Export */}
          {project && hasImages && (
            <>
              {/* Sélection d'images pour Magazine DECO */}
              {selectedRenderIds.size > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium">
                  <span>{selectedRenderIds.size} image{selectedRenderIds.size > 1 ? 's' : ''} sélectionnée{selectedRenderIds.size > 1 ? 's' : ''}</span>
                  <button
                    onClick={onClearSelection}
                    className="hover:underline"
                  >
                    Désélectionner
                  </button>
                </div>
              )}

              <ResellerBrochureExportButton
                project={{
                  id: project.id,
                  name: project.title,
                  type: (project.use_case as ProjectType) || 'autre',
                  clientName: project.client_reference || undefined,
                  createdAt: new Date(),
                }}
                decor={decors.length > 0 ? {
                  id: decors[0].id,
                  name: decors[0].name,
                  referenceCode: decors[0].reference_code,
                  category: decors[0].category,
                } : {
                  id: 'default',
                  name: 'Décor DICA',
                  referenceCode: 'DICA',
                  category: 'autre',
                }}
                images={buildBrochureImages({ renders, photos, decors, creativeImports })}
                resellerBranding={resellerBranding}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              />

              {/* Magazine DECO Export */}
              {canExportMagazine && (
                <MagazineDecoExportButton
                  project={{
                    id: project.id,
                    name: project.title,
                    type: (project.use_case as ProjectType) || 'autre',
                    clientName: project.client_reference || undefined,
                    createdAt: new Date(),
                  }}
                  decor={decors.map(d => ({
                    id: d.id,
                    name: d.name,
                    referenceCode: d.reference_code,
                    category: d.category,
                  }))[0]}
                  images={buildMagazineImages({
                    renders,
                    photos,
                    decors,
                    creativeImports,
                    favoriteRenderIds,
                    selectedRenderIds,
                  })}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                />
              )}
            </>
          )}


          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateDashboard}
            className="text-muted-foreground hover:text-foreground"
          >
            <Home className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Accueil</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
