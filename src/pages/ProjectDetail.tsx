import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Upload, Sparkles, Download, Loader2 } from "lucide-react";
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

  useEffect(() => {
    loadProject();
    loadDecors();
  }, [id, user]);

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
    if (!selectedPhoto || !selectedDecor || !user) return;

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("apply-decor", {
        body: {
          photoUrl: selectedPhoto.original_image_url,
          textureUrl: selectedDecor.texture_image_url,
          photoId: selectedPhoto.id,
          decorId: selectedDecor.id,
        },
      });

      if (error) throw error;

      toast.success("Rendu généré avec succès !");
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

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <h1 className="text-lg font-semibold">{project.title}</h1>
          <div className="w-24" /> {/* Spacer for centering */}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Photos du projet</CardTitle>
            <CardDescription>
              Uploadez une ou plusieurs photos pour appliquer des décors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label htmlFor="photo-upload">
              <Button asChild disabled={isUploading}>
                <span className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
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
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Upload className="mb-4 h-16 w-16 text-muted-foreground" />
              <h3 className="mb-2 text-xl font-semibold">Aucune photo</h3>
              <p className="text-center text-muted-foreground">
                Commencez par uploader une photo de votre produit
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {photos.map((photo) => (
              <Card key={photo.id}>
                <CardHeader>
                  <CardTitle className="text-base">Photo originale</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <img
                    src={photo.original_image_url}
                    alt="Photo projet"
                    className="w-full rounded-lg border"
                  />
                  
                  <Button
                    onClick={() => {
                      setSelectedPhoto(photo);
                      setShowDecorDialog(true);
                    }}
                    className="w-full"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Appliquer un décor
                  </Button>

                  {/* Renders for this photo */}
                  {renders[photo.id]?.map((render) => (
                    <div key={render.id} className="space-y-2 border-t pt-4">
                      <p className="text-sm font-medium">Résultat avec décor</p>
                      <img
                        src={render.result_image_url}
                        alt="Rendu"
                        className="w-full rounded-lg border"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        asChild
                      >
                        <a href={render.result_image_url} download>
                          <Download className="mr-2 h-4 w-4" />
                          Télécharger
                        </a>
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Decor Selection Dialog */}
      <Dialog open={showDecorDialog} onOpenChange={setShowDecorDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Choisir un décor</DialogTitle>
            <DialogDescription>
              Sélectionnez un décor DICA à appliquer sur votre photo
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {decors.map((decor) => (
                <Card
                  key={decor.id}
                  className={`cursor-pointer transition-all ${
                    selectedDecor?.id === decor.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedDecor(decor)}
                >
                  <CardContent className="p-4">
                    <img
                      src={decor.texture_image_url}
                      alt={decor.name}
                      className="mb-2 h-32 w-full rounded object-cover"
                    />
                    <h3 className="font-semibold">{decor.name}</h3>
                    <p className="text-sm text-muted-foreground">{decor.reference_code}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowDecorDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleGenerateRender}
              disabled={!selectedDecor || isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Générer le rendu
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectDetail;
