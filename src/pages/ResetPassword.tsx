import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { PremiumLayout } from "@/components/ui/premium-layout";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";

const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères")
  .regex(/[A-Z]/, "Au moins une majuscule")
  .regex(/[a-z]/, "Au moins une minuscule")
  .regex(/\d/, "Au moins un chiffre")
  .regex(/[^A-Za-z0-9]/, "Au moins un caractère spécial");

type Status = "checking" | "ready" | "invalid";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { session, setIsPasswordRecovery } = useAuth();
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hash = globalThis.location.hash;
    if (hash.includes("error")) {
      setStatus("invalid");
      return;
    }
    if (session) {
      setStatus("ready");
      return;
    }
    // Laisse le temps au lien de récupération d'ouvrir la session
    const t = setTimeout(() => setStatus((s) => (s === "checking" ? "invalid" : s)), 4000);
    return () => clearTimeout(t);
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Mot de passe invalide");
      return;
    }
    if (password !== confirm) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(
        error.message.toLowerCase().includes("pwned") || error.message.toLowerCase().includes("weak")
          ? "Ce mot de passe est trop courant ou a fuité. Choisissez-en un autre."
          : "Impossible de mettre à jour le mot de passe. Le lien a peut-être expiré.",
      );
      return;
    }
    setIsPasswordRecovery(false);
    toast.success("Mot de passe mis à jour !");
    navigate("/dashboard", { replace: true });
  };

  return (
    <PremiumLayout>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md glass-card rounded-2xl p-8 bg-card">
          <h1 className="text-2xl font-semibold tracking-tight mb-2">Nouveau mot de passe</h1>

          {status === "checking" && (
            <div className="flex items-center gap-2 text-muted-foreground py-6">
              <Loader2 className="h-4 w-4 animate-spin" /> Vérification du lien…
            </div>
          )}

          {status === "invalid" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ce lien est invalide ou a expiré. Retournez à la page de connexion, saisissez votre e-mail
                puis cliquez sur « Mot de passe oublié ? » pour en recevoir un nouveau.
              </p>
              <Button asChild variant="command" className="w-full h-11">
                <Link to="/auth">Demander un nouveau lien</Link>
              </Button>
            </div>
          )}

          {status === "ready" && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="text-sm text-muted-foreground">Choisissez votre nouveau mot de passe.</p>
              <div className="space-y-2">
                <Label htmlFor="new-password">Nouveau mot de passe</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 rounded-xl"
                />
                <PasswordStrengthMeter password={password} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="h-11 rounded-xl"
                />
              </div>
              <Button type="submit" variant="command" className="w-full h-11" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer le mot de passe"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </PremiumLayout>
  );
};

export default ResetPassword;
