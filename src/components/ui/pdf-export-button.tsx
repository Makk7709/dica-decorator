/**
 * @fileoverview PDFExportButton - Bouton d'export PDF avec dialog de configuration
 * Permet l'export de plaquettes commerciales et devis DICA
 */

import React, { useState, useCallback } from 'react';
import { FileDown, FileText, Receipt, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  PDFExportService,
  PDFTemplate,
  PlaquetteData,
  DevisData,
  RenderInfo,
} from '@/services/pdf-export.service';

// ============================================================================
// Types
// ============================================================================

export interface PDFExportButtonProps {
  /** Données du projet */
  projectTitle: string;
  projectId: string;
  /** Rendus à exporter */
  renders: RenderInfo[];
  /** Nom du client */
  clientName?: string;
  /** Référence client */
  clientRef?: string;
  /** Informations de contact */
  contactInfo?: {
    name: string;
    email: string;
    phone?: string;
  };
  /** Classe CSS */
  className?: string;
  /** Variante du bouton */
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  /** Taille du bouton */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Afficher le texte */
  showLabel?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export const PDFExportButton: React.FC<PDFExportButtonProps> = ({
  projectTitle,
  projectId,
  renders,
  clientName = '',
  clientRef = '',
  contactInfo,
  className,
  variant = 'outline',
  size = 'default',
  showLabel = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [template, setTemplate] = useState<PDFTemplate>('plaquette');
  
  // Form state
  const [formData, setFormData] = useState({
    clientName: clientName,
    clientRef: clientRef,
    includeComparison: true,
    notes: '',
    // Devis specific
    devisRef: `DEV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
    validityDays: 30,
    conditions: 'Livraison sous 15 jours ouvrés après confirmation de commande.',
  });

  const service = new PDFExportService();

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setExportSuccess(false);

    try {
      service.applyPreset('dica-commercial');

      let content;
      let filename;

      if (template === 'plaquette') {
        const data: PlaquetteData = {
          projectTitle,
          clientName: formData.clientName || 'Client',
          clientRef: formData.clientRef,
          date: new Date(),
          renders,
          contactInfo,
          includeComparison: formData.includeComparison && renders.length >= 2,
          notes: formData.notes,
        };

        const validation = service.validatePlaquetteData(data);
        if (!validation.valid) {
          throw new Error(`Données invalides: ${validation.errors.join(', ')}`);
        }

        content = service.generatePlaquetteContent(data);
        filename = service.generateFilename({
          template: 'plaquette',
          projectTitle,
          date: new Date(),
        });
      } else {
        // Devis
        const data: DevisData = {
          reference: formData.devisRef,
          date: new Date(),
          validUntil: new Date(Date.now() + formData.validityDays * 24 * 60 * 60 * 1000),
          client: {
            name: formData.clientName || 'Client',
            address: '',
            contact: contactInfo?.name || '',
            email: contactInfo?.email || '',
          },
          items: renders.map((render, i) => ({
            description: `${render.decorName} (${render.decorCode})`,
            quantity: 1,
            unitPrice: 0, // À remplir par l'utilisateur
            unit: 'panneau',
          })),
          conditions: formData.conditions,
          notes: formData.notes,
        };

        const validation = service.validateDevisData(data);
        if (!validation.valid) {
          throw new Error(`Données invalides: ${validation.errors.join(', ')}`);
        }

        content = service.generateDevisContent(data);
        filename = service.generateFilename({
          template: 'devis',
          projectTitle,
          date: new Date(),
        });
      }

      // Generate and download PDF
      const blob = await service.generatePDFBlob(content);
      await service.downloadPDF(blob, filename);

      setExportSuccess(true);
      toast.success('PDF exporté avec succès !', {
        description: filename,
      });

      // Auto-close after success
      setTimeout(() => {
        setIsOpen(false);
        setExportSuccess(false);
      }, 1500);

    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erreur lors de l\'export', {
        description: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    } finally {
      setIsExporting(false);
    }
  }, [template, formData, projectTitle, renders, contactInfo, service]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn('gap-2', className)}
          disabled={renders.length === 0}
        >
          <FileDown className="h-4 w-4" />
          {showLabel && <span>Exporter PDF</span>}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5 text-primary" />
            Export PDF
          </DialogTitle>
          <DialogDescription>
            Générez une plaquette commerciale ou un devis professionnel.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Template Selection */}
          <div className="grid gap-2">
            <Label>Type de document</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={template === 'plaquette' ? 'default' : 'outline'}
                className="flex-1 gap-2"
                onClick={() => setTemplate('plaquette')}
              >
                <FileText className="h-4 w-4" />
                Plaquette
              </Button>
              <Button
                type="button"
                variant={template === 'devis' ? 'default' : 'outline'}
                className="flex-1 gap-2"
                onClick={() => setTemplate('devis')}
              >
                <Receipt className="h-4 w-4" />
                Devis
              </Button>
            </div>
          </div>

          {/* Client Name */}
          <div className="grid gap-2">
            <Label htmlFor="clientName">Nom du client</Label>
            <Input
              id="clientName"
              value={formData.clientName}
              onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
              placeholder="Société ABC"
            />
          </div>

          {/* Client Ref */}
          <div className="grid gap-2">
            <Label htmlFor="clientRef">Référence client</Label>
            <Input
              id="clientRef"
              value={formData.clientRef}
              onChange={(e) => setFormData(prev => ({ ...prev, clientRef: e.target.value }))}
              placeholder="CMD-2024-001"
            />
          </div>

          {/* Template-specific fields */}
          {template === 'plaquette' && renders.length >= 2 && (
            <div className="flex items-center justify-between">
              <Label htmlFor="includeComparison">Inclure page de comparaison</Label>
              <Switch
                id="includeComparison"
                checked={formData.includeComparison}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeComparison: checked }))}
              />
            </div>
          )}

          {template === 'devis' && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="devisRef">Référence devis</Label>
                <Input
                  id="devisRef"
                  value={formData.devisRef}
                  onChange={(e) => setFormData(prev => ({ ...prev, devisRef: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="validityDays">Validité (jours)</Label>
                <Select
                  value={String(formData.validityDays)}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, validityDays: parseInt(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 jours</SelectItem>
                    <SelectItem value="30">30 jours</SelectItem>
                    <SelectItem value="60">60 jours</SelectItem>
                    <SelectItem value="90">90 jours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Notes */}
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Notes additionnelles..."
              rows={2}
            />
          </div>

          {/* Summary */}
          <div className="rounded-lg bg-muted p-3 text-sm">
            <div className="font-medium mb-1">Récapitulatif</div>
            <div className="text-muted-foreground space-y-1">
              <div>Projet: {projectTitle}</div>
              <div>Rendus: {renders.length} image(s)</div>
              <div>Format: {template === 'plaquette' ? 'Plaquette commerciale' : 'Devis professionnel'}</div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isExporting}>
            Annuler
          </Button>
          <Button onClick={handleExport} disabled={isExporting || renders.length === 0}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Export en cours...
              </>
            ) : exportSuccess ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Exporté !
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Exporter
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PDFExportButton;

