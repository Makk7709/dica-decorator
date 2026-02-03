/**
 * Composant de sélection de décors contextualisé par type de projet
 * Affiche les catalogues appropriés (Parois/Sol pour Ascenseur, Évasion pour Van, etc.)
 */

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Sparkles, Info, AlertTriangle } from "lucide-react";
import { useCatalogsWithDecors, hasConfiguredCatalogs, type ProjectType, type CatalogDecor } from "@/hooks/use-catalogs";

interface DecorSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectType: ProjectType;
  selectedDecor: CatalogDecor | null;
  onSelectDecor: (decor: CatalogDecor) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  // Options de génération
  renderCount: number;
  onRenderCountChange: (count: number) => void;
  renderFormat: "square" | "portrait" | "landscape" | "original";
  onRenderFormatChange: (format: "square" | "portrait" | "landscape" | "original") => void;
  showReferences: boolean;
  onShowReferencesChange: (show: boolean) => void;
  originalDimensions?: { width: number; height: number } | null;
}

export const DecorSelectorDialog = ({
  open,
  onOpenChange,
  projectType,
  selectedDecor,
  onSelectDecor,
  onGenerate,
  isGenerating,
  renderCount,
  onRenderCountChange,
  renderFormat,
  onRenderFormatChange,
  showReferences,
  onShowReferencesChange,
  originalDimensions,
}: DecorSelectorDialogProps) => {
  const { catalogs, decorsByCatalog, isLoading, error } = useCatalogsWithDecors(projectType);
  const [activeTab, setActiveTab] = useState<string>("");

  // Initialiser l'onglet actif au premier catalogue avec des décors
  useEffect(() => {
    if (catalogs.length > 0 && !activeTab) {
      const firstCatalogWithDecors = catalogs.find(c => (decorsByCatalog[c.id]?.length || 0) > 0);
      if (firstCatalogWithDecors) {
        setActiveTab(firstCatalogWithDecors.id);
      } else if (catalogs[0]) {
        setActiveTab(catalogs[0].id);
      }
    }
  }, [catalogs, decorsByCatalog, activeTab]);

  // Vérifier si des catalogues sont configurés
  const hasCatalogs = hasConfiguredCatalogs(catalogs, decorsByCatalog);
  const totalDecors = Object.values(decorsByCatalog).reduce((sum, decors) => sum + decors.length, 0);

  // Labels pour les types de projet
  const projectTypeLabels: Record<ProjectType, string> = {
    ascenseur: "Ascenseur",
    van: "Van",
    terrasse: "Terrasse",
    autre: "Autre",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Choisir un décor</DialogTitle>
          <DialogDescription className="text-base">
            Catalogues {projectTypeLabels[projectType]} • {totalDecors} décors disponibles
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              En fonction de la qualité des images sources, il est parfois nécessaire de faire plusieurs générations pour obtenir le résultat attendu.
            </AlertDescription>
          </Alert>

          {/* Paramètres de génération */}
          <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/30">
            <div className="space-y-2">
              <Label htmlFor="render-count">Nombre de rendus</Label>
              <Select value={renderCount.toString()} onValueChange={(v) => onRenderCountChange(parseInt(v))}>
                <SelectTrigger id="render-count">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 rendu</SelectItem>
                  <SelectItem value="2">2 rendus</SelectItem>
                  <SelectItem value="3">3 rendus</SelectItem>
                  <SelectItem value="4">4 rendus</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="render-format">Format / Taille</Label>
              <Select value={renderFormat} onValueChange={(v: any) => onRenderFormatChange(v)}>
                <SelectTrigger id="render-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="square">Carré (1024×1024)</SelectItem>
                  <SelectItem value="portrait">Portrait (768×1344)</SelectItem>
                  <SelectItem value="landscape">Paysage (1344×768)</SelectItem>
                  <SelectItem value="original">
                    Format original {originalDimensions ? `(${originalDimensions.width}×${originalDimensions.height})` : ""}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Option références DICA */}
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
              <input
                type="checkbox"
                id="show-references"
                checked={showReferences}
                onChange={(e) => onShowReferencesChange(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <div className="flex-1">
                <Label htmlFor="show-references" className="cursor-pointer font-medium">
                  Afficher les références DICA
                </Label>
                <p className="text-xs text-muted-foreground">
                  Ajoute le nom et code du décor sur l'image (ex: "Inox Brossé 3020BN")
                </p>
              </div>
            </div>
          </div>

          {/* État de chargement */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Chargement des catalogues...</span>
            </div>
          )}

          {/* Erreur */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Erreur lors du chargement des catalogues : {(error as Error).message}
              </AlertDescription>
            </Alert>
          )}

          {/* Aucun catalogue configuré */}
          {!isLoading && !error && !hasCatalogs && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun décor configuré</h3>
              <p className="text-muted-foreground max-w-md">
                Les catalogues pour les projets {projectTypeLabels[projectType]} ne contiennent pas encore de décors.
                Contactez votre administrateur pour configurer les catalogues.
              </p>
            </div>
          )}

          {/* Affichage des catalogues avec tabs */}
          {!isLoading && !error && hasCatalogs && catalogs.length > 0 && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className={`grid w-full h-auto ${catalogs.length === 1 ? 'grid-cols-1' : catalogs.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {catalogs.map((catalog) => {
                  const decorsCount = decorsByCatalog[catalog.id]?.length || 0;
                  return (
                    <TabsTrigger 
                      key={catalog.id} 
                      value={catalog.id} 
                      className="py-3"
                      disabled={decorsCount === 0}
                    >
                      {catalog.label}
                      <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${decorsCount === 0 ? 'bg-muted text-muted-foreground' : 'bg-primary/10'}`}>
                        {decorsCount}
                      </span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {catalogs.map((catalog) => {
                const decors = decorsByCatalog[catalog.id] || [];
                return (
                  <TabsContent key={catalog.id} value={catalog.id} className="mt-6">
                    <div className="max-h-[35vh] overflow-y-auto pr-2">
                      {decors.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <p className="text-lg text-muted-foreground">
                            Aucun décor dans ce catalogue
                          </p>
                          {catalog.description && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {catalog.description}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          {decors.map((decor) => (
                            <Card
                              key={decor.id}
                              className={`cursor-pointer transition-all hover:shadow-lg ${
                                selectedDecor?.id === decor.id 
                                  ? "ring-2 ring-primary shadow-lg" 
                                  : "hover:border-primary/50"
                              }`}
                              onClick={() => onSelectDecor(decor)}
                            >
                              <CardContent className="p-3">
                                <div className="relative mb-2 overflow-hidden rounded-lg">
                                  <img
                                    src={decor.texture_image_url}
                                    alt={decor.name}
                                    className="h-32 w-full object-cover transition-transform hover:scale-105"
                                  />
                                </div>
                                <h3 className="font-semibold text-sm leading-tight mb-1">
                                  {decor.name}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                  {decor.reference_code}
                                </p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={onGenerate}
            disabled={!selectedDecor || isGenerating}
            size="lg"
            className="btn-primary-premium"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {renderCount > 1 ? `Générer ${renderCount} rendus` : "Générer le rendu"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
