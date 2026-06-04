/**
 * Composant de sélection de décors contextualisé par type de projet
 * Support de la sélection multi-catalogue (ex: Parois + Sol pour Ascenseur)
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, Info, AlertTriangle, Check, X, Search } from "lucide-react";
import { useCatalogsWithDecors, hasConfiguredCatalogs, type ProjectType, type CatalogDecor, type Catalog } from "@/hooks/use-catalogs";

// Type pour la sélection par catalogue
export type DecorSelection = Record<string, CatalogDecor | null>;

interface DecorSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectType: ProjectType;
  // Support multi-sélection par catalogue
  decorSelection: DecorSelection;
  onDecorSelectionChange: (selection: DecorSelection) => void;
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

// Labels pour les types de projet
const projectTypeLabels: Record<ProjectType, string> = {
  ascenseur: "Ascenseur",
  van: "Van",
  terrasse: "Terrasse",
  autre: "Autre",
};
// Génère une URL de miniature optimisée via Supabase Storage Transform
// width = taille d'affichage CSS (sera multipliée par le DPR pour la netteté retina)
const getThumbUrl = (url: string, width = 200, quality = 85): string => {
  if (!url) return url;
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 3) : 2;
  const renderWidth = Math.round(width * dpr);
  if (url.includes('/storage/v1/object/public/')) {
    return url.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/'
    ) + `?width=${renderWidth}&quality=${quality}&resize=cover`;
  }
  return url;
};

export const DecorSelectorDialog = ({
  open,
  onOpenChange,
  projectType,
  decorSelection,
  onDecorSelectionChange,
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
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

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

  // Compter les sélections valides
  const selectedCount = useMemo(() => {
    return Object.values(decorSelection).filter(Boolean).length;
  }, [decorSelection]);

  // Vérifier si au moins un décor est sélectionné
  const hasSelection = selectedCount > 0;

  // Extraire les catégories uniques de tous les décors
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const decors of Object.values(decorsByCatalog)) {
      for (const d of decors) {
        if (d.category) cats.add(d.category);
      }
    }
    return Array.from(cats).sort();
  }, [decorsByCatalog]);

  // Filtrer les décors par recherche et catégorie
  const filteredDecorsByCatalog = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const filtered: Record<string, CatalogDecor[]> = {};
    for (const [catalogId, decors] of Object.entries(decorsByCatalog)) {
      filtered[catalogId] = decors.filter((d) => {
        const matchesSearch = !q || d.name.toLowerCase().includes(q) || d.reference_code.toLowerCase().includes(q) || (d.category && d.category.toLowerCase().includes(q));
        const matchesCategory = categoryFilter === "all" || d.category === categoryFilter;
        return matchesSearch && matchesCategory;
      });
    }
    return filtered;
  }, [decorsByCatalog, searchQuery, categoryFilter]);

  // Handler pour sélectionner/désélectionner un décor dans un catalogue
  const handleSelectDecor = (catalogId: string, decor: CatalogDecor) => {
    const currentSelection = decorSelection[catalogId];
    const isSelected = currentSelection?.id === decor.id;
    
    onDecorSelectionChange({
      ...decorSelection,
      [catalogId]: isSelected ? null : decor,
    });
  };

  // Handler pour retirer une sélection
  const handleRemoveSelection = (catalogId: string) => {
    onDecorSelectionChange({
      ...decorSelection,
      [catalogId]: null,
    });
  };

  // Trouver le catalogue correspondant à un ID
  const getCatalogById = (catalogId: string): Catalog | undefined => {
    return catalogs.find(c => c.id === catalogId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Choisir vos décors</DialogTitle>
          <DialogDescription className="text-base">
            Catalogues {projectTypeLabels[projectType]} • {totalDecors} décors disponibles
            {catalogs.length > 1 && " • Sélectionnez un décor par catalogue"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Récapitulatif de la sélection */}
          {catalogs.length > 0 && (
            <div className="p-4 border rounded-lg bg-muted/30">
              <Label className="text-sm font-medium mb-3 block">Votre sélection</Label>
              <div className="flex flex-wrap gap-3">
                {catalogs.map((catalog) => {
                  const selectedDecor = decorSelection[catalog.id];
                  const decorsCount = decorsByCatalog[catalog.id]?.length || 0;
                  
                  if (decorsCount === 0) return null;
                  
                  return (
                    <div
                      key={catalog.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                        selectedDecor 
                          ? "bg-primary/10 border-primary" 
                          : "bg-background border-dashed border-muted-foreground/30"
                      }`}
                    >
                      {selectedDecor ? (
                        <>
                          <img
                            src={getThumbUrl(selectedDecor.texture_image_url, 40, 90)}
                            alt={selectedDecor.name}
                            className="w-10 h-10 rounded object-cover"
                            loading="eager"
                            decoding="async"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-muted-foreground">{catalog.label}</p>
                            <p className="text-sm font-semibold truncate max-w-[150px]">{selectedDecor.name}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveSelection(catalog.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 px-2 py-1">
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                            <span className="text-muted-foreground text-lg">?</span>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">{catalog.label}</p>
                            <p className="text-sm text-muted-foreground italic">Non sélectionné</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              En fonction de la qualité des images sources, il est parfois nécessaire de faire plusieurs générations pour obtenir le résultat attendu.
            </AlertDescription>
          </Alert>

          {/* Paramètres de génération */}
           <div className="grid grid-cols-1 gap-4 p-4 border rounded-lg bg-muted/30">
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
            <div className="col-span-2 flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
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
            <div className="space-y-4">
              {/* Barre de recherche */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom, référence ou matière..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {allCategories.length > 1 && (
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Matière" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes matières</SelectItem>
                      {allCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className={`grid w-full h-auto ${catalogs.length === 1 ? 'grid-cols-1' : catalogs.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {catalogs.map((catalog) => {
                  const decorsCount = filteredDecorsByCatalog[catalog.id]?.length || 0;
                  const isSelected = !!decorSelection[catalog.id];
                  return (
                    <TabsTrigger 
                      key={catalog.id} 
                      value={catalog.id} 
                      className="py-3 relative"
                      disabled={decorsCount === 0 && !searchQuery}
                    >
                      {isSelected && (
                        <Check className="h-4 w-4 mr-1 text-primary" />
                      )}
                      {catalog.label}
                      <Badge 
                        variant={isSelected ? "default" : "secondary"} 
                        className="ml-2"
                      >
                        {decorsCount}
                      </Badge>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {catalogs.map((catalog) => {
                const decors = filteredDecorsByCatalog[catalog.id] || [];
                const selectedDecorInCatalog = decorSelection[catalog.id];
                
                return (
                  <TabsContent key={catalog.id} value={catalog.id} className="mt-6">
                    <div className="max-h-[30vh] overflow-y-auto pr-2">
                      {decors.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <p className="text-lg text-muted-foreground">
                            {searchQuery ? `Aucun décor trouvé pour "${searchQuery}"` : "Aucun décor dans ce catalogue"}
                          </p>
                        </div>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                          {decors.map((decor) => {
                            const isSelected = selectedDecorInCatalog?.id === decor.id;
                            return (
                              <Card
                                key={decor.id}
                                className={`cursor-pointer transition-all hover:shadow-lg ${
                                  isSelected 
                                    ? "ring-2 ring-primary shadow-lg bg-primary/5" 
                                    : "hover:border-primary/50"
                                }`}
                                onClick={() => handleSelectDecor(catalog.id, decor)}
                              >
                                <CardContent className="p-2">
                                  <div className="relative mb-2 overflow-hidden rounded-lg">
                                    {isSelected && (
                                      <div className="absolute top-1 right-1 z-10 bg-primary text-primary-foreground rounded-full p-1">
                                        <Check className="h-3 w-3" />
                                      </div>
                                    )}
                                    <img
                                      src={getThumbUrl(decor.texture_image_url)}
                                      alt={decor.name}
                                      className="h-24 w-full object-cover transition-transform hover:scale-105"
                                      loading="lazy"
                                      decoding="async"
                                      width={200}
                                      height={96}
                                    />
                                  </div>
                                  <h3 className="font-medium text-xs leading-tight mb-0.5 truncate">
                                    {decor.name}
                                  </h3>
                                  <p className="text-[10px] text-muted-foreground truncate">
                                    {decor.reference_code}
                                  </p>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center gap-2 pt-4 border-t bg-background">
          <div className="text-sm text-muted-foreground">
            {selectedCount > 0 ? (
              <span className="text-foreground font-medium">
                {selectedCount} décor{selectedCount > 1 ? 's' : ''} sélectionné{selectedCount > 1 ? 's' : ''}
              </span>
            ) : (
              <span>Sélectionnez au moins un décor</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              onClick={onGenerate}
              disabled={!hasSelection || isGenerating}
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
