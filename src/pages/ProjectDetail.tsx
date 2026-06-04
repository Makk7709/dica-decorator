import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Upload, Sparkles, Download, Loader2, Trash2, Heart, RotateCcw, Home, ImageIcon, Maximize2, X, SplitSquareHorizontal, FileText, Share2, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { PremiumLayout, ContentContainer, SectionTitle } from "@/components/ui/premium-layout";
import { BeforeAfterSlider } from "@/components/ui/before-after-slider";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { compressImage, formatFileSize } from "@/lib/image-compression";
import { ShareLinkDialog } from "@/components/ui/share-link-dialog";
import { ResellerBrochureExportButton } from "@/components/ui/reseller-brochure-export-button";
import { MagazineDecoExportButton } from "@/components/ui/magazine-deco-export-button";
import { SafeImage } from "@/components/ui/safe-image";
import { DecorSelectorDialog, type DecorSelection } from "@/components/decor-selector";
import { type CatalogDecor, type ProjectType, type Catalog } from "@/hooks/use-catalogs";

import { ImageExportDropdown, ImageExportMenuItems } from "@/components/ui/image-export-dropdown";
import { PlaquetteProject, PlaquetteDecor, PlaquetteImage, DEFAULT_APP_SETTINGS } from "@/types/plaquette.types";
import { signStorageUrl } from "@/lib/signed-storage";

interface Project {
  id: string;
  title: string;
  use_case: string;
  client_reference: string | null;
}

interface ProjectPhoto {
  id: string;
  original_image_url: string;
  created_at: string;
}

interface Decor {
  id: string;
  name: string;
  reference_code: string;
  texture_image_url: string;
  usage_contexts: string[];
  category: string;
}

interface RenderResult {
  id: string;
  result_image_url: string;
  decor_id: string | null;
  created_at: string;
}

