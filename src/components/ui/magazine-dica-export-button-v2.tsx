/**
 * Composant d'export Magazine DICA Generator V2 (Refondu)
 * Avec thème personnalisé et sélection d'images
 */

import { useState } from 'react';
import { BookOpen, Loader2, Sparkles, Check, X, FileText, Image as ImageIcon, Type } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { magazineGeneratorV2Service } from '@/services/magazine-generator-v2.service';
import { magazineDICAPdfService } from '@/services/magazine-dica-pdf.service';
import type { SelectedImage, DecorInfo } from '@/types/magazine-generator.types';

export interface MagazineDICAExportButtonV2Props {
  availableImages: Array<{
    id: string;
    url: string;
    type: 'project_photo' | 'render' | 'creative';
    projectId?: string;
    projectName?: string;
    decorId?: string;
    decorName?: string;
    decorCode?: string;
    decorTextureUrl?: string;
    usage?: string;
  }>;
  availableDecors: Array<{
    id: string;
    name: string;
    reference_code: string;
    category: string;
    texture_image_url?: string;
    color_hex?: string;
  }>;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  onExportComplete?: (magazine: any) => void;
  onExportError?: (error: Error) => void;
}

export function MagazineDICAExportButtonV2({
  availableImages,
  availableDecors,
  variant = 'outline',
  size = 'default',
  className,
  onExportComplete,
  onExportError,
}: MagazineDICAExportButtonV2Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // État de sélection
  const [theme, setTheme] = useState<string>('');
  const [coverImageId, setCoverImageId] = useState<string>('');
  const [selectedZoomImageIds, setSelectedZoomImageIds] = useState<Set<string>>(new Set());
  const [generatedMagazine, setGeneratedMagazine] = useState<any>(null);
  
  const { toast } = useToast();

  // Initialize when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open && availableImages.length > 0) {
      // Sélectionner la première image comme couverture par défaut
      if (!coverImageId) {
        setCoverImageId(availableImages[0].id);
      }
      // Sélectionner les 2-3 premières images comme zoom par défaut
      if (selectedZoomImageIds.size === 0) {
        const defaultZooms = availableImages.slice(1, 4).map(img => img.id);
        setSelectedZoomImageIds(new Set(defaultZooms));
      }
      setGeneratedMagazine(null);
      setProgress(0);
    }
    setIsOpen(open);
  };

  // Toggle zoom image selection
  const toggleZoomImageSelection = (imageId: string) => {
    const newSelected = new Set(selectedZoomImageIds);
    
    // Ne pas permettre de désélectionner si seulement 2 sont sélectionnées (minimum)
    if (newSelected.has(imageId) && newSelected.size <= 2) {
      toast({
        title: 'Minimum requis',
        description: 'Au moins 2 images sont requises pour les pages Zoom Produit.',
        variant: 'default',
      });
      return;
    }

    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
    } else {
      // Limiter à 6 images max
      if (newSelected.size >= 6) {
        toast({
          title: 'Maximum atteint',
          description: 'Maximum 6 images pour les pages Zoom Produit.',
          variant: 'default',
        });
        return;
      }
      newSelected.add(imageId);
    }
    
    setSelectedZoomImageIds(newSelected);
  };

  // Convert to SelectedImage
  const convertToSelectedImage = (img: any): SelectedImage => {
    const decor = availableDecors.find(d => d.id === img.decorId);
    
    return {
      id: img.id,
      url: img.url,
      type: img.type,
      projectId: img.projectId,
      projectName: img.projectName,
      decorId: img.decorId,
      decorName: img.decorName || decor?.name,
      decorCode: img.decorCode || decor?.reference_code,
      decorTextureUrl: img.decorTextureUrl || decor?.texture_image_url,
      usage: img.usage,
    };
  };

  // Convert to DecorInfo
  const extractDecorsFromImages = (): DecorInfo[] => {
    const decorMap = new Map<string, DecorInfo>();
    
    // Extraire depuis les images sélectionnées
    const allSelectedImages = [coverImageId, ...Array.from(selectedZoomImageIds)]
      .map(id => availableImages.find(img => img.id === id))
      .filter(Boolean) as any[];

    allSelectedImages.forEach(img => {
      if (img.decorId) {
        const decor = availableDecors.find(d => d.id === img.decorId);
        if (decor && !decorMap.has(decor.id)) {
          decorMap.set(decor.id, {
            id: decor.id,
            nom: decor.name,
            code: decor.reference_code,
            famille: extractFamilyFromCategory(decor.category),
            effet: 'brossé', // Default
            texture_image_url: decor.texture_image_url,
            color_hex: decor.color_hex,
          });
        }
      }
    });

    return Array.from(decorMap.values());
  };

  // Extract family from category
  const extractFamilyFromCategory = (category: string): 'bois' | 'metal' | 'pierre' | 'uni' | 'deco' => {
    const cat = category.toLowerCase();
    if (cat.includes('bois') || cat.includes('wood')) return 'bois';
    if (cat.includes('metal') || cat.includes('metall')) return 'metal';
    if (cat.includes('pierre') || cat.includes('stone')) return 'pierre';
    if (cat.includes('uni')) return 'uni';
    return 'deco';
  };

  // Generate magazine
  const handleGenerate = async () => {
    if (!theme.trim()) {
      toast({
        title: 'Thème requis',
        description: 'Veuillez saisir un thème pour le magazine.',
        variant: 'destructive',
      });
      return;
    }

    if (!coverImageId) {
      toast({
        title: 'Image de couverture requise',
        description: 'Veuillez sélectionner une image de couverture.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedZoomImageIds.size < 2) {
      toast({
        title: 'Images Zoom requises',
        description: 'Veuillez sélectionner au moins 2 images pour les pages Zoom Produit.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setProgress(10);

    try {
      // Convertir les images
      const coverImage = convertToSelectedImage(
        availableImages.find(img => img.id === coverImageId)!
      );
      
      const zoomImages = Array.from(selectedZoomImageIds)
        .map(id => convertToSelectedImage(availableImages.find(img => img.id === id)!))
        .filter(Boolean);

      setProgress(30);

      // Extraire les décors
      const decors = extractDecorsFromImages();
      
      if (decors.length === 0) {
        throw new Error('Aucun décor trouvé dans les images sélectionnées');
      }

      setProgress(40);

      // Générer le magazine
      const result = await magazineGeneratorV2Service.generateMagazine({
        theme: theme.trim(),
        coverImage,
        zoomImages,
        decors,
        min_zoom_pages: 2,
        max_zoom_pages: 6,
      });

      setProgress(60);

      if (!result.success || !result.magazine) {
        throw new Error(result.error || 'Erreur lors de la génération');
      }

      setGeneratedMagazine(result.magazine);
      setProgress(70);

      // Créer le mapping des URLs d'images
      const imageUrls: Record<string, string> = {};
      [coverImage, ...zoomImages].forEach(img => {
        imageUrls[img.id] = img.url;
      });

      // Créer le mapping des textures
      const decorTextureUrls: Record<string, string> = {};
      decors.forEach(decor => {
        if (decor.texture_image_url) {
          decorTextureUrls[decor.id] = decor.texture_image_url;
          decorTextureUrls[decor.code] = decor.texture_image_url;
        }
      });

      setProgress(80);

      // Générer le PDF
      const pdfResult = await magazineDICAPdfService.generateMagazinePDF(
        result.magazine,
        imageUrls,
        decorTextureUrls
      );

      setProgress(90);

      if (pdfResult.success && pdfResult.blob && pdfResult.filename) {
        // Télécharger le PDF
        const url = URL.createObjectURL(pdfResult.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = pdfResult.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setProgress(100);
        
        toast({
          title: 'Magazine PDF généré avec succès',
          description: `PDF créé avec ${pdfResult.pageCount} pages sur le thème "${theme}".`,
          variant: 'default',
        });

        if (onExportComplete) {
          onExportComplete(result.magazine);
        }
      } else {
        throw new Error(pdfResult.error || 'Erreur lors de la génération du PDF');
      }
    } catch (error: any) {
      console.error('[MagazineDICA V2] Generation error:', error);
      toast({
        title: 'Erreur de génération',
        description: error.message || 'Une erreur est survenue lors de la génération du magazine.',
        variant: 'destructive',
      });

      if (onExportError) {
        onExportError(error);
      }
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const canGenerate = theme.trim().length > 0 && 
                      coverImageId && 
                      selectedZoomImageIds.size >= 2 && 
                      !isGenerating;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Sparkles className="mr-2 h-4 w-4" />
          Magazine DICA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Générateur Magazine DICA
          </DialogTitle>
          <DialogDescription>
            Créez un magazine déco haut de gamme avec un thème personnalisé et une sélection d'images.
          </DialogDescription>
        </DialogHeader>

        {!generatedMagazine ? (
          <>
            {/* Étape 1: Thème */}
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="theme" className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Thème du magazine
                </Label>
                <Input
                  id="theme"
                  placeholder="Ex: les escapades en van, la remontée luxe d'ascenseur..."
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  disabled={isGenerating}
                />
                <p className="text-xs text-muted-foreground">
                  L'IA générera les textes éditoriaux (expert stratifié/storytelling) basés sur ce thème.
                </p>
              </div>

              {/* Étape 2: Image de couverture */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Image de couverture
                </Label>
                <div className="grid grid-cols-3 gap-3 max-h-[200px] overflow-y-auto border rounded-lg p-3">
                  {availableImages.map((img) => {
                    const isSelected = coverImageId === img.id;
                    return (
                      <div
                        key={img.id}
                        className={`relative border-2 rounded-lg p-2 cursor-pointer transition-all ${
                          isSelected ? 'border-primary bg-primary/5' : 'border-border'
                        }`}
                        onClick={() => setCoverImageId(img.id)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => setCoverImageId(img.id)}
                          className="absolute top-1 right-1"
                        />
                        <div className="space-y-1">
                          {img.projectName && (
                            <p className="text-xs font-medium truncate">{img.projectName}</p>
                          )}
                          {img.decorName && (
                            <Badge variant="outline" className="text-xs">
                              {img.decorName}
                            </Badge>
                          )}
                          {img.usage && (
                            <Badge variant="secondary" className="text-xs">
                              {img.usage}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Étape 3: Images Zoom Produit */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Images pour pages Zoom Produit (2-6 images)
                  <Badge variant="outline" className="text-xs">
                    {selectedZoomImageIds.size} sélectionnée{selectedZoomImageIds.size > 1 ? 's' : ''}
                  </Badge>
                </Label>
                <div className="grid grid-cols-3 gap-3 max-h-[300px] overflow-y-auto border rounded-lg p-3">
                  {availableImages
                    .filter(img => img.id !== coverImageId) // Exclure l'image de couverture
                    .map((img) => {
                      const isSelected = selectedZoomImageIds.has(img.id);
                      return (
                        <div
                          key={img.id}
                          className={`relative border-2 rounded-lg p-2 cursor-pointer transition-all ${
                            isSelected ? 'border-primary bg-primary/5' : 'border-border'
                          }`}
                          onClick={() => toggleZoomImageSelection(img.id)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleZoomImageSelection(img.id)}
                            className="absolute top-1 right-1"
                          />
                          <div className="space-y-1">
                            {img.projectName && (
                              <p className="text-xs font-medium truncate">{img.projectName}</p>
                            )}
                            {img.decorName && (
                              <Badge variant="outline" className="text-xs">
                                {img.decorName}
                              </Badge>
                            )}
                            {img.usage && (
                              <Badge variant="secondary" className="text-xs">
                                {img.usage}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
                {selectedZoomImageIds.size < 2 && (
                  <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 p-3">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      ⚠️ Au moins 2 images sont requises pour les pages Zoom Produit.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Progress */}
            {isGenerating && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-muted-foreground text-center">
                  Génération du magazine en cours...
                </p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isGenerating}>
                Annuler
              </Button>
              <Button onClick={handleGenerate} disabled={!canGenerate}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Générer le PDF
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Results */}
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <h3 className="font-semibold text-green-900 dark:text-green-100">
                    Magazine PDF généré avec succès
                  </h3>
                </div>
                <p className="text-sm text-green-800 dark:text-green-200">
                  PDF créé avec <strong>{generatedMagazine.pages.length} pages</strong> sur le thème "{generatedMagazine.theme}"
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setGeneratedMagazine(null);
                setProgress(0);
                setIsOpen(false);
              }}>
                Fermer
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

