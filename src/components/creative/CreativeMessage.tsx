/**
 * @fileoverview Bulle de message du chat de l'Assistant Créatif.
 *
 * Sous-composant de présentation extrait de `src/pages/Creative.tsx`
 * (LOT 4 — découpage). Le balisage est repris à l'identique afin de préserver
 * le rendu et l'accessibilité (role="button", aria-label, onKeyDown via
 * `onActivateKeyDown`) ajoutés au LOT 3. Aucune logique métier ici : les
 * actions sont remontées au parent via des callbacks.
 */

import { Button } from "@/components/ui/button";
import { ImageExportDropdown } from "@/components/ui/image-export-dropdown";
import { FolderPlus, Heart, Maximize2 } from "lucide-react";
import { onActivateKeyDown } from "@/lib/utils";
import type { Message } from "./types";

interface CreativeMessageProps {
  message: Message;
  index: number;
  onZoom: (imageUrl: string) => void;
  onSaveToProject: (imageUrl: string) => void;
  onSaveFavorite: (index: number) => void;
}

export const CreativeMessage = ({
  message,
  index,
  onZoom,
  onSaveToProject,
  onSaveFavorite,
}: Readonly<CreativeMessageProps>) => {
  return (
    <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
      <div className="flex flex-col gap-2 max-w-[80%]">
        <div
          className={`rounded-lg px-4 py-3 ${
            message.role === "user"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground"
          }`}
        >
          {message.sourceImageUrls && message.sourceImageUrls.length > 0 && message.role === "user" && (
            <div className="mb-2 flex flex-wrap gap-2">
              {message.sourceImageUrls.map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt={`Source ${idx + 1}`}
                  className="rounded-lg h-16 w-16 object-cover"
                />
              ))}
            </div>
          )}
          {message.sourceImageUrl && !message.sourceImageUrls && message.role === "user" && (
            <div className="mb-2">
              <img
                src={message.sourceImageUrl}
                alt="Source"
                className="rounded-lg max-h-40 w-auto"
              />
            </div>
          )}
          {message.imageUrl ? (
            <div className="space-y-3">
              <p className="whitespace-pre-wrap text-sm text-foreground">{message.content}</p>
              <div className="space-y-2">
                {/* Image avec overlay de zoom */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Agrandir la visualisation"
                  className="relative group cursor-pointer"
                  onClick={() => onZoom(message.imageUrl!)}
                  onKeyDown={(e) => onActivateKeyDown(e, () => onZoom(message.imageUrl!))}
                >
                  <img
                    src={message.imageUrl}
                    alt="Visualisation générée"
                    className="rounded-lg w-full max-w-2xl transition-transform hover:scale-[1.02]"
                  />
                  {/* Overlay avec icône zoom */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all rounded-lg flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-black/90 rounded-full p-3 shadow-lg">
                      <Maximize2 className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {/* Bouton Zoom */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onZoom(message.imageUrl!)}
                  >
                    <Maximize2 className="h-4 w-4 mr-2" />
                    Agrandir
                  </Button>
                  <ImageExportDropdown
                    imageUrl={message.imageUrl!}
                    filename={`dica-creative-${Date.now()}`}
                    variant="outline"
                    size="sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSaveToProject(message.imageUrl!)}
                  >
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Enregistrer dans un projet
                  </Button>
                </div>

                {/* Références DICA utilisées */}
                {message.decorReferences && message.decorReferences.length > 0 && (
                  <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
                    <p className="text-xs font-semibold text-primary mb-2 flex items-center gap-1.5">
                      <span className="text-sm">🏷️</span>
                      Décors DICA utilisés
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {message.decorReferences.map((decor, idx) => (
                        <div
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-black/40 border border-border/50 shadow-sm"
                        >
                          <span className="text-xs font-medium text-foreground">{decor.label}</span>
                          <span className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded">
                            {decor.reference}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-sm text-foreground">{message.content}</p>
          )}
        </div>
        {message.role === "assistant" && index > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => onSaveFavorite(index)}
          >
            <Heart className="h-4 w-4 mr-2" />
            Sauvegarder en favori
          </Button>
        )}
      </div>
    </div>
  );
};
