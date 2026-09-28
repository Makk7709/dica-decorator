import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const RELOAD_FLAG = "dica:chunk-reload";

/** Après un déploiement, les anciens chunks lazy n'existent plus sur le serveur. */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(message);
}

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
    // Au plus un rechargement automatique par minute pour éviter une boucle.
    const lastReload = Number(sessionStorage.getItem(RELOAD_FLAG) ?? 0);
    if (isChunkLoadError(error) && Date.now() - lastReload > 60_000) {
      sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
      window.location.reload();
    }
  }

  private readonly handleReload = () => {
    window.location.reload();
  };

  private readonly handleHome = () => {
    window.location.assign("/dashboard");
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div role="alert" className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md space-y-4 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
          <h1 className="text-xl font-semibold">Une erreur inattendue est survenue</h1>
          <p className="text-sm text-muted-foreground">
            {isChunkLoadError(this.state.error)
              ? "Une nouvelle version de l'application est disponible. Rechargez la page pour continuer."
              : "La page n'a pas pu s'afficher. Vos données sont conservées : rechargez la page ou revenez au tableau de bord."}
          </p>
          <div className="flex justify-center gap-2">
            <Button onClick={this.handleReload}>Recharger</Button>
            <Button variant="outline" onClick={this.handleHome}>Tableau de bord</Button>
          </div>
        </div>
      </div>
    );
  }
}
