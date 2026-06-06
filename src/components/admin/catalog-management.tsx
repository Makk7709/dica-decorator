/**
 * Composant Admin pour la gestion des catalogues contextualisés
 * Permet de lier les décors aux catalogues (Parois/Sol, Évasion, Compact, etc.)
 */

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import {Tabs, TabsList, TabsTrigger} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Search, CheckCircle, AlertTriangle, Filter } from "lucide-react";
import { toast } from "sonner";
import { onActivateKeyDown } from "@/lib/utils";

interface Catalog {
  id: string;
  code: string;
  label: string;
  description: string | null;
  project_type: string;
  display_order: number;
}

interface Decor {
  id: string;
  name: string;
  reference_code: string;
  category: string;
  texture_image_url: string;
  is_active: boolean;
}

interface CatalogLink {
  catalog_id: string;
  decor_id: string;
}

export const CatalogManagement = () => {
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [decors, setDecors] = useState<Decor[]>([]);
  const [existingLinks, setExistingLinks] = useState<CatalogLink[]>([]);
  const [selectedLinks, setSelectedLinks] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeCatalog, setActiveCatalog] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [hasChanges, setHasChanges] = useState(false);

  // Charger les données
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [catalogsRes, decorsRes, linksRes] = await Promise.all([
        supabase.from("catalogs").select("*").order("project_type").order("display_order"),
        supabase.from("decors").select("*").eq("is_active", true).order("category").order("name"),
        supabase.from("catalog_decor_links").select("catalog_id, decor_id"),
      ]);

      if (catalogsRes.error) throw catalogsRes.error;
      if (decorsRes.error) throw decorsRes.error;
      if (linksRes.error) throw linksRes.error;

      setCatalogs(catalogsRes.data || []);
      setDecors(decorsRes.data || []);
      setExistingLinks(linksRes.data || []);

      // Initialiser les liens sélectionnés
      const linkSet = new Set((linksRes.data || []).map(l => `${l.catalog_id}:${l.decor_id}`));
      setSelectedLinks(linkSet);

      // Définir le premier catalogue comme actif
      if (catalogsRes.data?.length && !activeCatalog) {
        setActiveCatalog(catalogsRes.data[0].id);
      }
    } catch (error) {
      toast.error("Erreur lors du chargement");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [activeCatalog]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toggle un lien décor <-> catalogue
  const toggleLink = (catalogId: string, decorId: string) => {
    const key = `${catalogId}:${decorId}`;
    setSelectedLinks(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
    setHasChanges(true);
  };

  // Sauvegarder les modifications pour le catalogue actif
  const saveChanges = async () => {
    if (!activeCatalog) return;
    
    setIsSaving(true);
    try {
      // Récupérer les liens actuels du catalogue
      const currentLinks = Array.from(selectedLinks)
        .filter(key => key.startsWith(`${activeCatalog}:`))
        .map(key => key.split(":")[1]);

      // Supprimer tous les liens existants pour ce catalogue
      const { error: deleteError } = await supabase
        .from("catalog_decor_links")
        .delete()
        .eq("catalog_id", activeCatalog);

      if (deleteError) throw deleteError;

      // Insérer les nouveaux liens
      if (currentLinks.length > 0) {
        const newLinks = currentLinks.map((decorId, index) => ({
          catalog_id: activeCatalog,
          decor_id: decorId,
          display_order: index,
        }));

        const { error: insertError } = await supabase
          .from("catalog_decor_links")
          .insert(newLinks);

        if (insertError) throw insertError;
      }

      toast.success(`Catalogue mis à jour (${currentLinks.length} décors)`);
      setHasChanges(false);
      
      // Recharger les données
      await loadData();
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  // Sélectionner tous les décors d'une catégorie
  const selectAllCategory = (category: string) => {
    const categoryDecors = decors.filter(d => d.category.toLowerCase() === category.toLowerCase());
    setSelectedLinks(prev => {
      const next = new Set(prev);
      categoryDecors.forEach(d => next.add(`${activeCatalog}:${d.id}`));
      return next;
    });
    setHasChanges(true);
  };

  // Désélectionner tous les décors d'une catégorie
  const deselectAllCategory = (category: string) => {
    const categoryDecors = decors.filter(d => d.category.toLowerCase() === category.toLowerCase());
    setSelectedLinks(prev => {
      const next = new Set(prev);
      categoryDecors.forEach(d => next.delete(`${activeCatalog}:${d.id}`));
      return next;
    });
    setHasChanges(true);
  };

  // Filtrer les décors par recherche
  const filteredDecors = decors.filter(d => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = d.name.toLowerCase().includes(query) || 
           d.reference_code.toLowerCase().includes(query) ||
           d.category.toLowerCase().includes(query);
    const matchesCategory = categoryFilter === "all" || d.category.toLowerCase() === categoryFilter.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  // Extraire toutes les catégories uniques
  const allCategories = [...new Set(decors.map(d => d.category))].sort((a, b) => a.localeCompare(b));

  // Grouper par catégorie
  const decorsByCategory = filteredDecors.reduce((acc, decor) => {
    const cat = decor.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(decor);
    return acc;
  }, {} as Record<string, Decor[]>);

  // Compter les décors sélectionnés pour le catalogue actif
  const selectedCount = Array.from(selectedLinks).filter(k => k.startsWith(`${activeCatalog}:`)).length;

  // Grouper les catalogues par type de projet
  const catalogsByProject = catalogs.reduce((acc, catalog) => {
    const pt = catalog.project_type;
    if (!acc[pt]) acc[pt] = [];
    acc[pt].push(catalog);
    return acc;
  }, {} as Record<string, Catalog[]>);

  const projectTypeLabels: Record<string, string> = {
    ascenseur: "Ascenseur",
    van: "Van",
    terrasse: "Terrasse",
    autre: "Autre",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Gestion des Catalogues Contextualisés
            {hasChanges && (
              <Badge variant="destructive" className="animate-pulse">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Modifications non sauvegardées
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Assignez les décors aux catalogues par type de projet. 
            Chaque type de projet affiche uniquement ses catalogues dédiés.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Sélection du catalogue */}
          <div className="mb-6">
            <Tabs value={activeCatalog} onValueChange={setActiveCatalog}>
              <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${catalogs.length}, 1fr)` }}>
                {Object.entries(catalogsByProject).map(([projectType, projectCatalogs]) => (
                  projectCatalogs.map((catalog) => (
                    <TabsTrigger key={catalog.id} value={catalog.id} className="text-xs sm:text-sm">
                      <span className="hidden sm:inline">{projectTypeLabels[projectType]}: </span>
                      {catalog.label}
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {Array.from(selectedLinks).filter(k => k.startsWith(`${catalog.id}:`)).length}
                      </Badge>
                    </TabsTrigger>
                  ))
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Barre d'actions */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un décor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {allCategories.map(cat => (
                  <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={saveChanges} 
              disabled={!hasChanges || isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Sauvegarder ({selectedCount} décors)
            </Button>
          </div>

          {/* Info catalogue actif */}
          {activeCatalog && catalogs.find(c => c.id === activeCatalog) && (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Catalogue:</strong> {catalogs.find(c => c.id === activeCatalog)?.label} • 
                <strong className="ml-2">Projet:</strong> {projectTypeLabels[catalogs.find(c => c.id === activeCatalog)?.project_type || '']} •
                <strong className="ml-2">Description:</strong> {catalogs.find(c => c.id === activeCatalog)?.description || 'Aucune'}
              </p>
            </div>
          )}

          {/* Liste des décors par catégorie */}
          <div className="space-y-6">
            {Object.entries(decorsByCategory).map(([category, categoryDecors]) => {
              const selectedInCategory = categoryDecors.filter(d => 
                selectedLinks.has(`${activeCatalog}:${d.id}`)
              ).length;
              const allSelected = selectedInCategory === categoryDecors.length;

              return (
                <div key={category} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold capitalize">{category}</h3>
                      <Badge variant="outline">
                        {selectedInCategory} / {categoryDecors.length} sélectionnés
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => selectAllCategory(category)}
                        disabled={allSelected}
                      >
                        Tout sélectionner
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deselectAllCategory(category)}
                        disabled={selectedInCategory === 0}
                      >
                        Tout désélectionner
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {categoryDecors.map((decor) => {
                      const isSelected = selectedLinks.has(`${activeCatalog}:${decor.id}`);
                      const handleToggle = () => toggleLink(activeCatalog, decor.id);
                      return (
                        <div
                          key={decor.id}
                          role="button"
                          tabIndex={0}
                          aria-pressed={isSelected}
                          aria-label={`${isSelected ? 'Désélectionner' : 'Sélectionner'} ${decor.name}`}
                          className={`relative rounded-lg border-2 transition-all cursor-pointer overflow-hidden ${
                            isSelected
                              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                              : 'border-transparent hover:border-muted-foreground/30'
                          }`}
                          onClick={handleToggle}
                          onKeyDown={(e) => onActivateKeyDown(e, handleToggle)}
                        >
                          <div className="aspect-square relative">
                            <img
                              src={decor.texture_image_url}
                              alt={decor.name}
                              className="w-full h-full object-cover"
                            />
                            {isSelected && (
                              <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                                <CheckCircle className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                          <div className="p-2 bg-background">
                            <p className="text-xs font-medium truncate">{decor.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{decor.reference_code}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredDecors.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Aucun décor trouvé pour "{searchQuery}"
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
