import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Sparkles, Loader2, Heart, Star, FolderPlus, ImagePlus, X, Home } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PremiumLayout, ContentContainer } from "@/components/ui/premium-layout";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ImageExportDropdown } from "@/components/ui/image-export-dropdown";
import { CreativeMessage } from "@/components/creative/CreativeMessage";
import { FavoriteCard } from "@/components/creative/FavoriteCard";
import type { Decor, Favorite, Project, UploadedImage } from "@/components/creative/types";
import {
  buildDecorContext,
  parseJsonChatResponse,
  sendCreativeChatRequest,
  streamAssistantText,
} from "@/lib/creative-chat";
import {
  createCreativeProject,
  ensureProjectPhoto,
  saveCreativeRenderResult,
  uploadCreativeImageToStorage,
} from "@/lib/creative-storage";
import type { Message } from "@/components/creative/types";

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
  const scrollRef = useRef<HTMLDivElement>(null);
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
          
          const { data: uploadData, error: uploadError } = await supabase.storage
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
      const { data: uploadData, error: uploadError } = await supabase.storage
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
    const decorContext = buildDecorContext(decors);

    // Récupère le jeton de session pour l'authentification de l'edge function.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error("Session expirée - veuillez vous reconnecter");
    }

    const resp = await sendCreativeChatRequest({
      messages,
      userMessage,
      decorContext,
      sourceImages,
      showReferences,
      accessToken: session.access_token,
    });

    const contentType = resp.headers.get("content-type") || "";

    // Réponse JSON : message unique (image ou texte) consommé sans streaming.
    if (contentType.includes("application/json")) {
      const data = await resp.json();
      setMessages((prev) => [...prev, parseJsonChatResponse(data)]);
      return;
    }

    // Réponse en flux : message assistant vide mis à jour au fil du stream.
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    await streamAssistantText(resp, (assistantContent) => {
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: "assistant",
          content: assistantContent,
        };
        return newMessages;
      });
    });
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

    setIsSavingToProject(true);
    try {
      // Crée le projet si nécessaire, sinon réutilise le projet sélectionné.
      let projectId = selectedProjectId;
      if (!projectId && newProjectTitle.trim()) {
        projectId = await createCreativeProject(user.id, newProjectTitle.trim());
      }

      if (!projectId) {
        toast.error("Veuillez sélectionner ou créer un projet");
        return;
      }

      // Résout l'URL publique (upload du base64 si besoin), garantit une photo
      // projet puis enregistre le rendu (zoom, export, plaquette).
      const publicUrl = await uploadCreativeImageToStorage(selectedImageUrl, user.id);
      const photoId = await ensureProjectPhoto(projectId, publicUrl);
      await saveCreativeRenderResult(photoId, publicUrl);

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
              <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-primary" />
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
                <Sparkles className="mr-2 h-4 w-4" />
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
                    <Sparkles className="h-6 w-6 text-primary" />
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
                        <CreativeMessage
                          key={index}
                          message={message}
                          index={index}
                          onZoom={setZoomedImage}
                          onSaveToProject={(imageUrl) => {
                            setSelectedImageUrl(imageUrl);
                            setSaveToProjectDialogOpen(true);
                          }}
                          onSaveFavorite={(messageIndex) => {
                            setSelectedMessageIndex(messageIndex);
                            setSaveDialogOpen(true);
                          }}
                        />
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
                            <img 
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
                    <FavoriteCard
                      key={favorite.id}
                      favorite={favorite}
                      index={index}
                      onZoom={setZoomedImage}
                      onDelete={deleteFavorite}
                    />
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
                    <label htmlFor="creative-existing-project" className="text-sm font-medium text-foreground">Projet existant</label>
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                      <SelectTrigger id="creative-existing-project">
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
                  <label htmlFor="creative-new-project-title" className="text-sm font-medium text-foreground">Nouveau projet</label>
                  <Input
                    id="creative-new-project-title"
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

                {/* Image zoomée — wrappée pour intercepter le click et
                    éviter que le Dialog ne se ferme si on clique l'image
                    (le fond noir conserve son comportement de fermeture). */}
                {zoomedImage && (
                  // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
                  <div
                    className="max-w-full max-h-[90vh]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <img
                      src={zoomedImage}
                      alt="Visualisation en plein écran"
                      className="max-w-full max-h-[90vh] object-contain rounded-lg"
                    />
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </ContentContainer>
    </PremiumLayout>
  );
};

export default Creative;