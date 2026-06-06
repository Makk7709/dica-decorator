import { Sparkles, Loader2, Maximize2, Heart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/ui/safe-image";
import { ImageExportDropdown } from "@/components/ui/image-export-dropdown";
import type { CreativeImport } from "./project-detail.types";

interface CreativeImportsSectionProps {
  creativeImports: CreativeImport[];
  isLoadingRenders: boolean;
  favoriteRenderIds: Set<string>;
  onZoom: (url: string) => void;
  onToggleFavorite: (renderId: string) => void;
  onDelete: (renderId: string, photoId: string) => void;
}

const gridClassForCount = (count: number): string => {
  if (count === 1) return "grid-cols-1 max-w-md";
  if (count === 2) return "grid-cols-2";
  return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
};

/**
 * Section "Créations Assistant IA" (skeleton de chargement + liste).
 * Extrait de ProjectDetail (LOT 4) — markup, textes et a11y préservés.
 */
export const CreativeImportsSection = ({
  creativeImports,
  isLoadingRenders,
  favoriteRenderIds,
  onZoom,
  onToggleFavorite,
  onDelete,
}: Readonly<CreativeImportsSectionProps>) => (
  <div className="card-premium p-5 md:p-6 mb-6 animate-fade-in">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-purple-500" />
        <h3 className="font-semibold">Créations Assistant IA</h3>
        {isLoadingRenders ? (
          <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Chargement...
          </span>
        ) : (
          <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-0.5 rounded-full">
            {creativeImports.length}
          </span>
        )}
      </div>
    </div>

    {/* Skeleton pendant le chargement */}
    {isLoadingRenders && creativeImports.length === 0 && (
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-purple-200 dark:border-purple-800/50 overflow-hidden bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background animate-pulse">
            <div className="aspect-square bg-purple-100 dark:bg-purple-900/30" />
            <div className="p-2 space-y-2">
              <div className="h-4 bg-purple-100 dark:bg-purple-900/30 rounded w-3/4" />
              <div className="h-3 bg-purple-100 dark:bg-purple-900/30 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )}

    {/* Liste des créations IA */}
    {creativeImports.length > 0 && (
      <div className={`grid gap-4 ${gridClassForCount(creativeImports.length)}`}>
        {creativeImports.map((creative, index) => (
          <div
            key={creative.id}
            className="group rounded-xl border border-purple-200 dark:border-purple-800/50 overflow-hidden bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="relative">
              <SafeImage
                src={creative.result_image_url}
                alt="Création IA"
                className="w-full aspect-square object-cover"
                loading="lazy"
              />
              {/* Badge IA */}
              <div className="absolute top-2 left-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                IA
              </div>
              {/* Icônes d'action */}
              <div className="absolute bottom-2 right-2 flex gap-1.5 z-20">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-7 w-7 bg-white/90 hover:bg-white shadow-md"
                  onClick={() => onZoom(creative.result_image_url)}
                  title="Agrandir"
                >
                  <Maximize2 className="h-3.5 w-3.5 text-gray-700" />
                </Button>
              </div>
              {/* Overlay actions au survol */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 z-10">
                <div className="flex gap-2">
                  <ImageExportDropdown
                    imageUrl={creative.result_image_url}
                    filename={`dica-ia-${creative.id}`}
                    variant="secondary"
                    size="sm"
                    className="h-8 px-3 bg-white hover:bg-gray-100 shadow-md text-xs text-gray-800 border border-gray-200"
                  />
                </div>
              </div>
            </div>

            {/* Footer avec favoris et suppression */}
            <div className="p-2 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => onToggleFavorite(creative.id)}
              >
                <Heart
                  className={`h-3.5 w-3.5 mr-1.5 ${
                    favoriteRenderIds.has(creative.id)
                      ? "fill-current text-red-500"
                      : ""
                  }`}
                />
                <span className="text-xs">
                  {favoriteRenderIds.has(creative.id) ? "Favori" : "Ajouter"}
                </span>
              </Button>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">
                  {new Date(creative.created_at).toLocaleDateString('fr-FR')}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-destructive hover:text-destructive"
                  onClick={() => onDelete(creative.id, creative.photoId)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);
