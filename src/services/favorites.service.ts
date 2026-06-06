/**
 * @fileoverview Service de gestion des favoris de rendus
 * 
 * Fournit une interface complète pour gérer les favoris avec:
 * - Récupération avec métadonnées complètes
 * - Filtrage et tri
 * - Statistiques
 * - Intégration brochures/magazine
 * - Groupement par projet/date/type
 * 
 * @author KOREV AI
 * @date Décembre 2024
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/integrations/supabase/types';

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Rendu favori avec toutes ses relations
 */
export interface FavoriteRender {
  id: string;
  userId: string;
  renderId: string;
  createdAt: Date;
  render: {
    id: string;
    resultImageUrl: string;
    createdAt: Date;
    projectId: string;
    photoId: string | null;
    decorId: string | null;
    photo: {
      id: string;
      originalImageUrl: string;
    } | null;
    decor: {
      id: string;
      name: string;
      referenceCode: string;
      textureUrl: string;
    } | null;
    project: {
      id: string;
      title: string;
      useCase: string;
    };
    isCreativeImport?: boolean;
  };
}

/**
 * Filtres de recherche pour les favoris
 */
export interface FavoritesFilter {
  type?: 'decor' | 'creative' | 'all';
  projectId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Statistiques sur les favoris
 */
export interface FavoritesStats {
  total: number;
  byType: {
    decor: number;
    creative: number;
  };
  byProject: Record<string, number>;
  recentCount: number; // Dernières 7 jours
}

/**
 * Favoris groupés
 */
export interface FavoritesGrouped {
  [key: string]: FavoriteRender[];
}

/**
 * Format d'export pour brochures/magazine
 */
export interface FavoriteExportImage {
  id: string;
  url: string;
  originalUrl?: string;
  decorId?: string;
  decorName?: string;
  decorCode: string;
  createdAt: Date;
  isHighResolution: boolean;
  isFavorite: boolean;
}

/**
 * Résultat de service
 */
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// Service Class
// ============================================================================

export class FavoritesService {
  public supabase: SupabaseClient<Database>;

  constructor(supabase: SupabaseClient<Database>) {
    if (!supabase) {
      throw new Error('Supabase client is required');
    }
    this.supabase = supabase;
  }

