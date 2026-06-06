import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Wand2, Loader2, Heart, Star, FolderPlus, ImagePlus, X, Home, Maximize2 } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PremiumLayout, ContentContainer } from "@/components/ui/premium-layout";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ImageExportDropdown } from "@/components/ui/image-export-dropdown";
import { SafeImage } from "@/components/ui/safe-image";

interface DecorReference {
  reference: string;
  label: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  sourceImageUrls?: string[];  // Support multiple images
  sourceImageUrl?: string;     // Keep for backward compat
  decorReferences?: DecorReference[];  // References des décors DICA utilisés
}

interface UploadedImage {
  url: string;
  label: string;
}

interface Decor {
  id: string;
  name: string;
  reference_code: string;
  category: string;
  usage_contexts: string[];
  texture_image_url: string;
}

interface Favorite {
  id: string;
  title: string;
  prompt: string;
  response: string;
  image_data: string | null;
  created_at: string;
}

interface Project {
  id: string;
  title: string;
  use_case: string;
}

const Creative = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Bonjour ! Je suis votre assistant créatif DICA. Je peux vous aider à créer des mood boards, des plaquettes de présentation, et visualiser vos décors de manière créative. Que souhaitez-vous imaginer aujourd'hui ?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [decors, setDecors] = useState<Decor[]>([]);
  const [isDecorsLoading, setIsDecorsLoading] = useState(false);
  const [decorsLoadError, setDecorsLoadError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [selectedMessageIndex, setSelectedMessageIndex] = useState<number | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [saveToProjectDialogOpen, setSaveToProjectDialogOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [isSavingToProject, setIsSavingToProject] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentImageLabel, setCurrentImageLabel] = useState<string>("");
  const [showReferences, setShowReferences] = useState<boolean>(true); // Afficher les références DICA
  const [zoomedImage, setZoomedImage] = useState<string | null>(null); // Image en plein écran
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadDecors();
    loadFavorites();
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadFavorites = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("creative_favorites")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFavorites(data || []);
    } catch (error: unknown) {
      console.error("Error loading favorites:", error);
    }
  };

  const loadProjects = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id, title, use_case")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error: unknown) {
      console.error("Error loading projects:", error);
    }
  };

  const saveFavorite = async () => {
    if (!user || selectedMessageIndex === null || !saveTitle.trim()) return;
    
    setIsSaving(true);
    try {
      const userMessage = messages[selectedMessageIndex - 1];
      const assistantMessage = messages[selectedMessageIndex];
      
      console.log("Saving favorite - selectedIndex:", selectedMessageIndex);
      console.log("User message:", userMessage?.content?.substring(0, 100));
      console.log("Assistant message:", assistantMessage?.content?.substring(0, 100));
      console.log("Image URL present:", !!assistantMessage.imageUrl);
      
      // Si l'image est en base64, l'uploader d'abord dans le Storage
      let storedImageUrl: string | null = null;
      
      if (assistantMessage.imageUrl) {
        // Check if it's a base64 image
        if (assistantMessage.imageUrl.startsWith('data:image')) {
          console.log("Uploading base64 image to storage...");
          
          // Convert base64 to blob
          const response = await fetch(assistantMessage.imageUrl);
          const blob = await response.blob();
          
          // Upload to storage
          const fileName = `creative-${Date.now()}.png`;
          const filePath = `${user.id}/creative/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from("project-photos")
            .upload(filePath, blob, {
              contentType: 'image/png',
              upsert: false
            });
          
          if (uploadError) {
            console.error("Storage upload error:", uploadError);
            throw new Error(`Erreur upload image: ${uploadError.message}`);
          }
          
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from("project-photos")
            .getPublicUrl(filePath);
          
          storedImageUrl = publicUrl;
          console.log("Image uploaded successfully:", publicUrl);
        } else {
          // Already a URL, use directly
          storedImageUrl = assistantMessage.imageUrl;
        }
      }
      
      const { error } = await supabase
        .from("creative_favorites")
        .insert({
          user_id: user.id,
          title: saveTitle.trim(),
          prompt: userMessage?.content || "",
          response: assistantMessage.content,
          image_data: storedImageUrl
        });

      if (error) {
        console.error("Database insert error:", error);
        throw error;
      }
      
      toast.success("Favori enregistré !");
      setSaveDialogOpen(false);
      setSaveTitle("");
      setSelectedMessageIndex(null);
      loadFavorites();
    } catch (error: unknown) {
      console.error("Error saving favorite:", error);
      const message = error instanceof Error ? error.message : "Erreur lors de la sauvegarde";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteFavorite = async (id: string) => {
    try {
      const { error } = await supabase
        .from("creative_favorites")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Favori supprimé");
      loadFavorites();
    } catch (error: unknown) {
      console.error("Error deleting favorite:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const loadDecors = async () => {
    setIsDecorsLoading(true);
    setDecorsLoadError(null);

    try {
      const { data, error } = await supabase
        .from("decors")
        .select("id, name, reference_code, category, usage_contexts, texture_image_url")
        .eq("is_active", true)
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      console.log(`Décors chargés: ${data?.length || 0} décors actifs`);
      setDecors(data || []);

      if (!data || data.length === 0) {
        setDecorsLoadError("Aucun décor actif trouvé dans le catalogue");
      }
    } catch (error: unknown) {
      console.error("Error loading decors:", error);
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      setDecorsLoadError(message);
      toast.error("Erreur lors du chargement des décors");
    } finally {
      setIsDecorsLoading(false);
    }
  };

  const buildDecorContext = () => {
    if (decors.length === 0) {
      console.warn("Aucun décor disponible pour le contexte");
      return "Aucun décor DICA disponible actuellement.";
    }

    const decorsByCategory = decors.reduce((acc, decor) => {
      if (!acc[decor.category]) {
        acc[decor.category] = [];
      }
      acc[decor.category].push(decor);
      return acc;
    }, {} as Record<string, Decor[]>);

    const allReferences = decors.map(d => d.reference_code);
    
    // Pick up to 3 real examples from the catalog
    const exampleRefs = decors.slice(0, 3).map(d => `- "${d.reference_code}" ✅ ${d.name}`).join('\n');

    let context = `════════════════════════════════════════════════════════════════
🚨 CATALOGUE DICA - LISTE STRICTE (${decors.length} décors)
════════════════════════════════════════════════════════════════

⛔ RÈGLE ABSOLUE: UNIQUEMENT les références ci-dessous.
⛔ INVENTER une référence = ERREUR FATALE BLOQUÉE.

📋 RÉFÉRENCES VALIDES:
${allReferences.join('\n')}

✅ EXEMPLES CORRECTS:
${exampleRefs}

📚 DÉTAIL PAR CATÉGORIE:
`;

    for (const [category, categoryDecors] of Object.entries(decorsByCategory)) {
      context += `\n📁 ${category.toUpperCase()}:\n`;
      categoryDecors.forEach(decor => {
        context += `  • "${decor.reference_code}" = ${decor.name}\n`;
      });
    }

    context += `\n⛔ COPIE les références EXACTEMENT. Ne modifie PAS, n'invente PAS.\n`;

    console.log(`Contexte décors construit: ${decors.length} décors dans ${Object.keys(decorsByCategory).length} catégories`);
    return context;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Veuillez sélectionner une image");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 10 Mo");
      return;
    }

    if (uploadedImages.length >= 5) {
      toast.error("Maximum 5 images par génération");
      return;
    }

    setIsUploading(true);
    try {
      const fileName = `source-${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage
        .from("project-photos")
        .upload(`${user.id}/${fileName}`, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("project-photos")
        .getPublicUrl(`${user.id}/${fileName}`);

      // Add image with label
      const label = currentImageLabel.trim() || `Image ${uploadedImages.length + 1}`;
      setUploadedImages(prev => [...prev, { url: publicUrl, label }]);
      setCurrentImageLabel("");
      toast.success(`${label} uploadée`);
    } catch (error: unknown) {
      console.error("Error uploading image:", error);
      toast.error("Erreur lors de l'upload");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeUploadedImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const streamChat = async (userMessage: string, sourceImages?: UploadedImage[]) => {
    const decorContext = buildDecorContext();
    const chatUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/creative-chat`;
    
    // Get the user's session token for authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error("Session expirée - veuillez vous reconnecter");
    }
    
    // Build source images array with labels for the prompt
    const sourceImageUrls = sourceImages?.map(img => img.url) || [];
    const imageLabels = sourceImages?.map(img => img.label) || [];
    
    const resp = await fetch(chatUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ 
        messages: [...messages, { role: "user", content: userMessage }],
        decorContext,
        sourceImageUrls,  // Array of image URLs
        imageLabels,      // Array of labels for each image
        showReferences,   // Afficher les références DICA sur l'image
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429 || resp.status === 402) {
        const errorData = await resp.json();
        throw new Error(errorData.error);
      }
      throw new Error("Échec de la connexion au service IA");
    }

    const contentType = resp.headers.get("content-type") || "";

    // Si la réponse est en JSON, on la consomme ici et on NE tente PAS de streamer ensuite.
    if (contentType.includes("application/json")) {
      const data = await resp.json();

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.type === "image") {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.text,
            imageUrl: data.imageUrl,
            decorReferences: data.decorReferences || [],
          },
        ]);
        return;
      }

      if (data?.type === "text" && typeof data?.content === "string") {
        setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
        return;
      }

      throw new Error("Réponse inattendue du service IA");
    }

    // Stream text response
    if (!resp.body) {
      throw new Error("Échec de la connexion au service IA");
    }

    const reader = resp.body.getReader();

    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;
    let assistantContent = "";

    // Add empty assistant message that we'll update
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantContent += content;
            setMessages(prev => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = {
                role: "assistant",
                content: assistantContent
              };
              return newMessages;
            });
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    const sourceImages = [...uploadedImages];
    setInput("");
    setUploadedImages([]);
    setMessages(prev => [...prev, { 
      role: "user", 
      content: userMessage,
      sourceImageUrls: sourceImages.length > 0 ? sourceImages.map(img => img.url) : undefined
    }]);
    setIsLoading(true);

    try {
      await streamChat(userMessage, sourceImages.length > 0 ? sourceImages : undefined);
    } catch (error: unknown) {
      console.error("Error:", error);
      const message = error instanceof Error ? error.message : "Erreur lors de la communication avec l'IA";
      toast.error(message);
      // Remove the empty assistant message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // La fonction downloadImage a été remplacée par ImageExportDropdown
  // qui supporte PNG, JPEG et WebP avec choix du format

  const saveImageToProject = async () => {
    if (!user || !selectedImageUrl) {
      console.error("Missing user or selectedImageUrl", { user: !!user, selectedImageUrl: !!selectedImageUrl });
      toast.error("Erreur: utilisateur ou image manquant");
      return;
    }
    
    console.log("Starting saveImageToProject...", { 
      selectedImageUrl: selectedImageUrl.substring(0, 100) + "...",
      selectedProjectId,
      newProjectTitle 
    });
    
    setIsSavingToProject(true);
    try {
      let projectId = selectedProjectId;
      
      // Create new project if needed
      if (!projectId && newProjectTitle.trim()) {
        console.log("Creating new project:", newProjectTitle.trim());
        const { data: newProject, error: projectError } = await supabase
          .from("projects")
          .insert({
            user_id: user.id,
            title: newProjectTitle.trim(),
            use_case: "autre"
          })
          .select()
          .single();

        if (projectError) {
          console.error("Project creation error:", projectError);
          throw projectError;
        }
        projectId = newProject.id;
        console.log("New project created:", projectId);
      }

      if (!projectId) {
        toast.error("Veuillez sélectionner ou créer un projet");
        return;
      }

      let publicUrl: string;
      
      // Check if the image is base64 or already a URL
      if (selectedImageUrl.startsWith('data:image')) {
        console.log("Converting base64 to storage...");
        
        try {
          // Extract base64 data and convert to blob manually
          const base64Data = selectedImageUrl.split(',')[1];
          const mimeType = selectedImageUrl.split(':')[1]?.split(';')[0] || 'image/png';
          
          // Decode base64 to binary
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: mimeType });
          
          console.log("Blob created:", { size: blob.size, type: blob.type });
          
          // Upload to storage in creative subfolder
          const extension = mimeType.split('/')[1] || 'png';
          const fileName = `creative-${Date.now()}.${extension}`;
          const filePath = `${user.id}/creative/${fileName}`;
          
          console.log("Uploading to storage:", filePath);
          
          const { error: uploadError } = await supabase.storage
            .from("project-photos")
            .upload(filePath, blob, {
              contentType: mimeType,
              upsert: false
            });

          if (uploadError) {
            console.error("Storage upload error:", uploadError);
            throw new Error(`Erreur upload: ${uploadError.message}`);
          }

          // Get public URL
          const { data } = supabase.storage
            .from("project-photos")
            .getPublicUrl(filePath);
          
          publicUrl = data.publicUrl;
          console.log("Image uploaded to storage:", publicUrl);
        } catch (conversionError: unknown) {
          console.error("Base64 conversion error:", conversionError);
          const message = conversionError instanceof Error ? conversionError.message : "Erreur inconnue";
          throw new Error(`Erreur de conversion d'image: ${message}`);
        }
      } else {
        // Already a URL, use directly
        publicUrl = selectedImageUrl;
        console.log("Using existing URL:", publicUrl);
      }

      // Check if project has photos, if not create one
      const { data: existingPhotos } = await supabase
        .from("project_photos")
        .select("id")
        .eq("project_id", projectId)
        .limit(1);

      let photoId: string;
      
      if (!existingPhotos || existingPhotos.length === 0) {
        console.log("Creating new photo entry for project:", projectId);
        // Create a photo entry for the project (using the creative image as source)
        const { data: newPhoto, error: photoError } = await supabase
          .from("project_photos")
          .insert({
            project_id: projectId,
            original_image_url: publicUrl
          })
          .select()
          .single();

        if (photoError) {
          console.error("Photo creation error:", photoError);
          throw photoError;
        }
        photoId = newPhoto.id;
      } else {
        photoId = existingPhotos[0].id;
      }

      console.log("Saving render result with photoId:", photoId);
      
      // Save as RENDER RESULT for full features (zoom, export, plaquette)
      const { error: renderError } = await supabase
        .from("render_results")
        .insert({
          project_photo_id: photoId,
          result_image_url: publicUrl,
          decor_id: null // Creative generation - no specific decor
        });

      if (renderError) {
        console.error("Render result error:", renderError);
        throw renderError;
      }

      console.log("Image saved successfully!");
      toast.success("✅ Image ajoutée avec zoom, export et plaquette disponibles !");
      setSaveToProjectDialogOpen(false);
      setSelectedImageUrl(null);
      setSelectedProjectId("");
      setNewProjectTitle("");
      loadProjects();
    } catch (error: unknown) {
      console.error("Error saving to project:", error);
      const message = error instanceof Error ? error.message : "Erreur lors de la sauvegarde";
      toast.error(message);
    } finally {
      setIsSavingToProject(false);
    }
  };

  return (
    <PremiumLayout backgroundImage="/images/assistant-creatif.png">
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
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wand2 className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg md:text-xl font-semibold tracking-tight text-foreground">Assistant Créatif</h1>
              <p className="text-xs text-muted-foreground">Powered by DICA AI</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <ThemeToggle className="text-muted-foreground" />
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

      <ContentContainer className="max-w-4xl pb-20">
        <Tabs defaultValue="chat" className="w-full">
          {/* Tabs Navigation Premium */}
          <div className="flex justify-center mb-8">
            <TabsList className="h-12 p-1 bg-muted/50 backdrop-blur-sm rounded-xl">
              <TabsTrigger 
                value="chat" 
                className="h-10 px-6 rounded-lg text-foreground data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                <Wand2 className="mr-2 h-4 w-4" />
                Nouvelle création
              </TabsTrigger>
              <TabsTrigger 
                value="favorites" 
                className="h-10 px-6 rounded-lg text-foreground data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                <Heart className="mr-2 h-4 w-4" />
                Favoris ({favorites.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="chat" className="animate-fade-in">
            <div className="card-premium p-6 md:p-8">
              {/* Header */}
              <div className="mb-6 pb-6 border-b border-border/50">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                    <Wand2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold mb-1">Studio Créatif DICA</h2>
                    <p className="text-sm text-muted-foreground">
                      Créez des mood boards, plaquettes et visualisations avec vos décors
                    </p>
                  </div>
                </div>
              </div>

              {/* Catalogue status */}
              <div className="mb-6">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Catalogue décors :</span>{" "}
                    {isDecorsLoading ? (
                      <span className="inline-flex items-center gap-2 text-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Chargement…
                      </span>
                    ) : decorsLoadError ? (
                      <span className="text-destructive">Indisponible</span>
                    ) : (
                      <span className="text-foreground">{decors.length} disponibles</span>
                    )}
                    {decorsLoadError ? (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {decorsLoadError}
                      </div>
                    ) : null}
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={loadDecors}
                    disabled={isDecorsLoading}
                  >
                    Recharger
                  </Button>
                </div>
              </div>

              {/* Chat Area */}
              <div className="space-y-6">
                <ScrollArea className="h-[450px] pr-4 scrollbar-minimal">
                    <div className="space-y-4">
                      {messages.map((message, index) => (
                        <div
                          key={index}
                          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div className="flex flex-col gap-2 max-w-[80%]">
                            <div
                              className={`rounded-lg px-4 py-3 ${
                                message.role === "user"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-foreground"
                              }`}
                            >
                              {message.sourceImageUrls && message.sourceImageUrls.length > 0 && message.role === "user" && (
                                <div className="mb-2 flex flex-wrap gap-2">
                                  {message.sourceImageUrls.map((url, idx) => (
                                    <SafeImage 
                                      key={idx}
                                      src={url} 
                                      alt={`Photo source ${idx + 1}`} 
                                      className="rounded-lg h-16 w-16 object-cover"
                                    />
                                  ))}
                                </div>
                              )}
                              {message.sourceImageUrl && !message.sourceImageUrls && message.role === "user" && (
                                <div className="mb-2">
                                  <SafeImage 
                                    src={message.sourceImageUrl} 
                                    alt="Photo source" 
                                    className="rounded-lg max-h-40 w-auto"
                                  />
                                </div>
                              )}
                              {message.imageUrl ? (
                                <div className="space-y-3">
                                  <p className="whitespace-pre-wrap text-sm text-foreground">{message.content}</p>
                                  <div className="space-y-2">
                                    {/* Image avec overlay de zoom */}
                                    <div 
                                      role="button"
                                      tabIndex={0}
                                      className="relative group cursor-pointer"
                                      onClick={() => setZoomedImage(message.imageUrl ?? null)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault();
                                          setZoomedImage(message.imageUrl ?? null);
                                        }
                                      }}
                                    >
                                      <SafeImage 
                                        src={message.imageUrl} 
                                        alt="Visualisation générée" 
                                        className="rounded-lg w-full max-w-2xl transition-transform hover:scale-[1.02]"
                                      />
                                      {/* Overlay avec icône zoom */}
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all rounded-lg flex items-center justify-center">
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-black/90 rounded-full p-3 shadow-lg">
                                          <Maximize2 className="h-6 w-6 text-primary" />
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {/* Bouton Zoom */}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setZoomedImage(message.imageUrl ?? null)}
                                      >
                                        <Maximize2 className="h-4 w-4 mr-2" />
                                        Agrandir
                                      </Button>
                                      <ImageExportDropdown
                                        imageUrl={message.imageUrl}
                                        filename={`dica-creative-${Date.now()}`}
                                        variant="outline"
                                        size="sm"
                                      />
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedImageUrl(message.imageUrl ?? null);
                                          setSaveToProjectDialogOpen(true);
                                        }}
                                      >
                                        <FolderPlus className="h-4 w-4 mr-2" />
                                        Enregistrer dans un projet
                                      </Button>
                                    </div>
                                    
                                    {/* Références DICA utilisées */}
                                    {message.decorReferences && message.decorReferences.length > 0 && (
                                      <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
                                        <p className="text-xs font-semibold text-primary mb-2 flex items-center gap-1.5">
                                          <span className="text-sm">🏷️</span>
                                          Décors DICA utilisés
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                          {message.decorReferences.map((decor, idx) => (
                                            <div
                                              key={idx}
                                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-black/40 border border-border/50 shadow-sm"
                                            >
                                              <span className="text-xs font-medium text-foreground">{decor.label}</span>
                                              <span className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded">
                                                {decor.reference}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <p className="whitespace-pre-wrap text-sm text-foreground">{message.content}</p>
                              )}
                            </div>
                            {message.role === "assistant" && index > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="self-start"
                                onClick={() => {
                                  setSelectedMessageIndex(index);
                                  setSaveDialogOpen(true);
                                }}
                              >
                                <Heart className="h-4 w-4 mr-2" />
                                Sauvegarder en favori
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Multi-image preview */}
                  {uploadedImages.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        📷 Images à combiner ({uploadedImages.length}/5) :
                      </p>
                      <div className="flex flex-wrap gap-3">
                        {uploadedImages.map((img, index) => (
                          <div key={index} className="relative group">
                            <SafeImage 
                              src={img.url} 
                              alt={img.label} 
                              className="rounded-lg h-20 w-20 object-cover border-2 border-primary"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs px-1 py-0.5 rounded-b-lg truncate">
                              {img.label}
                            </div>
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute -top-2 -right-2 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeUploadedImage(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Image upload with label */}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <Input
                        value={currentImageLabel}
                        onChange={(e) => setCurrentImageLabel(e.target.value)}
                        placeholder="Étiquette (ex: Van, Décor bois, Personnes...)"
                        disabled={isLoading || isUploading || uploadedImages.length >= 5}
                        className="w-48"
                      />
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading || isUploading || uploadedImages.length >= 5}
                        title="Ajouter une image"
                      >
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <ImagePlus className="h-4 w-4 mr-2" />
                        )}
                        Ajouter
                      </Button>
                    </div>
                  </div>

                  {/* Message input */}
                  <div className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={uploadedImages.length > 0 
                        ? "Décrivez comment combiner ces éléments..."
                        : "Ex: Créer un mood board des décors marbre pour une salle de bain..."}
                      disabled={isLoading}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleSend} 
                      disabled={isLoading || !input.trim()}
                      size="icon"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Option références DICA */}
                  <div className="flex items-center space-x-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                    <input
                      type="checkbox"
                      id="show-references-creative"
                      checked={showReferences}
                      onChange={(e) => setShowReferences(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <div className="flex-1">
                      <label htmlFor="show-references-creative" className="cursor-pointer text-sm font-medium text-foreground">
                        🏷️ Afficher les références DICA
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Ajoute les noms et codes des décors sur l'image générée
                      </p>
                    </div>
                  </div>

                  {/* Tips */}
                  <div className="p-4 rounded-xl bg-muted/50 text-xs text-muted-foreground space-y-2">
                    <p className="font-medium text-foreground">💡 Astuces</p>
                    <p>Uploadez plusieurs images (décor, van, personnes...) et demandez à l'IA de les combiner en une scène créative.</p>
                    <p>🏷️ <span className="font-medium">Étiquettes</span> : Nommez chaque image avant de l'ajouter (ex: "Van", "Décor bois", "Client") pour aider l'IA à comprendre le rôle de chaque élément dans la composition.</p>
                  </div>
                </div>
              </div>
            </TabsContent>

          <TabsContent value="favorites" className="animate-fade-in">
            <div className="card-premium p-6 md:p-8">
              {/* Header */}
              <div className="mb-6 pb-6 border-b border-border/50">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                    <Star className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold mb-1">Mes créations favorites</h2>
                    <p className="text-sm text-muted-foreground">
                      Retrouvez toutes vos générations sauvegardées
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              {favorites.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-muted flex items-center justify-center">
                    <Heart className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-medium mb-2">Aucun favori</p>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Enregistrez vos créations préférées en cliquant sur le cœur pour les retrouver ici.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {favorites.map((favorite, index) => (
                    <div 
                      key={favorite.id} 
                      className="rounded-xl border border-border/50 bg-card hover:shadow-md transition-all overflow-hidden animate-slide-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {/* Image si présente */}
                      {favorite.image_data && (
                        <div 
                          role="button"
                          tabIndex={0}
                          className="relative group cursor-pointer"
                          onClick={() => setZoomedImage(favorite.image_data)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setZoomedImage(favorite.image_data);
                            }
                          }}
                        >
                          <SafeImage 
                            src={favorite.image_data} 
                            alt={favorite.title}
                            className="w-full aspect-square object-cover"
                          />
                          {/* Badge favori */}
                          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                            <Heart className="h-3 w-3 fill-current" />
                            Favori
                          </div>
                          {/* Overlay au survol */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="flex gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                className="h-8 px-3 bg-white hover:bg-white shadow-md"
                              >
                                <Maximize2 className="h-3.5 w-3.5 mr-1.5 text-foreground" />
                                <span className="text-foreground text-xs">Agrandir</span>
                              </Button>
                              <ImageExportDropdown
                                imageUrl={favorite.image_data || ''}
                                filename={`dica-favorite-${favorite.id}`}
                                variant="secondary"
                                size="sm"
                                className="h-8 px-3 bg-white hover:bg-white shadow-md"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Infos */}
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate">{favorite.title}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(favorite.created_at).toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "short",
                                year: "numeric"
                              })}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteFavorite(favorite.id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0 h-8 w-8 p-0"
                          >
                            <Heart className="h-4 w-4 fill-current" />
                          </Button>
                        </div>
                        
                        {/* Prompt */}
                        <p className="text-xs text-muted-foreground line-clamp-2">{favorite.prompt}</p>
                        
                        {/* Message si pas d'image */}
                        {!favorite.image_data && (
                          <div className="mt-3 p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground line-clamp-3">{favorite.response}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Save Dialog */}
        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Sauvegarder en favori</DialogTitle>
                <DialogDescription>
                  Donnez un titre à cette création pour la retrouver facilement
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  placeholder="Ex: Mood board marbre salle de bain"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      saveFavorite();
                    }
                  }}
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button 
                    onClick={saveFavorite} 
                    disabled={isSaving || !saveTitle.trim()}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Heart className="mr-2 h-4 w-4" />
                        Enregistrer
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={saveToProjectDialogOpen} onOpenChange={setSaveToProjectDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Enregistrer dans un projet</DialogTitle>
                <DialogDescription>
                  Choisissez un projet existant ou créez-en un nouveau
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {projects.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Projet existant</label>
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un projet" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Ou</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Nouveau projet</label>
                  <Input
                    value={newProjectTitle}
                    onChange={(e) => {
                      setNewProjectTitle(e.target.value);
                      setSelectedProjectId("");
                    }}
                    placeholder="Nom du nouveau projet"
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setSaveToProjectDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button 
                    onClick={saveImageToProject} 
                    disabled={isSavingToProject || (!selectedProjectId && !newProjectTitle.trim())}
                  >
                    {isSavingToProject ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <FolderPlus className="mr-2 h-4 w-4" />
                        Enregistrer
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Dialog Zoom Plein Écran */}
          <Dialog open={!!zoomedImage} onOpenChange={(open) => !open && setZoomedImage(null)}>
            <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
              <div className="relative w-full h-full flex items-center justify-center">
                {/* Bouton fermer */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 text-white rounded-full h-10 w-10"
                  onClick={() => setZoomedImage(null)}
                >
                  <X className="h-5 w-5" />
                </Button>
                
                {/* Actions en haut à gauche */}
                <div className="absolute top-4 left-4 z-50 flex gap-2">
                  <ImageExportDropdown
                    imageUrl={zoomedImage || ''}
                    filename={`dica-creative-${Date.now()}`}
                    variant="secondary"
                    size="sm"
                    className="bg-white/10 hover:bg-white/20 text-white border-none"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-white/10 hover:bg-white/20 text-white border-none"
                    onClick={() => {
                      if (zoomedImage) {
                        setSelectedImageUrl(zoomedImage);
                        setZoomedImage(null);
                        setSaveToProjectDialogOpen(true);
                      }
                    }}
                  >
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Enregistrer
                  </Button>
                </div>

                {/* Image zoomée */}
                {zoomedImage && (
                  <SafeImage
                    src={zoomedImage}
                    alt="Visualisation en plein écran"
                    className="max-w-full max-h-[90vh] object-contain rounded-lg"
                  />
                )}
              </div>
            </DialogContent>
          </Dialog>
        </ContentContainer>
    </PremiumLayout>
  );
};

export default Creative;