/**
 * Hook pour la gestion des catalogues contextualisés par type de projet
 * Remplace l'ancienne logique par catégorie (metal/bois/marbre...)
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Types de catalogue
export type CatalogCode = 
  | 'elevator_walls' 
  | 'elevator_floors' 
  | 'van_evasion' 
  | 'terrace_compact' 
  | 'other_all';

export type ProjectType = 'ascenseur' | 'van' | 'terrasse' | 'autre';

export interface Catalog {
  id: string;
  code: CatalogCode;
  label: string;
  description: string | null;
  project_type: ProjectType;
  display_order: number;
  is_active: boolean;
}

export interface CatalogDecor {
  id: string;
  name: string;
  reference_code: string;
  texture_image_url: string;
  category: string;
  display_order?: number;
}

// Clés de cache
const CATALOGS_QUERY_KEY = "catalogs";
const CATALOG_DECORS_QUERY_KEY = "catalog-decors";

/**
 * Récupère les catalogues disponibles pour un type de projet
 */
const fetchCatalogsByProjectType = async (projectType: ProjectType): Promise<Catalog[]> => {
  const { data, error } = await supabase
    .from("catalogs")
    .select("*")
    .eq("project_type", projectType)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) throw error;
  return data || [];
};

/**
 * Récupère les décors d'un catalogue spécifique
 */
const fetchDecorsByCatalog = async (catalogId: string): Promise<CatalogDecor[]> => {
  // Récupérer les liens du catalogue
  const { data: links, error: linksError } = await supabase
    .from("catalog_decor_links")
    .select("decor_id, display_order")
    .eq("catalog_id", catalogId)
    .order("display_order", { ascending: true });

  if (linksError) throw linksError;
  if (!links || links.length === 0) return [];

  // Récupérer les décors correspondants
  const decorIds = links.map(l => l.decor_id);
  const { data: decors, error: decorsError } = await supabase
    .from("decors")
    .select("id, name, reference_code, texture_image_url, category")
    .in("id", decorIds)
    .eq("is_active", true);

  if (decorsError) throw decorsError;

  // Créer une map pour l'ordre d'affichage
  const orderMap = new Map(links.map(l => [l.decor_id, l.display_order]));
  
  // Mapper et trier les décors selon l'ordre du catalogue
  return (decors || [])
    .map(decor => ({
      id: decor.id,
      name: decor.name,
      reference_code: decor.reference_code,
      texture_image_url: decor.texture_image_url,
      category: decor.category,
      display_order: orderMap.get(decor.id) || 0,
    }))
    .sort((a, b) => a.display_order - b.display_order);
};

/**
 * Hook pour récupérer les catalogues par type de projet
 */
export const useCatalogsByProjectType = (projectType: ProjectType) => {
  return useQuery({
    queryKey: [CATALOGS_QUERY_KEY, projectType],
    queryFn: () => fetchCatalogsByProjectType(projectType),
    staleTime: 1000 * 60 * 10, // 10 minutes - les catalogues changent rarement
    gcTime: 1000 * 60 * 30, // 30 minutes en cache
    enabled: !!projectType,
  });
};

/**
 * Hook pour récupérer les décors d'un catalogue
 */
export const useDecorsByCatalog = (catalogId: string | null) => {
  return useQuery({
    queryKey: [CATALOG_DECORS_QUERY_KEY, catalogId],
    queryFn: () => fetchDecorsByCatalog(catalogId),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes en cache
    enabled: !!catalogId,
  });
};

/**
 * Hook combiné : récupère tous les catalogues et leurs décors pour un type de projet
 * Optimisé pour charger tout d'un coup
 */
export const useCatalogsWithDecors = (projectType: ProjectType) => {
  const { data: catalogs, isLoading: catalogsLoading, error: catalogsError } = useCatalogsByProjectType(projectType);
  
  // Récupérer tous les décors pour tous les catalogues en parallèle
  const catalogIds = catalogs?.map(c => c.id) || [];
  
  const decorsQueries = useQuery({
    queryKey: [CATALOG_DECORS_QUERY_KEY, 'all', projectType, catalogIds],
    queryFn: async () => {
      if (!catalogIds.length) return {};
      
      const results = await Promise.all(
        catalogIds.map(async (catalogId) => {
          const decors = await fetchDecorsByCatalog(catalogId);
          return { catalogId, decors };
        })
      );
      
      // Transformer en map catalogId -> decors
      return results.reduce((acc, { catalogId, decors }) => {
        acc[catalogId] = decors;
        return acc;
      }, {} as Record<string, CatalogDecor[]>);
    },
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    enabled: catalogIds.length > 0,
  });

  return {
    catalogs: catalogs || [],
    decorsByCatalog: decorsQueries.data || {},
    isLoading: catalogsLoading || decorsQueries.isLoading,
    error: catalogsError || decorsQueries.error,
  };
};

/**
 * Vérifie si un type de projet a des catalogues configurés
 */
export const hasConfiguredCatalogs = (catalogs: Catalog[], decorsByCatalog: Record<string, CatalogDecor[]>): boolean => {
  return catalogs.some(catalog => (decorsByCatalog[catalog.id]?.length || 0) > 0);
};
