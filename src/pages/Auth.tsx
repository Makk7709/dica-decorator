import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Eye, EyeOff, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { z } from "zod";
import { PremiumLayout } from "@/components/ui/premium-layout";
import { ThemeToggle } from "@/components/ui/theme-toggle";

// Validation schemas
const emailSchema = z.string().email("Email invalide").trim();
const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères")
  .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
  .regex(/[a-z]/, "Le mot de passe doit contenir au moins une minuscule")
  .regex(/\d/, "Le mot de passe doit contenir au moins un chiffre")
  .regex(/[^A-Za-z0-9]/, "Le mot de passe doit contenir au moins un caractère spécial");

const Auth = () => {
  const navigate = useNavigate();
  const { user, signIn, signUp, isPasswordRecovery, setIsPasswordRecovery } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [signupData, setSignupData] = useState({ email: "", password: "", confirmPassword: "" });

  useEffect(() => {
    // Don't redirect if in password recovery mode
    if (user && !isPasswordRecovery) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate, isPasswordRecovery]);

  const handleForgotPassword = async () => {
    if (!loginData.email) {
      toast.error("Veuillez d'abord saisir votre email");
      return;
    }
    try {
      emailSchema.parse(loginData.email);
    } catch {
      toast.error("Email invalide");
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(loginData.email, {
        redirectTo: `${globalThis.location.origin}/auth`,
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

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      passwordSchema.parse(newPassword);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0]?.message || "Mot de passe invalide");
      }
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    try {
      emailSchema.parse(loginData.email);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0]?.message || "Email invalide");
      } else {
        toast.error("Email invalide");
      }
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation email
    try {
      emailSchema.parse(signupData.email);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0]?.message || "Email invalide");
      } else {
        toast.error("Email invalide");
      }
      return;
    }

    // Validation mot de passe
    try {
      passwordSchema.parse(signupData.password);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0]?.message || "Mot de passe invalide");
      } else {
        toast.error("Mot de passe invalide");
      }
      return;
    }

    // Vérification correspondance
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

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: globalThis.location.origin,
      });
      if (result.error) {
        toast.error("Erreur lors de la connexion avec Google");
        return;
      }
      if (result.redirected) return;
      toast.success("Connexion réussie !");
      navigate("/dashboard");
    } catch {
      toast.error("Erreur lors de la connexion avec Google");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <PremiumLayout showPlates={true}>
      {/* Theme toggle in corner */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle className="bg-card/80 backdrop-blur-sm shadow-sm" variant="outline" />
      </div>
      
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md animate-fade-in">
          {/* Card Premium */}
          <div className="card-premium p-8 md:p-10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight mb-2">DICA Visual Studio</h1>
              <p className="text-muted-foreground text-sm">
                Visualisez vos décors en un clic grâce à l'IA
              </p>
            </div>

            {/* Password Recovery Form or Login/Signup Tabs */}
            {isPasswordRecovery ? (
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
                <Button 
                  type="submit" 
                  className="w-full btn-primary-premium h-11 rounded-xl" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Mise à jour...
                    </>
                  ) : (
                    "Mettre à jour le mot de passe"
                  )}
                </Button>
              </form>
            ) : (
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-11 p-1 bg-muted/50 rounded-xl mb-6">
                <TabsTrigger 
                  value="login" 
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  Connexion
                </TabsTrigger>
                <TabsTrigger 
                  value="signup"
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  Inscription
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="animate-fade-in">
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
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm font-medium">Mot de passe</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        required
                        className="h-11 rounded-xl bg-muted/30 border-border/50 focus:bg-white transition-colors pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                      >
                        {showLoginPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full btn-primary-premium h-11 rounded-xl" 
                    disabled={isLoading || isGoogleLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connexion...
                      </>
                    ) : (
                      "Se connecter"
                    )}
                  </Button>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border/50" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-card px-3 text-muted-foreground">ou</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 rounded-xl gap-3"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading || isGoogleLoading}
                  >
                    {isGoogleLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    )}
                    Continuer avec Google
                  </Button>
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
              </TabsContent>
              
              <TabsContent value="signup" className="animate-fade-in">
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
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm font-medium">Mot de passe</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showSignupPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={signupData.password}
                        onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                        required
                        className="h-11 rounded-xl bg-muted/30 border-border/50 focus:bg-white transition-colors pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                      >
                        {showSignupPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Min. 8 caractères, majuscule, minuscule, chiffre et caractère spécial
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm" className="text-sm font-medium">Confirmer le mot de passe</Label>
                    <Input
                      id="signup-confirm"
                      type={showSignupPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={signupData.confirmPassword}
                      onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                      required
                      className="h-11 rounded-xl bg-muted/30 border-border/50 focus:bg-white transition-colors"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full btn-primary-premium h-11 rounded-xl" 
                    disabled={isLoading || isGoogleLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Création...
                      </>
                    ) : (
                      "Créer un compte"
                    )}
                  </Button>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border/50" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-card px-3 text-muted-foreground">ou</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 rounded-xl gap-3"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading || isGoogleLoading}
                  >
                    {isGoogleLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    )}
                    S'inscrire avec Google
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            )}
          </div>

          {/* Footer */}
          <div className="text-center mt-6 space-y-2">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} DICA France • Powered by KOREV AI
            </p>
            <Link 
              to="/mentions-legales" 
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
            >
              Mentions légales & CGU
            </Link>
          </div>
        </div>
      </div>
    </PremiumLayout>
  );
};

export default Auth;
