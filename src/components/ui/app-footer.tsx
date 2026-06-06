import { Link } from "react-router-dom";

interface AppFooterProps {
  className?: string;
}

export const AppFooter = ({ className = "" }: Readonly<AppFooterProps>) => {
  return (
    <footer className={`border-t border-border/30 py-4 ${className}`}>
      <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} DICA Décor – Application réservée à DICA France et ses revendeurs autorisés
        </p>
        <Link 
          to="/mentions-legales" 
          className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
        >
          Mentions légales & CGU
        </Link>
      </div>
    </footer>
  );
};