  /**
   * Récupère tous les favoris d'un utilisateur
   */
  async getAllFavorites(userId: string): Promise<ServiceResult<FavoriteRender[]>> {
    try {
      const { data, error } = await this.supabase
        .from('render_favorites')
        .select(`
          id,
          user_id,
          render_result_id,
          created_at,
          render_results!inner (
            id,
            result_image_url,
            created_at,
            project_photo_id,
            decor_id,
            project_photos (
              id,
              original_image_url,
              project_id,
              projects (
                id,
                title,
                use_case
              )
            ),
            decors (
              id,
              name,
              reference_code,
              texture_image_url
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[FavoritesService] Get all favorites error:', error);
        return { success: false, error: error.message };
      }

      // Formater les données
      const favorites: FavoriteRender[] = (data || []).map((fav: any) => {
        const render = fav.render_results;
        const photo = render.project_photos;
        const project = photo?.projects;
        
        return {
          id: fav.id,
          userId: fav.user_id,
          renderId: fav.render_result_id,
          createdAt: new Date(fav.created_at),
          render: {
            id: render.id,
            resultImageUrl: render.result_image_url,
            createdAt: new Date(render.created_at),
            projectId: photo?.project_id || '',
            photoId: render.project_photo_id,
            decorId: render.decor_id,
            photo: photo ? {
              id: photo.id,
              originalImageUrl: photo.original_image_url,
            } : null,
            decor: render.decors ? {
              id: render.decors.id,
              name: render.decors.name,
              referenceCode: render.decors.reference_code,
              textureUrl: render.decors.texture_image_url,
            } : null,
            project: project ? {
              id: project.id,
              title: project.title,
              useCase: project.use_case,
            } : { id: '', title: 'Projet inconnu', useCase: '' },
            // Creative import = pas de décor (render généré par IA)
            isCreativeImport: !render.decor_id,
          },
        };
      });

      return { success: true, data: favorites };
    } catch (err) {
      console.error('[FavoritesService] Unexpected error:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  /**
   * Récupère les favoris avec filtres
   */
  async getFavoritesWithFilter(
    userId: string,
    filter: FavoritesFilter = {}
  ): Promise<ServiceResult<FavoriteRender[]>> {
    const result = await this.getAllFavorites(userId);
    
    if (!result.success || !result.data) {
      return result;
    }

    let filtered = result.data;

    // Filtrer par type
    if (filter.type && filter.type !== 'all') {
      filtered = filtered.filter(fav => {
        if (filter.type === 'decor') {
          return fav.render.decorId !== null;
        } else if (filter.type === 'creative') {
          return fav.render.isCreativeImport === true;
        }
        return true;
      });
    }

    // Filtrer par projet
    if (filter.projectId) {
      filtered = filtered.filter(fav => fav.render.projectId === filter.projectId);
    }

    // Filtrer par date
    if (filter.dateFrom) {
      filtered = filtered.filter(fav => fav.createdAt >= filter.dateFrom);
    }
    if (filter.dateTo) {
      filtered = filtered.filter(fav => fav.createdAt <= filter.dateTo);
    }

    // Pagination
    if (filter.offset !== undefined || filter.limit !== undefined) {
      const offset = filter.offset || 0;
      const limit = filter.limit || filtered.length;
      filtered = filtered.slice(offset, offset + limit);
    }

    return { success: true, data: filtered };
  }

  /**
   * Calcule des statistiques sur les favoris
   */
  async getFavoritesStats(userId: string): Promise<ServiceResult<FavoritesStats>> {
    const result = await this.getAllFavorites(userId);
    
    if (!result.success || !result.data) {
      return { 
        success: false, 
        error: result.error,
      };
    }

    const favorites = result.data;
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats: FavoritesStats = {
      total: favorites.length,
      byType: {
        decor: favorites.filter(f => f.render.decorId !== null).length,
        creative: favorites.filter(f => f.render.isCreativeImport === true).length,
      },
      byProject: {},
      recentCount: favorites.filter(f => f.createdAt >= sevenDaysAgo).length,
    };

    // Compter par projet
    favorites.forEach(fav => {
      const projectId = fav.render.projectId;
      stats.byProject[projectId] = (stats.byProject[projectId] || 0) + 1;
    });

    return { success: true, data: stats };
  }

  /**
   * Groupe les favoris par critère
   */
  async getFavoritesGrouped(
    userId: string,
    groupBy: 'project' | 'date' | 'type'
  ): Promise<ServiceResult<FavoritesGrouped>> {
    const result = await this.getAllFavorites(userId);
    
    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    const favorites = result.data;
    const grouped: FavoritesGrouped = {};

    favorites.forEach(fav => {
      let key: string;

      switch (groupBy) {
        case 'project':
          key = fav.render.projectId;
          break;
        case 'date':
          // Grouper par jour
          key = fav.createdAt.toISOString().split('T')[0];
          break;
        case 'type':
          key = fav.render.isCreativeImport ? 'creative' : 'decor';
          break;
        default:
          key = 'other';
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(fav);
    });

    return { success: true, data: grouped };
  }

  /**
   * Récupère les favoris formatés pour export brochure/magazine
   */
  async getFavoritesForExport(
    userId: string,
    exportType: 'brochure' | 'magazine'
  ): Promise<ServiceResult<FavoriteExportImage[]>> {
    const result = await this.getAllFavorites(userId);
    
    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    const exportImages: FavoriteExportImage[] = result.data.map(fav => ({
      id: fav.render.id,
      url: fav.render.resultImageUrl,
      originalUrl: fav.render.photo?.originalImageUrl,
      decorId: fav.render.decorId || undefined,
      decorName: fav.render.decor?.name,
      decorCode: fav.render.decor?.referenceCode || 'ASSISTANT_IA',
      createdAt: fav.render.createdAt,
      isHighResolution: true,
      isFavorite: true,
    }));

    return { success: true, data: exportImages };
  }

  /**
   * Supprime un favori
   */
  async removeFavorite(userId: string, favoriteId: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await this.supabase
        .from('render_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('id', favoriteId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Supprime plusieurs favoris en une fois
   */
  async bulkRemoveFavorites(userId: string, favoriteIds: string[]): Promise<ServiceResult<void>> {
    try {
      const { error } = await this.supabase
        .from('render_favorites')
        .delete()
        .eq('user_id', userId)
        .in('id', favoriteIds);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }
}

/**
 * Factory function pour créer une instance du service
 */
export function createFavoritesService(supabase: SupabaseClient<Database>): FavoritesService {
  return new FavoritesService(supabase);
}

export default FavoritesService;
