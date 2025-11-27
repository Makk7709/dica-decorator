import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Sparkles, Loader2, Heart, Star, Download, FolderPlus } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Message {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
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
    } catch (error: any) {
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
    } catch (error: any) {
      console.error("Error loading projects:", error);
    }
  };

  const saveFavorite = async () => {
    if (!user || selectedMessageIndex === null || !saveTitle.trim()) return;
    
    setIsSaving(true);
    try {
      const userMessage = messages[selectedMessageIndex - 1];
      const assistantMessage = messages[selectedMessageIndex];
      
      const { error } = await supabase
        .from("creative_favorites")
        .insert({
          user_id: user.id,
          title: saveTitle.trim(),
          prompt: userMessage?.content || "",
          response: assistantMessage.content,
          image_data: null
        });

      if (error) throw error;
      
      toast.success("Favori enregistré !");
      setSaveDialogOpen(false);
      setSaveTitle("");
      setSelectedMessageIndex(null);
      loadFavorites();
    } catch (error: any) {
      console.error("Error saving favorite:", error);
      toast.error("Erreur lors de la sauvegarde");
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
    } catch (error: any) {
      console.error("Error deleting favorite:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const loadDecors = async () => {
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
    } catch (error: any) {
      console.error("Error loading decors:", error);
      toast.error("Erreur lors du chargement des décors");
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

    let context = `CATALOGUE DICA - ${decors.length} décors disponibles:\n`;
    
    for (const [category, categoryDecors] of Object.entries(decorsByCategory)) {
      context += `\n📁 Catégorie ${category.toUpperCase()} (${categoryDecors.length} décors):\n`;
      categoryDecors.forEach(decor => {
        context += `  • ${decor.name} (Réf: ${decor.reference_code})\n`;
        context += `    Contextes d'usage: ${decor.usage_contexts.join(", ")}\n`;
        if (decor.texture_image_url) {
          context += `    Texture disponible: ${decor.texture_image_url}\n`;
        }
      });
    }
    
    console.log(`Contexte décors construit: ${decors.length} décors dans ${Object.keys(decorsByCategory).length} catégories`);
    return context;
  };

  const streamChat = async (userMessage: string) => {
    const decorContext = buildDecorContext();
    const chatUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/creative-chat`;
    
    const resp = await fetch(chatUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ 
        messages: [...messages, { role: "user", content: userMessage }],
        decorContext
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429 || resp.status === 402) {
        const errorData = await resp.json();
        throw new Error(errorData.error);
      }
      throw new Error("Échec de la connexion au service IA");
    }

    const contentType = resp.headers.get("content-type");
    
    // Check if it's an image response (JSON)
    if (contentType?.includes("application/json")) {
      const data = await resp.json();
      if (data.type === "image") {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: data.text,
          imageUrl: data.imageUrl
        }]);
        return;
      }
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
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      await streamChat(userMessage);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Erreur lors de la communication avec l'IA");
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

  const downloadImage = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dica-creative-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Image téléchargée");
    } catch (error) {
      console.error("Error downloading image:", error);
      toast.error("Erreur lors du téléchargement");
    }
  };

  const saveImageToProject = async () => {
    if (!user || !selectedImageUrl) return;
    
    setIsSavingToProject(true);
    try {
      let projectId = selectedProjectId;
      
      // Create new project if needed
      if (!projectId && newProjectTitle.trim()) {
        const { data: newProject, error: projectError } = await supabase
          .from("projects")
          .insert({
            user_id: user.id,
            title: newProjectTitle.trim(),
            use_case: "autre"
          })
          .select()
          .single();

        if (projectError) throw projectError;
        projectId = newProject.id;
      }

      if (!projectId) {
        toast.error("Veuillez sélectionner ou créer un projet");
        return;
      }

      // Convert base64 to blob
      const base64Data = selectedImageUrl.split(',')[1];
      const blob = await fetch(`data:image/png;base64,${base64Data}`).then(r => r.blob());
      
      // Upload to storage
      const fileName = `creative-${Date.now()}.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("project-photos")
        .upload(`${user.id}/${fileName}`, blob);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("project-photos")
        .getPublicUrl(`${user.id}/${fileName}`);

      // Save to project_photos
      const { error: photoError } = await supabase
        .from("project_photos")
        .insert({
          project_id: projectId,
          original_image_url: publicUrl
        });

      if (photoError) throw photoError;

      toast.success("Image ajoutée au projet");
      setSaveToProjectDialogOpen(false);
      setSelectedImageUrl(null);
      setSelectedProjectId("");
      setNewProjectTitle("");
      loadProjects();
    } catch (error: any) {
      console.error("Error saving to project:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsSavingToProject(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background">
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
              <Sparkles className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">Libérez votre imagination</h1>
            </div>
            <div className="w-24" />
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="chat" className="text-lg">
                <Sparkles className="mr-2 h-5 w-5" />
                Nouvelle création
              </TabsTrigger>
              <TabsTrigger value="favorites" className="text-lg">
                <Heart className="mr-2 h-5 w-5" />
                Mes favoris ({favorites.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat">
              <Card className="border-2 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-primary" />
                    Assistant Créatif DICA
                  </CardTitle>
                  <CardDescription>
                    Demandez-moi de créer des mood boards, des plaquettes de présentation, ou toute visualisation créative avec vos décors DICA
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ScrollArea className="h-[500px] pr-4">
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
                                  : "bg-muted"
                              }`}
                            >
                              {message.imageUrl ? (
                                <div className="space-y-3">
                                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                                  <div className="space-y-2">
                                    <img 
                                      src={message.imageUrl} 
                                      alt="Visualisation générée" 
                                      className="rounded-lg w-full max-w-2xl"
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => downloadImage(message.imageUrl!)}
                                      >
                                        <Download className="h-4 w-4 mr-2" />
                                        Télécharger
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedImageUrl(message.imageUrl!);
                                          setSaveToProjectDialogOpen(true);
                                        }}
                                      >
                                        <FolderPlus className="h-4 w-4 mr-2" />
                                        Enregistrer dans un projet
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
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

                  <div className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ex: Créer un mood board des décors marbre pour une salle de bain..."
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

                  <div className="text-xs text-muted-foreground">
                    💡 Exemples de demandes : "Crée-moi une plaquette des décors marbre", "Je veux un mood board de mes panneaux métalliques préférés", "Imagine une salle de bain avec nos décors"
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="favorites">
              <Card className="border-2 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-6 w-6 text-primary" />
                    Mes créations favorites
                  </CardTitle>
                  <CardDescription>
                    Retrouvez toutes vos générations sauvegardées
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {favorites.length === 0 ? (
                    <div className="text-center py-12">
                      <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-lg text-muted-foreground">Aucun favori pour le moment</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Enregistrez vos créations préférées en cliquant sur le cœur
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {favorites.map((favorite) => (
                        <Card key={favorite.id} className="border">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <CardTitle className="text-lg">{favorite.title}</CardTitle>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteFavorite(favorite.id)}
                              >
                                <Heart className="h-4 w-4 fill-current text-red-500" />
                              </Button>
                            </div>
                            <CardDescription className="text-xs">
                              {new Date(favorite.created_at).toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div>
                              <p className="text-sm font-semibold mb-1">Demande:</p>
                              <p className="text-sm text-muted-foreground">{favorite.prompt}</p>
                            </div>
                            <div>
                              <p className="text-sm font-semibold mb-1">Réponse:</p>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{favorite.response}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

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
                    <label className="text-sm font-medium">Projet existant</label>
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
                  <label className="text-sm font-medium">Nouveau projet</label>
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
        </main>
      </div>
    </div>
  );
};

export default Creative;