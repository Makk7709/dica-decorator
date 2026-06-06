/**
 * @fileoverview Carte d'un favori (onglet « Mes créations favorites »).
 *
 * Sous-composant de présentation extrait de `src/pages/Creative.tsx`
 * (LOT 4 — découpage). Balisage et accessibilité repris à l'identique
 * (role="button", aria-label, onKeyDown via `onActivateKeyDown`). Les actions
 * (zoom, suppression) sont remontées au parent via des callbacks.
 */

import { Button } from "@/components/ui/button";
import { ImageExportDropdown } from "@/components/ui/image-export-dropdown";
import { Heart, Maximize2 } from "lucide-react";
import { onActivateKeyDown } from "@/lib/utils";
import type { Favorite } from "./types";

interface FavoriteCardProps {
  favorite: Favorite;
  index: number;
  onZoom: (imageUrl: string) => void;
  onDelete: (id: string) => void;
}

export const FavoriteCard = ({
  favorite,
  index,
  onZoom,
  onDelete,
}: Readonly<FavoriteCardProps>) => {
  return (
    <div
      className="rounded-xl border border-border/50 bg-card hover:shadow-md transition-all overflow-hidden animate-slide-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Image si présente */}
      {favorite.image_data && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Agrandir le favori"
          className="relative group cursor-pointer"
          onClick={() => onZoom(favorite.image_data!)}
          onKeyDown={(e) => onActivateKeyDown(e, () => onZoom(favorite.image_data!))}
        >
          <img
            src={favorite.image_data}
            alt={favorite.title}
            className="w-full aspect-square object-cover"
          />
          {/* Badge favori */}
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <Heart className="h-3 w-3 fill-current" />
            Favori
          </div>
          {/* Overlay au survol */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="h-8 px-3 bg-white hover:bg-white shadow-md"
              >
                <Maximize2 className="h-3.5 w-3.5 mr-1.5 text-foreground" />
                <span className="text-foreground text-xs">Agrandir</span>
              </Button>
              <ImageExportDropdown
                imageUrl={favorite.image_data || ''}
                filename={`dica-favorite-${favorite.id}`}
                variant="secondary"
                size="sm"
                className="h-8 px-3 bg-white hover:bg-white shadow-md"
              />
            </div>
          </div>
        </div>
      )}

      {/* Infos */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{favorite.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(favorite.created_at).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
                year: "numeric"
              })}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(favorite.id)}
            className="text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0 h-8 w-8 p-0"
          >
            <Heart className="h-4 w-4 fill-current" />
          </Button>
        </div>

        {/* Prompt */}
        <p className="text-xs text-muted-foreground line-clamp-2">{favorite.prompt}</p>

        {/* Message si pas d'image */}
        {!favorite.image_data && (
          <div className="mt-3 p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground line-clamp-3">{favorite.response}</p>
          </div>
        )}
      </div>
    </div>
  );
};
