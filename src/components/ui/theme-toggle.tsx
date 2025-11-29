import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "ghost" | "outline";
}

export function ThemeToggle({ 
  className, 
  size = "icon",
  variant = "ghost" 
}: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleTheme}
      className={cn(
        "relative overflow-hidden transition-colors",
        className
      )}
      title={resolvedTheme === "light" ? "Activer le mode nuit" : "Activer le mode jour"}
    >
      <Sun 
        className={cn(
          "h-4 w-4 transition-all duration-300",
          resolvedTheme === "dark" 
            ? "rotate-90 scale-0 opacity-0" 
            : "rotate-0 scale-100 opacity-100"
        )} 
      />
      <Moon 
        className={cn(
          "absolute h-4 w-4 transition-all duration-300",
          resolvedTheme === "dark" 
            ? "rotate-0 scale-100 opacity-100" 
            : "-rotate-90 scale-0 opacity-0"
        )} 
      />
      <span className="sr-only">
        {resolvedTheme === "light" ? "Activer le mode nuit" : "Activer le mode jour"}
      </span>
    </Button>
  );
}

