import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { BeforeAfterSlider } from "@/components/ui/before-after-slider";
import { ImageExportDropdown } from "@/components/ui/image-export-dropdown";
import type { ComparisonState } from "./project-detail.types";

interface ComparisonDialogProps {
  comparisonMode: ComparisonState | null;
  onClose: () => void;
}

/**
 * Dialogue de comparaison avant/après. Extrait de ProjectDetail (LOT 4).
 * Markup, libellés et comportement préservés.
 */
export const ComparisonDialog = ({ comparisonMode, onClose }: Readonly<ComparisonDialogProps>) => (
  <Dialog open={!!comparisonMode} onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="max-w-4xl p-0 overflow-hidden">
      <div className="relative">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center justify-between">
            <div className="text-white">
              <h3 className="font-semibold">Comparaison Avant / Après</h3>
              {comparisonMode?.decorName && (
                <p className="text-sm text-white/80">
                  {comparisonMode.decorName}
                  {comparisonMode.decorCode && ` (${comparisonMode.decorCode})`}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 bg-white/10 hover:bg-white/20 text-white"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Slider */}
        {comparisonMode && (
          <BeforeAfterSlider
            beforeImage={comparisonMode.before}
            afterImage={comparisonMode.after}
            beforeLabel="Photo originale"
            afterLabel="Avec décor DICA"
            metadata={{
              decorName: comparisonMode.decorName,
              decorCode: comparisonMode.decorCode,
            }}
            aspectRatio="auto"
            className="w-full max-h-[80vh]"
          />
        )}

        {/* Footer actions */}
        <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/60 to-transparent">
          <div className="flex justify-center gap-3">
            {comparisonMode?.after && (
              <ImageExportDropdown
                imageUrl={comparisonMode.after}
                filename={`dica-comparison-${Date.now()}`}
                variant="secondary"
                className="h-10 px-4 bg-white hover:bg-gray-100 shadow-lg text-gray-800 border border-gray-200"
              />
            )}
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);
