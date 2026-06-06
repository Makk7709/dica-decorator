import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** État d'affichage du mot de passe (en clair si `true`). */
  visible: boolean;
  /** Bascule afficher/masquer. */
  onToggleVisibility: () => void;
  /** Texte d'aide optionnel affiché sous le champ. */
  helpText?: string;
}

/**
 * Champ mot de passe avec bouton afficher/masquer.
 *
 * Extrait d'Auth.tsx (LOT 4 vague 2) : mutualise le motif identique des champs
 * « Mot de passe » (connexion / inscription), incluant le wrapper relatif, le
 * `pr-10` et le bouton œil. Le ternaire d'icône (Eye/EyeOff) est désormais
 * porté par ce composant, allégeant la complexité des formulaires appelants.
 * Rendu, ids et classes strictement identiques à l'origine.
 */
export const PasswordField = ({
  id,
  label,
  value,
  onChange,
  visible,
  onToggleVisibility,
  helpText,
}: Readonly<PasswordFieldProps>) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="text-sm font-medium">
      {label}
    </Label>
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        placeholder="••••••••"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="h-11 rounded-xl bg-muted/30 border-border/50 focus:bg-white transition-colors pr-10"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
        onClick={onToggleVisibility}
      >
        {visible ? (
          <EyeOff className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Eye className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>
    </div>
    {helpText ? <p className="text-xs text-muted-foreground">{helpText}</p> : null}
  </div>
);
