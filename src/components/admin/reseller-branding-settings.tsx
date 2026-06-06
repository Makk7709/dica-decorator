/**
 * @fileoverview Composant de configuration du co-branding revendeur
 * Interface Admin pour activer/désactiver et configurer le branding
 * 
 * @author KOREV AI pour DICA France
 */

import { useState, useEffect } from 'react';
import {Building2, Upload, Save, AlertCircle, Palette, Globe, Mail, Phone, MapPin, User, FileText, Eye, EyeOff} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { ResellerBranding, ResellerBrandingValidation } from '@/types/plaquette.types';
import { ResellerBrochurePdfService } from '@/services/reseller-brochure-pdf.service';

// ============================================================================
// Types
// ============================================================================

export interface ResellerBrandingSettingsProps {
  /** Configuration actuelle du branding */
  currentBranding?: ResellerBranding | null;
  /** Co-branding activé globalement */
  isCoBrandingEnabled: boolean;
  /** Callback pour toggle global */
  onToggleCoBranding: (enabled: boolean) => void;
  /** Callback pour sauvegarder le branding */
  onSaveBranding: (branding: ResellerBranding) => Promise<void>;
  /** Mode lecture seule */
  readOnly?: boolean;
}

// ============================================================================
// Composant
// ============================================================================

