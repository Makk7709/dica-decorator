import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ConversationSummary } from "@/hooks/use-creative-conversation";
import { cn } from "@/lib/utils";

export function formatRelativeDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const diffMin = Math.round((now.getTime() - date.getTime()) / 60_000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "hier";
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

interface ConversationHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export function ConversationHistory({
  open,
  onOpenChange,
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: Readonly<ConversationHistoryProps>) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex w-full flex-col gap-0 p-0 sm:max-w-sm">
        <SheetHeader className="space-y-1 border-b border-border p-5 text-left">
          <SheetTitle className="font-display text-lg">Conversations</SheetTitle>
          <SheetDescription>Enregistrées automatiquement sur votre compte.</SheetDescription>
        </SheetHeader>
        <div className="border-b border-border p-3">
          <Button variant="outline" className="w-full justify-start" onClick={onNew}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle conversation
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">Aucune conversation pour l'instant.</p>
          ) : (
            <ul className="space-y-0.5">
              {conversations.map((c) => (
                <li key={c.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-sm px-3 py-2.5 pr-10 text-left transition-colors",
                      c.id === activeId ? "bg-muted text-foreground" : "hover:bg-muted/60",
                    )}
                    aria-current={c.id === activeId ? "true" : undefined}
                  >
                    <MessageSquare
                      className={cn("mt-0.5 h-4 w-4 shrink-0", c.id === activeId ? "text-primary" : "text-muted-foreground")}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{c.title}</span>
                      <span className="block font-mono text-[10.5px] text-muted-foreground">
                        {formatRelativeDate(c.updated_at)}
                      </span>
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(c.id)}
                    className="absolute right-1 top-1.5 h-8 w-8 text-muted-foreground opacity-100 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                    aria-label={`Supprimer « ${c.title} »`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
