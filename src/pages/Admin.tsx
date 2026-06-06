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
import { ArrowLeft, Plus, Edit, Trash2, CheckCircle, XCircle, FolderPlus, Upload, Users, Eye, UserX, UserCheck, Building2, BarChart3, Palette, Layers, Shield, ShieldCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ResellerBrandingSettings } from "@/components/admin/reseller-branding-settings";
import { ResellerBranding } from "@/types/plaquette.types";
import { UserProjectsDialog } from "@/components/admin/user-projects-dialog";
import { CatalogManagement } from "@/components/admin/catalog-management";
import { BulkDecorUpload } from "@/components/admin/bulk-decor-upload";

type UsageContext = Database['public']['Enums']['usage_context'];

interface CatalogOption {
  id: string;
  code: string;
  label: string;
  project_type: string;
}

const PROJECT_TYPE_LABELS: Record<string, string> = {
  ascenseur: "Ascenseur",
  van: "Van",
  terrasse: "Terrasse",
  autre: "Autre",
};

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

interface UserData {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  created_at: string;
  quota_limit: number;
  quota_used: number;
  project_count: number;
  cobranding_enabled: boolean;
  role: "admin" | "client";
}

const Admin = () => {
  const navigate = useNavigate();
  const { userRole, signOut, user } = useAuth();
  const [decors, setDecors] = useState<Decor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catalogOptions, setCatalogOptions] = useState<CatalogOption[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editQuotaValue, setEditQuotaValue] = useState<number>(0);
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
    selectedCatalogIds: [] as string[],
  });

  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    displayOrder: 0,
    imageUrl: "",
    isActive: true,
  });
  const [categoryImageFile, setCategoryImageFile] = useState<File | null>(null);
  
  // Co-branding state
  const [isCoBrandingEnabled, setIsCoBrandingEnabled] = useState(false);
  const [resellerBranding, setResellerBranding] = useState<ResellerBranding | null>(null);
  
  // User projects dialog state
  const [showUserProjectsDialog, setShowUserProjectsDialog] = useState(false);
  const [selectedUserForProjects, setSelectedUserForProjects] = useState<{ id: string; email: string } | null>(null);

  useEffect(() => {
    if (userRole !== "admin") {
      navigate("/dashboard");
      return;
    }
    loadDecors();
    loadCategories();
    loadCatalogs();
    loadUsers();
    loadUserBranding();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole, navigate, user]);

  const loadUserBranding = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("cobranding_enabled, company_name, contact_name, email, phone, addressline1, addressline2, city, postal_code, website, tagline, logo_url, accent_color_hex, siret, country")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        const coBrandingEnabled = data.cobranding_enabled ?? false;
        setIsCoBrandingEnabled(coBrandingEnabled);
        
        if (coBrandingEnabled && data.company_name) {
          setResellerBranding({
            enabled: true,
            companyName: data.company_name,
            contactName: data.contact_name || undefined,
            email: data.email || undefined,
            phone: data.phone || undefined,
            addressLine1: data.addressline1 || undefined,
            addressLine2: data.addressline2 || undefined,
            city: data.city || undefined,
            postalCode: data.postal_code || undefined,
            website: data.website || undefined,
            tagline: data.tagline || undefined,
            logoUrl: data.logo_url || undefined,
            accentColorHex: data.accent_color_hex || undefined,
            siret: data.siret || undefined,
            country: data.country || 'France',
          });
        } else {
          setResellerBranding(null);
        }
      }
    } catch (error: unknown) {
      console.error("[Admin] Error loading user branding:", error);
    }
  };

  const loadDecors = async () => {
    try {
      const { data, error } = await supabase
        .from("decors")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      setDecors(data || []);
    } catch {
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
    } catch {
      toast.error("Erreur lors du chargement des catégories");
    }
  };

  const loadCatalogs = async () => {
    try {
      const { data, error } = await supabase
        .from("catalogs")
        .select("id, code, label, project_type")
        .eq("is_active", true)
        .order("project_type")
        .order("display_order");

      if (error) throw error;
      setCatalogOptions(data || []);
    } catch {
      toast.error("Erreur lors du chargement des catalogues");
    }
  };

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      // Get current session to include auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error("No valid session");
      }

      // Call edge function with auth headers
      const { data, error } = await supabase.functions.invoke("get-users-admin", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (error) throw error;
      
      if (data?.users) {
        setUsers(data.users);
      }
    } catch (error: unknown) {
      toast.error("Erreur lors du chargement des utilisateurs");
      console.error(error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleUpdateQuota = async (userId: string, newLimit: number) => {
    try {
      const { error } = await supabase
        .from("user_quotas")
        .update({ quota_limit: newLimit })
        .eq("user_id", userId);

      if (error) throw error;
      toast.success("Quota mis à jour");
      setEditingUserId(null);
      loadUsers();
    } catch {
      toast.error("Erreur lors de la mise à jour du quota");
    }
  };

  const handleToggleUserActive = async (userId: string, isActive: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("No session");

      const { data, error } = await supabase.functions.invoke("get-users-admin", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { action: "toggle_active", userId },
      });

      if (error) throw error;
      toast.success(isActive ? "Compte désactivé" : "Compte réactivé");
      loadUsers();
    } catch {
      toast.error("Erreur lors de la mise à jour du compte");
    }
  };

  const handleToggleCoBranding = async (userId: string, currentValue: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("No session");

      const { data, error } = await supabase.functions.invoke("get-users-admin", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { action: "toggle_cobranding", userId },
      });

      if (error) throw error;
      toast.success(!currentValue ? "Co-branding activé" : "Co-branding désactivé");
      loadUsers();
    } catch {
      toast.error("Erreur lors de la mise à jour du co-branding");
    }
  };

  const handleConfirmUser = async (userId: string, email: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("No session");

      const { data, error } = await supabase.functions.invoke("get-users-admin", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { action: "confirm_user", userId },
      });

      if (error) throw error;
      toast.success(`Email confirmé pour ${email}`);
      loadUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de la confirmation";
      toast.error(message);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement le compte de ${email} ? Cette action est irréversible.`)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("No session");

      const { data, error } = await supabase.functions.invoke("get-users-admin", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { action: "delete_user", userId },
      });

      if (error) throw error;
      toast.success(`Compte ${email} supprimé définitivement`);
      loadUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de la suppression";
      toast.error(message);
    }
  };

  const handleChangeRole = async (userId: string, newRole: "admin" | "client") => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("No session");

      const { data, error } = await supabase.functions.invoke("get-users-admin", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { action: "update_role", userId, role: newRole },
      });

      if (error) throw error;
      toast.success(`Rôle mis à jour : ${newRole === "admin" ? "Administrateur" : "Client"}`);
      loadUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de la mise à jour du rôle";
      toast.error(message);
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

      // Auto-derive category from selected catalogs
      const autoCategory = formData.category || "autre";

      const decorData = {
        name: formData.name,
        reference_code: formData.referenceCode,
        category: autoCategory.toLowerCase(),
        usage_contexts: formData.usageContexts,
        texture_image_url: textureUrl,
        is_active: formData.isActive,
      };

      let decorId: string;

      if (editingDecor) {
        const { error } = await supabase
          .from("decors")
          .update(decorData)
          .eq("id", editingDecor.id);

        if (error) throw error;
        decorId = editingDecor.id;
        toast.success("Décor mis à jour avec succès");
      } else {
        const { data, error } = await supabase
          .from("decors")
          .insert(decorData)
          .select("id")
          .single();

        if (error) throw error;
        decorId = data.id;
        toast.success("Décor créé avec succès");
      }

      // Sync catalog links
      if (formData.selectedCatalogIds.length > 0 || editingDecor) {
        // Delete existing links for this decor
        await supabase
          .from("catalog_decor_links")
          .delete()
          .eq("decor_id", decorId);

        // Insert new links
        if (formData.selectedCatalogIds.length > 0) {
          const newLinks = formData.selectedCatalogIds.map((catalogId, index) => ({
            catalog_id: catalogId,
            decor_id: decorId,
            display_order: index,
          }));

          const { error: linkError } = await supabase
            .from("catalog_decor_links")
            .insert(newLinks);

          if (linkError) throw linkError;
        }
      }

      setIsDialogOpen(false);
      resetForm();
      loadDecors();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erreur lors de la sauvegarde";
      toast.error(message);
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erreur lors de la sauvegarde";
      toast.error(message);
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
    } catch {
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
    } catch {
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
    } catch {
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
      selectedCatalogIds: [],
    });
    setEditingDecor(null);
    setImageFile(null);
    setUploadingImage(false);
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
    setUploadingImage(false);
  };

  const openEditDialog = async (decor: Decor) => {
    setEditingDecor(decor);
    
    // Load existing catalog links for this decor
    const { data: links } = await supabase
      .from("catalog_decor_links")
      .select("catalog_id")
      .eq("decor_id", decor.id);
    
    setFormData({
      name: decor.name,
      referenceCode: decor.reference_code,
      category: decor.category,
      usageContexts: decor.usage_contexts as UsageContext[],
      textureUrl: decor.texture_image_url,
      isActive: decor.is_active,
      selectedCatalogIds: links?.map(l => l.catalog_id) || [],
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
        className="fixed inset-0 bg-cover opacity-20"
        style={{ backgroundImage: "url('/images/creative-bg.jpg')", backgroundPosition: "center center" }}
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
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="mb-8 flex-wrap">
            <TabsTrigger value="users">
              <Users className="mr-2 h-4 w-4" />
              Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="catalogs">
              <Layers className="mr-2 h-4 w-4" />
              Catalogues
            </TabsTrigger>
            <TabsTrigger value="decors">Décors</TabsTrigger>
            <TabsTrigger value="categories">Catégories</TabsTrigger>
            <TabsTrigger value="cobranding">
              <Building2 className="mr-2 h-4 w-4" />
              Co-branding
            </TabsTrigger>
            <TabsTrigger value="analytics" onClick={() => navigate('/admin/analytics')}>
              <BarChart3 className="mr-2 h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <div className="mb-8">
              <h2 className="text-3xl font-bold">Gestion des Utilisateurs</h2>
              <p className="text-muted-foreground">Gérez les utilisateurs inscrits et leurs quotas de génération</p>
            </div>

            {isLoadingUsers ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-20 rounded bg-muted" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <Card key={user.id}>
                    <CardContent className="p-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        {/* User Info */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <div>
                              <h3 className="font-semibold text-lg">
                                {user.first_name && user.last_name
                                  ? `${user.first_name} ${user.last_name}`
                                  : user.email}
                              </h3>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                            {user.is_active ? (
                              <Badge variant="default" className="ml-auto lg:ml-0">Actif</Badge>
                            ) : (
                              <Badge variant="secondary" className="ml-auto lg:ml-0">Désactivé</Badge>
                            )}
                            {user.role === "admin" ? (
                              <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">
                                <ShieldCheck className="mr-1 h-3 w-3" />
                                Admin
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                <Shield className="mr-1 h-3 w-3" />
                                Client
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                            <span>Inscrit: {new Date(user.created_at).toLocaleDateString("fr-FR")}</span>
                            <span>Projets: {user.project_count}</span>
                            <span>
                              Quota: {user.quota_used} / {user.quota_limit} générations
                            </span>
                          </div>
                          
                          {/* Co-branding Toggle */}
                          <div className="flex items-center gap-3 mt-3 pt-3 border-t">
                            <div className="flex items-center gap-2">
                              <Palette className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Co-branding PDF</span>
                            </div>
                            <Switch
                              checked={user.cobranding_enabled}
                              onCheckedChange={() => handleToggleCoBranding(user.id, user.cobranding_enabled)}
                            />
                            <span className="text-xs text-muted-foreground">
                              {user.cobranding_enabled ? "Activé" : "Désactivé"}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                          {/* Edit Quota */}
                          {editingUserId === user.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={editQuotaValue}
                                onChange={(e) => setEditQuotaValue(Number.parseInt(e.target.value))}
                                className="w-24"
                                min="0"
                              />
                              <Button
                                size="sm"
                                onClick={() => handleUpdateQuota(user.id, editQuotaValue)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingUserId(null)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingUserId(user.id);
                                setEditQuotaValue(user.quota_limit);
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Modifier quota
                            </Button>
                          )}

                          {/* Toggle Active */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleUserActive(user.id, user.is_active)}
                          >
                            {user.is_active ? (
                              <>
                                <UserX className="mr-2 h-4 w-4" />
                                Désactiver
                              </>
                            ) : (
                              <>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Réactiver
                              </>
                            )}
                          </Button>

                          {/* Change Role */}
                          <Select
                            value={user.role}
                            onValueChange={(value: "admin" | "client") => handleChangeRole(user.id, value)}
                          >
                            <SelectTrigger className="w-[140px] h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="client">Client</SelectItem>
                              <SelectItem value="admin">Administrateur</SelectItem>
                            </SelectContent>
                          </Select>

                          {/* Confirm Email */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleConfirmUser(user.id, user.email)}
                            title="Confirmer l'email manuellement"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Confirmer
                          </Button>

                          {/* View Projects */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUserForProjects({ id: user.id, email: user.email });
                              setShowUserProjectsDialog(true);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Voir projets
                          </Button>

                          {/* Delete User (only if deactivated) */}
                          {!user.is_active && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteUser(user.id, user.email)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Supprimer
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="catalogs">
            <div className="mb-8">
              <h2 className="text-3xl font-bold">Catalogues par Type de Projet</h2>
              <p className="text-muted-foreground">
                Assignez les décors aux catalogues contextualisés (Parois/Sol pour Ascenseur, Évasion pour Van, Compact pour Terrasse)
              </p>
            </div>
            <CatalogManagement />
          </TabsContent>

          <TabsContent value="decors">
            {/* Bulk Upload Section */}
            <div className="mb-8">
              <BulkDecorUpload onComplete={loadDecors} />
            </div>

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
                      <Label>Catalogues (Gammes) *</Label>
                      <p className="text-xs text-muted-foreground">Sélectionnez les catalogues auxquels ce décor appartient</p>
                      <div className="grid grid-cols-1 gap-2 border rounded-md p-3">
                        {Object.entries(
                          catalogOptions.reduce((acc, cat) => {
                            const pt = cat.project_type;
                            if (!acc[pt]) acc[pt] = [];
                            acc[pt].push(cat);
                            return acc;
                          }, {} as Record<string, CatalogOption[]>)
                        ).map(([projectType, cats]) => (
                          <div key={projectType}>
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                              {PROJECT_TYPE_LABELS[projectType] || projectType}
                            </p>
                            {cats.map((cat) => (
                              <label key={cat.id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted cursor-pointer">
                                <Checkbox
                                  checked={formData.selectedCatalogIds.includes(cat.id)}
                                  onCheckedChange={(checked) => {
                                    setFormData(prev => ({
                                      ...prev,
                                      selectedCatalogIds: checked
                                        ? [...prev.selectedCatalogIds, cat.id]
                                        : prev.selectedCatalogIds.filter(id => id !== cat.id),
                                    }));
                                  }}
                                />
                                <span className="text-sm">{cat.label}</span>
                              </label>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Catégorie matériau</Label>
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
                      <p className="text-xs text-muted-foreground">Utilisé par l'IA pour les règles de rendu (veinage bois, reflets métal...)</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="textureFile">Image Texture</Label>
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
                        Ou entrez une URL ci-dessous
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
                        required={!imageFile}
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
                        onChange={(e) => setCategoryFormData({ ...categoryFormData, displayOrder: Number.parseInt(e.target.value) })}
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

          {/* Co-branding Tab */}
          <TabsContent value="cobranding">
            <div className="mb-8">
              <h2 className="text-3xl font-bold">Configuration Co-branding</h2>
              <p className="text-muted-foreground">
                Configurez le co-branding revendeur pour les plaquettes PDF
              </p>
            </div>

            <ResellerBrandingSettings
              currentBranding={resellerBranding}
              isCoBrandingEnabled={isCoBrandingEnabled}
              onToggleCoBranding={(enabled) => {
                setIsCoBrandingEnabled(enabled);
                toast.success(enabled ? "Co-branding activé" : "Co-branding désactivé");
              }}
              onSaveBranding={async (branding) => {
                if (!user) {
                  toast.error("Vous devez être connecté pour sauvegarder");
                  return;
                }

                try {
                  // Sauvegarder dans la table profiles pour l'utilisateur connecté
                  const { error } = await supabase
                    .from('profiles')
                    .update({
                      cobranding_enabled: branding.enabled,
                      company_name: branding.companyName || null,
                      contact_name: branding.contactName || null,
                      email: branding.email || null,
                      phone: branding.phone || null,
                      addressline1: branding.addressLine1 || null,
                      addressline2: branding.addressLine2 || null,
                      city: branding.city || null,
                      postal_code: branding.postalCode || null,
                      country: branding.country || 'France',
                      website: branding.website || null,
                      tagline: branding.tagline || null,
                      logo_url: branding.logoUrl || null,
                      accent_color_hex: branding.accentColorHex || null,
                      siret: branding.siret || null,
                    })
                    .eq('id', user.id);

                  if (error) {
                    console.error("[Admin] Error saving branding:", error);
                    toast.error(`Erreur lors de la sauvegarde: ${error.message}`);
                    throw error;
                  }

                  setResellerBranding(branding);
                  toast.success("Configuration du co-branding sauvegardée avec succès");
                  
                  console.log("[Admin] Branding saved successfully for user:", user.id, branding);
                } catch (error: unknown) {
                  console.error("[Admin] Error saving branding:", error);
                  const message = error instanceof Error ? error.message : "Impossible de sauvegarder";
                  toast.error(`Erreur: ${message}`);
                }
              }}
            />
          </TabsContent>
        </Tabs>
      </main>
      </div>
      
      {/* User Projects Dialog */}
      {selectedUserForProjects && user && (
        <UserProjectsDialog
          open={showUserProjectsDialog}
          onOpenChange={setShowUserProjectsDialog}
          targetUserId={selectedUserForProjects.id}
          targetUserEmail={selectedUserForProjects.email}
          adminUserId={user.id}
        />
      )}
    </div>
  );
};

export default Admin;
