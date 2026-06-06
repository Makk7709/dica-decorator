/**
 * Composant d'export PDF Brochure Revendeur
 * Clone de Magazine DECO avec couverture personnalisée
 * 
 * Le NOM DU REVENDEUR apparaît en titre principal sur la couverture
 * 
 * @author KOREV AI
 * @date Décembre 2025
 */

import { useState } from 'react';
import { BookOpen, Download, Loader2, Sparkles, Check, X, Building2, User } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { resellerBrochurePdfService } from '@/services/reseller-brochure-pdf.service';
import type { ResellerBranding } from '@/types/plaquette.types';
import type { 
  PlaquetteProject, 
  PlaquetteDecor, 
  PlaquetteImage 
} from '@/types/plaquette.types';

export interface ResellerBrochureExportButtonProps {
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

export function ResellerBrochureExportButton({
  project,
  decor,
  images,
  resellerBranding,
  variant = 'outline',
  size = 'default',
  className,
  onExportComplete,
  onExportError,
}: ResellerBrochureExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [coverImageId, setCoverImageId] = useState<string>('');
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [clientName, setClientName] = useState<string>('');
  
  const { toast } = useToast();

  const isResellerMode = resellerBranding?.enabled && resellerBranding?.companyName?.trim();
  const brandName = isResellerMode ? resellerBranding.companyName : 'DICA';

  const handleOpenChange = (open: boolean) => {
    if (open && images.length > 0) {
      if (!coverImageId) {
        setCoverImageId(images[0].id);
      }
      setSelectedImageIds(new Set(images.map(img => img.id)));
    }
    setIsOpen(open);
  };

  const toggleImageSelection = (imageId: string) => {
    const newSelected = new Set(selectedImageIds);
    if (newSelected.has(imageId)) {
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

  const handleSetCover = (imageId: string) => {
    setCoverImageId(imageId);
    const newSelected = new Set(selectedImageIds);
    newSelected.add(imageId);
    setSelectedImageIds(newSelected);
  };

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
      
      const selectedImages = images.filter(img => selectedImageIds.has(img.id));
      const coverImage = selectedImages.find(img => img.id === coverImageId);
      const otherImages = selectedImages.filter(img => img.id !== coverImageId);
      const orderedImages = coverImage ? [coverImage, ...otherImages] : selectedImages;
      
      console.log("[ResellerBrochureExport] Generating PDF with:", {
        projectName: project.name,
        decorName: decor.name,
        imagesCount: orderedImages.length,
        resellerBranding: resellerBranding ? JSON.stringify(resellerBranding, null, 2) : 'NULL',
        clientName: clientName.trim() || undefined,
      });

      const result = await resellerBrochurePdfService.generateResellerBrochurePDF({
        project,
        decor,
        images: orderedImages,
        resellerBranding,
        clientName: clientName.trim() || undefined,
        generateAICaptions: true
      });

      console.log("[ResellerBrochureExport] PDF generation result:", {
        success: result.success,
        filename: result.filename,
        pageCount: result.pageCount,
      });

      setProgress(90);

      if (result.success && result.blob && result.filename) {
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
          title: isResellerMode ? `📖 Brochure ${brandName} exportée` : '📖 Brochure DICA exportée',
          description: `${result.filename} (${result.pageCount} page${result.pageCount! > 1 ? 's' : ''})`,
        });

        onExportComplete?.(result.filename);
        setIsOpen(false);
      } else {
        throw new Error(result.error || 'Échec de la génération');
      }
    } catch (error) {
      const err = error as Error;
      console.error('Brochure export error:', err);
      
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
          {isResellerMode ? (
            <Building2 className="mr-2 h-4 w-4" />
          ) : (
            <BookOpen className="mr-2 h-4 w-4" />
          )}
          {isResellerMode ? `Brochure ${brandName}` : 'Brochure DICA'}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                {isResellerMode ? (
                  <Building2 className="h-5 w-5 text-primary" />
                ) : (
                  <BookOpen className="h-5 w-5 text-primary" />
                )}
              </div>
              {isResellerMode ? `Brochure ${brandName}` : 'Brochure DICA'}
              <Badge variant="secondary" className="ml-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-700 border-purple-500/30">
                <Sparkles className="h-3 w-3 mr-1" />
                Premium
              </Badge>
            </div>
          </DialogTitle>
          <DialogDescription>
            {isResellerMode ? (
              <>
                Brochure personnalisée avec <strong>{brandName}</strong> en couverture.
                Style éditorial premium avec captions IA.
              </>
            ) : (
              'Style éditorial premium avec captions IA générées automatiquement.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Personnalisation client */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-4">
            <div className="flex items-center gap-2 mb-3">
              <User className="h-4 w-4 text-blue-600" />
              <span className="font-semibold text-blue-700 dark:text-blue-400">
                Personnalisation client
              </span>
              <Badge variant="outline" className="text-xs border-blue-300 text-blue-600">
                Optionnel
              </Badge>
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-name" className="text-sm text-blue-700 dark:text-blue-300">
                Nom du client (apparaîtra sur la couverture)
              </Label>
              <Input
                id="client-name"
                placeholder="Ex: Société Martin, Hôtel Le Palace, M. Dupont..."
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="bg-white dark:bg-gray-900 border-blue-200 dark:border-blue-700 focus-visible:ring-blue-500"
              />
              <p className="text-xs text-blue-500 dark:text-blue-400">
                💡 Le nom apparaîtra comme sous-titre : "Projet pour [Nom du client]"
              </p>
            </div>
          </div>

          {/* Infos revendeur si mode revendeur */}
          {isResellerMode && resellerBranding && (
            <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-green-600" />
                <span className="font-semibold text-green-700 dark:text-green-400">
                  Mode Revendeur activé
                </span>
              </div>
              <div className="text-sm text-green-600 dark:text-green-300 space-y-1">
                <p><strong>Titre couverture :</strong> {brandName}</p>
                {resellerBranding.contactName && <p>Contact : {resellerBranding.contactName}</p>}
                {resellerBranding.phone && <p>Tél : {resellerBranding.phone}</p>}
                {resellerBranding.email && <p>Email : {resellerBranding.email}</p>}
              </div>
            </div>
          )}

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
              Cliquez pour sélectionner. Double-cliquez pour définir la couverture.
            </p>
            
            <div className="grid grid-cols-3 gap-3">
              {images.map((image) => {
                const isSelected = selectedImageIds.has(image.id);
                const isCover = coverImageId === image.id;
                
                return (
                  <div key={image.id} className="relative">
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
                      
                      <div className={`absolute top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center ${
                        isSelected ? 'bg-green-500' : 'bg-gray-400/80'
                      }`}>
                        {isSelected ? (
                          <Check className="h-3 w-3 text-white" />
                        ) : (
                          <X className="h-3 w-3 text-white" />
                        )}
                      </div>
                      
                      {image.isFavorite && (
                        <Badge 
                          variant="secondary" 
                          className="absolute top-2 right-2 text-xs bg-yellow-500/90 text-white border-0"
                        >
                          ★
                        </Badge>
                      )}
                      
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
                  {selectedCount} image{selectedCount > 1 ? 's' : ''} • Décor {decor.name}
                </p>
                {selectedCount > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    = {selectedCount + 1} page{selectedCount > 0 ? 's' : ''} (couverture + {selectedCount} article{selectedCount > 1 ? 's' : ''})
                  </p>
                )}
              </div>
              
              <div className="pt-3 border-t border-border/50">
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3 w-3 text-primary" />
                    <span className="text-muted-foreground">Titre couverture : <strong>{brandName}</strong></span>
                  </div>
                  {clientName.trim() && (
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3 text-blue-500" />
                      <span className="text-muted-foreground">Client : <strong className="text-blue-600">{clientName.trim()}</strong></span>
                    </div>
                  )}
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

