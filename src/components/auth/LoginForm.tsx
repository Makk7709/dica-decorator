import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkEmail, isValidEmail } from "@/lib/auth-validation";
import { AuthSubmitButton } from "./AuthSubmitButton";
import { PasswordField } from "./PasswordField";

/**
 * Formulaire de connexion + parcours « Mot de passe oublié ? ».
 *
 * Extrait d'Auth.tsx (LOT 4 vague 2). Comportement, messages, appels Supabase
 * et redirections strictement identiques à l'origine. La validation est
 * déléguée aux helpers purs de `@/lib/auth-validation`.
 */
export const LoginForm = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });

  const handleForgotPassword = async () => {
    if (!loginData.email) {
      toast.error("Veuillez d'abord saisir votre email");
      return;
    }
    if (!isValidEmail(loginData.email)) {
      toast.error("Email invalide");
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(loginData.email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      toast.success("Un email de réinitialisation a été envoyé. Vérifiez votre boîte mail.", { duration: 8000 });
    } catch {
      // Message générique
      toast.success("Si ce compte existe, un email de réinitialisation a été envoyé.", { duration: 8000 });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailError = checkEmail(loginData.email);
    if (emailError) {
      toast.error(emailError);
      return;
    }
    setIsLoading(true);
    try {
      await signIn(loginData.email, loginData.password);
      toast.success("Connexion réussie !");
      navigate("/dashboard");
    } catch {
      // Messages d'erreur génériques pour éviter l'énumération de comptes
      toast.error("Email ou mot de passe incorrect");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
        <Input
          id="login-email"
          type="email"
          placeholder="votre@email.com"
          value={loginData.email}
          onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
          required
          className="h-11 rounded-xl bg-muted/30 border-border/50 focus:bg-white transition-colors"
        />
      </div>
      <PasswordField
        id="login-password"
        label="Mot de passe"
        value={loginData.password}
        onChange={(password) => setLoginData({ ...loginData, password })}
        visible={showPassword}
        onToggleVisibility={() => setShowPassword(!showPassword)}
      />
      <AuthSubmitButton isLoading={isLoading} label="Se connecter" loadingLabel="Connexion..." />
      <div className="text-center">
        <button
          type="button"
          onClick={handleForgotPassword}
          className="text-xs text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
          disabled={isLoading}
        >
          Mot de passe oublié ?
        </button>
      </div>
    </form>
  );
};
