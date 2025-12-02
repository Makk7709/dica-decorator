/**
 * @fileoverview Service de suppression sécurisée de projets
 * Processus de sécurité strict avec validation de propriétaire,
 * logs de sécurité et gestion d'erreurs
 * 
 * @author KOREV AI pour DICA France
 * @date Décembre 2025
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface ProjectDeletionValidation {
  isValid: boolean;
  isOwner: boolean;
  error?: ProjectDeletionError;
  projectTitle?: string;
}

export interface ProjectDeletionStats {
  photosCount: number;
  rendersCount: number;
  totalItemsToDelete: number;
}

export interface ProjectDeletionResult {
  success: boolean;
  deletedProjectId?: string;
  deletedStats?: ProjectDeletionStats;
  error?: ProjectDeletionError;
}

export class ProjectDeletionError extends Error {
  constructor(
    message: string,
    public code: 'NOT_AUTHENTICATED' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'VALIDATION_ERROR' | 'DELETION_ERROR' | 'NETWORK_ERROR',
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ProjectDeletionError';
  }
}

// ============================================================================
// Service
// ============================================================================

export class ProjectDeletionService {
  private static instance: ProjectDeletionService;
  
  private constructor() {}
  
  static getInstance(): ProjectDeletionService {
    if (!this.instance) {
      this.instance = new ProjectDeletionService();
    }
    return this.instance;
  }

  /**
   * Valide la propriété du projet par l'utilisateur actuel
   */
  async validateProjectOwnership(projectId: string): Promise<ProjectDeletionValidation> {
    try {
      // Validation de base
      if (!projectId || projectId.trim() === '') {
        return {
          isValid: false,
          isOwner: false,
          error: new ProjectDeletionError(
            'Project ID is required',
            'VALIDATION_ERROR'
          ),
        };
      }

      // Vérification format UUID basique
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(projectId)) {
        return {
          isValid: false,
          isOwner: false,
          error: new ProjectDeletionError(
            'Invalid project ID format',
            'VALIDATION_ERROR'
          ),
        };
      }

      // Récupérer l'utilisateur actuel
      const { data: authData, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authData.user) {
        return {
          isValid: false,
          isOwner: false,
          error: new ProjectDeletionError(
            'User not authenticated',
            'NOT_AUTHENTICATED',
            { authError: authError?.message }
          ),
        };
      }

      const userId = authData.user.id;

      // Récupérer le projet
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, user_id, title')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        return {
          isValid: false,
          isOwner: false,
          error: new ProjectDeletionError(
            'Project not found',
            'NOT_FOUND',
            { projectError: projectError?.message }
          ),
        };
      }

      // Vérifier la propriété
      const isOwner = project.user_id === userId;

      if (!isOwner) {
        return {
          isValid: false,
          isOwner: false,
          error: new ProjectDeletionError(
            'You are not authorized to delete this project',
            'UNAUTHORIZED',
            { projectUserId: project.user_id, currentUserId: userId }
          ),
        };
      }

      return {
        isValid: true,
        isOwner: true,
        projectTitle: project.title,
      };

    } catch (error: any) {
      return {
        isValid: false,
        isOwner: false,
        error: new ProjectDeletionError(
          `Validation error: ${error.message}`,
          'VALIDATION_ERROR',
          { originalError: error.message }
        ),
      };
    }
  }

  /**
   * Récupère les statistiques de suppression (nombre de données liées)
   */
  async getProjectDeletionStats(projectId: string): Promise<ProjectDeletionStats> {
    try {
      // Compter les photos
      const { data: photos = [], error: photosError } = await supabase
        .from('project_photos')
        .select('id')
        .eq('project_id', projectId);

      if (photosError) {
        console.warn('Error counting photos:', photosError);
      }

      // Compter les rendus (via les photos)
      let rendersCount = 0;
      
      if (photos.length > 0) {
        // Compter les rendus pour chaque photo (plus simple que .in() pour les mocks)
        for (const photo of photos) {
          const { data: renders = [], error: rendersError } = await supabase
            .from('render_results')
            .select('id')
            .eq('project_photo_id', photo.id);

          if (rendersError) {
            console.warn('Error counting renders:', rendersError);
          } else {
            rendersCount += renders.length;
          }
        }
      }

      const photosCount = photos.length;

      return {
        photosCount,
        rendersCount,
        totalItemsToDelete: photosCount + rendersCount,
      };

    } catch (error: any) {
      console.error('Error getting deletion stats:', error);
      return {
        photosCount: 0,
        rendersCount: 0,
        totalItemsToDelete: 0,
      };
    }
  }

  /**
   * Supprime un projet avec tous les processus de sécurité
   */
  async deleteProject(projectId: string): Promise<ProjectDeletionResult> {
    try {
      // 1. Validation de propriété
      const validation = await this.validateProjectOwnership(projectId);
      
      if (!validation.isValid || !validation.isOwner) {
        return {
          success: false,
          error: validation.error || new ProjectDeletionError(
            'Validation failed',
            'VALIDATION_ERROR'
          ),
        };
      }

      // 2. Récupérer les stats avant suppression
      const stats = await this.getProjectDeletionStats(projectId);

      // 3. Log de sécurité
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id || 'unknown';
      
      console.log(
        `🔒 Security: Project deletion initiated`,
        `Project: ${projectId}`,
        `User: ${userId}`,
        `Stats: ${stats.totalItemsToDelete} items to delete`
      );

      // 4. Suppression du projet (CASCADE supprimera automatiquement les données liées)
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (deleteError) {
        console.error('❌ Project deletion error:', deleteError);
        
        return {
          success: false,
          error: new ProjectDeletionError(
            `Failed to delete project: ${deleteError.message}`,
            'DELETION_ERROR',
            { deleteError: deleteError.message, stats }
          ),
        };
      }

      // 5. Log de succès
      console.log(
        `✅ Security: Project deleted successfully`,
        `Project: ${projectId}`,
        `User: ${userId}`,
        `Deleted: ${stats.totalItemsToDelete} related items`
      );

      return {
        success: true,
        deletedProjectId: projectId,
        deletedStats: stats,
      };

    } catch (error: any) {
      console.error('❌ Unexpected error during project deletion:', error);
      
      return {
        success: false,
        error: new ProjectDeletionError(
          `Unexpected error: ${error.message}`,
          'NETWORK_ERROR',
          { originalError: error.message }
        ),
      };
    }
  }

  /**
   * Vérifie si un projet peut être supprimé (permissions + existence)
   */
  async canDeleteProject(projectId: string): Promise<boolean> {
    const validation = await this.validateProjectOwnership(projectId);
    return validation.isValid && validation.isOwner;
  }
}

// Export singleton instance
export const projectDeletionService = ProjectDeletionService.getInstance();

