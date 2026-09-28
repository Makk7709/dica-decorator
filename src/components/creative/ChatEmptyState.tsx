import { ArrowRight, Clock } from "lucide-react";
import type { ConversationSummary } from "@/hooks/use-creative-conversation";
import { formatRelativeDate } from "./ConversationHistory";

const SUGGESTIONS = [
  { tag: "Mood board", prompt: "Crée un mood board salle de bain avec des décors marbre blanc et bois clair" },
  { tag: "Ascenseur", prompt: "Imagine une cabine d'ascenseur en compact HPL, ambiance chêne clair et inox brossé" },
  { tag: "Van", prompt: "Aménagement de van : façades en bois naturel et plan de travail effet béton" },
  { tag: "CHR", prompt: "Terrasse de restaurant avec des plateaux de table Compactop effet pierre" },
];

interface ChatEmptyStateProps {
  onPick: (prompt: string) => void;
  recent: ConversationSummary[];
  onOpenConversation: (id: string) => void;
}

export function ChatEmptyState({ onPick, recent, onOpenConversation }: Readonly<ChatEmptyStateProps>) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 py-6 sm:py-10">
      <div className="space-y-2">
        <p className="eyebrow">
          Studio créatif <span className="text-primary">/</span> <span className="text-foreground/80">Nouveau projet</span>
        </p>
        <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Que voulez-vous créer ?</h2>
        <p className="max-w-lg text-sm text-muted-foreground">
          Décrivez un espace, citez des décors ou joignez vos photos : le studio compose le visuel avec les textures
          réelles du catalogue DICA.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.tag}
            type="button"
            onClick={() => onPick(s.prompt)}
            className="group flex flex-col gap-1.5 border border-border bg-card/70 p-3.5 text-left transition-colors hover:border-foreground/25 hover:bg-card"
          >
            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground group-hover:text-primary">
              {s.tag}
            </span>
            <span className="text-sm text-foreground/90">{s.prompt}</span>
          </button>
        ))}
      </div>

      {recent.length > 0 && (
        <div className="space-y-2">
          <p className="eyebrow">Reprendre</p>
          <ul className="divide-y divide-border border-y border-border">
            {recent.slice(0, 3).map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onOpenConversation(c.id)}
                  className="group flex w-full items-center gap-3 py-2.5 text-left"
                >
                  <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground/90 group-hover:text-foreground">
                    {c.title}
                  </span>
                  <span className="shrink-0 font-mono text-[10.5px] text-muted-foreground">
                    {formatRelativeDate(c.updated_at)}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
