/**
 * @fileoverview Page dédiée aux créations IA générées via l'Assistant Créatif.
 * Galerie globale (table ai_creations) avec zoom, export et suppression.
 */

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Wand2, Loader2, Trash2, Maximize2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PremiumLayout, ContentContainer } from "@/components/ui/premium-layout";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ImageExportDropdown } from "@/components/ui/image-export-dropdown";
import { SafeImage } from "@/components/ui/safe-image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface AiCreation {
  id: string;
  image_url: string;
  prompt: string | null;
  title: string | null;
  created_at: string;
}

export default function AiCreations() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [creations, setCreations] = useState<AiCreation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toDelete, setToDelete] = useState<AiCreation | null>(null);
  const [zoomed, setZoomed] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from("ai_creations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      toast.error("Impossible de charger les créations IA");
    } else {
      setCreations((data ?? []) as AiCreation[]);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("ai_creations").delete().eq("id", toDelete.id);
    if (error) {
      toast.error("Suppression impossible");
    } else {
      toast.success("Création supprimée");
      setCreations((prev) => prev.filter((c) => c.id !== toDelete.id));
    }
    setToDelete(null);
  };

  return (
    <PremiumLayout backgroundImage="/images/assistant-creatif.png" showPlates={false}>
      <header className="header-premium sticky top-0 z-50 border-b">
        <ContentContainer className="flex h-16 md:h-20 items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Wand2 className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-semibold tracking-tight text-foreground">
                  Mes Créations IA
                </h1>
                <p className="text-xs text-muted-foreground">
                  Générées par l'Assistant Créatif
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => navigate("/creative")} className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nouvelle création</span>
            </Button>
            <ThemeToggle />
          </div>
        </ContentContainer>
      </header>

      <ContentContainer className="py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : creations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Wand2 className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Aucune création pour le moment</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Lancez votre première génération depuis l'Assistant Créatif. Toutes vos images
              y seront automatiquement enregistrées.
            </p>
            <Button onClick={() => navigate("/creative")} className="gap-2">
              <Wand2 className="h-4 w-4" />
              Ouvrir l'Assistant Créatif
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {creations.map((c) => (
              <div
                key={c.id}
                className="group relative rounded-2xl overflow-hidden border bg-card shadow-sm hover:shadow-lg transition-shadow"
              >
                <button
                  type="button"
                  onClick={() => setZoomed(c.image_url)}
                  className="block w-full aspect-square overflow-hidden"
                >
                  <SafeImage
                    src={c.image_url}
                    alt={c.title ?? c.prompt ?? "Création IA"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </button>
                <div className="p-3 space-y-2">
                  {c.prompt && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{c.prompt}</p>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("fr-FR")}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setZoomed(c.image_url)}
                      >
                        <Maximize2 className="h-4 w-4" />
                      </Button>
                      <ImageExportDropdown
                        imageUrl={c.image_url}
                        fileName={`creation-ia-${c.id.slice(0, 8)}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setToDelete(c)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ContentContainer>

      <Dialog open={!!zoomed} onOpenChange={(o) => !o && setZoomed(null)}>
        <DialogContent className="max-w-5xl p-2 bg-background">
          {zoomed && (
            <SafeImage
              src={zoomed}
              alt="Création IA en plein écran"
              className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette création ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'image sera retirée de votre galerie.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PremiumLayout>
  );
}
