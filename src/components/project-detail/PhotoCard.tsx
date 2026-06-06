import { Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/ui/safe-image";
import { RenderCard } from "./RenderCard";
import type { ProjectPhoto, RenderResult } from "./project-detail.types";

interface PhotoCardProps {
  photo: ProjectPhoto;
  index: number;
  photoRenders: RenderResult[];
  favoriteRenderIds: Set<string>;
  selectedRenderIds: Set<string>;
  isGenerating: boolean;
  onDeletePhoto: (photoId: string) => void;
  onApplyDecor: (photo: ProjectPhoto) => void;
  onToggleSelect: (renderId: string) => void;
  onToggleFavorite: (renderId: string) => void;
  onZoom: (url: string) => void;
  onCompare: (render: RenderResult, photo: ProjectPhoto) => void;
  onRegenerate: (renderId: string, photoId: string) => void;
  onDeleteRender: (renderId: string, photoId: string) => void;
}

/**
 * Carte d'une photo du projet : en-tête, image, application de décor et grille
 * des rendus. Extrait de ProjectDetail (LOT 4) — markup et a11y préservés.
 */
export const PhotoCard = ({
  photo,
  index,
  photoRenders,
  favoriteRenderIds,
  selectedRenderIds,
  isGenerating,
  onDeletePhoto,
  onApplyDecor,
  onToggleSelect,
  onToggleFavorite,
  onZoom,
  onCompare,
  onRegenerate,
  onDeleteRender,
}: Readonly<PhotoCardProps>) => (
  <div
    className="card-premium p-5 md:p-6 animate-slide-up"
    style={{ animationDelay: `${index * 100}ms` }}
  >
    {/* Photo Header */}
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-semibold text-sm text-muted-foreground">Photo originale</h3>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDeletePhoto(photo.id)}
        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>

    {/* Photo Image */}
    <div className="relative rounded-xl overflow-hidden mb-4 bg-muted">
      <SafeImage
        src={photo.original_image_url}
        alt="Photo projet"
        className="w-full object-contain max-h-[500px]"
        loading="lazy"
      />
    </div>

    {/* Action Button */}
    <Button
      onClick={() => onApplyDecor(photo)}
      className="w-full btn-primary-premium h-11 rounded-xl"
    >
      <Sparkles className="mr-2 h-4 w-4" />
      Appliquer un décor
    </Button>

    {/* Renders Grid - Masonry Layout */}
    {photoRenders.length > 0 && (
      <div className="mt-6 pt-6 border-t border-border/50">
        <p className="text-sm font-medium mb-4">
          Rendus générés ({photoRenders.length})
        </p>
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-3 space-y-3">
          {photoRenders.map((render, renderIndex) => (
            <RenderCard
              key={render.id}
              render={render}
              photo={photo}
              renderIndex={renderIndex}
              isSelected={selectedRenderIds.has(render.id)}
              isFavorite={favoriteRenderIds.has(render.id)}
              isGenerating={isGenerating}
              onToggleSelect={onToggleSelect}
              onToggleFavorite={onToggleFavorite}
              onZoom={onZoom}
              onCompare={onCompare}
              onRegenerate={onRegenerate}
              onDelete={onDeleteRender}
            />
          ))}
        </div>
      </div>
    )}
  </div>
);
