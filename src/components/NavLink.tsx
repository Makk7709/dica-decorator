import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
  prefetch?: boolean;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, prefetch = true, onMouseEnter, ...props }, ref) => {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    // Précharger les données au survol pour une navigation plus rapide
    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLAnchorElement>) => {
        onMouseEnter?.(e);

        if (prefetch && user?.id) {
          const targetPath = typeof to === "string" ? to : to.pathname;
          
          // Précharger selon la route cible
          if (targetPath === "/dashboard" || targetPath?.startsWith("/dashboard")) {
            queryClient.prefetchQuery({
              queryKey: ["projects", user.id],
              staleTime: 1000 * 60 * 2,
            });
          }
          
          if (targetPath?.startsWith("/project/") && targetPath !== "/project/new") {
            queryClient.prefetchQuery({
              queryKey: ["decors"],
              staleTime: 1000 * 60 * 30,
            });
          }
        }
      },
      [prefetch, user?.id, queryClient, onMouseEnter, to]
    );

    return (
      <RouterNavLink
        ref={ref}
        to={to}
        onMouseEnter={handleMouseEnter}
        className={({ isActive, isPending }) =>
          cn(className, isActive && activeClassName, isPending && pendingClassName)
        }
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };