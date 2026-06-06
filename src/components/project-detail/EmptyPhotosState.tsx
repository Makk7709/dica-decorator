import { ImageIcon } from "lucide-react";
import { PhotoUploadButton } from "./PhotoUploadButton";

interface EmptyPhotosStateProps {
  isUploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * État vide affiché quand le projet n'a ni photo ni création.
 * Extrait de ProjectDetail (LOT 4) — markup préservé à l'identique.
 */
export const EmptyPhotosState = ({ isUploading, onUpload }: Readonly<EmptyPhotosStateProps>) => (
  <div className="card-premium p-12 md:p-16 text-center animate-fade-in">
    <div className="max-w-sm mx-auto">
      <div className="mb-6 mx-auto w-20 h-20 rounded-2xl bg-muted flex items-center justify-center">
        <ImageIcon className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">Aucune photo</h3>
      <p className="text-muted-foreground mb-8 text-balance">
        Commencez par uploader une photo de votre espace pour visualiser les décors DICA.
      </p>
      <PhotoUploadButton
        inputId="photo-upload-empty"
        ariaLabel="Uploader la première photo du projet"
        idleLabel="Ajouter ma première photo"
        isUploading={isUploading}
        buttonClassName="btn-primary-premium h-12 px-8 rounded-xl cursor-pointer"
        onUpload={onUpload}
      />
    </div>
  </div>
);
