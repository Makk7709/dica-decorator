/**
 * Hook optimisé pour la gestion des décors avec React Query
 * Cache global pour éviter les rechargements répétés
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Decor {
  id: string;
  name: string;
  reference_code: string;
  texture_image_url: string;
  usage_contexts: string[];
  category: string;
  is_active: boolean;
}

// Clé de cache pour les décors
const DECORS_QUERY_KEY = "decors";

// Fonction de fetch des décors
const fetchDecors = async (): Promise<Decor[]> => {
  const { data, error } = await supabase
    .from("decors")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
};

/**
 * Hook pour récupérer tous les décors actifs avec cache long
 * Les décors changent rarement, donc on peut les garder en cache longtemps
 */
export const useDecors = () => {
  return useQuery({
    queryKey: [DECORS_QUERY_KEY],
    queryFn: fetchDecors,
    staleTime: 1000 * 60 * 30, // 30 minutes - les décors changent rarement
    gcTime: 1000 * 60 * 60, // 1 heure en cache
  });
};

/**
 * Hook pour récupérer les décors filtrés par contexte d'usage
 */
export const useDecorsByContext = (usageContext: string) => {
  const { data: allDecors, ...rest } = useDecors();
  
  const filteredDecors = allDecors?.filter(
    (decor) => decor.usage_contexts.includes(usageContext)
  );
  
  return { data: filteredDecors, ...rest };
};

/**
 * Hook pour récupérer les décors par catégorie
 */
export const useDecorsByCategory = (category: string) => {
  const { data: allDecors, ...rest } = useDecors();
  
  const filteredDecors = allDecors?.filter(
    (decor) => decor.category === category
  );
  
  return { data: filteredDecors, ...rest };
};