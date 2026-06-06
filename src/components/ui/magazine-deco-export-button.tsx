/**
 * Composant d'export PDF Magazine DECO
 * Style éditorial premium pour DICA DÉCOR
 */

import { useState } from 'react';
import { BookOpen, Download, Loader2, Sparkles, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { magazineDecoPdfService } from '@/services/magazine-deco-pdf.service';
import type { 
  PlaquetteProject, 
  PlaquetteDecor, 
  PlaquetteImage,
  ResellerBranding,
} from '@/types/plaquette.types';

export interface MagazineDecoExportButtonProps {
  project: PlaquetteProject;
  decor: PlaquetteDecor;
  images: PlaquetteImage[];
  resellerBranding?: ResellerBranding | null;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  onExportComplete?: (filename: string) => void;
  onExportError?: (error: Error) => void;
}

export function MagazineDecoExportButton({
  project,
  decor,
  images,
  resellerBranding,
  variant = 'outline',
  size = 'default',
  className,
  onExportComplete,
  onExportError,
}: MagazineDecoExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [coverImageId, setCoverImageId] = useState<string>('');
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  
  const { toast } = useToast();

  // Initialize cover image and select all images when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open && images.length > 0) {
      if (!coverImageId) {
        setCoverImageId(images[0].id);
      }
      // Select all images by default
      setSelectedImageIds(new Set(images.map(img => img.id)));
    }
    setIsOpen(open);
  };

  // Toggle image selection
  const toggleImageSelection = (imageId: string) => {
    const newSelected = new Set(selectedImageIds);
    if (newSelected.has(imageId)) {
      // Don't allow deselecting the cover image
      if (imageId === coverImageId) {
        toast({
          title: 'Image de couverture',
          description: 'L\'image de couverture doit rester sélectionnée.',
          variant: 'default',
        });
        return;
      }
      newSelected.delete(imageId);
    } else {
      newSelected.add(imageId);
    }
    setSelectedImageIds(newSelected);
  };

  // Set cover image (also ensures it's selected)
  const handleSetCover = (imageId: string) => {
    setCoverImageId(imageId);
    // Ensure cover is selected
    const newSelected = new Set(selectedImageIds);
    newSelected.add(imageId);
    setSelectedImageIds(newSelected);
  };

  // Get selected images count
  const selectedCount = selectedImageIds.size;

  const handleExport = async () => {
    if (selectedCount === 0) {
      toast({
        title: 'Export impossible',
        description: 'Veuillez sélectionner au moins une image.',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    setProgress(10);

    try {
      setProgress(30);
      
      // Filter only selected images
      const selectedImages = images.filter(img => selectedImageIds.has(img.id));
      
      // Reorder images: cover first, then others
      const coverImage = selectedImages.find(img => img.id === coverImageId);
      const otherImages = selectedImages.filter(img => img.id !== coverImageId);
      const orderedImages = coverImage ? [coverImage, ...otherImages] : selectedImages;
      
      // Generate Magazine DECO PDF with AI captions
      const result = await magazineDecoPdfService.generateMagazinePDF({
        project,
        decor,
        images: orderedImages,
        generateAICaptions: true,
        resellerBranding,
      });

      setProgress(90);

      if (result.success && result.blob && result.filename) {
        // Download PDF
        const url = URL.createObjectURL(result.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        setProgress(100);

        toast({
          title: '📖 Magazine DECO exporté',
          description: `${result.filename} (${result.pageCount} page${result.pageCount! > 1 ? 's' : ''})`,
        });

        onExportComplete?.(result.filename);
        setIsOpen(false);
      } else {
        throw new Error(result.error || 'Échec de la génération');
      }
    } catch (error) {
      const err = error as Error;
      console.error('Magazine DECO export error:', err);
      
      toast({
        title: 'Erreur d\'export',
        description: err.message || 'Une erreur est survenue lors de la génération',
        variant: 'destructive',
      });
      
      onExportError?.(err);
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <BookOpen className="mr-2 h-4 w-4" />
          Magazine DECO
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              Export Magazine DECO
              <Badge variant="secondary" className="ml-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-700 border-purple-500/30">
                <Sparkles className="h-3 w-3 mr-1" />
                Éditorial
              </Badge>
            </div>
          </DialogTitle>
          <DialogDescription>
            Style éditorial premium avec captions IA générées automatiquement (type AD Magazine).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Sélection des images */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold">Sélection des images</h4>
                <Badge variant="outline" className="text-xs">
                  {selectedCount}/{images.length} sélectionnée{selectedCount > 1 ? 's' : ''}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedImageIds(new Set(images.map(img => img.id)))}
                  className="text-xs h-7"
                >
                  Tout sélectionner
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedImageIds(new Set([coverImageId]))}
                  className="text-xs h-7"
                >
                  Couverture seule
                </Button>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Cliquez sur une image pour la sélectionner/désélectionner. Double-cliquez pour définir la couverture.
            </p>
            
            <div className="grid grid-cols-3 gap-3">
              {images.map((image) => {
                const isSelected = selectedImageIds.has(image.id);
                const isCover = coverImageId === image.id;
                
                return (
                  <div
                    key={image.id}
                    className="relative"
                  >
                    <button
                      type="button"
                      onClick={() => toggleImageSelection(image.id)}
                      onDoubleClick={() => handleSetCover(image.id)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all w-full ${
                        isCover
                          ? 'border-primary ring-2 ring-primary/20'
                          : isSelected
                            ? 'border-green-500 ring-1 ring-green-500/20'
                            : 'border-border opacity-50 grayscale hover:opacity-75 hover:grayscale-0'
                      }`}
                    >
                      <img
                        src={image.url}
                        alt={`Option ${image.decorName}`}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Indicateur de sélection */}
                      <div className={`absolute top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center ${
                        isSelected ? 'bg-green-500' : 'bg-gray-400/80'
                      }`}>
                        {isSelected ? (
                          <Check className="h-3 w-3 text-white" />
                        ) : (
                          <X className="h-3 w-3 text-white" />
                        )}
                      </div>
                      
                      {/* Badge favori */}
                      {image.isFavorite && (
                        <Badge 
                          variant="secondary" 
                          className="absolute top-2 right-2 text-xs bg-yellow-500/90 text-white border-0"
                        >
                          ★
                        </Badge>
                      )}
                      
                      {/* Badge couverture */}
                      {isCover && (
                        <div className="absolute bottom-0 inset-x-0 bg-primary/90 py-1">
                          <p className="text-xs text-white text-center font-medium">Couverture</p>
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Résumé du projet */}
          <div className="rounded-xl border p-4 bg-gradient-to-br from-muted/50 to-muted/20">
            <div className="space-y-3">
              <div>
                <h4 className="font-playfair font-semibold text-lg">{project.name}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedCount} image{selectedCount > 1 ? 's' : ''} sélectionnée{selectedCount > 1 ? 's' : ''} • Décor {decor.name}
                </p>
                {selectedCount > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    = {selectedCount + 1} page{selectedCount > 0 ? 's' : ''} (couverture + {selectedCount} article{selectedCount > 1 ? 's' : ''})
                  </p>
                )}
              </div>
              
              {/* Features */}
              <div className="pt-3 border-t border-border/50">
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3 w-3 text-primary" />
                    <span className="text-muted-foreground">Slugline IA handwritten</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3 w-3 text-primary" />
                    <span className="text-muted-foreground">Caption éditoriale IA</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-3 w-3 text-primary" />
                    <span className="text-muted-foreground">Layout magazine premium</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Typography preview */}
          <div className="rounded-lg border p-4 space-y-2 bg-background">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Aperçu typographie</p>
            <p className="font-allura text-xl text-foreground">Slugline handwritten</p>
            <p className="font-playfair text-sm text-muted-foreground leading-relaxed">
              Caption éditoriale style magazine professionnel
            </p>
          </div>

          {/* Progress */}
          {isExporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Génération en cours...</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                {progress < 40 ? '🤖 Génération des textes IA...' : 
                 progress < 80 ? '📄 Création du PDF...' : 
                 '✨ Finalisation...'}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isExporting}>
            Annuler
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Télécharger PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
