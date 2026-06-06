import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PremiumLayout, ContentContainer, SectionTitle } from "@/components/ui/premium-layout";
import { compressImage, formatFileSize } from "@/lib/image-compression";
import { DecorSelectorDialog, type DecorSelection } from "@/components/decor-selector";
import { type CatalogDecor, type ProjectType } from "@/hooks/use-catalogs";
import { getErrorMessage } from "@/lib/utils";
import type { ResellerBranding } from "@/types/plaquette.types";

import { ProjectDetailHeader } from "@/components/project-detail/ProjectDetailHeader";
import { PhotoUploadButton } from "@/components/project-detail/PhotoUploadButton";
import { CreativeImportsSection } from "@/components/project-detail/CreativeImportsSection";
import { EmptyPhotosState } from "@/components/project-detail/EmptyPhotosState";
import { PhotoCard } from "@/components/project-detail/PhotoCard";
import { ZoomDialog } from "@/components/project-detail/ZoomDialog";
import { ComparisonDialog } from "@/components/project-detail/ComparisonDialog";
import { partitionRenderResults } from "@/components/project-detail/project-detail.helpers";
import type {
  Project,
  ProjectPhoto,
  Decor,
  RenderResult,
  CreativeImport,
  RendersByPhoto,
  ComparisonState,
  RenderFormat,
} from "@/components/project-detail/project-detail.types";

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [photos, setPhotos] = useState<ProjectPhoto[]>([]);
  const [decors, setDecors] = useState<Decor[]>([]);
  const [renders, setRenders] = useState<RendersByPhoto>({});
  const [creativeImports, setCreativeImports] = useState<CreativeImport[]>([]); // Créations Assistant IA
  const [selectedPhoto, setSelectedPhoto] = useState<ProjectPhoto | null>(null);
  const [decorSelection, setDecorSelection] = useState<DecorSelection>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDecorDialog, setShowDecorDialog] = useState(false);
  const [favoriteRenderIds, setFavoriteRenderIds] = useState<Set<string>>(new Set());
  const [renderCount, setRenderCount] = useState<number>(1);
  const [renderFormat, setRenderFormat] = useState<RenderFormat>("square");
  const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number } | null>(null);
  const [showReferences, setShowReferences] = useState<boolean>(true); // Afficher les références DICA
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [comparisonMode, setComparisonMode] = useState<ComparisonState | null>(null);
  const [selectedRenderIds, setSelectedRenderIds] = useState<Set<string>>(new Set());
  const [userCoBrandingEnabled, setUserCoBrandingEnabled] = useState<boolean>(false);
  const [resellerBranding, setResellerBranding] = useState<ResellerBranding | null>(null);
  const [isLoadingRenders, setIsLoadingRenders] = useState(true); // État de chargement des renders

  useEffect(() => {
    setIsLoadingRenders(true);
    loadProject();
    loadDecors();
    loadFavorites();
    loadUserProfile();
  }, [id, user]);

  const loadUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("cobranding_enabled, company_name, contact_name, email, phone, addressline1, addressline2, city, postal_code, website, tagline")
        .eq("id", user.id)
        .single();

      console.log("[Branding] Profile data loaded:", { data, error, userId: user.id });

      if (!error && data) {
        const coBrandingEnabled = data.cobranding_enabled ?? false;
        setUserCoBrandingEnabled(coBrandingEnabled);
        
        console.log("[Branding] Co-branding enabled:", coBrandingEnabled);
        console.log("[Branding] Company name:", data.company_name);
        
        // Construire l'objet branding si co-branding activé et nom de société fourni
        if (coBrandingEnabled && data.company_name?.trim()) {
          const branding = {
            enabled: true,
            companyName: data.company_name.trim(),
            contactName: data.contact_name?.trim() || undefined,
            email: data.email?.trim() || undefined,
            phone: data.phone?.trim() || undefined,
            addressLine1: data.addressline1?.trim() || undefined,
            addressLine2: data.addressline2?.trim() || undefined,
            city: data.city?.trim() || undefined,
            postalCode: data.postal_code?.trim() || undefined,
            website: data.website?.trim() || undefined,
            tagline: data.tagline?.trim() || undefined,
          };
          
          console.log("[Branding] Setting reseller branding:", branding);
          setResellerBranding(branding);
        } else {
          console.log("[Branding] No branding set - enabled:", coBrandingEnabled, "companyName:", data.company_name);
          setResellerBranding(null);
        }
      } else {
        console.error("[Branding] Error loading profile:", error);
      }
    } catch (error: unknown) {
      console.error("[Branding] Error loading user profile:", error);
    }
  };

  const loadFavorites = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("render_favorites")
        .select("render_result_id")
        .eq("user_id", user.id);

      if (error) throw error;
      
      const favoriteIds = new Set(data?.map(f => f.render_result_id) || []);
      setFavoriteRenderIds(favoriteIds);
    } catch (error: unknown) {
      console.error("Error loading favorites:", error);
    }
  };

  const toggleFavorite = async (renderId: string) => {
    if (!user) {
      toast.error("Vous devez être connecté");
      return;
    }

    const isFavorite = favoriteRenderIds.has(renderId);
    console.log(`[Favorites] Toggle: ${renderId}, isFavorite: ${isFavorite}, userId: ${user.id}`);

    try {
      if (isFavorite) {
        // Supprimer des favoris
        const { data, error, count } = await supabase
          .from("render_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("render_result_id", renderId)
          .select();

        console.log(`[Favorites] Delete result:`, { data, error, count });

        if (error) {
          console.error("[Favorites] Delete error:", error);
          throw error;
        }
        
        // Mise à jour locale
        setFavoriteRenderIds(prev => {
          const next = new Set(prev);
          next.delete(renderId);
          return next;
        });
        toast.success("Retiré des favoris");
      } else {
        // Ajouter aux favoris
        const { data, error } = await supabase
          .from("render_favorites")
          .insert({
            user_id: user.id,
            render_result_id: renderId
          })
          .select();

        console.log(`[Favorites] Insert result:`, { data, error });

        if (error) {
          console.error("[Favorites] Insert error:", error);
          throw error;
        }
        
        setFavoriteRenderIds(prev => new Set(prev).add(renderId));
        toast.success("Ajouté aux favoris");
      }
    } catch (error: unknown) {
      console.error("[Favorites] Error toggling favorite:", error);
      toast.error(`Erreur: ${getErrorMessage(error, "Mise à jour des favoris")}`);
    }
  };

  const loadProject = async () => {
    if (!user || !id) return;

    try {
      // 🚀 ÉTAPE 1 : Charger projet ET photos EN PARALLÈLE
      const [projectResult, photosResult] = await Promise.all([
        supabase
          .from("projects")
          .select("*")
          .eq("id", id)
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("project_photos")
          .select("*")
          .eq("project_id", id)
          .order("created_at", { ascending: false })
      ]);

      if (projectResult.error) throw projectResult.error;
      if (photosResult.error) throw photosResult.error;

      // ✅ Afficher projet et photos IMMÉDIATEMENT
      setProject(projectResult.data);
      const loadedPhotos = photosResult.data || [];
      setPhotos(loadedPhotos);

      // 🚀 ÉTAPE 2 : Charger les renders en parallèle (non bloquant pour l'UI)
      const photoIds = loadedPhotos.map(p => p.id);

      if (photoIds.length > 0) {
        // Lancer la requête des renders
        const { data: allRendersData } = await supabase
          .from("render_results")
          .select("*")
          .in("project_photo_id", photoIds)
          .order("created_at", { ascending: false });

        // Répartition O(n) : rendus décors par photo + créations IA (decor_id nul)
        const { rendersByPhoto, creativeImports: allCreativeImports } = partitionRenderResults(
          allRendersData,
          photoIds,
        );

        // ✅ Afficher créations IA et renders
        setCreativeImports(allCreativeImports);
        setRenders(rendersByPhoto);
        setIsLoadingRenders(false);

        console.log(`[Load] ${allCreativeImports.length} créations IA, ${Object.values(rendersByPhoto).flat().length} renders chargés`);
      } else {
        setRenders({});
        setCreativeImports([]);
        setIsLoadingRenders(false);
      }
    } catch (error: unknown) {
      console.error("[Load] Erreur:", error);
      setIsLoadingRenders(false);
      toast.error("Erreur lors du chargement du projet");
      navigate("/dashboard");
    }
  };

  const loadDecors = async () => {
    try {
      const { data, error } = await supabase
        .from("decors")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setDecors(data || []);
    } catch (error: unknown) {
      toast.error("Erreur lors du chargement des décors");
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !id) return;

    // Vérifier que c'est une image
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image valide");
      return;
    }

    setIsUploading(true);

    try {
      const originalSize = file.size;
      console.log(`Image originale: ${formatFileSize(originalSize)}`);

      // Compresser l'image avant upload
      const compressedBlob = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
        outputFormat: "jpeg",
      });

      const compressedSize = compressedBlob.size;
      const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
      console.log(`Image compressée: ${formatFileSize(compressedSize)} (réduction de ${compressionRatio}%)`);

      // Créer un File à partir du Blob compressé
      const compressedFile = new File(
        [compressedBlob],
        file.name.replace(/\.[^.]+$/, ".jpg"),
        { type: "image/jpeg" }
      );

      const fileName = `${user.id}/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("project-photos")
        .upload(fileName, compressedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("project-photos")
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from("project_photos")
        .insert({
          project_id: id,
          original_image_url: publicUrl,
        });

      if (insertError) throw insertError;

      toast.success(`Photo ajoutée (${formatFileSize(compressedSize)}, -${compressionRatio}%)`);
      loadProject();
    } catch (error: unknown) {
      console.error("Erreur upload:", error);
      toast.error("Erreur lors de l'upload de la photo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateRender = async () => {
    // Récupérer les décors sélectionnés
    const selectedDecors = Object.values(decorSelection).filter(Boolean) as CatalogDecor[];
    
    if (!selectedPhoto || selectedDecors.length === 0 || !user || !project) return;

    setIsGenerating(true);

    try {
      // Pour chaque décor sélectionné, générer le rendu
      // On utilise le premier décor comme décor principal (pour parois principalement)
      // et on passe tous les décors au backend
      const primaryDecor = selectedDecors[0];
      
      // Construire les informations de tous les décors sélectionnés
      const allDecors = selectedDecors.map(d => ({
        id: d.id,
        name: d.name,
        referenceCode: d.reference_code,
        textureUrl: d.texture_image_url,
      }));

      const { data, error } = await supabase.functions.invoke("apply-decor", {
        body: {
          photoUrl: selectedPhoto.original_image_url,
          textureUrl: primaryDecor.texture_image_url,
          photoId: selectedPhoto.id,
          decorId: primaryDecor.id,
          useCase: project.use_case,
          renderCount,
          format: renderFormat,
          showReferences,
          originalWidth: renderFormat === "original" ? originalDimensions?.width : undefined,
          originalHeight: renderFormat === "original" ? originalDimensions?.height : undefined,
          // Nouvelle propriété : tous les décors pour application multi-surface
          allDecors: allDecors.length > 1 ? allDecors : undefined,
        },
      });

      if (error) throw error;

      const count = renderCount > 1 ? `${renderCount} rendus générés` : "Rendu généré";
      toast.success(`${count} avec succès !`);
      setShowDecorDialog(false);
      setSelectedPhoto(null);
      setDecorSelection({});
      
      // Small delay to ensure database has propagated the new render
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadProject();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Erreur lors de la génération du rendu"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateRender = async (renderId: string, photoId: string) => {
    if (!user || !project) return;

    const photo = photos.find(p => p.id === photoId);
    const render = renders[photoId]?.find(r => r.id === renderId);
    
    if (!photo || !render || !render.decor_id) {
      toast.error("Impossible de régénérer ce rendu");
      return;
    }

    const decor = decors.find(d => d.id === render.decor_id);
    if (!decor) {
      toast.error("Décor introuvable");
      return;
    }

    setIsGenerating(true);

    try {
      // Delete the old render first
      const { error: deleteError } = await supabase
        .from("render_results")
        .delete()
        .eq("id", renderId);

      if (deleteError) throw deleteError;

      // Generate new render with same parameters
      const { data, error } = await supabase.functions.invoke("apply-decor", {
        body: {
          photoUrl: photo.original_image_url,
          textureUrl: decor.texture_image_url,
          photoId: photo.id,
          decorId: decor.id,
          useCase: project.use_case,
          renderCount: 1,
          format: renderFormat,
          showReferences,
          originalWidth: renderFormat === "original" ? originalDimensions?.width : undefined,
          originalHeight: renderFormat === "original" ? originalDimensions?.height : undefined,
        },
      });

      if (error) throw error;

      toast.success("Variante régénérée avec succès !");
      
      // Small delay to ensure database has propagated the new render
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadProject();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Erreur lors de la régénération"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteRender = async (renderId: string, photoId: string) => {
    // 🚀 OPTIMISTIC UPDATE : Mise à jour immédiate de l'UI
    
    // Sauvegarder l'état pour rollback en cas d'erreur
    const previousCreativeImports = [...creativeImports];
    const previousRenders = { ...renders };
    const previousFavorites = new Set(favoriteRenderIds);
    
    // Déterminer si c'est une création IA ou un render décor
    const isCreativeImport = creativeImports.some(c => c.id === renderId);
    
    // Mise à jour IMMÉDIATE de l'UI
    if (isCreativeImport) {
      setCreativeImports(prev => prev.filter(c => c.id !== renderId));
    } else {
      setRenders(prev => ({
        ...prev,
        [photoId]: (prev[photoId] || []).filter(r => r.id !== renderId)
      }));
    }
    
    // Retirer des favoris localement
    setFavoriteRenderIds(prev => {
      const next = new Set(prev);
      next.delete(renderId);
      return next;
    });
    
    // Retirer de la sélection si sélectionné
    setSelectedRenderIds(prev => {
      const next = new Set(prev);
      next.delete(renderId);
      return next;
    });
    
    toast.success("Supprimé !");
    
    try {
      // Suppression en arrière-plan (parallèle pour vitesse)
      const deletePromises = [
        supabase
          .from("render_favorites")
          .delete()
          .eq("render_result_id", renderId)
          .eq("user_id", user?.id),
        supabase
          .from("render_results")
          .delete()
          .eq("id", renderId)
      ];
      
      const results = await Promise.all(deletePromises);
      
      // Vérifier les erreurs
      const deleteError = results[1].error;
      if (deleteError) {
        throw deleteError;
      }
      
      console.log(`[Delete] Render ${renderId} supprimé avec succès`);
      
    } catch (error: unknown) {
      // 🔄 ROLLBACK : Restaurer l'état précédent en cas d'erreur
      console.error("Erreur suppression, rollback:", error);
      
      setCreativeImports(previousCreativeImports);
      setRenders(previousRenders);
      setFavoriteRenderIds(previousFavorites);
      
      toast.error(`Échec de la suppression: ${getErrorMessage(error)}`);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    try {
      // Delete all render results for this photo first
      const { error: renderError } = await supabase
        .from("render_results")
        .delete()
        .eq("project_photo_id", photoId);

      if (renderError) throw renderError;

      // Delete the photo itself
      const { error: photoError } = await supabase
        .from("project_photos")
        .delete()
        .eq("id", photoId);

      if (photoError) throw photoError;

      toast.success("Photo supprimée");
      loadProject();
    } catch (error: unknown) {
      toast.error("Erreur lors de la suppression de la photo");
    }
  };

  // Ouvre le sélecteur de décor et précharge les dimensions de la photo
  const handleApplyDecor = (photo: ProjectPhoto) => {
    setSelectedPhoto(photo);
    setShowDecorDialog(true);
    // Load original image dimensions
    const img = new Image();
    img.onload = () => {
      setOriginalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = photo.original_image_url;
  };

  // Bascule la sélection d'un rendu pour l'export Magazine DECO
  const handleToggleSelect = (renderId: string) => {
    setSelectedRenderIds(prev => {
      const next = new Set(prev);
      if (next.has(renderId)) {
        next.delete(renderId);
      } else {
        next.add(renderId);
      }
      return next;
    });
  };

  // Ouvre la comparaison avant/après pour un rendu donné
  const handleOpenComparison = (render: RenderResult, photo: ProjectPhoto) => {
    const decor = decors.find(d => d.id === render.decor_id);
    const isCreativeRender = !render.decor_id;
    setComparisonMode({
      before: photo.original_image_url,
      after: render.result_image_url,
      decorName: decor?.name || (isCreativeRender ? 'Création Assistant IA' : undefined),
      decorCode: decor?.reference_code || (isCreativeRender ? 'CREATIVE-AI' : undefined),
    });
  };

  if (!project) {
    return (
      <PremiumLayout backgroundImage="/images/page-projets.png">
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
      </PremiumLayout>
    );
  }

  const isEmpty = photos.length === 0 && creativeImports.length === 0 && !isLoadingRenders;
  const showCreativeSection = creativeImports.length > 0 || isLoadingRenders;

  return (
    <PremiumLayout backgroundImage="/images/page-projets.png">
      <ProjectDetailHeader
        project={project}
        user={user}
        decors={decors}
        photos={photos}
        renders={renders}
        creativeImports={creativeImports}
        favoriteRenderIds={favoriteRenderIds}
        selectedRenderIds={selectedRenderIds}
        resellerBranding={resellerBranding}
        onClearSelection={() => setSelectedRenderIds(new Set())}
        onNavigateDashboard={() => navigate("/dashboard")}
      />

      <ContentContainer className="pb-20">
        {/* Hero Section */}
        <div className="mb-10 md:mb-12">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <SectionTitle 
              title="Photos du projet" 
              subtitle="Uploadez vos photos et appliquez les décors DICA en un clic."
            />
            <PhotoUploadButton
              inputId="photo-upload"
              ariaLabel="Uploader des photos du projet"
              idleLabel="Ajouter une photo"
              isUploading={isUploading}
              withLoadingState
              buttonClassName="btn-primary-premium h-12 px-6 rounded-xl cursor-pointer"
              onUpload={handlePhotoUpload}
            />
          </div>
        </div>

        {/* Section Créations Assistant IA */}
        {showCreativeSection && (
          <CreativeImportsSection
            creativeImports={creativeImports}
            isLoadingRenders={isLoadingRenders}
            favoriteRenderIds={favoriteRenderIds}
            onZoom={setZoomedImage}
            onToggleFavorite={toggleFavorite}
            onDelete={handleDeleteRender}
          />
        )}

        {/* Photos Grid */}
        {isEmpty ? (
          <EmptyPhotosState isUploading={isUploading} onUpload={handlePhotoUpload} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {photos.map((photo, index) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                index={index}
                photoRenders={renders[photo.id] || []}
                favoriteRenderIds={favoriteRenderIds}
                selectedRenderIds={selectedRenderIds}
                isGenerating={isGenerating}
                onDeletePhoto={handleDeletePhoto}
                onApplyDecor={handleApplyDecor}
                onToggleSelect={handleToggleSelect}
                onToggleFavorite={toggleFavorite}
                onZoom={setZoomedImage}
                onCompare={handleOpenComparison}
                onRegenerate={handleRegenerateRender}
                onDeleteRender={handleDeleteRender}
              />
            ))}
          </div>
        )}

      {/* Decor Selection Dialog - Contextualisé par type de projet */}
      {project && (
        <DecorSelectorDialog
          open={showDecorDialog}
          onOpenChange={setShowDecorDialog}
          projectType={project.use_case as ProjectType}
          decorSelection={decorSelection}
          onDecorSelectionChange={setDecorSelection}
          onGenerate={handleGenerateRender}
          isGenerating={isGenerating}
          renderCount={renderCount}
          onRenderCountChange={setRenderCount}
          renderFormat={renderFormat}
          onRenderFormatChange={setRenderFormat}
          showReferences={showReferences}
          onShowReferencesChange={setShowReferences}
          originalDimensions={originalDimensions}
        />
      )}

      {/* Dialog pour agrandir l'image */}
      <ZoomDialog zoomedImage={zoomedImage} onClose={() => setZoomedImage(null)} />

      {/* Dialog pour comparaison avant/après */}
      <ComparisonDialog comparisonMode={comparisonMode} onClose={() => setComparisonMode(null)} />
      </ContentContainer>
    </PremiumLayout>
  );
};

export default ProjectDetail;
