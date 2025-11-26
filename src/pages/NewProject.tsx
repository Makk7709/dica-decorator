import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const NewProject = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    useCase: "ascenseur" as "ascenseur" | "van" | "terrasse" | "autre",
    clientReference: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          title: formData.title,
          use_case: formData.useCase,
          client_reference: formData.clientReference || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Projet créé avec succès !");
      navigate(`/project/${data.id}`);
    } catch (error: any) {
      toast.error("Erreur lors de la création du projet");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Nouveau Projet</CardTitle>
            <CardDescription>
              Créez un nouveau projet pour visualiser vos décors DICA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Nom du projet *</Label>
                <Input
                  id="title"
                  placeholder="Ex: Rénovation Immeuble Haussmann"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="useCase">Type d'application *</Label>
                <Select
                  value={formData.useCase}
                  onValueChange={(value: any) => setFormData({ ...formData, useCase: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ascenseur">Ascenseur</SelectItem>
                    <SelectItem value="van">Van / Véhicule</SelectItem>
                    <SelectItem value="terrasse">Terrasse</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientReference">Référence client (optionnel)</Label>
                <Input
                  id="clientReference"
                  placeholder="Ex: CMD-2024-001"
                  value={formData.clientReference}
                  onChange={(e) => setFormData({ ...formData, clientReference: e.target.value })}
                />
              </div>

              <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={() => navigate("/dashboard")} disabled={isLoading}>
                  Annuler
                </Button>
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? "Création..." : "Créer le projet"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default NewProject;
