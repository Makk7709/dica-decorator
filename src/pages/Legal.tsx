import { ArrowLeft, Scale, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const Legal = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="header-premium sticky top-0 z-50 border-b border-border/30">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="/images/dica-logo.png" 
              alt="DICA" 
              className="h-8 w-auto"
            />
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 md:py-12">
        <Card className="max-w-3xl mx-auto bg-card/80 backdrop-blur-sm border-border/50">
          <CardContent className="p-6 md:p-10">
            {/* Title */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Scale className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-serif font-semibold text-foreground mb-2">
                Mentions légales & Conditions d'utilisation
              </h1>
              <p className="text-sm text-muted-foreground">
                Document d'information – à valider par le conseil juridique de DICA
              </p>
            </div>

            {/* Alert */}
            <Alert className="mb-8 border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700 dark:text-amber-400 text-sm">
                Ce document est fourni à titre indicatif. Il doit être relu et validé par le conseil juridique de DICA avant toute opposabilité.
              </AlertDescription>
            </Alert>

            {/* Content Sections */}
            <div className="space-y-8 text-foreground/90">
              {/* Section 1 */}
              <section>
                <h2 className="text-lg font-semibold text-foreground mb-3">1. Objet de l'application</h2>
                <p className="text-sm leading-relaxed">
                  DICA Décor est une application SaaS (Software as a Service) mise à disposition par l'éditeur à destination de DICA France et de ses revendeurs officiels autorisés. Cette application permet la visualisation de décors stratifiés, la génération de présentations commerciales, la gestion de catalogues produits et l'utilisation d'outils de simulation visuelle assistés par intelligence artificielle.
                </p>
                <p className="text-sm leading-relaxed mt-2">
                  L'accès et l'utilisation de DICA Décor sont strictement réservés à un usage professionnel dans le cadre des activités commerciales liées aux produits DICA.
                </p>
              </section>

              <Separator />

              {/* Section 2 */}
              <section>
                <h2 className="text-lg font-semibold text-foreground mb-3">2. Éditeur de l'application</h2>
                <div className="text-sm leading-relaxed space-y-1 bg-muted/30 rounded-lg p-4">
                  <p><strong>Raison sociale :</strong> KOREV AI</p>
                  <p><strong>Forme juridique :</strong> SAS</p>
                  <p><strong>Siège social :</strong> 20 Route d'Uriage, 38320 Herbeys, France</p>
                  <p><strong>SIRET :</strong> 845 355 668 00029</p>
                  <p><strong>Contact support :</strong> <a href="mailto:contact@korev-ai.com" className="text-primary hover:underline">contact@korev-ai.com</a></p>
                </div>
              </section>

              <Separator />

              {/* Section 3 */}
              <section>
                <h2 className="text-lg font-semibold text-foreground mb-3">3. Accès au service</h2>
                <p className="text-sm leading-relaxed">
                  L'accès à DICA Décor est exclusivement réservé aux utilisateurs disposant d'un compte fourni par DICA France ou par l'éditeur de l'application. Chaque compte est personnel et nominatif.
                </p>
                <p className="text-sm leading-relaxed mt-2">
                  L'utilisateur s'engage à :
                </p>
                <ul className="list-disc list-inside text-sm leading-relaxed mt-2 space-y-1 ml-4">
                  <li>Maintenir la confidentialité de ses identifiants de connexion</li>
                  <li>Ne pas partager son compte avec des tiers non autorisés</li>
                  <li>Signaler immédiatement toute utilisation non autorisée de son compte</li>
                </ul>
              </section>

              <Separator />

              {/* Section 4 */}
              <section>
                <h2 className="text-lg font-semibold text-foreground mb-3">4. Licence d'utilisation</h2>
                <p className="text-sm leading-relaxed">
                  L'éditeur concède à l'utilisateur un droit d'usage limité, non exclusif et non transférable sur l'application DICA Décor, pour la durée du contrat commercial en vigueur.
                </p>
                <p className="text-sm leading-relaxed mt-2">
                  Ce droit d'usage est strictement limité au périmètre professionnel du client (DICA France et ses revendeurs officiels autorisés).
                </p>
                <p className="text-sm leading-relaxed mt-2">
                  Il est expressément interdit de :
                </p>
                <ul className="list-disc list-inside text-sm leading-relaxed mt-2 space-y-1 ml-4">
                  <li>Revendre, sous-licencier ou mettre à disposition l'application à des tiers non autorisés</li>
                  <li>Procéder à du reverse engineering, décompilation ou désassemblage du code source</li>
                  <li>Utiliser l'application à des fins autres que celles prévues au contrat</li>
                  <li>Copier, modifier ou créer des œuvres dérivées de l'application</li>
                </ul>
              </section>

              <Separator />

              {/* Section 5 */}
              <section>
                <h2 className="text-lg font-semibold text-foreground mb-3">5. Propriété intellectuelle</h2>
                <p className="text-sm leading-relaxed">
                  L'application DICA Décor, incluant son code source, son design, sa structure, ses algorithmes et le nom « DICA Décor », demeure la propriété exclusive de l'éditeur. Aucun droit de propriété intellectuelle n'est transféré à l'utilisateur par les présentes conditions.
                </p>
                <p className="text-sm leading-relaxed mt-2">
                  Les contenus chargés par DICA France (photographies, catalogues, visuels de décors, textures) restent la propriété de DICA France ou de leurs ayants droit respectifs.
                </p>
                <p className="text-sm leading-relaxed mt-2">
                  L'utilisateur s'engage à respecter l'ensemble des droits de propriété intellectuelle attachés à l'application et aux contenus qu'elle héberge.
                </p>
              </section>

              <Separator />

              {/* Section 6 */}
              <section>
                <h2 className="text-lg font-semibold text-foreground mb-3">6. Données & confidentialité</h2>
                <p className="text-sm leading-relaxed">
                  Les données collectées dans le cadre de l'utilisation de DICA Décor sont utilisées uniquement pour fournir et améliorer le service. L'éditeur s'engage à respecter la réglementation applicable en matière de protection des données personnelles, notamment le Règlement Général sur la Protection des Données (RGPD).
                </p>
                <p className="text-sm leading-relaxed mt-2">
                  Une politique de confidentialité détaillée est disponible à l'adresse suivante : <span className="text-muted-foreground">[URL_POLITIQUE_CONFIDENTIALITE]</span>
                </p>
                <p className="text-sm leading-relaxed mt-2">
                  L'utilisateur reconnaît que certaines fonctionnalités de l'application utilisent des technologies d'intelligence artificielle pour générer des visuels et des contenus.
                </p>
              </section>

              <Separator />

              {/* Section 7 */}
              <section>
                <h2 className="text-lg font-semibold text-foreground mb-3">7. Disponibilité, maintenance et évolution</h2>
                <p className="text-sm leading-relaxed">
                  L'éditeur s'efforce de maintenir l'application DICA Décor accessible 24 heures sur 24, 7 jours sur 7. Toutefois, l'éditeur ne peut garantir une disponibilité absolue du service.
                </p>
                <p className="text-sm leading-relaxed mt-2">
                  Des interruptions ponctuelles peuvent survenir pour des raisons de maintenance, de mise à jour ou d'amélioration du service. Dans la mesure du possible, ces interventions seront planifiées et communiquées à l'avance.
                </p>
                <p className="text-sm leading-relaxed mt-2">
                  L'application peut évoluer au fil du temps (nouvelles fonctionnalités, modifications de l'interface, optimisations). Ces évolutions n'ouvrent droit à aucune indemnisation.
                </p>
              </section>

              <Separator />

              {/* Section 8 */}
              <section>
                <h2 className="text-lg font-semibold text-foreground mb-3">8. Responsabilité</h2>
                <p className="text-sm leading-relaxed">
                  L'éditeur met en œuvre les moyens raisonnables pour assurer la qualité et la fiabilité de l'application. Toutefois :
                </p>
                <ul className="list-disc list-inside text-sm leading-relaxed mt-2 space-y-1 ml-4">
                  <li>L'éditeur ne garantit pas l'exactitude absolue des visuels et rendus générés par l'application, notamment ceux produits par intelligence artificielle</li>
                  <li>L'éditeur décline toute responsabilité en cas de mauvaise utilisation de l'application ou de décisions commerciales fondées uniquement sur les visuels générés</li>
                  <li>L'utilisateur reste seul responsable de l'interprétation et de l'utilisation des contenus générés</li>
                </ul>
                <p className="text-sm leading-relaxed mt-2">
                  En tout état de cause, la responsabilité de l'éditeur est limitée dans le cadre autorisé par la loi applicable et ne saurait excéder le montant des sommes versées par le client au titre du contrat au cours des douze derniers mois.
                </p>
              </section>

              <Separator />

              {/* Section 9 */}
              <section>
                <h2 className="text-lg font-semibold text-foreground mb-3">9. Durée, suspension et résiliation</h2>
                <p className="text-sm leading-relaxed">
                  L'accès au service DICA Décor est lié au contrat commercial en vigueur entre DICA France et l'éditeur.
                </p>
                <p className="text-sm leading-relaxed mt-2">
                  L'éditeur se réserve le droit de suspendre ou de résilier l'accès d'un utilisateur en cas de :
                </p>
                <ul className="list-disc list-inside text-sm leading-relaxed mt-2 space-y-1 ml-4">
                  <li>Non-respect des présentes conditions d'utilisation</li>
                  <li>Incident de paiement ou défaut de règlement</li>
                  <li>Usage frauduleux, abusif ou contraire aux bonnes pratiques</li>
                  <li>Atteinte à la sécurité du service ou aux droits de tiers</li>
                </ul>
                <p className="text-sm leading-relaxed mt-2">
                  En cas de fin de contrat, les accès utilisateurs pourront être désactivés après un préavis raisonnable permettant la récupération des données.
                </p>
              </section>

              <Separator />

              {/* Section 10 */}
              <section>
                <h2 className="text-lg font-semibold text-foreground mb-3">10. Loi applicable et juridiction compétente</h2>
                <p className="text-sm leading-relaxed">
                  Les présentes conditions d'utilisation sont soumises au droit français.
                </p>
                <p className="text-sm leading-relaxed mt-2">
                  En cas de litige relatif à l'interprétation ou à l'exécution des présentes conditions, et à défaut de résolution amiable, les parties conviennent de soumettre leur différend à la compétence exclusive des tribunaux de Grenoble.
                </p>
              </section>

              <Separator />

              {/* Footer */}
              <div className="text-center pt-4">
                <p className="text-xs text-muted-foreground">
                  Dernière mise à jour : Décembre 2024
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Version 1.0 – Document à usage interne
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 py-6 mt-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} DICA Décor – Application réservée à DICA France et ses revendeurs autorisés
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Legal;
