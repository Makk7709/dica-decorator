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
import { ArrowLeft, Plus, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

type UsageContext = Database['public']['Enums']['usage_context'];

interface Decor {
  id: string;
  name: string;
  reference_code: string;
  usage_contexts: string[];
  texture_image_url: string;
  catalog_pdf_url: string | null;
  is_active: boolean;
}

const Admin = () => {
  const navigate = useNavigate();
  const { userRole, signOut } = useAuth();
  const [decors, setDecors] = useState<Decor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDecor, setEditingDecor] = useState<Decor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    referenceCode: "",
    usageContexts: ["ascenseur"] as UsageContext[],
    textureUrl: "",
    isActive: true,
  });

  useEffect(() => {
    if (userRole !== "admin") {
      navigate("/dashboard");
      return;
    }
    loadDecors();
  }, [userRole, navigate]);

  const loadDecors = async () => {
    try {
      const { data, error } = await supabase
        .from("decors")
        .select("*")
        .order("name");

      if (error) throw error;
      setDecors(data || []);
    } catch (error: any) {
      toast.error("Erreur lors du chargement des décors");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const decorData = {
        name: formData.name,
        reference_code: formData.referenceCode,
        usage_contexts: formData.usageContexts,
        texture_image_url: formData.textureUrl,
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

  const resetForm = () => {
    setFormData({
      name: "",
      referenceCode: "",
      usageContexts: ["ascenseur"] as UsageContext[],
      textureUrl: "",
      isActive: true,
    });
    setEditingDecor(null);
  };

  const openEditDialog = (decor: Decor) => {
    setEditingDecor(decor);
    setFormData({
      name: decor.name,
      referenceCode: decor.reference_code,
      usageContexts: decor.usage_contexts as UsageContext[],
      textureUrl: decor.texture_image_url,
      isActive: decor.is_active,
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="relative min-h-screen bg-background">
      {/* Background image */}
      <div 
        className="fixed inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: "url('/images/dica-app-bg.jpg')" }}
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
            <DialogContent>
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
                    placeholder="Ex: DIC-A23"
                    value={formData.referenceCode}
                    onChange={(e) => setFormData({ ...formData, referenceCode: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="textureUrl">URL Texture *</Label>
                  <Input
                    id="textureUrl"
                    type="url"
                    placeholder="https://..."
                    value={formData.textureUrl}
                    onChange={(e) => setFormData({ ...formData, textureUrl: e.target.value })}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Enregistrement..." : "Enregistrer"}
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
      </main>
      </div>
    </div>
  );
};

export default Admin;
