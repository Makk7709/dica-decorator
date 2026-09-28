import { FolderPlus, Heart, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/ui/safe-image";
import { ImageExportDropdown } from "@/components/ui/image-export-dropdown";
import type { ChatMessage } from "@/hooks/use-creative-conversation";
import { cn } from "@/lib/utils";

interface ChatMessageItemProps {
  message: ChatMessage;
  canFavorite: boolean;
  onZoom: (url: string) => void;
  onSaveToProject: (url: string) => void;
  onFavorite: () => void;
}

export function AssistantMark({ className }: Readonly<{ className?: string }>) {
  return (
    <div
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center border border-foreground/15 bg-background/60 font-display text-[13px] font-semibold text-primary",
        className,
      )}
      aria-hidden="true"
    >
      D
    </div>
  );
}

export function ChatMessageItem({ message, canFavorite, onZoom, onSaveToProject, onFavorite }: Readonly<ChatMessageItemProps>) {
  const isUser = message.role === "user";
  const sources = message.sourceImageUrls ?? (message.sourceImageUrl ? [message.sourceImageUrl] : []);

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="flex max-w-[85%] flex-col items-end gap-2 sm:max-w-[75%]">
          {sources.length > 0 && (
            <div className="flex flex-wrap justify-end gap-1.5">
              {sources.map((url, idx) => (
                <SafeImage
                  key={url}
                  src={url}
                  alt={`Photo jointe ${idx + 1}`}
                  className="h-16 w-16 rounded-[2px] border border-border object-cover"
                />
              ))}
            </div>
          )}
          <div className="bubble bubble-user">
            <p className="whitespace-pre-wrap text-sm">{message.content}</p>
          </div>
        </div>
      </div>
    );
  }

  const imageUrl = message.imageUrl;

  return (
    <div className="group flex gap-3">
      <AssistantMark className="mt-0.5" />
      <div className="min-w-0 flex-1 space-y-3">
        {message.content && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{message.content}</p>
        )}

        {imageUrl && (
          <figure className="max-w-2xl overflow-hidden border border-border bg-card">
            <button
              type="button"
              onClick={() => onZoom(imageUrl)}
              className="block w-full cursor-zoom-in"
              aria-label="Agrandir le visuel"
            >
              <SafeImage
                src={imageUrl}
                alt="Visuel généré"
                className="mx-auto max-h-[min(62vh,560px)] w-full bg-muted/40 object-contain"
              />
            </button>
            <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-2 py-1.5">
              <div className="flex flex-wrap items-center gap-1">
                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => onZoom(imageUrl)}>
                  <Maximize2 className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Agrandir</span>
                </Button>
                <ImageExportDropdown
                  imageUrl={imageUrl}
                  filename={`dica-creation-${Date.now()}`}
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 [&>span]:ml-1.5 [&>span]:hidden sm:[&>span]:inline"
                />
                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => onSaveToProject(imageUrl)}>
                  <FolderPlus className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Projet</span>
                </Button>
              </div>
              {canFavorite && (
                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={onFavorite}>
                  <Heart className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Favori</span>
                </Button>
              )}
            </figcaption>
          </figure>
        )}

        {message.decorReferences && message.decorReferences.length > 0 && (
          <div className="space-y-1.5">
            <p className="eyebrow">Décors utilisés</p>
            <div className="flex flex-wrap gap-1.5">
              {message.decorReferences.map((decor) => (
                <span
                  key={decor.reference}
                  className="inline-flex items-center gap-2 border border-border bg-background/50 px-2 py-1 text-xs"
                >
                  <span className="text-foreground">{decor.label}</span>
                  <span className="font-mono text-[10.5px] text-muted-foreground">{decor.reference}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {!imageUrl && canFavorite && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onFavorite}
            className="h-7 px-2 text-muted-foreground opacity-100 transition-opacity hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
          >
            <Heart className="mr-1.5 h-3.5 w-3.5" />
            Favori
          </Button>
        )}
      </div>
    </div>
  );
}

export function AssistantTyping() {
  return (
    <div className="flex gap-3" role="status" aria-live="polite">
      <AssistantMark className="mt-0.5" />
      <div className="flex items-center gap-3 pt-1 text-sm text-muted-foreground">
        <span className="flex gap-1" aria-hidden="true">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/40"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
        En cours… un visuel peut prendre jusqu'à une minute.
      </div>
    </div>
  );
}
