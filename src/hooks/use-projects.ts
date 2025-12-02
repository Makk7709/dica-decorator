/**
 * Hook optimisé pour la gestion des projets avec React Query
 * Permet le cache et la réutilisation des données entre navigations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Project {
  id: string;
  title: string;
  use_case: string;
  client_reference: string | null;
  created_at: string;
}

// Clé de cache pour les projets
const PROJECTS_QUERY_KEY = "projects";

// Fonction de fetch des projets
const fetchProjects = async (userId: string): Promise<Project[]> => {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * Hook pour récupérer les projets avec cache React Query
 */
export const useProjects = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: [PROJECTS_QUERY_KEY, user?.id],
    queryFn: () => fetchProjects(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes - données considérées fraîches
    gcTime: 1000 * 60 * 10, // 10 minutes en cache
  });
};

/**
 * Hook pour créer un projet
 */
export const useCreateProject = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { title: string; use_case: "ascenseur" | "van" | "terrasse" | "autre"; client_reference?: string }) => {
      if (!user?.id) throw new Error("User not authenticated");
      
      const { data: project, error } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          title: data.title,
          use_case: data.use_case,
          client_reference: data.client_reference || null,
        })
        .select()
        .single();

      if (error) throw error;
      return project;
    },
    onSuccess: () => {
      // Invalider le cache pour forcer le rechargement
      queryClient.invalidateQueries({ queryKey: [PROJECTS_QUERY_KEY] });
    },
  });
};

/**
 * Hook pour supprimer un projet
 */
export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => {
      // Mise à jour optimiste du cache
      queryClient.setQueryData<Project[]>(
        [PROJECTS_QUERY_KEY],
        (old) => old?.filter((p) => p.id !== projectId) || []
      );
      toast.success("Projet supprimé");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });
};

/**
 * Hook pour renommer un projet
 */
export const useRenameProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, newTitle }: { projectId: string; newTitle: string }) => {
      const { error } = await supabase
        .from("projects")
        .update({ title: newTitle })
        .eq("id", projectId);

      if (error) throw error;
      return { projectId, newTitle };
    },
    onSuccess: ({ projectId, newTitle }) => {
      // Mise à jour optimiste du cache
      queryClient.setQueryData<Project[]>(
        [PROJECTS_QUERY_KEY],
        (old) => old?.map((p) => p.id === projectId ? { ...p, title: newTitle } : p) || []
      );
      toast.success("Projet renommé");
    },
    onError: () => {
      toast.error("Erreur lors du renommage");
    },
  });
};

/**
 * Précharger les projets (utile pour le prefetch)
 */
export const prefetchProjects = async (queryClient: ReturnType<typeof useQueryClient>, userId: string) => {
  await queryClient.prefetchQuery({
    queryKey: [PROJECTS_QUERY_KEY, userId],
    queryFn: () => fetchProjects(userId),
    staleTime: 1000 * 60 * 2,
  });
};