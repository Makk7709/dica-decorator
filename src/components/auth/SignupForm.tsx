import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkEmail, checkPassword } from "@/lib/auth-validation";
import { AuthSubmitButton } from "./AuthSubmitButton";
import { PasswordField } from "./PasswordField";

const PASSWORD_HELP_TEXT = "Min. 8 caractères, majuscule, minuscule, chiffre et caractère spécial";

/**
 * Formulaire d'inscription.
 *
 * Extrait d'Auth.tsx (LOT 4 vague 2). Comportement, messages, appel Supabase
 * `signUp` et réinitialisation du formulaire strictement identiques à l'origine.
 * La validation email/mot de passe est déléguée aux helpers purs de
 * `@/lib/auth-validation`.
 */
export const SignupForm = () => {
  const { signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [signupData, setSignupData] = useState({ email: "", password: "", confirmPassword: "" });

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailError = checkEmail(signupData.email);
    if (emailError) {
      toast.error(emailError);
      return;
    }

    const passwordError = checkPassword(signupData.password);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    if (signupData.password !== signupData.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    setIsLoading(true);
    try {
      await signUp(signupData.email, signupData.password);
      toast.success("Compte créé ! Vérifiez votre email pour confirmer votre inscription.", {
        duration: 8000,
      });
      // Reset le formulaire et revenir sur l'onglet connexion
      setSignupData({ email: "", password: "", confirmPassword: "" });
    } catch {
      // Messages génériques pour éviter l'énumération
      toast.error("Impossible de créer le compte. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignup} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
        <Input
          id="signup-email"
          type="email"
          placeholder="votre@email.com"
          value={signupData.email}
          onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
          required
          className="h-11 rounded-xl bg-muted/30 border-border/50 focus:bg-white transition-colors"
        />
      </div>
      <PasswordField
        id="signup-password"
        label="Mot de passe"
        value={signupData.password}
        onChange={(password) => setSignupData({ ...signupData, password })}
        visible={showPassword}
        onToggleVisibility={() => setShowPassword(!showPassword)}
        helpText={PASSWORD_HELP_TEXT}
      />
      <div className="space-y-2">
        <Label htmlFor="signup-confirm" className="text-sm font-medium">Confirmer le mot de passe</Label>
        <Input
          id="signup-confirm"
          type={showPassword ? "text" : "password"}
          placeholder="••••••••"
          value={signupData.confirmPassword}
          onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
          required
          className="h-11 rounded-xl bg-muted/30 border-border/50 focus:bg-white transition-colors"
        />
      </div>
      <AuthSubmitButton isLoading={isLoading} label="Créer un compte" loadingLabel="Création..." />
    </form>
  );
};
