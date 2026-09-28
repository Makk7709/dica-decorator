import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { safeImageFileName, UploadValidationError } from "@/lib/safe-upload";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Heart, FolderPlus, X, Maximize2, History, SquarePen, Images, Cloud, CloudOff } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PremiumLayout, ContentContainer } from "@/components/ui/premium-layout";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ImageExportDropdown } from "@/components/ui/image-export-dropdown";
import { SafeImage } from "@/components/ui/safe-image";
import { VoiceAssistant, type ComposeResult } from "@/components/creative/VoiceAssistant";
import { ChatComposer, MAX_ATTACHMENTS, type ComposerAttachment } from "@/components/creative/ChatComposer";
import { ChatMessageItem, AssistantTyping } from "@/components/creative/ChatMessageItem";
import { ChatEmptyState } from "@/components/creative/ChatEmptyState";
import { ConversationHistory } from "@/components/creative/ConversationHistory";
import { useCreativeConversation, type ChatMessage } from "@/hooks/use-creative-conversation";
import creativeBackground from "@/assets/creative-background.png.asset.json";

type Message = ChatMessage;
type UploadedImage = ComposerAttachment;

/** Historique transmis au serveur (le serveur refuse au-delà de 60 messages). */
const MAX_HISTORY_SENT = 40;

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
  const {
    messages,
    setMessages,
    conversationId,
    conversations,
    isRestoring,
    syncState,
    startNew,
    openConversation,
    deleteConversation,
  } = useCreativeConversation(user?.id);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
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
  const [showReferences, setShowReferences] = useState<boolean>(true); // Afficher les références DICA
  const [zoomedImage, setZoomedImage] = useState<string | null>(null); // Image en plein écran
  const scrollRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const lastScrollTopRef = useRef(0);

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

  const hasThread = messages.length > 0 || isLoading;

  // Nouveau message ou conversation rouverte : on revient en bas.
  useEffect(() => {
    stickToBottomRef.current = true;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, isRestoring, conversationId]);

  // Texte en streaming, images qui finissent de charger : on reste collé en bas tant que l'utilisateur n'a pas remonté.
  useEffect(() => {
    const el = scrollRef.current;
    const thread = threadRef.current;
    if (!el || !thread || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (stickToBottomRef.current) el.scrollTop = el.scrollHeight;
    });
    observer.observe(thread);
    return () => observer.disconnect();
  }, [isRestoring, hasThread]);

  // Seul un défilement vers le haut détache le fil : le contenu qui grandit (image chargée) ne doit pas le faire.
  const handleThreadScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (nearBottom) stickToBottomRef.current = true;
    else if (el.scrollTop < lastScrollTopRef.current) stickToBottomRef.current = false;
    lastScrollTopRef.current = el.scrollTop;
  };

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
      console.log("User message length:", userMessage?.content?.length ?? 0);
      console.log("Assistant message length:", assistantMessage?.content?.length ?? 0);
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

    if (uploadedImages.length >= MAX_ATTACHMENTS) {
      toast.error(`Maximum ${MAX_ATTACHMENTS} photos par génération`);
      return;
    }

    setIsUploading(true);
    try {
      const fileName = `source-${safeImageFileName(file, 10 * 1024 * 1024)}`;
      const { error: uploadError } = await supabase.storage
        .from("project-photos")
        .upload(`${user.id}/${fileName}`, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("project-photos")
        .getPublicUrl(`${user.id}/${fileName}`);

      const label = file.name.replace(/\.[^.]+$/, "").slice(0, 40) || `Photo ${uploadedImages.length + 1}`;
      setUploadedImages(prev => [...prev, { url: publicUrl, label }]);
    } catch (error: unknown) {
      console.error("Error uploading image:", error);
      toast.error(error instanceof UploadValidationError ? error.message : "Erreur lors de l'upload");
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const removeUploadedImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const renameUploadedImage = (index: number, label: string) => {
    setUploadedImages(prev => prev.map((img, i) => (i === index ? { ...img, label } : img)));
  };

  const streamChat = async (
    userMessage: string,
    sourceImages?: UploadedImage[],
    requestedDecorRefs?: string[],
  ): Promise<"image" | "text"> => {
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
        messages: [...messages, { role: "user", content: userMessage } as Message]
          .slice(-MAX_HISTORY_SENT)
          .map(({ role, content, sourceImageUrls }) => ({ role, content, sourceImageUrls })),
        decorContext,
        sourceImageUrls,  // Array of image URLs
        imageLabels,      // Array of labels for each image
        showReferences,   // Afficher les références DICA sur l'image
        requestedDecorRefs,
      }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => null);
      throw new Error(
        typeof errorData?.error === "string" ? errorData.error : "Échec de la connexion au service IA"
      );
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
        // Enregistre le visuel dans la galerie, puis remplace le base64 par l'URL de stockage
        // pour que la conversation puisse être sauvegardée.
        void autoSaveCreation(data.imageUrl, userMessage).then((storedUrl) => {
          if (storedUrl && storedUrl !== data.imageUrl) {
            setMessages((prev) => prev.map((m) => (m.imageUrl === data.imageUrl ? { ...m, imageUrl: storedUrl } : m)));
          }
        });
        return data.imageUrl ? "image" : "text";
      }

      if (data?.type === "text" && typeof data?.content === "string") {
        setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
        return "text";
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
    return "text";
  };

  const handleVoiceCompose = async (brief: string, references: string[]): Promise<ComposeResult> => {
    if (isLoading) return { ok: false, error: "une autre génération est déjà en cours" };
    const userMessage = `🎤 Composition : ${brief}\nDécors : ${references.join(", ")}`;
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);
    try {
      const outcome = await streamChat(userMessage, undefined, references);
      return outcome === "image"
        ? { ok: true }
        : { ok: false, error: "l'assistant demande des précisions, affichées dans le chat" };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erreur lors de la génération";
      toast.error(message);
      return { ok: false, error: message };
    } finally {
      setIsLoading(false);
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
      // Retire le message envoyé (et la réponse vide éventuelle) et le remet dans le champ pour réessayer.
      setMessages(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant" && !last.content && !last.imageUrl) next.pop();
        if (next[next.length - 1]?.role === "user" && next[next.length - 1]?.content === userMessage) next.pop();
        return next;
      });
      setInput(userMessage);
      setUploadedImages(sourceImages);
    } finally {
      setIsLoading(false);
    }
  };

  // La fonction downloadImage a été remplacée par ImageExportDropdown
  // qui supporte PNG, JPEG et WebP avec choix du format

  // Auto-save AI creation to dedicated gallery (table ai_creations)
  const autoSaveCreation = async (imageUrl: string, promptText: string): Promise<string | null> => {
    if (!user || !imageUrl) return null;
    try {
      let storedUrl = imageUrl;
      if (imageUrl.startsWith("data:image")) {
        const base64Data = imageUrl.split(",")[1];
        const mimeType = imageUrl.split(":")[1]?.split(";")[0] || "image/png";
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        const blob = new Blob([bytes], { type: mimeType });
        const extension = mimeType.split("/")[1] || "png";
        const filePath = `${user.id}/creative/creation-${Date.now()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("project-photos")
          .upload(filePath, blob, { contentType: mimeType, upsert: false });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("project-photos").getPublicUrl(filePath);
        storedUrl = data.publicUrl;
      }
      const { error } = await supabase.from("ai_creations").insert({
        user_id: user.id,
        image_url: storedUrl,
        prompt: promptText.slice(0, 2000),
      });
      if (error) throw error;
      return storedUrl;
    } catch (err) {
      console.error("autoSaveCreation error:", err);
      return null;
    }
  };

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

  const lastMessage = messages[messages.length - 1];
  const isStreamingText = isLoading && lastMessage?.role === "assistant" && !!lastMessage.content;
  const visibleMessages = messages.filter((m) => m.role === "user" || m.content || m.imageUrl);
  const activeTitle = conversations.find((c) => c.id === conversationId)?.title;

  const catalogStatus = isDecorsLoading ? (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] text-muted-foreground">
      <Loader2 className="h-3 w-3 animate-spin" /> Catalogue…
    </span>
  ) : decorsLoadError ? (
    <button
      type="button"
      onClick={loadDecors}
      className="inline-flex items-center gap-1.5 font-mono text-[10.5px] text-destructive hover:underline"
      title={decorsLoadError}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-destructive" /> Catalogue indisponible · réessayer
    </button>
  ) : (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-success" /> {decors.length} décors
    </span>
  );

  const syncLabel = {
    idle: null,
    saving: { icon: Loader2, text: "Enregistrement…", spin: true },
    saved: { icon: Cloud, text: "Enregistré", spin: false },
    offline: { icon: CloudOff, text: "Hors ligne · copie locale", spin: false },
  }[syncState];

  const handleNewConversation = () => {
    if (isLoading) return;
    startNew();
    setInput("");
    setUploadedImages([]);
    setHistoryOpen(false);
  };

  const handleOpenConversation = async (id: string) => {
    if (isLoading) return;
    setHistoryOpen(false);
    const ok = await openConversation(id);
    if (!ok) toast.error("Impossible d'ouvrir cette conversation");
  };

  const confirmDeleteConversation = async () => {
    if (!pendingDeleteId) return;
    const ok = await deleteConversation(pendingDeleteId);
    setPendingDeleteId(null);
    toast[ok ? "success" : "error"](ok ? "Conversation supprimée" : "Suppression impossible");
  };

  return (
    <PremiumLayout backgroundImage={creativeBackground.url}>
      <header className="header-premium sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Retour au tableau de bord"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <p className="eyebrow leading-none">Studio créatif</p>
              <h1 className="mt-1 truncate font-display text-base font-semibold leading-tight text-foreground sm:text-lg">
                {activeTitle ?? (messages.length > 0 ? "Conversation en cours" : "Nouvelle conversation")}
              </h1>
            </div>
            {syncLabel && (
              <span
                className="hidden shrink-0 items-center gap-1.5 font-mono text-[10.5px] text-muted-foreground md:inline-flex"
                aria-live="polite"
              >
                <syncLabel.icon className={`h-3 w-3 ${syncLabel.spin ? "animate-spin" : ""}`} />
                {syncLabel.text}
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHistoryOpen(true)}
              className="text-muted-foreground hover:text-foreground"
              title="Historique des conversations"
            >
              <History className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Historique</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewConversation}
              disabled={isLoading}
              className="text-muted-foreground hover:text-foreground"
              title="Nouvelle conversation"
            >
              <SquarePen className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Nouvelle</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/ai-creations")}
              className="text-muted-foreground hover:text-foreground"
              title="Mes créations"
            >
              <Images className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Mes créations</span>
            </Button>
            <ThemeToggle className="text-muted-foreground" />
          </div>
        </div>
      </header>

      <ConversationHistory
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        conversations={conversations}
        activeId={conversationId}
        onSelect={handleOpenConversation}
        onNew={handleNewConversation}
        onDelete={setPendingDeleteId}
      />

      <ContentContainer className="max-w-4xl py-4 pb-8 md:py-6">
        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="chat">Studio</TabsTrigger>
            <TabsTrigger value="favorites">
              Favoris
              <span className="ml-2 font-mono text-[10.5px] text-muted-foreground">{favorites.length}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-0">
            <div className="card-premium flex h-[calc(100dvh-10.5rem)] min-h-[460px] flex-col md:h-[calc(100dvh-12rem)]">
              <div
                ref={scrollRef}
                onScroll={handleThreadScroll}
                className="scrollbar-minimal min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6"
              >
                {isRestoring ? (
                  <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Chargement de la conversation…
                  </div>
                ) : visibleMessages.length === 0 && !isLoading ? (
                  <ChatEmptyState
                    onPick={setInput}
                    recent={conversations}
                    onOpenConversation={handleOpenConversation}
                  />
                ) : (
                  <div ref={threadRef} className="space-y-6">
                    {messages.map((message, index) =>
                      message.role === "assistant" && !message.content && !message.imageUrl ? null : (
                        <ChatMessageItem
                          key={index}
                          message={message}
                          canFavorite={message.role === "assistant" && index > 0}
                          onZoom={setZoomedImage}
                          onSaveToProject={(url) => {
                            setSelectedImageUrl(url);
                            setSaveToProjectDialogOpen(true);
                          }}
                          onFavorite={() => {
                            setSelectedMessageIndex(index);
                            setSaveDialogOpen(true);
                          }}
                        />
                      ),
                    )}
                    {isLoading && !isStreamingText && <AssistantTyping />}
                  </div>
                )}
              </div>

              <ChatComposer
                value={input}
                onChange={setInput}
                onSend={handleSend}
                isBusy={isLoading}
                attachments={uploadedImages}
                onAttach={handleImageUpload}
                onRemoveAttachment={removeUploadedImage}
                onRenameAttachment={renameUploadedImage}
                isUploading={isUploading}
                showReferences={showReferences}
                onToggleReferences={() => setShowReferences((v) => !v)}
                catalogStatus={catalogStatus}
                voiceControl={
                  <VoiceAssistant
                    onTranscript={(role, text) => setMessages((prev) => [...prev, { role, content: text }])}
                    onCompose={handleVoiceCompose}
                  />
                }
              />
            </div>
          </TabsContent>

          <TabsContent value="favorites" className="mt-0">
            <div className="card-premium p-5 md:p-7">
              <div className="mb-6 space-y-1">
                <h2 className="font-display text-xl font-semibold">Favoris</h2>
                <p className="text-sm text-muted-foreground">Les réponses et visuels que vous avez mis de côté.</p>
              </div>

              {favorites.length === 0 ? (
                <div className="py-14 text-center">
                  <Heart className="mx-auto mb-4 h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
                  <p className="mb-1 font-medium">Aucun favori</p>
                  <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                    Utilisez « Favori » sous une réponse ou un visuel pour le retrouver ici.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {favorites.map((favorite) => (
                    <div key={favorite.id} className="overflow-hidden border border-border bg-card">
                      {favorite.image_data && (
                        <button
                          type="button"
                          className="block w-full cursor-zoom-in"
                          onClick={() => setZoomedImage(favorite.image_data)}
                          aria-label={`Agrandir ${favorite.title}`}
                        >
                          <SafeImage src={favorite.image_data} alt={favorite.title} className="aspect-square w-full object-cover" />
                        </button>
                      )}
                      <div className="p-4">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate font-medium text-foreground">{favorite.title}</h3>
                            <p className="mt-0.5 font-mono text-[10.5px] text-muted-foreground">
                              {new Date(favorite.created_at).toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center">
                            {favorite.image_data && (
                              <ImageExportDropdown
                                imageUrl={favorite.image_data}
                                filename={`dica-favori-${favorite.id}`}
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              />
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteFavorite(favorite.id)}
                              className="h-8 w-8 text-primary hover:text-primary"
                              aria-label="Retirer des favoris"
                              title="Retirer des favoris"
                            >
                              <Heart className="h-4 w-4 fill-current" />
                            </Button>
                          </div>
                        </div>
                        <p className="line-clamp-2 text-xs text-muted-foreground">{favorite.prompt}</p>
                        {!favorite.image_data && (
                          <p className="mt-3 line-clamp-3 border-l-2 border-border pl-3 text-xs text-muted-foreground">
                            {favorite.response}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <AlertDialog open={!!pendingDeleteId} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cette conversation ?</AlertDialogTitle>
              <AlertDialogDescription>
                Les messages seront effacés. Les visuels restent disponibles dans « Mes créations ».
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteConversation}>Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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