/**
 * @fileoverview Composant d'export de plaquette PDF DICA DÉCOR
 * avec support co-branding revendeurs
 * 
 * @author KOREV AI pour DICA France
 */

import { useState } from 'react';
import { FileText, Download, Loader2, Settings2, Building2 } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { PlaquettePdfService } from '@/services/plaquette-pdf.service';
import {
  PlaquetteGenerationOptions,
  PlaquetteProject,
  PlaquetteDecor,
  PlaquetteImage,
  ResellerBranding,
  AppSettings,
  DEFAULT_APP_SETTINGS,
  DEFAULT_DICA_CONTACT,
  PlaquetteProgressEvent,
} from '@/types/plaquette.types';

// ============================================================================
// Types
// ============================================================================

export interface PlaquetteExportButtonProps {
  /** Projet à exporter */
  project: PlaquetteProject;
  /** Décors utilisés */
  decors: PlaquetteDecor[];
  /** Images rendues */
  images: PlaquetteImage[];
  /** Image originale pour comparaison */
  originalImage?: string;
  /** Configuration revendeur (optionnel) */
  resellerBranding?: ResellerBranding | null;
  /** Paramètres application */
  appSettings?: Partial<AppSettings>;
  /** Variante du bouton */
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  /** Taille du bouton */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Classe CSS additionnelle */
  className?: string;
  /** Callback après export réussi */
  onExportComplete?: (filename: string) => void;
  /** Callback en cas d'erreur */
  onExportError?: (error: Error) => void;
}

// ============================================================================
// Component
// ============================================================================

export function PlaquetteExportButton({
  project,
  decors,
  images,
  originalImage,
  resellerBranding,
  appSettings: appSettingsOverrides,
  variant = 'default',
  size = 'default',
  className,
  onExportComplete,
  onExportError,
}: PlaquetteExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [includeComparison, setIncludeComparison] = useState(!!originalImage);
  const [useCoBranding, setUseCoBranding] = useState(
    appSettingsOverrides?.resellerBrandingEnabled ?? false
  );
  
  const { toast } = useToast();
  const service = new PlaquettePdfService();

  const appSettings: AppSettings = {
    ...DEFAULT_APP_SETTINGS,
    ...appSettingsOverrides,
    resellerBrandingEnabled: useCoBranding,
  };

  const canUseCoBranding = 
    resellerBranding !== null && 
    resellerBranding !== undefined &&
    resellerBranding.enabled &&
    resellerBranding.companyName.trim() !== '';

  const handleProgressUpdate = (event: PlaquetteProgressEvent) => {
    setProgress(event.progress);
    setProgressMessage(event.message);
  };

  const handleExport = async () => {
    if (images.length === 0) {
      toast({
        title: 'Export impossible',
        description: 'Aucune image à exporter. Générez d\'abord des rendus.',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    setProgress(0);

    try {
      const options: PlaquetteGenerationOptions = {
        project,
        decors,
        images,
        resellerBranding: useCoBranding ? resellerBranding : null,
        appSettings,
        originalImage,
        includeComparison,
        dicaContact: DEFAULT_DICA_CONTACT,
      };

      const result = await service.generatePlaquette(options, handleProgressUpdate);

      if (result.success && result.blob && result.filename) {
        // Télécharger le PDF
        const url = URL.createObjectURL(result.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: 'Plaquette exportée',
          description: `${result.filename} (${result.pageCount} page${result.pageCount! > 1 ? 's' : ''})`,
        });

        onExportComplete?.(result.filename);
        setIsOpen(false);
      } else {
        throw new Error(result.error || 'Échec de la génération');
      }
    } catch (error) {
      const err = error as Error;
      toast({
        title: 'Erreur d\'export',
        description: err.message || 'Une erreur est survenue lors de la génération du PDF',
        variant: 'destructive',
      });
      onExportError?.(err);
    } finally {
      setIsExporting(false);
      setProgress(0);
      setProgressMessage('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <FileText className="mr-2 h-4 w-4" />
          Plaquette PDF
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Exporter la plaquette
          </DialogTitle>
          <DialogDescription>
            Générez une plaquette PDF professionnelle pour ce projet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Résumé du projet */}
          <div className="rounded-lg border p-4 bg-muted/30">
            <h4 className="font-medium mb-2">{project.name}</h4>
            <p className="text-sm text-muted-foreground">
              {images.length} image{images.length > 1 ? 's' : ''} • {decors.length} décor{decors.length > 1 ? 's' : ''}
            </p>
          </div>

          {/* Options */}
          <div className="space-y-4">
            {/* Comparaison avant/après */}
            {originalImage && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="comparison">Comparaison avant/après</Label>
                  <p className="text-xs text-muted-foreground">
                    Ajouter une page de comparaison
                  </p>
                </div>
                <Switch
                  id="comparison"
                  checked={includeComparison}
                  onCheckedChange={setIncludeComparison}
                />
              </div>
            )}

            {/* Co-branding revendeur */}
            {canUseCoBranding && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="cobranding" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Co-branding revendeur
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {resellerBranding?.companyName}
                  </p>
                </div>
                <Switch
                  id="cobranding"
                  checked={useCoBranding}
                  onCheckedChange={setUseCoBranding}
                />
              </div>
            )}
          </div>

          {/* Progression */}
          {isExporting && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-center text-muted-foreground">
                {progressMessage}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isExporting}>
            Annuler
          </Button>
          <Button onClick={handleExport} disabled={isExporting || images.length === 0}>
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

export default PlaquetteExportButton;

