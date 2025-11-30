/**
 * @fileoverview Composant d'export de plaquette PDF DICA DÉCOR Premium
 * avec support co-branding revendeurs et design premium v2
 * 
 * @author KOREV AI pour DICA France
 * @version 2.0.0
 */

import { useState } from 'react';
import { 
  FileText, 
  Download, 
  Loader2, 
  Building2, 
  Sparkles,
  Image,
  MessageSquareQuote
} from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
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
  const [includeAIComment, setIncludeAIComment] = useState(true);
  
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

      // Utiliser la version Premium pour un rendu de haute qualité
      const result = await service.generatePlaquettePremium(options, handleProgressUpdate);

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
          title: '✨ Plaquette Premium exportée',
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
          <Sparkles className="mr-2 h-4 w-4" />
          Plaquette PDF
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              Exporter la plaquette
              <Badge variant="secondary" className="ml-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-700 border-amber-500/30">
                <Sparkles className="h-3 w-3 mr-1" />
                Premium
              </Badge>
            </div>
          </DialogTitle>
          <DialogDescription>
            Générez une plaquette PDF professionnelle avec mise en page intelligente et commentaire commercial IA.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Résumé du projet */}
          <div className="rounded-xl border p-4 bg-gradient-to-br from-muted/50 to-muted/20">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-base">{project.name}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {images.length} image{images.length > 1 ? 's' : ''} • {decors.length} décor{decors.length > 1 ? 's' : ''}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-background border">
                <Image className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            
            {/* Caractéristiques Premium */}
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 rounded-full bg-primary/10 text-primary">
                  ✓ Images HD non compressées
                </span>
                <span className="px-2 py-1 rounded-full bg-primary/10 text-primary">
                  ✓ Badges couleurs
                </span>
                <span className="px-2 py-1 rounded-full bg-primary/10 text-primary">
                  ✓ Design premium
                </span>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <h5 className="text-sm font-medium text-muted-foreground">Options de génération</h5>
            
            {/* Comparaison avant/après */}
            {originalImage && (
              <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                <div className="space-y-0.5">
                  <Label htmlFor="comparison" className="flex items-center gap-2 cursor-pointer">
                    <Image className="h-4 w-4 text-blue-500" />
                    Comparaison Avant / Après
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Page dédiée avec effet "wahou"
                  </p>
                </div>
                <Switch
                  id="comparison"
                  checked={includeComparison}
                  onCheckedChange={setIncludeComparison}
                />
              </div>
            )}

            {/* Commentaire commercial IA */}
            <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
              <div className="space-y-0.5">
                <Label htmlFor="aicomment" className="flex items-center gap-2 cursor-pointer">
                  <MessageSquareQuote className="h-4 w-4 text-purple-500" />
                  Commentaire commercial IA
                </Label>
                <p className="text-xs text-muted-foreground">
                  Texte commercial adapté au décor et projet
                </p>
              </div>
              <Switch
                id="aicomment"
                checked={includeAIComment}
                onCheckedChange={setIncludeAIComment}
              />
            </div>

            {/* Co-branding revendeur */}
            {canUseCoBranding && (
              <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                <div className="space-y-0.5">
                  <Label htmlFor="cobranding" className="flex items-center gap-2 cursor-pointer">
                    <Building2 className="h-4 w-4 text-green-500" />
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
            <div className="space-y-3 p-4 rounded-lg bg-muted/30">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{progressMessage}</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isExporting}>
            Annuler
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={isExporting || images.length === 0}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Télécharger PDF Premium
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PlaquetteExportButton;

