/**
 * Composant d'export PDF Magazine DECO
 * Style éditorial premium pour DICA DÉCOR
 */

import { useState } from 'react';
import { BookOpen, Download, Loader2, Sparkles } from 'lucide-react';
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
  PlaquetteImage 
} from '@/types/plaquette.types';

export interface MagazineDecoExportButtonProps {
  project: PlaquetteProject;
  decor: PlaquetteDecor;
  images: PlaquetteImage[];
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
  variant = 'outline',
  size = 'default',
  className,
  onExportComplete,
  onExportError,
}: MagazineDecoExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const { toast } = useToast();

  const handleExport = async () => {
    if (images.length === 0) {
      toast({
        title: 'Export impossible',
        description: 'Aucune image à exporter.',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    setProgress(10);

    try {
      setProgress(30);
      
      // Generate Magazine DECO PDF with AI captions
      const result = await magazineDecoPdfService.generateMagazinePDF({
        project,
        decor,
        images,
        generateAICaptions: true
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
        document.body.removeChild(link);
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <BookOpen className="mr-2 h-4 w-4" />
          Magazine DECO
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
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
          {/* Résumé du projet */}
          <div className="rounded-xl border p-4 bg-gradient-to-br from-muted/50 to-muted/20">
            <div className="space-y-3">
              <div>
                <h4 className="font-playfair font-semibold text-lg">{project.name}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {images.length} image{images.length > 1 ? 's' : ''} • Décor {decor.name}
                </p>
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
