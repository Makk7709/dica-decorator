import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuthSubmitButtonProps {
  /** Désactive le bouton et affiche l'état de chargement. */
  isLoading: boolean;
  /** Libellé affiché au repos (ex. "Se connecter"). */
  label: string;
  /** Libellé affiché pendant le chargement (ex. "Connexion..."). */
  loadingLabel: string;
}

/**
 * Bouton de soumission des formulaires d'authentification.
 *
 * Extrait d'Auth.tsx (LOT 4 vague 2) : encapsule le ternaire
 * « chargement / repos » répété à l'identique dans les trois formulaires,
 * ce qui retire autant de complexité cognitive des composants appelants.
 * Rendu et classes strictement identiques à l'origine.
 */
export const AuthSubmitButton = ({ isLoading, label, loadingLabel }: Readonly<AuthSubmitButtonProps>) => (
  <Button type="submit" className="w-full btn-primary-premium h-11 rounded-xl" disabled={isLoading}>
    {isLoading ? (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {loadingLabel}
      </>
    ) : (
      label
    )}
  </Button>
);
