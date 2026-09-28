import { useEffect, useRef, type ChangeEvent, type KeyboardEvent, type ReactNode } from "react";
import { ArrowUp, Loader2, Paperclip, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/ui/safe-image";
import { cn } from "@/lib/utils";

export interface ComposerAttachment {
  url: string;
  label: string;
}

export const MAX_ATTACHMENTS = 5;
const MAX_TEXTAREA_HEIGHT = 180;

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isBusy: boolean;
  attachments: ComposerAttachment[];
  onAttach: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: (index: number) => void;
  onRenameAttachment: (index: number, label: string) => void;
  isUploading: boolean;
  showReferences: boolean;
  onToggleReferences: () => void;
  catalogStatus: ReactNode;
  voiceControl: ReactNode;
}

export function ChatComposer({
  value,
  onChange,
  onSend,
  isBusy,
  attachments,
  onAttach,
  onRemoveAttachment,
  onRenameAttachment,
  isUploading,
  showReferences,
  onToggleReferences,
  catalogStatus,
  voiceControl,
}: Readonly<ChatComposerProps>) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canAttach = !isBusy && !isUploading && attachments.length < MAX_ATTACHMENTS;
  const canSend = !isBusy && value.trim().length > 0;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (canSend) onSend();
    }
  };

  return (
    <div className="border-t border-border/70 p-3 sm:p-4">
      <div className="rounded-sm border border-input bg-card transition-[border-color,box-shadow] focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 border-b border-border/60 p-2.5">
            {attachments.map((img, index) => (
              <div
                key={img.url}
                className="flex items-center gap-2 rounded-sm border border-border bg-background/60 py-1 pl-1 pr-1.5"
              >
                <SafeImage src={img.url} alt={img.label} className="h-9 w-9 rounded-[2px] object-cover" />
                <input
                  value={img.label}
                  onChange={(e) => onRenameAttachment(index, e.target.value.slice(0, 40))}
                  aria-label={`Nom de la photo ${index + 1}`}
                  className="w-24 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground focus:underline"
                  placeholder="Nommer…"
                />
                <button
                  type="button"
                  onClick={() => onRemoveAttachment(index)}
                  className="rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={`Retirer ${img.label}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isBusy}
          placeholder={
            attachments.length > 0
              ? "Décrivez comment utiliser ces photos…"
              : "Décrivez votre projet : espace, ambiance, décors souhaités…"
          }
          className="block w-full resize-none bg-transparent px-3.5 pt-3 pb-1 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
        />

        <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-1">
          <div className="flex min-w-0 items-center gap-1">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={onAttach} className="hidden" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={!canAttach}
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
              title="Ajouter une photo (5 max.)"
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              <span className="ml-1.5 hidden sm:inline">Photo</span>
              {attachments.length > 0 && (
                <span className="ml-1 font-mono text-[10.5px]">{attachments.length}/{MAX_ATTACHMENTS}</span>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onToggleReferences}
              aria-pressed={showReferences}
              className={cn(
                "h-8 px-2",
                showReferences ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
              title="Afficher les noms et références des décors sur l'image générée"
            >
              <Tag className={cn("h-4 w-4", showReferences && "text-primary")} />
              <span className="ml-1.5 hidden sm:inline">Références</span>
              <span
                className={cn(
                  "ml-1.5 h-1.5 w-1.5 rounded-full",
                  showReferences ? "bg-primary" : "bg-muted-foreground/40",
                )}
                aria-hidden="true"
              />
            </Button>
            <div className="ml-1 hidden min-w-0 truncate md:block">{catalogStatus}</div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {voiceControl}
            <Button
              type="button"
              size="icon"
              onClick={onSend}
              disabled={!canSend}
              className="h-9 w-9"
              aria-label="Envoyer"
              title="Envoyer (Entrée)"
            >
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 px-1 md:hidden">{catalogStatus}</div>
    </div>
  );
}