export function ResellerBrandingSettings({
  currentBranding,
  isCoBrandingEnabled,
  onToggleCoBranding,
  onSaveBranding,
  readOnly = false,
}: Readonly<ResellerBrandingSettingsProps>) {
  const { toast } = useToast();
  const service = ResellerBrochurePdfService.getInstance();

  // État du formulaire
  const [formData, setFormData] = useState<ResellerBranding>({
    enabled: currentBranding?.enabled ?? true,
    companyName: currentBranding?.companyName ?? '',
    logoUrl: currentBranding?.logoUrl ?? '',
    contactName: currentBranding?.contactName ?? '',
    phone: currentBranding?.phone ?? '',
    email: currentBranding?.email ?? '',
    website: currentBranding?.website ?? '',
    addressLine1: currentBranding?.addressLine1 ?? '',
    addressLine2: currentBranding?.addressLine2 ?? '',
    city: currentBranding?.city ?? '',
    postalCode: currentBranding?.postalCode ?? '',
    country: currentBranding?.country ?? 'France',
    accentColorHex: currentBranding?.accentColorHex ?? '#2563EB',
    siret: currentBranding?.siret ?? '',
    tagline: currentBranding?.tagline ?? '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [validation, setValidation] = useState<ResellerBrandingValidation | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Valider à chaque changement
  useEffect(() => {
    const result = service.validateResellerBranding(formData);
    setValidation(result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

  // Mettre à jour quand les props changent
  useEffect(() => {
    if (currentBranding) {
      setFormData(currentBranding);
    }
  }, [currentBranding]);

  const handleInputChange = (field: keyof ResellerBranding, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!validation?.isValid) {
      toast({
        title: 'Validation échouée',
        description: 'Veuillez remplir les champs obligatoires.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSaveBranding(formData);
      toast({
        title: 'Configuration sauvegardée',
        description: 'Les informations de branding ont été mises à jour.',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder la configuration.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toggle Global */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Co-branding Revendeurs
          </CardTitle>
          <CardDescription>
            Activez le co-branding pour permettre aux revendeurs d'avoir leurs 
            informations sur les plaquettes PDF générées.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="global-cobranding">Activer le co-branding</Label>
              <p className="text-sm text-muted-foreground">
                {isCoBrandingEnabled 
                  ? 'Les plaquettes incluront les informations revendeur'
                  : 'Les plaquettes seront 100% DICA'
                }
              </p>
            </div>
            <Switch
              id="global-cobranding"
              checked={isCoBrandingEnabled}
              onCheckedChange={onToggleCoBranding}
              disabled={readOnly}
            />
          </div>
        </CardContent>
      </Card>

      {/* Formulaire de configuration (si co-branding activé) */}
      {isCoBrandingEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informations Revendeur
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? (
                  <><EyeOff className="mr-2 h-4 w-4" /> Masquer aperçu</>
                ) : (
                  <><Eye className="mr-2 h-4 w-4" /> Aperçu</>
                )}
              </Button>
            </CardTitle>
            <CardDescription>
              Ces informations apparaîtront sur les plaquettes PDF co-brandées.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Validation Alert */}
            {validation && !validation.isComplete && (
              <Alert variant={validation.isValid ? 'default' : 'destructive'}>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>
                  {validation.isValid ? 'Informations incomplètes' : 'Champs obligatoires manquants'}
                </AlertTitle>
                <AlertDescription>
                  {validation.missingFields.length > 0 && (
                    <span>
                      Champs manquants : {validation.missingFields.slice(0, 3).join(', ')}
                      {validation.missingFields.length > 3 && ` (+${validation.missingFields.length - 3})`}
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Preview */}
            {showPreview && validation?.isValid && (
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-4">
                    {formData.logoUrl ? (
                      <img 
                        src={formData.logoUrl} 
                        alt="Logo" 
                        className="w-16 h-16 object-contain rounded"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                        <Building2 className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <h4 
                        className="font-semibold text-lg"
                        style={{ color: formData.accentColorHex }}
                      >
                        {formData.companyName || 'Nom de la société'}
                      </h4>
                      {formData.tagline && (
                        <p className="text-sm text-muted-foreground italic">
                          {formData.tagline}
                        </p>
                      )}
                      <div className="text-sm mt-1 space-y-0.5">
                        {formData.phone && <p>{formData.phone}</p>}
                        {formData.email && <p>{formData.email}</p>}
                        {formData.website && <p>{formData.website}</p>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Separator />

            {/* Informations principales */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="companyName" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Nom de la société *
                </Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  placeholder="Ex: Décors Pro Paris"
                  disabled={readOnly}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Contact principal
                </Label>
                <Input
                  id="contactName"
                  value={formData.contactName || ''}
                  onChange={(e) => handleInputChange('contactName', e.target.value)}
                  placeholder="Jean Dupont"
                  disabled={readOnly}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tagline">Slogan / Tagline</Label>
                <Input
                  id="tagline"
                  value={formData.tagline || ''}
                  onChange={(e) => handleInputChange('tagline', e.target.value)}
                  placeholder="Votre partenaire décoration"
                  disabled={readOnly}
                />
              </div>
            </div>

            <Separator />

            {/* Contact */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Téléphone
                </Label>
                <Input
                  id="phone"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+33 1 23 45 67 89"
                  disabled={readOnly}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="contact@decorspro.fr"
                  disabled={readOnly}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="website" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Site web
                </Label>
                <Input
                  id="website"
                  value={formData.website || ''}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="www.decorspro.fr"
                  disabled={readOnly}
                />
              </div>
            </div>

            <Separator />

            {/* Adresse */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="addressLine1" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Adresse
                </Label>
                <Input
                  id="addressLine1"
                  value={formData.addressLine1 || ''}
                  onChange={(e) => handleInputChange('addressLine1', e.target.value)}
                  placeholder="123 Avenue des Décors"
                  disabled={readOnly}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postalCode">Code postal</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode || ''}
                  onChange={(e) => handleInputChange('postalCode', e.target.value)}
                  placeholder="75001"
                  disabled={readOnly}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Ville</Label>
                <Input
                  id="city"
                  value={formData.city || ''}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="Paris"
                  disabled={readOnly}
                />
              </div>
            </div>

            <Separator />

            {/* Personnalisation */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="logoUrl" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  URL du logo
                </Label>
                <Input
                  id="logoUrl"
                  value={formData.logoUrl || ''}
                  onChange={(e) => handleInputChange('logoUrl', e.target.value)}
                  placeholder="https://..."
                  disabled={readOnly}
                />
                <p className="text-xs text-muted-foreground">
                  Format recommandé : PNG transparent, 200x200 px minimum
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accentColor" className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Couleur d'accent
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="accentColor"
                    type="color"
                    value={formData.accentColorHex || '#2563EB'}
                    onChange={(e) => handleInputChange('accentColorHex', e.target.value)}
                    className="w-14 h-10 p-1 cursor-pointer"
                    disabled={readOnly}
                  />
                  <Input
                    value={formData.accentColorHex || '#2563EB'}
                    onChange={(e) => handleInputChange('accentColorHex', e.target.value)}
                    placeholder="#2563EB"
                    className="flex-1"
                    disabled={readOnly}
                  />
                </div>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="siret">SIRET (optionnel)</Label>
                <Input
                  id="siret"
                  value={formData.siret || ''}
                  onChange={(e) => handleInputChange('siret', e.target.value)}
                  placeholder="123 456 789 00010"
                  disabled={readOnly}
                />
              </div>
            </div>

            {/* Bouton de sauvegarde */}
            {!readOnly && (
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !validation?.isValid}
                >
                  {isSaving ? (
                    <>Sauvegarde...</>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Sauvegarder
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info quand désactivé */}
      {!isCoBrandingEnabled && (
        <Alert>
          <Building2 className="h-4 w-4" />
          <AlertTitle>Co-branding désactivé</AlertTitle>
          <AlertDescription>
            Toutes les plaquettes PDF générées afficheront uniquement la marque DICA France.
            Activez le co-branding pour permettre la personnalisation revendeur.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default ResellerBrandingSettings;

