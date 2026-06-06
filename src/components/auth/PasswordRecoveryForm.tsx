import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkPassword } from "@/lib/auth-validation";
import { AuthSubmitButton } from "./AuthSubmitButton";

/**
 * Formulaire de définition d'un nouveau mot de passe (mode récupération).
 *
 * Extrait d'Auth.tsx (LOT 4 vague 2). Comportement, messages, appel Supabase
 * `updateUser`, sortie du mode récupération et redirection strictement
 * identiques à l'origine.
 */
export const PasswordRecoveryForm = () => {
  const navigate = useNavigate();
  const { setIsPasswordRecovery } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const passwordError = checkPassword(newPassword);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Mot de passe mis à jour avec succès !");
      setIsPasswordRecovery(false);
      setNewPassword("");
      setConfirmNewPassword("");
      navigate("/dashboard");
    } catch {
      toast.error("Erreur lors de la mise à jour du mot de passe");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleUpdatePassword} className="space-y-5">
      <p className="text-sm text-muted-foreground mb-4">
        Choisissez votre nouveau mot de passe.
      </p>
      <div className="space-y-2">
        <Label htmlFor="new-password" className="text-sm font-medium">Nouveau mot de passe</Label>
        <Input
          id="new-password"
          type="password"
          placeholder="••••••••"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          className="h-11 rounded-xl bg-muted/30 border-border/50 focus:bg-white transition-colors"
        />
        <p className="text-xs text-muted-foreground">
          Min. 8 caractères, majuscule, minuscule, chiffre et caractère spécial
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-new-password" className="text-sm font-medium">Confirmer le mot de passe</Label>
        <Input
          id="confirm-new-password"
          type="password"
          placeholder="••••••••"
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
          required
          className="h-11 rounded-xl bg-muted/30 border-border/50 focus:bg-white transition-colors"
        />
      </div>
      <AuthSubmitButton isLoading={isLoading} label="Mettre à jour le mot de passe" loadingLabel="Mise à jour..." />
    </form>
  );
};
