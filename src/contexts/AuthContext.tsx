import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { authService, type AuthState } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  userRole: "admin" | "client" | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<"admin" | "client" | null>(null);
  
  // Cache pour éviter les appels répétés
  const roleCache = useRef<Map<string, "admin" | "client">>(new Map());
  const pendingRoleRequest = useRef<string | null>(null);

  // Fonction optimisée pour récupérer le rôle avec cache
  const fetchUserRole = useCallback(async (userId: string) => {
    // Vérifier le cache d'abord
    const cached = roleCache.current.get(userId);
    if (cached) {
      setUserRole(cached);
      return;
    }
    
    // Éviter les requêtes dupliquées
    if (pendingRoleRequest.current === userId) return;
    pendingRoleRequest.current = userId;
    
    try {
      const role = await authService.getUserRole(userId);
      if (role) {
        roleCache.current.set(userId, role);
        setUserRole(role);
      }
    } finally {
      pendingRoleRequest.current = null;
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch user role when authenticated
        if (session?.user) {
          fetchUserRole(session.user.id);
        } else {
          setUserRole(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      
      if (session?.user) {
        fetchUserRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserRole]);

  const signIn = useCallback(async (email: string, password: string) => {
    await authService.signIn(email, password);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    await authService.signUp(email, password);
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setUserRole(null);
    roleCache.current.clear();
  }, []);

  // Mémoïser la valeur du contexte
  const contextValue = useMemo(() => ({
    user,
    session,
    isLoading,
    userRole,
    signIn,
    signUp,
    signOut,
  }), [user, session, isLoading, userRole, signIn, signUp, signOut]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
