import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Edit, Trash2, CheckCircle, XCircle, FolderPlus, Upload } from "lucide-react";
import { toast } from "sonner";

type UsageContext = Database['public']['Enums']['usage_context'];

interface Decor {
  id: string;
  name: string;
  reference_code: string;
  category: string;
  usage_contexts: string[];
  texture_image_url: string;
  catalog_pdf_url: string | null;
  is_active: boolean;
}

interface Category {
  id: string;
  name: string;
  display_order: number;
  image_url: string | null;
  is_active: boolean;
}

const Admin = () => {
  const navigate = useNavigate();
  const { userRole, signOut } = useAuth();
  const [decors, setDecors] = useState<Decor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingDecor, setEditingDecor] = useState<Decor | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    referenceCode: "",
    category: "metal",
    usageContexts: ["ascenseur"] as UsageContext[],
    textureUrl: "",
    isActive: true,
  });

  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    displayOrder: 0,
    imageUrl: "",
    isActive: true,
  });
  const [categoryImageFile, setCategoryImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (userRole !== "admin") {
      navigate("/dashboard");
      return;
    }
    loadDecors();
    loadCategories();
  }, [userRole, navigate]);

  const loadDecors = async () => {
    try {
      const { data, error } = await supabase
        .from("decors")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      setDecors(data || []);
    } catch (error: any) {
      toast.error("Erreur lors du chargement des décors");
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("decor_categories")
        .select("*")
        .order("display_order");

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast.error("Erreur lors du chargement des catégories");
    }
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('decor-textures')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('decor-textures')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let textureUrl = formData.textureUrl;

      // Upload image if file is selected
      if (imageFile) {
        setUploadingImage(true);
        textureUrl = await handleImageUpload(imageFile);
      }

      const decorData = {
        name: formData.name,
        reference_code: formData.referenceCode,
        category: formData.category.toLowerCase(),
        usage_contexts: formData.usageContexts,
        texture_image_url: textureUrl,
        is_active: formData.isActive,
      };

      if (editingDecor) {
        const { error } = await supabase
          .from("decors")
          .update(decorData)
          .eq("id", editingDecor.id);

        if (error) throw error;
        toast.success("Décor mis à jour avec succès");
      } else {
        const { error } = await supabase
          .from("decors")
          .insert(decorData);

        if (error) throw error;
        toast.success("Décor créé avec succès");
      }

      setIsDialogOpen(false);
      resetForm();
      loadDecors();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la sauvegarde");
    } finally {
      setIsSubmitting(false);
      setUploadingImage(false);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let imageUrl = categoryFormData.imageUrl;

      // Upload image if file is selected
      if (categoryImageFile) {
        setUploadingImage(true);
        imageUrl = await handleImageUpload(categoryImageFile);
      }

      const categoryData = {
        name: categoryFormData.name.toLowerCase(),
        display_order: categoryFormData.displayOrder,
        image_url: imageUrl || null,
        is_active: categoryFormData.isActive,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from("decor_categories")
          .update(categoryData)
          .eq("id", editingCategory.id);

        if (error) throw error;
        toast.success("Catégorie mise à jour");
      } else {
        const { error } = await supabase
          .from("decor_categories")
          .insert(categoryData);

        if (error) throw error;
        toast.success("Catégorie créée");
      }

      setIsCategoryDialogOpen(false);
      resetCategoryForm();
      loadCategories();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la sauvegarde");
    } finally {
      setIsSubmitting(false);
      setUploadingImage(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce décor ?")) return;

    try {
      const { error } = await supabase
        .from("decors")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Décor supprimé");
      loadDecors();
    } catch (error: any) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleToggleActive = async (decor: Decor) => {
    try {
      const { error } = await supabase
        .from("decors")
        .update({ is_active: !decor.is_active })
        .eq("id", decor.id);

      if (error) throw error;
      toast.success(decor.is_active ? "Décor désactivé" : "Décor activé");
      loadDecors();
    } catch (error: any) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette catégorie ?")) return;

    try {
      const { error } = await supabase
        .from("decor_categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Catégorie supprimée");
      loadCategories();
    } catch (error: any) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      referenceCode: "",
      category: "metal",
      usageContexts: ["ascenseur"] as UsageContext[],
      textureUrl: "",
      isActive: true,
    });
    setEditingDecor(null);
    setImageFile(null);
  };

  const resetCategoryForm = () => {
    setCategoryFormData({
      name: "",
      displayOrder: 0,
      imageUrl: "",
      isActive: true,
    });
    setEditingCategory(null);
    setCategoryImageFile(null);
  };

  const openEditDialog = (decor: Decor) => {
    setEditingDecor(decor);
    setFormData({
      name: decor.name,
      referenceCode: decor.reference_code,
      category: decor.category,
      usageContexts: decor.usage_contexts as UsageContext[],
      textureUrl: decor.texture_image_url,
      isActive: decor.is_active,
    });
    setIsDialogOpen(true);
  };

  const openEditCategoryDialog = (category: Category) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      displayOrder: category.display_order,
      imageUrl: category.image_url || "",
      isActive: category.is_active,
    });
    setIsCategoryDialogOpen(true);
  };

  return (
    <div className="relative min-h-screen bg-background">
      {/* Background image */}
      <div 
        className="fixed inset-0 bg-cover opacity-30"
        style={{ backgroundImage: "url('/images/dica-app-bg.jpg')", backgroundPosition: "center 70%" }}
      />
      <div className="relative z-10">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <h1 className="text-lg font-semibold">Administration DICA</h1>
          <Button variant="ghost" size="sm" onClick={signOut}>
            Déconnexion
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="decors" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="decors">Décors</TabsTrigger>
            <TabsTrigger value="categories">Catégories</TabsTrigger>
          </TabsList>

          <TabsContent value="decors">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold">Catalogue Décors</h2>
                <p className="text-muted-foreground">Gérez les décors disponibles pour vos clients</p>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button size="lg">
                    <Plus className="mr-2 h-5 w-5" />
                    Nouveau Décor
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingDecor ? "Modifier le décor" : "Nouveau décor"}</DialogTitle>
                    <DialogDescription>
                      Renseignez les informations du décor DICA
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nom *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="referenceCode">Code référence *</Label>
                      <Input
                        id="referenceCode"
                        placeholder="Ex: 3040_BN_PF"
                        value={formData.referenceCode}
                        onChange={(e) => setFormData({ ...formData, referenceCode: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Catégorie *</Label>
                      <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.filter(c => c.is_active).map((cat) => (
                            <SelectItem key={cat.id} value={cat.name}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="textureFile">Image Texture</Label>
                      
                      {/* Preview current image */}
                      {formData.textureUrl && !imageFile && (
                        <div className="mb-3 rounded-lg border-2 border-primary/20 p-3">
                          <p className="mb-2 text-sm font-medium">Image actuelle:</p>
                          <img
                            src={formData.textureUrl}
                            alt="Texture actuelle"
                            className="h-32 w-full rounded object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <p className="mt-2 text-xs text-muted-foreground break-all">
                            {formData.textureUrl}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Input
                          id="textureFile"
                          type="file"
                          accept="image/*"
                          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                          className="flex-1"
                        />
                        {imageFile && <CheckCircle className="h-5 w-5 text-success" />}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {editingDecor ? "Uploadez une nouvelle image pour remplacer l'actuelle" : "Ou entrez une URL ci-dessous"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="textureUrl">URL Texture</Label>
                      <Input
                        id="textureUrl"
                        type="url"
                        placeholder="https://... ou /decor-textures/..."
                        value={formData.textureUrl}
                        onChange={(e) => setFormData({ ...formData, textureUrl: e.target.value })}
                        required={!imageFile && !editingDecor}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Annuler
                      </Button>
                      <Button type="submit" disabled={isSubmitting || uploadingImage}>
                        {uploadingImage ? "Upload en cours..." : isSubmitting ? "Enregistrement..." : "Enregistrer"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-6 w-3/4 rounded bg-muted" />
                    </CardHeader>
                    <CardContent>
                      <div className="h-32 rounded bg-muted" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {decors.map((decor) => (
                  <Card key={decor.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {decor.name}
                            {decor.is_active ? (
                              <CheckCircle className="h-4 w-4 text-success" />
                            ) : (
                              <XCircle className="h-4 w-4 text-muted-foreground" />
                            )}
                          </CardTitle>
                          <CardDescription>{decor.reference_code}</CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="mt-2 w-fit">
                        {decor.category}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <img
                        src={decor.texture_image_url}
                        alt={decor.name}
                        className="h-32 w-full rounded object-cover"
                      />
                      <div className="flex flex-wrap gap-1">
                        {decor.usage_contexts.map((context) => (
                          <Badge key={context} variant="secondary">
                            {context}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(decor)}
                          className="flex-1"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Modifier
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleActive(decor)}
                        >
                          {decor.is_active ? "Désactiver" : "Activer"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(decor.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="categories">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold">Catégories de Décors</h2>
                <p className="text-muted-foreground">Gérez les catégories du catalogue</p>
              </div>
              <Dialog open={isCategoryDialogOpen} onOpenChange={(open) => {
                setIsCategoryDialogOpen(open);
                if (!open) resetCategoryForm();
              }}>
                <DialogTrigger asChild>
                  <Button size="lg">
                    <FolderPlus className="mr-2 h-5 w-5" />
                    Nouvelle Catégorie
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingCategory ? "Modifier la catégorie" : "Nouvelle catégorie"}</DialogTitle>
                    <DialogDescription>
                      Renseignez les informations de la catégorie
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCategorySubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="catName">Nom *</Label>
                      <Input
                        id="catName"
                        value={categoryFormData.name}
                        onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="displayOrder">Ordre d'affichage *</Label>
                      <Input
                        id="displayOrder"
                        type="number"
                        value={categoryFormData.displayOrder}
                        onChange={(e) => setCategoryFormData({ ...categoryFormData, displayOrder: parseInt(e.target.value) })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="categoryImage">Image de la catégorie</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="categoryImage"
                          type="file"
                          accept="image/*"
                          onChange={(e) => setCategoryImageFile(e.target.files?.[0] || null)}
                          className="flex-1"
                        />
                        {categoryImageFile && <CheckCircle className="h-5 w-5 text-success" />}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Ou entrez une URL ci-dessous
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="categoryImageUrl">URL Image</Label>
                      <Input
                        id="categoryImageUrl"
                        type="url"
                        placeholder="https://..."
                        value={categoryFormData.imageUrl}
                        onChange={(e) => setCategoryFormData({ ...categoryFormData, imageUrl: e.target.value })}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                        Annuler
                      </Button>
                      <Button type="submit" disabled={isSubmitting || uploadingImage}>
                        {uploadingImage ? "Upload en cours..." : isSubmitting ? "Enregistrement..." : "Enregistrer"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {categories.map((category) => (
                <Card key={category.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {category.name}
                      {category.is_active ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </CardTitle>
                    <CardDescription>Ordre: {category.display_order}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {category.image_url && (
                      <img
                        src={category.image_url}
                        alt={category.name}
                        className="h-24 w-full rounded object-cover"
                      />
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditCategoryDialog(category)}
                        className="flex-1"
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Modifier
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
      </div>
    </div>
  );
};

export default Admin;
