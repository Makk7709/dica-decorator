/**
 * @fileoverview Presentation - Page de mode présentation fullscreen
 * Slideshow interactif pour présentations commerciales DICA
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { PresentationViewer } from '@/components/ui/presentation-viewer';
import { Slide } from '@/services/presentation.service';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

interface ProjectData {
  id: string;
  name: string;
  photos: Array<{
    id: string;
    original_image_url: string;
    renders: Array<{
      id: string;
      result_image_url: string;
      decor: {
        name: string;
        reference_code: string;
      };
    }>;
  }>;
}

// ============================================================================
// Component
// ============================================================================

const Presentation: React.FC = () => {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Parse URL params for presentation options
  const autoplay = searchParams.get('autoplay') === 'true';
  const interval = parseInt(searchParams.get('interval') || '5000', 10);
  const loop = searchParams.get('loop') !== 'false';
  const thumbnails = searchParams.get('thumbnails') === 'true';

  // Load project data
  useEffect(() => {
    const loadProject = async () => {
      if (!projectId) {
        setError('ID de projet manquant');
        setIsLoading(false);
        return;
      }

      try {
        // Fetch project
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('id, title')
          .eq('id', projectId)
          .single();

        if (projectError) throw projectError;

        // Fetch photos with renders
        const { data: photos, error: photosError } = await supabase
          .from('project_photos')
          .select(`
            id,
            original_image_url,
            render_results (
              id,
              result_image_url,
              decor:decors (
                name,
                reference_code
              )
            )
          `)
          .eq('project_id', projectId);

        if (photosError) throw photosError;

        setProject({
          id: projectData.id,
          name: projectData.title,
          photos: photos?.map(p => ({
            id: p.id,
            original_image_url: p.original_image_url,
            renders: (p.render_results || []).map((r: { id: string; result_image_url: string; decor: unknown }) => ({
              id: r.id,
              result_image_url: r.result_image_url,
              decor: r.decor,
            })),
          })) || [],
        });

      } catch (err) {
        console.error('Error loading project:', err);
        setError('Impossible de charger le projet');
        toast.error('Erreur lors du chargement');
      } finally {
        setIsLoading(false);
      }
    };

    loadProject();
  }, [projectId]);

  // Convert project data to slides
  const slides = useMemo<Slide[]>(() => {
    if (!project) return [];

    const slideList: Slide[] = [];

    // Title slide
    slideList.push({
      id: 'title',
      type: 'title',
      content: project.name,
      title: project.name,
      subtitle: 'Proposition de décors DICA',
    });

    // Generate slides for each photo/render
    project.photos.forEach((photo, photoIndex) => {
      // Original photo
      slideList.push({
        id: `photo-${photo.id}`,
        type: 'image',
        content: photo.original_image_url,
        title: `Photo originale ${photoIndex + 1}`,
      });

      // Each render
      photo.renders.forEach((render) => {
        // Render image
        slideList.push({
          id: `render-${render.id}`,
          type: 'image',
          content: render.result_image_url,
          title: render.decor?.name || 'Rendu',
          decorName: render.decor?.name,
          decorCode: render.decor?.reference_code,
        });

        // Comparison slide if we have original
        slideList.push({
          id: `compare-${render.id}`,
          type: 'comparison',
          content: render.result_image_url,
          title: `Comparaison - ${render.decor?.name || 'Décor'}`,
          decorName: render.decor?.name,
          decorCode: render.decor?.reference_code,
          metadata: {
            beforeImage: photo.original_image_url,
            afterImage: render.result_image_url,
          },
        });
      });
    });

    // End slide
    slideList.push({
      id: 'end',
      type: 'title',
      content: 'Merci',
      title: 'Merci de votre attention',
      subtitle: 'DICA France - Expert en stratifiés HPL',
    });

    return slideList;
  }, [project]);

  // Handle close
  const handleClose = () => {
    navigate(-1);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p>Chargement de la présentation...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !project) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-xl mb-4">{error || 'Projet non trouvé'}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  // No slides
  if (slides.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-xl mb-4">Aucun contenu à afficher</p>
          <p className="text-white/60 mb-4">
            Ajoutez des photos et générez des rendus pour créer une présentation.
          </p>
          <button
            onClick={() => navigate(`/project/${projectId}`)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Aller au projet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      <PresentationViewer
        slides={slides}
        autoStart={autoplay}
        autoplayInterval={interval}
        loop={loop}
        showThumbnails={thumbnails}
        showControls={true}
        showProgress={true}
        transition="fade"
        transitionDuration={500}
        onClose={handleClose}
      />
    </div>
  );
};

export default Presentation;

