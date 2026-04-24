import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Loader2, Building2, Lock } from "lucide-react";
import { toast } from "sonner";
import { PremiumLayout, ContentContainer, SectionTitle } from "@/components/ui/premium-layout";
import { ResellerBrandingSettings } from "@/components/admin/reseller-branding-settings";
import { ResellerBranding } from "@/types/plaquette.types";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { AppFooter } from "@/components/ui/app-footer";

const MyCoBranding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isCoBrandingEnabled, setIsCoBrandingEnabled] = useState(false);
  const [resellerBranding, setResellerBranding] = useState<ResellerBranding | null>(null);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "cobranding_enabled, company_name, contact_name, email, phone, addressline1, addressline2, city, postal_code, website, tagline, logo_url, accent_color_hex, siret, country"
        )
        .eq("id", user.id)
        .single();

      if (error) throw error;

      const enabled = data?.cobranding_enabled ?? false;
      setIsCoBrandingEnabled(enabled);

      setResellerBranding({
        enabled: enabled,
        companyName: data?.company_name ?? "",
        contactName: data?.contact_name ?? "",
        email: data?.email ?? "",
        phone: data?.phone ?? "",
        addressLine1: data?.addressline1 ?? "",
        addressLine2: data?.addressline2 ?? "",
        city: data?.city ?? "",
        postalCode: data?.postal_code ?? "",
        website: data?.website ?? "",
        tagline: data?.tagline ?? "",
        logoUrl: data?.logo_url ?? "",
        accentColorHex: data?.accent_color_hex ?? "#2563EB",
        siret: data?.siret ?? "",
        country: data?.country ?? "France",
      });
    } catch (error: unknown) {
      console.error("[MyCoBranding] Error loading profile:", error);
      toast.error("Impossible de charger votre profil");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBranding = async (branding: ResellerBranding) => {
    if (!user) {
      toast.error("Vous devez être connecté pour sauvegarder");
      return;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          // Note: on NE modifie PAS cobranding_enabled (réservé à l'admin)
          company_name: branding.companyName || null,
          contact_name: branding.contactName || null,
          email: branding.email || null,
          phone: branding.phone || null,
          addressline1: branding.addressLine1 || null,
          addressline2: branding.addressLine2 || null,
          city: branding.city || null,
          postal_code: branding.postalCode || null,
          country: branding.country || "France",
          website: branding.website || null,
          tagline: branding.tagline || null,
          logo_url: branding.logoUrl || null,
          accent_color_hex: branding.accentColorHex || null,
          siret: branding.siret || null,
        })
        .eq("id", user.id);

      if (error) throw error;

      setResellerBranding(branding);
      toast.success("Votre fiche co-branding a été enregistrée");
    } catch (error: unknown) {
      console.error("[MyCoBranding] Error saving branding:", error);
      const message = error instanceof Error ? error.message : "Erreur lors de la sauvegarde";
      toast.error(message);
      throw error;
    }
  };

  return (
    <PremiumLayout>
      {/* Header */}
      <header className="header-premium sticky top-0 z-50">
        <div className="container mx-auto flex h-16 md:h-18 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="rounded-xl"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Retour</span>
            </Button>
            <img
              src="/images/dica-logo.png"
              alt="DICA Visual Studio"
              className="h-12 md:h-14 w-auto"
            />
          </div>
          <ThemeToggle className="text-muted-foreground rounded-xl" />
        </div>
      </header>

      <ContentContainer className="pb-20">
        <div className="mb-10 md:mb-14">
          <SectionTitle
            title="Mon Co-branding"
            subtitle="Personnalisez vos plaquettes et magazines DECO avec l'identité de votre entreprise."
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !isCoBrandingEnabled ? (
          // Cas 1 : co-branding non activé par l'admin
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-muted-foreground" />
                Fonction non activée
              </CardTitle>
              <CardDescription>
                L'option co-branding doit être activée par l'équipe DICA pour votre compte.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Building2 className="h-4 w-4" />
                <AlertTitle>Comment activer le co-branding ?</AlertTitle>
                <AlertDescription className="mt-2">
                  Contactez votre interlocuteur DICA France pour demander l'activation
                  de cette option premium. Vous pourrez ensuite personnaliser vos
                  plaquettes PDF et magazines DECO avec le logo, les coordonnées et
                  les couleurs de votre entreprise.
                </AlertDescription>
              </Alert>
              <div className="text-sm text-muted-foreground space-y-1 pt-2">
                <p>📧 contact@dica-france.com</p>
                <p>🌐 www.dica-france.com</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          // Cas 2 : co-branding activé → afficher le formulaire
          <>
            <Alert className="mb-6 max-w-4xl mx-auto border-success/30 bg-success/5">
              <Building2 className="h-4 w-4 text-success" />
              <AlertTitle>Co-branding activé pour votre compte</AlertTitle>
              <AlertDescription>
                Complétez votre fiche ci-dessous. Ces informations apparaîtront
                automatiquement sur vos plaquettes PDF et magazines DECO.
              </AlertDescription>
            </Alert>

            <div className="max-w-4xl mx-auto">
              <ResellerBrandingSettings
                currentBranding={resellerBranding}
                isCoBrandingEnabled={true}
                // Le client ne peut PAS désactiver lui-même → no-op silencieux
                onToggleCoBranding={() => {
                  toast.info(
                    "Seul un administrateur DICA peut désactiver cette option."
                  );
                }}
                onSaveBranding={handleSaveBranding}
              />
            </div>
          </>
        )}
      </ContentContainer>

      <AppFooter />
    </PremiumLayout>
  );
};

export default MyCoBranding;
