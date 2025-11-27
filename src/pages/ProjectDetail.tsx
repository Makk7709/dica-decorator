import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, Sparkles, Download, Loader2, Trash2, Heart, Info, RotateCcw } from "lucide-react";
import { toast } from "sonner";

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

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [photos, setPhotos] = useState<ProjectPhoto[]>([]);
  const [decors, setDecors] = useState<Decor[]>([]);
  const [renders, setRenders] = useState<{ [photoId: string]: RenderResult[] }>({});
  const [selectedPhoto, setSelectedPhoto] = useState<ProjectPhoto | null>(null);
  const [selectedDecor, setSelectedDecor] = useState<Decor | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDecorDialog, setShowDecorDialog] = useState(false);
  const [favoriteRenderIds, setFavoriteRenderIds] = useState<Set<string>>(new Set());
  const [renderCount, setRenderCount] = useState<number>(1);
  const [renderFormat, setRenderFormat] = useState<"square" | "portrait" | "landscape">("square");

  useEffect(() => {
    loadProject();
    loadDecors();
    loadFavorites();
  }, [id, user]);

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
    if (!user) return;

    const isFavorite = favoriteRenderIds.has(renderId);

    try {
      if (isFavorite) {
        const { error } = await supabase
          .from("render_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("render_result_id", renderId);

        if (error) throw error;
        
        setFavoriteRenderIds(prev => {
          const next = new Set(prev);
          next.delete(renderId);
          return next;
        });
        toast.success("Retiré des favoris");
      } else {
        const { error } = await supabase
          .from("render_favorites")
          .insert({
            user_id: user.id,
            render_result_id: renderId
          });

        if (error) throw error;
        
        setFavoriteRenderIds(prev => new Set(prev).add(renderId));
        toast.success("Ajouté aux favoris");
      }
    } catch (error: any) {
      console.error("Error toggling favorite:", error);
      toast.error("Erreur lors de la mise à jour des favoris");
    }
  };

  const loadProject = async () => {
    if (!user || !id) return;

    try {
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      const { data: photosData, error: photosError } = await supabase
        .from("project_photos")
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: false });

      if (photosError) throw photosError;
      setPhotos(photosData || []);

      // Load renders for each photo
      const rendersByPhoto: { [photoId: string]: RenderResult[] } = {};
      for (const photo of photosData || []) {
        const { data: rendersData } = await supabase
          .from("render_results")
          .select("*")
          .eq("project_photo_id", photo.id)
          .order("created_at", { ascending: false });
        
        rendersByPhoto[photo.id] = rendersData || [];
      }
      setRenders(rendersByPhoto);
    } catch (error: any) {
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

    setIsUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("project-photos")
        .upload(fileName, file);

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

      toast.success("Photo ajoutée avec succès !");
      loadProject();
    } catch (error: any) {
      toast.error("Erreur lors de l'upload de la photo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateRender = async () => {
    if (!selectedPhoto || !selectedDecor || !user || !project) return;

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("apply-decor", {
        body: {
          photoUrl: selectedPhoto.original_image_url,
          textureUrl: selectedDecor.texture_image_url,
          photoId: selectedPhoto.id,
          decorId: selectedDecor.id,
          useCase: project.use_case,
          renderCount,
          format: renderFormat,
        },
      });

      if (error) throw error;

      const count = renderCount > 1 ? `${renderCount} rendus générés` : "Rendu généré";
      toast.success(`${count} avec succès !`);
      setShowDecorDialog(false);
      setSelectedPhoto(null);
      setSelectedDecor(null);
      loadProject();
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
        },
      });

      if (error) throw error;

      toast.success("Variante régénérée avec succès !");
      loadProject();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la régénération");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteRender = async (renderId: string, photoId: string) => {
    try {
      const { error } = await supabase
        .from("render_results")
        .delete()
        .eq("id", renderId);

      if (error) throw error;

      toast.success("Résultat supprimé");
      
      // Update local state
      setRenders(prev => ({
        ...prev,
        [photoId]: prev[photoId].filter(r => r.id !== renderId)
      }));
    } catch (error: any) {
      toast.error("Erreur lors de la suppression");
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
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      {/* Background image */}
      <div 
        className="fixed inset-0 bg-cover opacity-30"
        style={{ backgroundImage: "url('/images/dica-app-bg.jpg')", backgroundPosition: "center 70%" }}
      />
      <div className="relative z-10">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto flex h-20 items-center justify-between px-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="border-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <div className="flex items-center gap-3">
            <img src="/images/dica-logo.svg" alt="DICA" className="h-8 w-auto" />
            <div className="text-left">
              <h1 className="text-lg font-bold leading-tight">{project.title}</h1>
              <p className="text-xs text-muted-foreground">{project.use_case}</p>
            </div>
          </div>
          <div className="w-24" /> {/* Spacer for centering */}
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {/* Upload Section */}
        <Card className="mb-12 border-2">
          <CardHeader>
            <CardTitle className="text-2xl">Photos du projet</CardTitle>
            <CardDescription className="text-base">
              Uploadez une ou plusieurs photos pour appliquer des décors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label htmlFor="photo-upload">
              <Button asChild disabled={isUploading} size="lg" className="h-12 px-6 shadow-lg">
                <span className="cursor-pointer">
                  <Upload className="mr-2 h-5 w-5" />
                  {isUploading ? "Upload en cours..." : "Ajouter une photo"}
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
          </CardContent>
        </Card>

        {/* Photos Grid */}
        {photos.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-20">
              <Upload className="mb-6 h-20 w-20 text-muted-foreground" />
              <h3 className="mb-3 text-2xl font-semibold">Aucune photo</h3>
              <p className="text-center text-lg text-muted-foreground">
                Commencez par uploader une photo de votre produit
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-8 md:grid-cols-2">
            {photos.map((photo) => (
              <Card key={photo.id} className="border-2">
                <CardHeader>
                  <CardTitle className="text-xl">Photo originale</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <img
                    src={photo.original_image_url}
                    alt="Photo projet"
                    className="w-full rounded-lg border-2"
                  />
                  
                  <div className="flex gap-3">
                    <Button
                      onClick={() => {
                        setSelectedPhoto(photo);
                        setShowDecorDialog(true);
                      }}
                      className="flex-1 h-12 shadow-lg hover:shadow-xl transition-all"
                    >
                      <Sparkles className="mr-2 h-5 w-5" />
                      Appliquer un décor
                    </Button>
                    <Button
                      variant="destructive"
                      size="lg"
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="h-12 px-4"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>

                  {/* Renders Grid */}
                  {renders[photo.id] && renders[photo.id].length > 0 && (
                    <div className="space-y-4 border-t-2 pt-6">
                      <p className="text-base font-semibold">Rendus générés ({renders[photo.id].length})</p>
                      <div className={`grid gap-4 ${
                        renders[photo.id].length === 1 
                          ? "grid-cols-1" 
                          : "grid-cols-2"
                      }`}>
                        {renders[photo.id].map((render) => (
                          <Card key={render.id} className="overflow-hidden">
                            <CardContent className="p-3 space-y-3">
                              <img
                                src={render.result_image_url}
                                alt="Rendu"
                                className="w-full rounded-lg border-2 aspect-square object-cover"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-2"
                                  onClick={() => toggleFavorite(render.id)}
                                >
                                  <Heart 
                                    className={`mr-2 h-4 w-4 ${
                                      favoriteRenderIds.has(render.id) 
                                        ? "fill-current text-red-500" 
                                        : ""
                                    }`} 
                                  />
                                  {favoriteRenderIds.has(render.id) ? "Favori" : "Favori"}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-2"
                                  asChild
                                >
                                  <a href={render.result_image_url} download>
                                    <Download className="mr-2 h-4 w-4" />
                                    DL
                                  </a>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-2"
                                  onClick={() => handleRegenerateRender(render.id, photo.id)}
                                  disabled={isGenerating}
                                >
                                  <RotateCcw className="mr-2 h-4 w-4" />
                                  Regénérer
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteRender(render.id, photo.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Decor Selection Dialog */}
      <Dialog open={showDecorDialog} onOpenChange={setShowDecorDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl">Choisir un décor</DialogTitle>
            <DialogDescription className="text-base">
              Sélectionnez un décor DICA à appliquer sur votre photo
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                En fonction de la qualité des images sources, il est parfois nécessaire de faire plusieurs générations pour obtenir le résultat attendu.
              </AlertDescription>
            </Alert>

            {/* Generation Parameters */}
            <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/30">
              <div className="space-y-2">
                <Label htmlFor="render-count">Nombre de rendus</Label>
                <Select value={renderCount.toString()} onValueChange={(v) => setRenderCount(parseInt(v))}>
                  <SelectTrigger id="render-count">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 rendu</SelectItem>
                    <SelectItem value="2">2 rendus</SelectItem>
                    <SelectItem value="3">3 rendus</SelectItem>
                    <SelectItem value="4">4 rendus</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="render-format">Format / Taille</Label>
                <Select value={renderFormat} onValueChange={(v: any) => setRenderFormat(v)}>
                  <SelectTrigger id="render-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="square">Carré (1024×1024)</SelectItem>
                    <SelectItem value="portrait">Portrait (768×1344)</SelectItem>
                    <SelectItem value="landscape">Paysage (1344×768)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Tabs defaultValue="metal" className="w-full">
              <TabsList className="grid w-full grid-cols-5 h-auto">
                <TabsTrigger value="metal" className="py-3">
                  Métal
                  <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs">
                    {decors.filter(d => d.category.toLowerCase() === 'metal').length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="unis" className="py-3">
                  Unis
                  <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs">
                    {decors.filter(d => d.category.toLowerCase() === 'unis').length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="marbre" className="py-3">
                  Marbre
                  <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs">
                    {decors.filter(d => d.category.toLowerCase() === 'marbre').length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="bois" className="py-3">
                  Bois
                  <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs">
                    {decors.filter(d => d.category.toLowerCase() === 'bois').length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="deco" className="py-3">
                  Déco
                  <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs">
                    {decors.filter(d => d.category.toLowerCase() === 'deco').length}
                  </span>
                </TabsTrigger>
              </TabsList>

              {['metal', 'unis', 'marbre', 'bois', 'deco'].map((category) => (
                <TabsContent key={category} value={category} className="mt-6">
                  <div className="max-h-[35vh] overflow-y-auto pr-2">
                    {decors.filter(d => d.category.toLowerCase() === category).length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <p className="text-lg text-muted-foreground">
                          Aucun décor disponible dans cette catégorie
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {decors
                          .filter(d => d.category.toLowerCase() === category)
                          .map((decor) => (
                            <Card
                              key={decor.id}
                              className={`cursor-pointer transition-all hover:shadow-lg ${
                                selectedDecor?.id === decor.id 
                                  ? "ring-2 ring-primary shadow-lg" 
                                  : "hover:border-primary/50"
                              }`}
                              onClick={() => setSelectedDecor(decor)}
                            >
                              <CardContent className="p-3">
                                <div className="relative mb-2 overflow-hidden rounded-lg">
                                  <img
                                    src={decor.texture_image_url}
                                    alt={decor.name}
                                    className="h-32 w-full object-cover transition-transform hover:scale-105"
                                  />
                                </div>
                                <h3 className="font-semibold text-sm leading-tight mb-1">
                                  {decor.name}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                  {decor.reference_code}
                                </p>
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t bg-background">
            <Button variant="outline" onClick={() => setShowDecorDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleGenerateRender}
              disabled={!selectedDecor || isGenerating}
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {renderCount > 1 ? `Générer ${renderCount} rendus` : "Générer le rendu"}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

export default ProjectDetail;
