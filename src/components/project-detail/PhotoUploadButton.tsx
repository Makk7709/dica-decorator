import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PhotoUploadButtonProps {
  /** Identifiant de l'input (et cible du `htmlFor` du label). */
  inputId: string;
  /** Libellé accessible du label (a11y LOT 3). */
  ariaLabel: string;
  /** Texte du bouton à l'état repos. */
  idleLabel: string;
  /** Upload en cours. */
  isUploading: boolean;
  /** Affiche un état de chargement (spinner + "Upload...") quand `isUploading`. */
  withLoadingState?: boolean;
  /** Classes additionnelles du bouton. */
  buttonClassName: string;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Bouton + input fichier d'upload de photo, avec label accessible associé.
 * Extrait de ProjectDetail (LOT 4) — markup et a11y préservés à l'identique.
 */
export const PhotoUploadButton = ({
  inputId,
  ariaLabel,
  idleLabel,
  isUploading,
  withLoadingState = false,
  buttonClassName,
  onUpload,
}: Readonly<PhotoUploadButtonProps>) => {
  const showLoading = withLoadingState && isUploading;

  return (
    <>
      <label htmlFor={inputId} aria-label={ariaLabel}>
        <Button asChild disabled={isUploading} size="lg" className={buttonClassName}>
          <span>
            {showLoading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Upload className="mr-2 h-5 w-5" />
            )}
            {showLoading ? "Upload..." : idleLabel}
          </span>
        </Button>
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onUpload}
      />
    </>
  );
};
