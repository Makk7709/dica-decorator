import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ImageExportDropdown } from "@/components/ui/image-export-dropdown";

interface ZoomDialogProps {
  zoomedImage: string | null;
  onClose: () => void;
}

/**
 * Dialogue d'agrandissement d'une image. Extrait de ProjectDetail (LOT 4).
 * Markup et comportement (ouverture/fermeture, export) préservés.
 */
export const ZoomDialog = ({ zoomedImage, onClose }: Readonly<ZoomDialogProps>) => (
  <Dialog open={!!zoomedImage} onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden">
      <div className="relative w-full h-full flex items-center justify-center bg-black/95">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-10 h-10 w-10 bg-white/10 hover:bg-white/20 text-white"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
        {zoomedImage && (
          <>
            <img
              src={zoomedImage}
              alt="Rendu agrandi"
              className="max-w-full max-h-[90vh] object-contain"
            />
            <div className="absolute bottom-4 left-4 right-4 z-10 flex justify-between items-center">
              <Button
                variant="secondary"
                className="h-10 px-4 bg-white/90 hover:bg-white shadow-lg text-black"
                onClick={onClose}
              >
                <X className="h-4 w-4 mr-2" />
                Fermer
              </Button>
              <ImageExportDropdown
                imageUrl={zoomedImage}
                filename={`dica-render-${Date.now()}`}
                variant="secondary"
                className="h-10 px-4 bg-white hover:bg-gray-100 shadow-lg text-gray-800 border border-gray-200"
              />
            </div>
          </>
        )}
      </div>
    </DialogContent>
  </Dialog>
);
