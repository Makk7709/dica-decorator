import { Maximize2, Heart, RotateCcw, Trash2, SplitSquareHorizontal, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SafeImage } from "@/components/ui/safe-image";
import { ImageExportMenuItems } from "@/components/ui/image-export-dropdown";
import type { ProjectPhoto, RenderResult } from "./project-detail.types";

interface RenderCardProps {
  render: RenderResult;
  photo: ProjectPhoto;
  renderIndex: number;
  isSelected: boolean;
  isFavorite: boolean;
  isGenerating: boolean;
  onToggleSelect: (renderId: string) => void;
  onToggleFavorite: (renderId: string) => void;
  onZoom: (url: string) => void;
  onCompare: (render: RenderResult, photo: ProjectPhoto) => void;
  onRegenerate: (renderId: string, photoId: string) => void;
  onDelete: (renderId: string, photoId: string) => void;
}

/**
 * Carte d'un rendu généré (image + actions : sélection, favoris, menu).
 * Extrait de ProjectDetail (LOT 4) : isole le rendu d'un élément de la liste
 * afin de supprimer les imbrications profondes S2004 (les anciens handlers
 * `onClick` imbriqués deviennent des appels de props nommées). Markup préservé.
 */
export const RenderCard = ({
  render,
  photo,
  renderIndex,
  isSelected,
  isFavorite,
  isGenerating,
  onToggleSelect,
  onToggleFavorite,
  onZoom,
  onCompare,
  onRegenerate,
  onDelete,
}: Readonly<RenderCardProps>) => (
  <div
    className="break-inside-avoid rounded-xl border border-border/50 overflow-hidden bg-white/50 animate-fade-in shadow-sm hover:shadow-md transition-shadow"
    style={{ animationDelay: `${renderIndex * 50}ms` }}
  >
    <div className="relative">
      <SafeImage
        src={render.result_image_url}
        alt="Rendu"
        className="w-full h-auto"
        loading="lazy"
      />

      {/* Disclaimer non contractuel */}
      <div className="absolute bottom-2 left-2 z-10 px-1.5 py-0.5 rounded bg-black/40 text-white/80 text-[9px] backdrop-blur-sm">
        Image non contractuelle
      </div>

      {/* Checkbox sélection pour Magazine DECO - en haut à gauche */}
      <div className="absolute top-2 left-2 z-20">
        <button
          onClick={() => onToggleSelect(render.id)}
          className={`h-6 w-6 rounded-md border-2 flex items-center justify-center transition-all shadow-md ${
            isSelected
              ? 'bg-primary border-primary text-white'
              : 'bg-white/95 border-gray-300 hover:border-primary hover:bg-primary/10'
          }`}
          title="Sélectionner pour Magazine DECO"
        >
          {isSelected && (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      </div>

      {/* Boutons en haut à droite : Favoris + Menu */}
      <div className="absolute top-2 right-2 z-20 flex gap-1.5">
        {/* Bouton Favoris */}
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 bg-white/95 hover:bg-white shadow-md backdrop-blur-sm"
          onClick={() => onToggleFavorite(render.id)}
          title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
          <Heart
            className={`h-4 w-4 ${
              isFavorite
                ? "fill-red-500 text-red-500"
                : "text-gray-700"
            }`}
          />
        </Button>

        {/* Menu contextuel */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 bg-white/95 hover:bg-white shadow-md backdrop-blur-sm"
            >
              <MoreVertical className="h-4 w-4 text-gray-700" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => onZoom(render.result_image_url)}
              className="cursor-pointer"
            >
              <Maximize2 className="mr-2 h-4 w-4" />
              Agrandir
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onCompare(render, photo)}
              className="cursor-pointer"
            >
              <SplitSquareHorizontal className="mr-2 h-4 w-4" />
              Comparer avant/après
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Télécharger en...
            </div>
            <ImageExportMenuItems
              imageUrl={render.result_image_url}
              filename={`dica-render-${render.id}`}
            />
            {render.decor_id && (
              <DropdownMenuItem
                onClick={() => onRegenerate(render.id, photo.id)}
                disabled={isGenerating}
                className="cursor-pointer"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Régénérer
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onToggleFavorite(render.id)}
              className="cursor-pointer"
            >
              <Heart
                className={`mr-2 h-4 w-4 ${
                  isFavorite
                    ? "fill-current text-red-500"
                    : ""
                }`}
              />
              {isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(render.id, photo.id)}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  </div>
);
