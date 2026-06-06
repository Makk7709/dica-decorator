/**
 * @fileoverview Service de renommage sécurisé de projets
 * Processus de sécurité strict avec validation de propriétaire,
 * validation du titre et logs de sécurité
 * 
 * @author KOREV AI pour DICA France
 * @date Décembre 2025
 */

import { supabase } from '@/integrations/supabase/client';
import { getErrorMessage } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface ProjectRenameValidation {
  isValid: boolean;
  isOwner: boolean;
  error?: ProjectRenameError;
  currentTitle?: string;
}

export interface TitleValidation {
  isValid: boolean;
  error?: ProjectRenameError;
}

export interface ProjectRenameResult {
  success: boolean;
  newTitle?: string;
  error?: ProjectRenameError;
}

export class ProjectRenameError extends Error {
  constructor(
    message: string,
    public code: 'NOT_AUTHENTICATED' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'VALIDATION_ERROR' | 'UPDATE_ERROR' | 'NETWORK_ERROR',
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ProjectRenameError';
  }
}

// ============================================================================
// Constants
// ============================================================================

const MIN_TITLE_LENGTH = 1;
const MAX_TITLE_LENGTH = 200;

// ============================================================================
// Service
// ============================================================================

export class ProjectRenameService {
  private static instance: ProjectRenameService;
  
  private constructor() {}
  
  static getInstance(): ProjectRenameService {
    if (!this.instance) {
      this.instance = new ProjectRenameService();
    }
    return this.instance;
  }

  /**
   * Valide le format du nouveau titre
   */
  validateTitle(title: string): TitleValidation {
    // Trim pour validation
    const trimmedTitle = title.trim();
    
    // Vérification longueur minimale
    if (trimmedTitle.length < MIN_TITLE_LENGTH) {
      return {
        isValid: false,
        error: new ProjectRenameError(
          'Le titre ne peut pas être vide',
          'VALIDATION_ERROR',
          { minLength: MIN_TITLE_LENGTH }
        ),
      };
    }
    
    // Vérification longueur maximale
    if (trimmedTitle.length > MAX_TITLE_LENGTH) {
      return {
        isValid: false,
        error: new ProjectRenameError(
          `Le titre ne peut pas dépasser ${MAX_TITLE_LENGTH} caractères`,
          'VALIDATION_ERROR',
          { maxLength: MAX_TITLE_LENGTH, currentLength: trimmedTitle.length }
        ),
      };
    }
    
    return {
      isValid: true,
    };
  }

  /**
   * Valide la propriété du projet par l'utilisateur actuel
   */
  async validateProjectOwnership(projectId: string): Promise<ProjectRenameValidation> {
    try {
      // Validation de base
      if (!projectId || projectId.trim() === '') {
        return {
          isValid: false,
          isOwner: false,
          error: new ProjectRenameError(
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
          error: new ProjectRenameError(
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
          error: new ProjectRenameError(
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
          error: new ProjectRenameError(
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
          error: new ProjectRenameError(
            'You are not authorized to rename this project',
            'UNAUTHORIZED',
            { projectUserId: project.user_id, currentUserId: userId }
          ),
        };
      }

      return {
        isValid: true,
        isOwner: true,
        currentTitle: project.title,
      };

    } catch (error: unknown) {
      return {
        isValid: false,
        isOwner: false,
        error: new ProjectRenameError(
          `Validation error: ${getErrorMessage(error)}`,
          'VALIDATION_ERROR',
          { originalError: getErrorMessage(error) }
        ),
      };
    }
  }

  /**
   * Renomme un projet avec tous les processus de sécurité
   */
  async renameProject(projectId: string, newTitle: string): Promise<ProjectRenameResult> {
    try {
      // 1. Validation du titre
      const titleValidation = this.validateTitle(newTitle);
      if (!titleValidation.isValid) {
        return {
          success: false,
          error: titleValidation.error,
        };
      }

      // Trim le titre pour la sauvegarde
      const trimmedTitle = newTitle.trim();

      // 2. Validation de propriété
      const validation = await this.validateProjectOwnership(projectId);
      
      if (!validation.isValid || !validation.isOwner) {
        return {
          success: false,
          error: validation.error || new ProjectRenameError(
            'Validation failed',
            'VALIDATION_ERROR'
          ),
        };
      }

      const oldTitle = validation.currentTitle || 'Unknown';

      // 3. Log de sécurité
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id || 'unknown';
      
      console.log(
        `🔒 Security: Project rename initiated`,
        `Project: ${projectId}`,
        `User: ${userId}`,
        `Old: "${oldTitle}" → New: "${trimmedTitle}"`
      );

      // 4. Mise à jour du projet
      const { data: updatedProject, error: updateError } = await supabase
        .from('projects')
        .update({ 
          title: trimmedTitle,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Project rename error:', updateError);
        
        return {
          success: false,
          error: new ProjectRenameError(
            `Failed to rename project: ${updateError.message}`,
            'UPDATE_ERROR',
            { updateError: updateError.message }
          ),
        };
      }

      // 5. Log de succès
      console.log(
        `✅ Security: Project renamed successfully`,
        `Project: ${projectId}`,
        `User: ${userId}`
      );

      return {
        success: true,
        newTitle: trimmedTitle,
      };

    } catch (error: unknown) {
      console.error('❌ Unexpected error during project rename:', error);
      
      return {
        success: false,
        error: new ProjectRenameError(
          `Unexpected error: ${getErrorMessage(error)}`,
          'NETWORK_ERROR',
          { originalError: getErrorMessage(error) }
        ),
      };
    }
  }

  /**
   * Vérifie si un projet peut être renommé (permissions + existence)
   */
  async canRenameProject(projectId: string): Promise<boolean> {
    const validation = await this.validateProjectOwnership(projectId);
    return validation.isValid && validation.isOwner;
  }
}

// Export singleton instance
export const projectRenameService = ProjectRenameService.getInstance();

