/**
 * Composant d'export Magazine DICA Generator
 * Génère une structure éditoriale complète à partir de rendus IA
 */

import { useState } from 'react';
import { BookOpen, Loader2, Sparkles, Check, X, FileText } from 'lucide-react';
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
import { useToast } from '@/components/ui/use-toast';
import { magazineGeneratorService } from '@/services/magazine-generator.service';
import { magazineDICAPdfService } from '@/services/magazine-dica-pdf.service';
import type { RenderMetadata } from '@/types/magazine-generator.types';
import type { 
  PlaquetteProject, 
  PlaquetteImage 
} from '@/types/plaquette.types';

export interface MagazineDICAExportButtonProps {
  renders: Array<{
    id: string;
    url: string;
    decorId: string;
    decorName: string;
    decorCode: string;
    usage?: string;
    ambiances?: string[];
  }>;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  onExportComplete?: (magazine: any) => void;
  onExportError?: (error: Error) => void;
}

export function MagazineDICAExportButton({
  renders,
  variant = 'outline',
  size = 'default',
  className,
  onExportComplete,
  onExportError,
}: MagazineDICAExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedRenderIds, setSelectedRenderIds] = useState<Set<string>>(new Set());
  const [generatedMagazine, setGeneratedMagazine] = useState<any>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  const { toast } = useToast();

  // Initialize selection when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open && renders.length > 0) {
      // Select all renders by default (minimum 2 needed)
      const allIds = renders.map(r => r.id);
      setSelectedRenderIds(new Set(allIds));
      setGeneratedMagazine(null);
    }
    setIsOpen(open);
  };

  // Toggle render selection
  const toggleRenderSelection = (renderId: string) => {
    const newSelected = new Set(selectedRenderIds);
    if (newSelected.has(renderId)) {
      // Don't allow deselecting if only 2 left (minimum)
      if (newSelected.size <= 2) {
        toast({
          title: 'Sélection minimale',
          description: 'Au moins 2 rendus sont requis pour générer le magazine.',
          variant: 'default',
        });
        return;
      }
      newSelected.delete(renderId);
    } else {
      newSelected.add(renderId);
    }
    setSelectedRenderIds(newSelected);
  };

  // Convert PlaquetteImage to RenderMetadata
  const convertToRenderMetadata = (): RenderMetadata[] => {
    return Array.from(selectedRenderIds)
      .map(id => {
        const render = renders.find(r => r.id === id);
        if (!render) return null;

        // Extract decor info
        const decors = [{
          id: render.decorId,
          nom: render.decorName,
          code: render.decorCode,
          famille: extractFamilyFromCategory(render.decorCode),
          effet: 'brossé', // Default, could be enhanced
        }];

        return {
          id_image: render.id,
          usage: (render.usage as any) || 'autre',
          ambiances: render.ambiances || ['contemporain'],
          decors,
          image_url: render.url,
        };
      })
      .filter((r): r is RenderMetadata => r !== null);
  };

  // Extract family from decor code or name
  const extractFamilyFromCategory = (decorCode: string): 'bois' | 'metal' | 'pierre' | 'uni' | 'deco' => {
    const code = decorCode.toLowerCase();
    if (code.includes('bois') || code.includes('wood')) return 'bois';
    if (code.includes('metal') || code.includes('metall')) return 'metal';
    if (code.includes('pierre') || code.includes('stone')) return 'pierre';
    if (code.includes('uni')) return 'uni';
    return 'deco';
  };

  // Generate magazine structure
  const handleGenerate = async () => {
    if (selectedRenderIds.size < 2) {
      toast({
        title: 'Sélection insuffisante',
        description: 'Veuillez sélectionner au moins 2 rendus pour générer le magazine.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setProgress(10);

    try {
      const renderMetadata = convertToRenderMetadata();
      setProgress(30);

      const result = await magazineGeneratorService.generateMagazine({
        renders: renderMetadata,
        min_zoom_pages: 2,
        max_zoom_pages: 6,
      });

      setProgress(90);

      if (result.success && result.magazine) {
        setGeneratedMagazine(result.magazine);
        setProgress(50);
        
        // Générer directement le PDF
        setIsGeneratingPdf(true);
        setProgress(60);

        // Créer le mapping des URLs d'images
        const imageUrls: Record<string, string> = {};
        renders.forEach(render => {
          if (selectedRenderIds.has(render.id)) {
            imageUrls[render.id] = render.url;
          }
        });

        setProgress(70);

        // Générer le PDF
        const pdfResult = await magazineDICAPdfService.generateMagazinePDF(
          result.magazine,
          imageUrls
        );

        setProgress(90);

        if (pdfResult.success && pdfResult.blob && pdfResult.filename) {
          // Télécharger le PDF directement
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
            description: `PDF créé avec ${pdfResult.pageCount} pages.`,
            variant: 'default',
          });

          if (onExportComplete) {
            onExportComplete(result.magazine);
          }
        } else {
          throw new Error(pdfResult.error || 'Erreur lors de la génération du PDF');
        }
      } else {
        throw new Error(result.error || 'Erreur lors de la génération');
      }
    } catch (error: any) {
      console.error('[MagazineDICA] Generation error:', error);
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
      setIsGeneratingPdf(false);
      setProgress(0);
    }
  };

  // Download structure as JSON
  const handleDownloadStructure = () => {
    if (!generatedMagazine) return;

    const json = JSON.stringify(generatedMagazine, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `magazine-dica-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'Structure téléchargée',
      description: 'La structure du magazine a été téléchargée au format JSON.',
      variant: 'default',
    });
  };

  const selectedCount = selectedRenderIds.size;
  const canGenerate = selectedCount >= 2 && !isGenerating;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Sparkles className="mr-2 h-4 w-4" />
          Magazine DICA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Générateur Magazine DICA
          </DialogTitle>
          <DialogDescription>
            Sélectionnez les rendus IA pour générer une structure éditoriale complète de magazine déco haut de gamme.
          </DialogDescription>
        </DialogHeader>

        {isGenerating || isGeneratingPdf ? (
          // Affichage pendant génération
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                {isGeneratingPdf ? 'Génération du PDF en cours...' : 'Génération de la structure...'}
              </p>
            </div>
          </div>
        ) : generatedMagazine ? (
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
                  PDF créé avec <strong>{generatedMagazine.pages.length} pages</strong>
                </p>
                <div className="mt-3 space-y-1 text-sm text-green-700 dark:text-green-300">
                  <p>• {generatedMagazine.pages.filter((p: any) => p.type_page === 'zoom_product').length} pages Zoom Produit</p>
                  <p>• {generatedMagazine.decors_utilises_total?.length || 0} décors utilisés</p>
                </div>
              </div>

              {/* Preview structure */}
              <div className="space-y-2">
                <Label>Aperçu de la structure</Label>
                <div className="rounded-lg border bg-muted/50 p-4 max-h-[300px] overflow-y-auto">
                  <div className="space-y-2 text-sm">
                    {generatedMagazine.pages.map((page: any, index: number) => (
                      <div key={index} className="flex items-center gap-2 p-2 rounded bg-background">
                        <Badge variant="outline">{page.type_page}</Badge>
                        <span className="text-muted-foreground">
                          Page {index + 1}
                          {page.titre && ` - ${page.titre}`}
                          {page.phrase_calligraphie && `: "${page.phrase_calligraphie.substring(0, 40)}..."`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
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
              <Button onClick={handleDownloadStructure} variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                Télécharger la structure (JSON)
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Selection */}
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <Label>Sélection des rendus ({selectedCount} sélectionné{selectedCount > 1 ? 's' : ''})</Label>
                {selectedCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedRenderIds(new Set(renders.map(r => r.id)))}
                  >
                    Tout sélectionner
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
                {renders.map((render) => {
                  const isSelected = selectedRenderIds.has(render.id);
                  return (
                    <div
                      key={render.id}
                      className={`relative border rounded-lg p-2 cursor-pointer transition-all ${
                        isSelected ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                      onClick={() => toggleRenderSelection(render.id)}
                    >
                      <div className="flex items-start gap-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleRenderSelection(render.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {render.decorName}
                            </Badge>
                            {render.usage && (
                              <Badge variant="secondary" className="text-xs">
                                {render.usage}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {render.decorCode}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedCount < 2 && (
                <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 p-3">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    ⚠️ Au moins 2 rendus sont requis pour générer le magazine.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isGenerating}>
                Annuler
              </Button>
              <Button onClick={handleGenerate} disabled={!canGenerate}>
                {isGenerating || isGeneratingPdf ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isGeneratingPdf ? 'Génération PDF...' : 'Génération structure...'}
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
        )}
      </DialogContent>
    </Dialog>
  );
}

