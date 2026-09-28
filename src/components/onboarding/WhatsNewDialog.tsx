import { useCallback, useState } from "react";
import { Mic, Palette, LayoutGrid, MessageSquareText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const WHATS_NEW_VERSION = "2026-09-voice-design";
const STORAGE_KEY = "dica-whats-new";

const readSeen = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === WHATS_NEW_VERSION;
  } catch {
    return true;
  }
};

export function useWhatsNew() {
  const [seen, setSeen] = useState(readSeen);
  const markSeen = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, WHATS_NEW_VERSION);
    } catch {
      /* stockage indisponible : le pop-up réapparaîtra */
    }
    setSeen(true);
  }, []);
  return { showWhatsNew: !seen, markWhatsNewSeen: markSeen };
}

const VOICE_CAPABILITIES = [
  {
    icon: MessageSquareText,
    title: "Conseils à voix haute",
    text: "Posez vos questions sur les stratifiés et compacts HPL, DICA France et Compactop, comme à un conseiller.",
  },
  {
    icon: Palette,
    title: "Combinaisons de décors",
    text: "L'assistant cherche dans le catalogue réel et ne cite que des références DICA existantes.",
  },
  {
    icon: LayoutGrid,
    title: "Compositions sur demande",
    text: "Dictez un projet avec vos références : la composition est générée avec les vraies textures du catalogue.",
  },
];

interface WhatsNewDialogProps {
  open: boolean;
  onClose: () => void;
  onTryVoice: () => void;
}

export function WhatsNewDialog({ open, onClose, onTryVoice }: Readonly<WhatsNewDialogProps>) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-lg">
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6 sm:p-7">
          <DialogHeader className="space-y-3 text-left">
            <p className="eyebrow">
              Nouveautés <span className="text-primary">/</span>{" "}
              <span className="text-foreground/80">Septembre 2026</span>
            </p>
            <DialogTitle className="font-display text-2xl font-semibold tracking-tight">
              DICA Visual Studio fait peau neuve
            </DialogTitle>
            <DialogDescription>
              Une interface repensée et un assistant créatif qui vous écoute.
            </DialogDescription>
          </DialogHeader>

          <section className="card-premium flex gap-4 p-4">
            <div className="brackets flex h-10 w-10 shrink-0 items-center justify-center border border-foreground/10">
              <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.5} />
            </div>
            <div className="space-y-1">
              <h3 className="font-display text-base font-semibold">Nouveau design</h3>
              <p className="text-sm text-muted-foreground">
                Surfaces en verre dépoli, modes jour et nuit retravaillés, affichage mobile optimisé.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4 text-primary" strokeWidth={1.5} />
              <h3 className="font-display text-base font-semibold">Assistant vocal créatif</h3>
            </div>
            <ul className="space-y-3">
              {VOICE_CAPABILITIES.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-foreground/60" strokeWidth={1.5} />
                  <p className="text-sm">
                    <span className="font-medium">{title}.</span>{" "}
                    <span className="text-muted-foreground">{text}</span>
                  </p>
                </li>
              ))}
            </ul>
            <p className="border-l-2 border-primary/60 bg-muted/50 px-3 py-2 font-mono text-[12px] leading-relaxed text-foreground/80">
              « Crée-moi une cabine d'ascenseur avec un décor bois clair et un marbre blanc. »
            </p>
            <p className="text-xs text-muted-foreground">
              Appuyez sur le micro dans l'assistant créatif. Appels de 10 minutes maximum, nombre d'appels
              limité par jour. Chaque composition compte comme un rendu.
            </p>
          </section>
        </div>

        <DialogFooter className="shrink-0 flex-col-reverse gap-2 border-t border-border px-6 py-4 sm:flex-row sm:justify-end sm:px-7">
          <Button variant="ghost" onClick={onClose}>
            Plus tard
          </Button>
          <Button variant="command" onClick={onTryVoice}>
            Essayer l'assistant vocal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
