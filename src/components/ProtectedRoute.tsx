import { memo } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

// Composant de chargement mémoïsé
const LoadingSpinner = memo(() => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
));
LoadingSpinner.displayName = "LoadingSpinner";

// ProtectedRoute optimisé avec memo
export const ProtectedRoute = memo(({ children, requireAdmin = false }: Readonly<ProtectedRouteProps>) => {
  const { user, isLoading, userRole } = useAuth();

  // Afficher le spinner uniquement pendant le chargement initial
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Redirection si non authentifié
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Redirection si admin requis mais pas admin
  if (requireAdmin && userRole !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
});

ProtectedRoute.displayName = "ProtectedRoute";