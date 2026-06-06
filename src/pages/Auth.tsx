import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles } from "lucide-react";
import { PremiumLayout } from "@/components/ui/premium-layout";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignupForm } from "@/components/auth/SignupForm";
import { PasswordRecoveryForm } from "@/components/auth/PasswordRecoveryForm";

const Auth = () => {
  const navigate = useNavigate();
  const { user, isPasswordRecovery } = useAuth();

  useEffect(() => {
    // Don't redirect if in password recovery mode
    if (user && !isPasswordRecovery) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate, isPasswordRecovery]);

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
              <PasswordRecoveryForm />
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
                <LoginForm />
              </TabsContent>
              
              <TabsContent value="signup" className="animate-fade-in">
                <SignupForm />
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
