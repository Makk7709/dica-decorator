/**
 * @fileoverview Admin Project Viewer Service
 * 
 * Service permettant aux administrateurs de visualiser les projets
 * des revendeurs/utilisateurs enregistrés.
 * 
 * Features:
 * - Vérification du rôle admin avant chaque opération
 * - Liste des projets d'un utilisateur spécifique
 * - Détails complets d'un projet avec photos et rendus
 * - Gestion des créations Assistant IA (renders sans decor_id)
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface UserInfo {
  id: string;
  email: string;
  fullName: string;
  companyName: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface ProjectSummary {
  id: string;
  title: string;
  useCase: string;
  clientReference: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProjectSummary {
  user: UserInfo;
  totalProjects: number;
  projects: ProjectSummary[];
}

export interface DecorInfo {
  id: string;
  name: string;
  referenceCode: string;
  category: string;
}

export interface RenderInfo {
  id: string;
  resultImageUrl: string;
  decor: DecorInfo | null;
  isCreativeImport: boolean;
  createdAt: Date;
}

export interface PhotoWithRenders {
  id: string;
  originalImageUrl: string;
  createdAt: Date;
  renders: RenderInfo[];
}

export interface ProjectWithRenders {
  id: string;
  title: string;
  useCase: string;
  clientReference: string | null;
  createdAt: Date;
  updatedAt: Date;
  photos: PhotoWithRenders[];
  totalPhotos: number;
  totalRenders: number;
}

export interface UserProjectDetails extends UserProjectSummary {
  projectDetails?: ProjectWithRenders;
}

// ============================================================================
// Custom Errors
// ============================================================================

export class AdminProjectViewerError extends Error {
  public readonly originalError?: any;

  constructor(message: string, originalError?: any) {
    super(message);
    this.name = 'AdminProjectViewerError';
    this.originalError = originalError;
  }
}

export class UnauthorizedAdminAccessError extends AdminProjectViewerError {
  constructor(message: string = 'Accès administrateur requis pour visualiser les projets des utilisateurs') {
    super(message);
    this.name = 'UnauthorizedAdminAccessError';
  }
}

export class UserNotFoundError extends AdminProjectViewerError {
  constructor(userId: string) {
    super(`Utilisateur non trouvé: ${userId}`);
    this.name = 'UserNotFoundError';
  }
}

export class ProjectNotFoundError extends AdminProjectViewerError {
  constructor(projectId: string) {
    super(`Projet non trouvé: ${projectId}`);
    this.name = 'ProjectNotFoundError';
  }
}

// ============================================================================
// Service Implementation
// ============================================================================

export class AdminProjectViewerService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Vérifie que l'utilisateur actuel est un admin
   * @throws {UnauthorizedAdminAccessError} Si l'utilisateur n'est pas admin
   */
  private async verifyAdminRole(adminUserId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', adminUserId)
      .single();

    if (error) {
      throw new AdminProjectViewerError('Erreur lors de la vérification du rôle', error);
    }

    if (!data || data.role !== 'admin') {
      throw new UnauthorizedAdminAccessError();
    }
  }

  /**
   * Récupère la liste des projets d'un utilisateur
   * @param adminUserId - ID de l'admin qui fait la requête
   * @param targetUserId - ID de l'utilisateur dont on veut voir les projets
   * @returns Résumé de l'utilisateur avec sa liste de projets
   */
  async getUserProjects(adminUserId: string, targetUserId: string): Promise<UserProjectSummary> {
    // 1. Vérifier le rôle admin
    await this.verifyAdminRole(adminUserId);

    // 2. Récupérer le profil de l'utilisateur cible
    const { data: profileData, error: profileError } = await this.supabase
      .from('profiles')
      .select('id, email, first_name, last_name, company_name, is_active, created_at')
      .eq('id', targetUserId)
      .single();

    if (profileError || !profileData) {
      throw new UserNotFoundError(targetUserId);
    }

    // 3. Récupérer les projets de l'utilisateur
    const { data: projectsData, error: projectsError } = await this.supabase
      .from('projects')
      .select('id, title, use_case, client_reference, created_at, updated_at')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    if (projectsError) {
      throw new AdminProjectViewerError('Erreur lors de la récupération des projets', projectsError);
    }

    // 4. Formater et retourner les données
    const fullName = profileData.first_name && profileData.last_name
      ? `${profileData.first_name} ${profileData.last_name}`
      : profileData.email;

    const user: UserInfo = {
      id: profileData.id,
      email: profileData.email || '',
      fullName,
      companyName: profileData.company_name,
      isActive: profileData.is_active,
      createdAt: new Date(profileData.created_at),
    };

    const projects: ProjectSummary[] = (projectsData || []).map((p: any) => ({
      id: p.id,
      title: p.title,
      useCase: p.use_case,
      clientReference: p.client_reference,
      createdAt: new Date(p.created_at),
      updatedAt: new Date(p.updated_at),
    }));

    return {
      user,
      totalProjects: projects.length,
      projects,
    };
  }

  /**
   * Récupère les détails complets d'un projet avec photos et rendus
   * @param adminUserId - ID de l'admin qui fait la requête
   * @param projectId - ID du projet à visualiser
   * @returns Détails complets du projet
   */
  async getProjectDetails(adminUserId: string, projectId: string): Promise<ProjectWithRenders> {
    // 1. Vérifier le rôle admin
    await this.verifyAdminRole(adminUserId);

    // 2. Récupérer le projet
    const { data: projectData, error: projectError } = await this.supabase
      .from('projects')
      .select('id, title, use_case, client_reference, created_at, updated_at')
      .eq('id', projectId)
      .single();

    if (projectError || !projectData) {
      throw new ProjectNotFoundError(projectId);
    }

    // 3. Récupérer les photos du projet
    const { data: photosData, error: photosError } = await this.supabase
      .from('project_photos')
      .select('id, original_image_url, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (photosError) {
      throw new AdminProjectViewerError('Erreur lors de la récupération des photos', photosError);
    }

    // Si pas de photos, retourner le projet sans rendus
    if (!photosData || photosData.length === 0) {
      return {
        id: projectData.id,
        title: projectData.title,
        useCase: projectData.use_case,
        clientReference: projectData.client_reference,
        createdAt: new Date(projectData.created_at),
        updatedAt: new Date(projectData.updated_at),
        photos: [],
        totalPhotos: 0,
        totalRenders: 0,
      };
    }

    // 4. Récupérer les rendus pour toutes les photos
    const photoIds = photosData.map((p: any) => p.id);
    
    const { data: rendersData, error: rendersError } = await this.supabase
      .from('render_results')
      .select('id, project_photo_id, result_image_url, decor_id, created_at')
      .in('project_photo_id', photoIds)
      .order('created_at', { ascending: false });

    if (rendersError) {
      throw new AdminProjectViewerError('Erreur lors de la récupération des rendus', rendersError);
    }

    // 5. Récupérer les décors utilisés
    const decorIds = (rendersData || [])
      .filter((r: any) => r.decor_id)
      .map((r: any) => r.decor_id);

    const decorsMap: Map<string, DecorInfo> = new Map();

    if (decorIds.length > 0) {
      const { data: decorsData, error: decorsError } = await this.supabase
        .from('decors')
        .select('id, name, reference_code, category')
        .in('id', decorIds);

      if (!decorsError && decorsData) {
        decorsData.forEach((d: any) => {
          decorsMap.set(d.id, {
            id: d.id,
            name: d.name,
            referenceCode: d.reference_code,
            category: d.category,
          });
        });
      }
    }

    // 6. Organiser les données par photo
    const rendersByPhoto: Map<string, RenderInfo[]> = new Map();
    (rendersData || []).forEach((r: any) => {
      const photoId = r.project_photo_id;
      if (!rendersByPhoto.has(photoId)) {
        rendersByPhoto.set(photoId, []);
      }
      
      const decor = r.decor_id ? decorsMap.get(r.decor_id) || null : null;
      const isCreativeImport = r.decor_id === null;

      rendersByPhoto.get(photoId)!.push({
        id: r.id,
        resultImageUrl: r.result_image_url,
        decor,
        isCreativeImport,
        createdAt: new Date(r.created_at),
      });
    });

    // 7. Construire les photos avec leurs rendus
    const photos: PhotoWithRenders[] = photosData.map((p: any) => ({
      id: p.id,
      originalImageUrl: p.original_image_url,
      createdAt: new Date(p.created_at),
      renders: rendersByPhoto.get(p.id) || [],
    }));

    // 8. Calculer les totaux
    const totalRenders = photos.reduce((sum, p) => sum + p.renders.length, 0);

    return {
      id: projectData.id,
      title: projectData.title,
      useCase: projectData.use_case,
      clientReference: projectData.client_reference,
      createdAt: new Date(projectData.created_at),
      updatedAt: new Date(projectData.updated_at),
      photos,
      totalPhotos: photos.length,
      totalRenders,
    };
  }
}

// ============================================================================
// Factory function
// ============================================================================

export const createAdminProjectViewerService = (
  supabase: SupabaseClient
): AdminProjectViewerService => {
  return new AdminProjectViewerService(supabase);
};
