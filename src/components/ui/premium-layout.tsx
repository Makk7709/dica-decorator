import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PremiumLayoutProps {
  children: ReactNode;
  className?: string;
  showPlates?: boolean;
  backgroundImage?: string;
}

/**
 * Layout premium avec fond stratifié HPL
 * Évoque les panneaux de stratifié en perspective
 */
export function PremiumLayout({ 
  children, 
  className,
  showPlates = true,
  backgroundImage
}: PremiumLayoutProps) {
  return (
    <div className={cn("min-h-screen bg-stratifie relative", className)}>
      {/* Background image optionnel */}
      {backgroundImage && (
        <div 
          className="fixed inset-0 bg-cover bg-no-repeat z-0 opacity-50"
          style={{ 
            backgroundImage: `url('${backgroundImage}')`,
            backgroundPosition: 'center 30px'
          }}
          aria-hidden="true"
        />
      )}
      
      {/* Plaques de stratifié décoratives */}
      {showPlates && !backgroundImage && (
        <div className="stratifie-plates" aria-hidden="true">
          <div className="stratifie-plate stratifie-plate-1" />
          <div className="stratifie-plate stratifie-plate-2" />
          <div className="stratifie-plate stratifie-plate-3" />
          <div className="stratifie-plate stratifie-plate-4" />
        </div>
      )}
      
      {/* Gradient overlay pour adoucir (seulement si pas d'image) */}
      {!backgroundImage && (
        <div 
          className="absolute inset-0 pointer-events-none z-[1] light-gradient dark:dark-gradient"
          aria-hidden="true"
        />
      )}
      
      {/* Contenu */}
      <div className="content-safe relative z-10">
        {children}
      </div>
    </div>
  );
}

interface PremiumHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Header premium avec titre et sous-titre
 */
export function PremiumHeader({ 
  title, 
  subtitle, 
  action,
  className 
}: PremiumHeaderProps) {
  return (
    <header className={cn(
      "header-premium sticky top-0 z-50 px-6 py-4",
      className
    )}>
      <div className="container mx-auto flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        {action && (
          <div className="flex items-center gap-3">
            {action}
          </div>
        )}
      </div>
    </header>
  );
}

interface PremiumCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

/**
 * Card premium avec ombre douce et effet hover
 */
export function PremiumCard({ 
  children, 
  className,
  hover = true 
}: PremiumCardProps) {
  return (
    <div className={cn(
      "card-premium p-6",
      !hover && "hover:transform-none hover:shadow-card",
      className
    )}>
      {children}
    </div>
  );
}

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  className?: string;
}

/**
 * Titre de section avec hiérarchie visuelle
 */
export function SectionTitle({ 
  title, 
  subtitle,
  className 
}: SectionTitleProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <h2 className="section-title text-2xl md:text-3xl">{title}</h2>
      {subtitle && (
        <p className="section-subtitle text-base md:text-lg max-w-2xl">
          {subtitle}
        </p>
      )}
    </div>
  );
}

/**
 * Conteneur de contenu centré avec padding responsive
 */
export function ContentContainer({ 
  children, 
  className 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <div className={cn(
      "container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12",
      className
    )}>
      {children}
    </div>
  );
}