// Création de l'assistant IA (sans décor associé)
interface CreativeImport {
  id: string;
  result_image_url: string;
  created_at: string;
  photoId: string;
}

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [photos, setPhotos] = useState<ProjectPhoto[]>([]);
  const [decors, setDecors] = useState<Decor[]>([]);
  const [renders, setRenders] = useState<{ [photoId: string]: RenderResult[] }>({});
  const [creativeImports, setCreativeImports] = useState<CreativeImport[]>([]); // Créations Assistant IA
  const [selectedPhoto, setSelectedPhoto] = useState<ProjectPhoto | null>(null);
  const [decorSelection, setDecorSelection] = useState<DecorSelection>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDecorDialog, setShowDecorDialog] = useState(false);
  const [favoriteRenderIds, setFavoriteRenderIds] = useState<Set<string>>(new Set());
  const [renderCount, setRenderCount] = useState<number>(1);
  const [renderFormat, setRenderFormat] = useState<"square" | "portrait" | "landscape" | "original">("original");
  const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number } | null>(null);
  const [showReferences, setShowReferences] = useState<boolean>(true); // Afficher les références DICA
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [comparisonMode, setComparisonMode] = useState<{
    before: string;
    after: string;
    decorName?: string;
    decorCode?: string;
  } | null>(null);
  const [selectedRenderIds, setSelectedRenderIds] = useState<Set<string>>(new Set());
  const [userCoBrandingEnabled, setUserCoBrandingEnabled] = useState<boolean>(false);
  const [resellerBranding, setResellerBranding] = useState<{
    enabled: boolean;
    companyName: string;
    contactName?: string;
    email?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    postalCode?: string;
    website?: string;
    tagline?: string;
  } | null>(null);
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
      console.error("[Favorites] Error toggling favorite:", error);
      toast.error(`Erreur: ${error.message || "Mise à jour des favoris"}`);
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
      setPhotos(photosResult.data || []);

      // 🚀 ÉTAPE 2 : Charger les renders en parallèle (non bloquant pour l'UI)
      const photoIds = (photosResult.data || []).map(p => p.id);
      
      if (photoIds.length > 0) {
        // Lancer la requête des renders
        const { data: allRendersData } = await supabase
          .from("render_results")
          .select("*")
          .in("project_photo_id", photoIds)
          .order("created_at", { ascending: false });

        // Traitement rapide avec Map pour O(n) au lieu de O(n²)
        const rendersByPhoto: { [photoId: string]: RenderResult[] } = {};
        const allCreativeImports: CreativeImport[] = [];
        
        // Pré-initialiser avec Map pour performance
        const photoIdSet = new Set(photoIds);
        photoIds.forEach(photoId => {
          rendersByPhoto[photoId] = [];
        });
        
        // Traitement en une seule passe
        if (allRendersData) {
          for (let i = 0; i < allRendersData.length; i++) {
            const render = allRendersData[i];
            if (render.decor_id === null) {
              // Création de l'assistant IA
              allCreativeImports.push({
                id: render.id,
                result_image_url: render.result_image_url,
                created_at: render.created_at,
                photoId: render.project_photo_id,
              });
            } else if (photoIdSet.has(render.project_photo_id)) {
              // Rendu décor classique
              rendersByPhoto[render.project_photo_id].push(render);
            }
          }
        }
        
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
      console.error("Erreur upload:", error);
      toast.error("Erreur lors de l'upload de la photo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateRender = async () => {
    // Récupérer les décors sélectionnés avec leur catalogId
    const selectedEntries = Object.entries(decorSelection).filter(([, decor]) => decor != null) as [string, CatalogDecor][];
    
    if (!selectedPhoto || selectedEntries.length === 0 || !user || !project) return;

    setIsGenerating(true);

    try {
      const primaryDecor = selectedEntries[0][1];
      
      // Construire les informations de tous les décors sélectionnés AVEC le catalogId
      const allDecors = selectedEntries.map(([catalogId, d]) => ({
        id: d.id,
        name: d.name,
        referenceCode: d.reference_code,
        textureUrl: d.texture_image_url,
        catalogId,
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
          // TOUJOURS envoyer allDecors pour ascenseur (même avec 1 décor) pour le mapping surface
          allDecors: project.use_case === "ascenseur" ? allDecors : (allDecors.length > 1 ? allDecors : undefined),
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
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la génération du rendu");
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
      // Pre-load original image dimensions for this specific photo
      let regenOriginalWidth: number | undefined;
      let regenOriginalHeight: number | undefined;
      
      if (renderFormat === "original") {
        try {
          const photoSignedUrl = await signStorageUrl(photo.original_image_url);
          const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
            img.onerror = reject;
            img.src = photoSignedUrl;
          });
          regenOriginalWidth = dims.width;
          regenOriginalHeight = dims.height;
        } catch {
          console.warn("Could not load photo dimensions for regeneration, backend will auto-detect");
        }
      }

      // For elevator projects, resolve the catalog context for surface mapping
      let allDecors: { id: string; name: string; referenceCode: string; textureUrl: string; catalogId?: string }[] | undefined;
      
      if (project.use_case === "ascenseur") {
        // Find which catalog this decor belongs to via catalog_decor_links
        const { data: linkData } = await supabase
          .from("catalog_decor_links")
          .select("catalog_id")
          .eq("decor_id", decor.id)
          .limit(1);
        
        const catalogId = linkData?.[0]?.catalog_id;
        
        allDecors = [{
          id: decor.id,
          name: decor.name,
          referenceCode: decor.reference_code,
          textureUrl: decor.texture_image_url,
          catalogId: catalogId || undefined,
        }];
      }

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
          originalWidth: regenOriginalWidth,
          originalHeight: regenOriginalHeight,
          allDecors,
        },
      });

      if (error) throw error;

      toast.success("Variante régénérée avec succès !");
      
      // Small delay to ensure database has propagated the new render
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadProject();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la régénération");
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
      
    } catch (error: any) {
      // 🔄 ROLLBACK : Restaurer l'état précédent en cas d'erreur
      console.error("Erreur suppression, rollback:", error);
      
      setCreativeImports(previousCreativeImports);
      setRenders(previousRenders);
      setFavoriteRenderIds(previousFavorites);
      
      toast.error(`Échec de la suppression: ${error.message}`);
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
    } catch (error: any) {
      toast.error("Erreur lors de la suppression de la photo");
    }
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

  const getUseCaseLabel = (useCase: string) => {
    const labels: Record<string, string> = {
      "ascenseur": "Ascenseur",
      "van": "Van aménagé",
      "meuble": "Meuble",
      "autre": "Autre"
    };
    return labels[useCase] || useCase;
  };

  return (
    <PremiumLayout backgroundImage="/images/page-projets.png">
      {/* Header Premium */}
      <header className="header-premium sticky top-0 z-50">
        <div className="container mx-auto flex h-16 md:h-20 items-center justify-between px-4 sm:px-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/dashboard")} 
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Retour</span>
          </Button>
          
          <div className="flex items-center gap-2 md:gap-3">
            <img src="/images/dica-logo.png" alt="DICA" className="h-12 md:h-14 w-auto" />
            <div className="text-left hidden sm:block">
              <h1 className="text-base md:text-lg font-semibold leading-tight tracking-tight">{project.title}</h1>
              <p className="text-xs text-muted-foreground">{getUseCaseLabel(project.use_case)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <ThemeToggle className="text-muted-foreground" />
            
            {/* Share Link Dialog */}
            {project && user && (
              <ShareLinkDialog 
                projectId={project.id} 
                projectTitle={project.title}
                userId={user.id}
                variant="ghost"
                showLabel={false}
                className="text-muted-foreground hover:text-foreground h-8 px-2"
              />
            )}
            
            {/* Plaquette Premium Export */}
            {project && (Object.values(renders).flat().length > 0 || creativeImports.length > 0) && (
              <>
                {/* Sélection d'images pour Magazine DECO */}
                {selectedRenderIds.size > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium">
                    <span>{selectedRenderIds.size} image{selectedRenderIds.size > 1 ? 's' : ''} sélectionnée{selectedRenderIds.size > 1 ? 's' : ''}</span>
                    <button 
                      onClick={() => setSelectedRenderIds(new Set())}
                      className="hover:underline"
                    >
                      Désélectionner
                    </button>
                  </div>
                )}
                
                <ResellerBrochureExportButton
                  project={{
                    id: project.id,
                    name: project.title,
                    type: (project.use_case as any) || 'autre',
                    clientName: project.client_reference || undefined,
                    createdAt: new Date(),
                  }}
                  decor={decors.length > 0 ? {
                    id: decors[0].id,
                    name: decors[0].name,
                    referenceCode: decors[0].reference_code,
                    category: decors[0].category,
                  } : {
                    id: 'default',
                    name: 'Décor DICA',
                    referenceCode: 'DICA',
                    category: 'autre',
                  }}
                  images={[
                    // Rendus décors classiques d'abord (priorité)
                    ...Object.entries(renders).flatMap(([photoId, photoRenders]) => {
                      const photo = photos.find(p => p.id === photoId);
                      return photoRenders.map(render => {
                        const decor = decors.find(d => d.id === render.decor_id);
                        return {
                          id: render.id,
                          url: render.result_image_url,
                          originalUrl: photo?.original_image_url,
                          decorId: render.decor_id || '',
                          decorName: decor?.name || '',
                          decorCode: decor?.reference_code || '',
                          createdAt: new Date(render.created_at),
                          isHighResolution: true,
                        };
                      });
                    }),
                    // Créations IA ensuite
                    ...creativeImports.map(creative => ({
                      id: creative.id,
                      url: creative.result_image_url,
                      originalUrl: photos.find(p => p.id === creative.photoId)?.original_image_url,
                      decorId: 'creative',
                      decorName: 'Création Assistant IA',
                      decorCode: 'CREATIVE-AI',
                      createdAt: new Date(creative.created_at),
                      isHighResolution: true,
                    })),
                  ]}
                  resellerBranding={resellerBranding}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                />
                
                {/* Magazine DECO Export */}
                {(Object.values(renders).flat().length > 0 || creativeImports.length > 0) && decors.length > 0 && (
                  <MagazineDecoExportButton
                    project={{
                      id: project.id,
                      name: project.title,
                      type: (project.use_case as any) || 'autre',
                      clientName: project.client_reference || undefined,
                      createdAt: new Date(),
                    }}
                    decor={decors.map(d => ({
                      id: d.id,
                      name: d.name,
                      referenceCode: d.reference_code,
                      category: d.category,
                    }))[0]}
                    images={[
                      // Renders de décors
                      ...Object.entries(renders)
                        .flatMap(([photoId, photoRenders]) => {
                          const photo = photos.find(p => p.id === photoId);
                          return photoRenders.map(render => {
                            const decor = decors.find(d => d.id === render.decor_id);
                            const isFavorite = favoriteRenderIds.has(render.id);
                            return {
                              id: render.id,
                              url: render.result_image_url,
                              originalUrl: photo?.original_image_url,
                              decorId: render.decor_id || '',
                              decorName: decor?.name || '',
                              decorCode: decor?.reference_code || '',
                              createdAt: new Date(render.created_at),
                              isHighResolution: true,
                              isFavorite,
                            };
                          });
                        }),
                      // Créations assistant IA
                      ...creativeImports.map(creative => ({
                        id: creative.id,
                        url: creative.result_image_url,
                        originalUrl: undefined,
                        decorId: '',
                        decorName: 'Création Assistant IA',
                        decorCode: 'ASSISTANT_IA',
                        createdAt: new Date(creative.created_at),
                        isHighResolution: true,
                        isFavorite: false,
                      }))
                    ]
                      .filter(img => selectedRenderIds.size === 0 || selectedRenderIds.has(img.id))
                      .sort((a, b) => {
                        // Sort favorites first
                        if (a.isFavorite && !b.isFavorite) return -1;
                        if (!a.isFavorite && b.isFavorite) return 1;
                        return 0;
                      })
                    }
                    resellerBranding={resellerBranding}
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                  />
                )}

              </>
            )}
            
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/dashboard")}
              className="text-muted-foreground hover:text-foreground"
            >
              <Home className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Accueil</span>
            </Button>
          </div>
        </div>
      </header>

      <ContentContainer className="pb-20">
        {/* Hero Section */}
        <div className="mb-10 md:mb-12">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <SectionTitle 
              title="Photos du projet" 
              subtitle="Uploadez vos photos et appliquez les décors DICA en un clic."
            />
            
            <label htmlFor="photo-upload">
              <Button 
                asChild 
                disabled={isUploading} 
                size="lg" 
                className="btn-primary-premium h-12 px-6 rounded-xl cursor-pointer"
              >
                <span>
                  {isUploading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                  <Upload className="mr-2 h-5 w-5" />
                  )}
                  {isUploading ? "Upload..." : "Ajouter une photo"}
                </span>
              </Button>
            </label>
            <input
              id="photo-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>
        </div>

        {/* Section Créations Assistant IA */}
        {(creativeImports.length > 0 || isLoadingRenders) && (
          <div className="card-premium p-5 md:p-6 mb-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                <h3 className="font-semibold">Créations Assistant IA</h3>
                {isLoadingRenders ? (
                  <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Chargement...
                  </span>
                ) : (
                  <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-0.5 rounded-full">
                    {creativeImports.length}
                  </span>
                )}
              </div>
            </div>
            
            {/* Skeleton pendant le chargement */}
            {isLoadingRenders && creativeImports.length === 0 && (
              <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="rounded-xl border border-purple-200 dark:border-purple-800/50 overflow-hidden bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background animate-pulse">
                    <div className="aspect-square bg-purple-100 dark:bg-purple-900/30" />
                    <div className="p-2 space-y-2">
                      <div className="h-4 bg-purple-100 dark:bg-purple-900/30 rounded w-3/4" />
                      <div className="h-3 bg-purple-100 dark:bg-purple-900/30 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Liste des créations IA */}
            {creativeImports.length > 0 && (
            <div className={`grid gap-4 ${
              creativeImports.length === 1 
                ? "grid-cols-1 max-w-md" 
                : creativeImports.length === 2
                  ? "grid-cols-2"
                  : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            }`}>
              {creativeImports.map((creative, index) => (
                <div 
                  key={creative.id}
                  className="group rounded-xl border border-purple-200 dark:border-purple-800/50 overflow-hidden bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="relative">
                    <SafeImage
                      src={creative.result_image_url}
                      alt="Création IA"
                      className="w-full aspect-square object-cover"
                      loading="lazy"
                    />
                    {/* Badge IA */}
                    <div className="absolute top-2 left-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      IA
                    </div>
                    {/* Icônes d'action */}
                    <div className="absolute bottom-2 right-2 flex gap-1.5 z-20">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7 bg-white/90 hover:bg-white shadow-md"
                        onClick={() => setZoomedImage(creative.result_image_url)}
                        title="Agrandir"
                      >
                        <Maximize2 className="h-3.5 w-3.5 text-gray-700" />
                      </Button>
                    </div>
                    {/* Overlay actions au survol */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 z-10">
                      <div className="flex gap-2">
                        <ImageExportDropdown
                          imageUrl={creative.result_image_url}
                          filename={`dica-ia-${creative.id}`}
                          variant="secondary"
                          size="sm"
                          className="h-8 px-3 bg-white hover:bg-gray-100 shadow-md text-xs text-gray-800 border border-gray-200"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Footer avec favoris et suppression */}
                  <div className="p-2 flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => toggleFavorite(creative.id)}
                    >
                      <Heart 
                        className={`h-3.5 w-3.5 mr-1.5 ${
                          favoriteRenderIds.has(creative.id) 
                            ? "fill-current text-red-500" 
                            : ""
                        }`} 
                      />
                      <span className="text-xs">
                        {favoriteRenderIds.has(creative.id) ? "Favori" : "Ajouter"}
                      </span>
                    </Button>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">
                        {new Date(creative.created_at).toLocaleDateString('fr-FR')}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteRender(creative.id, creative.photoId)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        )}

        {/* Photos Grid */}
        {photos.length === 0 && creativeImports.length === 0 && !isLoadingRenders ? (
          <div className="card-premium p-12 md:p-16 text-center animate-fade-in">
            <div className="max-w-sm mx-auto">
              <div className="mb-6 mx-auto w-20 h-20 rounded-2xl bg-muted flex items-center justify-center">
                <ImageIcon className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Aucune photo</h3>
              <p className="text-muted-foreground mb-8 text-balance">
                Commencez par uploader une photo de votre espace pour visualiser les décors DICA.
              </p>
              <label htmlFor="photo-upload-empty">
                <Button 
                  asChild 
                  disabled={isUploading} 
                  size="lg"
                  className="btn-primary-premium h-12 px-8 rounded-xl cursor-pointer"
                >
                  <span>
                    <Upload className="mr-2 h-5 w-5" />
                    Ajouter ma première photo
                  </span>
                </Button>
              </label>
              <input
                id="photo-upload-empty"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {photos.map((photo, index) => (
              <div 
                key={photo.id} 
                className="card-premium p-5 md:p-6 animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Photo Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm text-muted-foreground">Photo originale</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Photo Image */}
                <div className="relative rounded-xl overflow-hidden mb-4 bg-muted">
                 <SafeImage
                    src={photo.original_image_url}
                    alt="Photo projet"
                    className="w-full object-contain max-h-[500px]"
                    loading="lazy"
                  />
                </div>
                  
                {/* Action Button */}
                    <Button
                      onClick={async () => {
                        setSelectedPhoto(photo);
                        setOriginalDimensions(null); // Reset to avoid stale dimensions
                        // Pre-load original image dimensions before opening dialog
                        const photoSignedUrl = await signStorageUrl(photo.original_image_url);
                        const img = new Image();
                        img.onload = () => {
                          setOriginalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
                          setShowDecorDialog(true);
                        };
                        img.onerror = () => {
                          // Fallback: open dialog anyway, backend will handle it
                          setShowDecorDialog(true);
                        };
                        img.src = photoSignedUrl;
                      }}
                  className="w-full btn-primary-premium h-11 rounded-xl"
                    >
                  <Sparkles className="mr-2 h-4 w-4" />
                      Appliquer un décor
                    </Button>

                {/* Renders Grid - Masonry Layout */}
                  {renders[photo.id] && renders[photo.id].length > 0 && (
                  <div className="mt-6 pt-6 border-t border-border/50">
                    <p className="text-sm font-medium mb-4">
                      Rendus générés ({renders[photo.id].length})
                    </p>
                    <div className="columns-1 sm:columns-2 lg:columns-3 gap-3 space-y-3">
                      {renders[photo.id].map((render, renderIndex) => (
                         <div 
                          key={render.id} 
                          className="break-inside-avoid rounded-xl border border-border/50 overflow-hidden bg-white/50 animate-fade-in shadow-sm hover:shadow-md transition-shadow"
                          style={{ animationDelay: `${renderIndex * 50}ms` }}
                        >
                          <div className="relative">
                            <SafeImage
                              src={render.result_image_url}
                              alt="Rendu"
                              className="w-full h-auto"
                              loading="lazy"
                            />
                            
                            {/* Disclaimer non contractuel */}
                            <div className="absolute bottom-2 left-2 z-10 px-1.5 py-0.5 rounded bg-black/40 text-white/80 text-[9px] backdrop-blur-sm">
                              Image non contractuelle
                            </div>
                            
                            {/* Checkbox sélection pour Magazine DECO - en haut à gauche */}
                            <div className="absolute top-2 left-2 z-20">
                              <button
                                onClick={() => {
                                  setSelectedRenderIds(prev => {
                                    const next = new Set(prev);
                                    if (next.has(render.id)) {
                                      next.delete(render.id);
                                    } else {
                                      next.add(render.id);
                                    }
                                    return next;
                                  });
                                }}
                                className={`h-6 w-6 rounded-md border-2 flex items-center justify-center transition-all shadow-md ${
                                  selectedRenderIds.has(render.id)
                                    ? 'bg-primary border-primary text-white'
                                    : 'bg-white/95 border-gray-300 hover:border-primary hover:bg-primary/10'
                                }`}
                                title="Sélectionner pour Magazine DECO"
                              >
                                {selectedRenderIds.has(render.id) && (
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                            </div>
                            
                            {/* Boutons en haut à droite : Favoris + Menu */}
                            <div className="absolute top-2 right-2 z-20 flex gap-1.5">
                              {/* Bouton Favoris */}
                              <Button
                                variant="secondary"
                                size="icon"
                                className="h-8 w-8 bg-white/95 hover:bg-white shadow-md backdrop-blur-sm"
                                onClick={() => toggleFavorite(render.id)}
                                title={favoriteRenderIds.has(render.id) ? "Retirer des favoris" : "Ajouter aux favoris"}
                              >
                                <Heart 
                                  className={`h-4 w-4 ${
                                    favoriteRenderIds.has(render.id) 
                                      ? "fill-red-500 text-red-500" 
                                      : "text-gray-700"
                                  }`} 
                                />
                              </Button>
                              
                              {/* Menu contextuel */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="h-8 w-8 bg-white/95 hover:bg-white shadow-md backdrop-blur-sm"
                                  >
                                    <MoreVertical className="h-4 w-4 text-gray-700" />
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem
                                    onClick={() => setZoomedImage(render.result_image_url)}
                                    className="cursor-pointer"
                                  >
                                    <Maximize2 className="mr-2 h-4 w-4" />
                                    Agrandir
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const decor = decors.find(d => d.id === render.decor_id);
                                      const isCreativeRender = !render.decor_id;
                                      setComparisonMode({
                                        before: photo.original_image_url,
                                        after: render.result_image_url,
                                        decorName: decor?.name || (isCreativeRender ? 'Création Assistant IA' : undefined),
                                        decorCode: decor?.reference_code || (isCreativeRender ? 'CREATIVE-AI' : undefined),
                                      });
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <SplitSquareHorizontal className="mr-2 h-4 w-4" />
                                    Comparer avant/après
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                    Télécharger en...
                                  </div>
                                  <ImageExportMenuItems
                                    imageUrl={render.result_image_url}
                                    filename={`dica-render-${render.id}`}
                                  />
                                  {render.decor_id && (
                                    <DropdownMenuItem
                                  onClick={() => handleRegenerateRender(render.id, photo.id)}
                                  disabled={isGenerating}
                                      className="cursor-pointer"
                                >
                                  <RotateCcw className="mr-2 h-4 w-4" />
                                      Régénérer
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => toggleFavorite(render.id)}
                                    className="cursor-pointer"
                                  >
                                    <Heart 
                                      className={`mr-2 h-4 w-4 ${
                                        favoriteRenderIds.has(render.id) 
                                          ? "fill-current text-red-500" 
                                          : ""
                                      }`} 
                                    />
                                    {favoriteRenderIds.has(render.id) ? "Retirer des favoris" : "Ajouter aux favoris"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                  onClick={() => handleDeleteRender(render.id, photo.id)}
                                    className="cursor-pointer text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Supprimer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              </div>
                          </div>
                        </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
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
      <Dialog open={!!zoomedImage} onOpenChange={(open) => !open && setZoomedImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden">
          <div className="relative w-full h-full flex items-center justify-center bg-black/95">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 h-10 w-10 bg-white/10 hover:bg-white/20 text-white"
              onClick={() => setZoomedImage(null)}
            >
              <X className="h-5 w-5" />
            </Button>
            {zoomedImage && (
              <>
                <SafeImage
                  src={zoomedImage}
                  alt="Rendu agrandi"
                  className="max-w-full max-h-[90vh] object-contain"
                />
                <div className="absolute bottom-4 left-4 right-4 z-10 flex justify-between items-center">
                  <Button
                    variant="secondary"
                    className="h-10 px-4 bg-white/90 hover:bg-white shadow-lg text-black"
                    onClick={() => setZoomedImage(null)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Fermer
                  </Button>
                  <ImageExportDropdown
                    imageUrl={zoomedImage!}
                    filename={`dica-render-${Date.now()}`}
                    variant="secondary"
                    className="h-10 px-4 bg-white hover:bg-gray-100 shadow-lg text-gray-800 border border-gray-200"
                  />
                </div>
              </>
            )}
    </div>
        </DialogContent>
      </Dialog>

      {/* Dialog pour comparaison avant/après */}
      <Dialog open={!!comparisonMode} onOpenChange={(open) => !open && setComparisonMode(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <div className="relative">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/60 to-transparent">
              <div className="flex items-center justify-between">
                <div className="text-white">
                  <h3 className="font-semibold">Comparaison Avant / Après</h3>
                  {comparisonMode?.decorName && (
                    <p className="text-sm text-white/80">
                      {comparisonMode.decorName}
                      {comparisonMode.decorCode && ` (${comparisonMode.decorCode})`}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 bg-white/10 hover:bg-white/20 text-white"
                  onClick={() => setComparisonMode(null)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Slider */}
            {comparisonMode && (
              <BeforeAfterSlider
                beforeImage={comparisonMode.before}
                afterImage={comparisonMode.after}
                beforeLabel="Photo originale"
                afterLabel="Avec décor DICA"
                metadata={{
                  decorName: comparisonMode.decorName,
                  decorCode: comparisonMode.decorCode,
                }}
                aspectRatio="auto"
                className="w-full max-h-[80vh]"
              />
            )}

            {/* Footer actions */}
            <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/60 to-transparent">
              <div className="flex justify-center gap-3">
                {comparisonMode?.after && (
                  <ImageExportDropdown
                    imageUrl={comparisonMode.after}
                    filename={`dica-comparison-${Date.now()}`}
                    variant="secondary"
                    className="h-10 px-4 bg-white hover:bg-gray-100 shadow-lg text-gray-800 border border-gray-200"
                  />
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </ContentContainer>
    </PremiumLayout>
  );
};

export default ProjectDetail;

