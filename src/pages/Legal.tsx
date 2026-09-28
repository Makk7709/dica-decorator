import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const LAST_UPDATE = "29 septembre 2026";
const CONTACT_EMAIL = "contact@korev-ai.com";

const COMPANY = {
  name: "KOREV AI",
  form: "Société par actions simplifiée (SAS)",
  capital: "567 951,00 €",
  address: "13 rue Marcel Chabloz, 38400 Saint-Martin-d'Hères, France",
  rcs: "RCS Grenoble 107 888 539",
  siren: "107 888 539",
  vat: "FR06107888539",
  president: "Amine MOHAMED",
};

const TOC = [
  { id: "mentions-legales", label: "Mentions légales" },
  { id: "cgu", label: "Conditions générales d'utilisation" },
  { id: "cgv", label: "Conditions générales de vente" },
  { id: "confidentialite", label: "Politique de confidentialité et cookies" },
];

const Doc = ({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children: ReactNode }) => (
  <section id={id} className="scroll-mt-24 space-y-6">
    <header className="space-y-2">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
    </header>
    {children}
  </section>
);

const Article = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="space-y-2">
    <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
    <div className="space-y-2 text-sm leading-relaxed text-foreground/85">{children}</div>
  </div>
);

const List = ({ items }: { items: ReactNode[] }) => (
  <ul className="ml-4 list-disc space-y-1 marker:text-primary">
    {items.map((item, i) => (
      <li key={i}>{item}</li>
    ))}
  </ul>
);

const Mail = () => (
  <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
    {CONTACT_EMAIL}
  </a>
);

const Legal = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="header-premium sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/images/dica-logo.png" alt="DICA" className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="card-premium mx-auto max-w-3xl p-6 md:p-10">
          <div className="mb-8 space-y-3">
            <p className="eyebrow">
              Informations légales <span className="text-primary">/</span>{" "}
              <span className="text-foreground/80">DICA Visual Studio</span>
            </p>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
              Mentions légales, CGU, CGV et confidentialité
            </h1>
            <p className="text-sm text-muted-foreground">Dernière mise à jour : {LAST_UPDATE}</p>
          </div>

          <nav aria-label="Sommaire" className="mb-10 border-l-2 border-primary/60 bg-muted/40 px-4 py-3">
            <ol className="space-y-1 text-sm">
              {TOC.map((item, i) => (
                <li key={item.id}>
                  <a href={`#${item.id}`} className="text-foreground/85 hover:text-primary">
                    <span className="mr-2 font-mono text-xs text-muted-foreground">0{i + 1}</span>
                    {item.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="space-y-12">
            {/* ─────────────────────────── Mentions légales ─────────────────────────── */}
            <Doc id="mentions-legales" eyebrow="01 / Loi n° 2004-575 du 21 juin 2004 (LCEN)" title="Mentions légales">
              <Article title="Éditeur de l'application">
                <div className="space-y-1 border border-border bg-muted/30 p-4">
                  <p><strong>{COMPANY.name}</strong>, {COMPANY.form} au capital de {COMPANY.capital}</p>
                  <p>Siège social : {COMPANY.address}</p>
                  <p>Immatriculation : {COMPANY.rcs} (SIREN {COMPANY.siren})</p>
                  <p>N° de TVA intracommunautaire : {COMPANY.vat}</p>
                  <p>Directeur de la publication : {COMPANY.president}, Président</p>
                  <p>Contact : <Mail /></p>
                </div>
                <p>
                  DICA Visual Studio (« l'Application ») est éditée par {COMPANY.name} pour le compte de DICA France et de
                  son réseau de revendeurs autorisés. Les marques, logos et visuels DICA restent la propriété de DICA
                  France.
                </p>
              </Article>
              <Article title="Hébergement">
                <List
                  items={[
                    <>
                      <strong>Application web :</strong> Lovable Labs Incorporated, dont l'établissement principal est
                      exploité par Lovable Labs Sweden AB, Regeringsgatan 25, 111 53 Stockholm, Suède (support@lovable.dev).
                    </>,
                    <>
                      <strong>Base de données, stockage et fonctions serveur :</strong> Supabase, Inc., 65 Chulia Street
                      #38-02/03, OCBC Centre, Singapour 049513 (support@supabase.com).
                    </>,
                  ]}
                />
              </Article>
            </Doc>

            <Separator />

            {/* ─────────────────────────────── CGU ─────────────────────────────── */}
            <Doc id="cgu" eyebrow="02 / Tous utilisateurs" title="Conditions générales d'utilisation">
              <Article title="1. Objet et acceptation">
                <p>
                  Les présentes conditions générales d'utilisation (CGU) définissent les règles d'accès et d'usage de
                  l'Application, outil professionnel de visualisation de décors stratifiés, de création de présentations
                  commerciales et d'assistance créative par intelligence artificielle. Toute connexion vaut acceptation
                  des CGU en vigueur.
                </p>
              </Article>
              <Article title="2. Accès et comptes">
                <p>
                  L'Application est réservée aux professionnels disposant d'un compte ouvert ou validé par DICA France ou
                  par l'éditeur. Chaque compte est personnel et nominatif. L'utilisateur s'engage à :
                </p>
                <List
                  items={[
                    "préserver la confidentialité de ses identifiants et ne pas les partager ;",
                    "signaler sans délai toute utilisation non autorisée de son compte ;",
                    "fournir des informations exactes et les tenir à jour.",
                  ]}
                />
              </Article>
              <Article title="3. Usages interdits">
                <List
                  items={[
                    "revendre, sous-licencier ou mettre l'Application à disposition de tiers non autorisés ;",
                    "décompiler, désassembler ou tenter d'extraire le code source, sauf dans les limites de l'article L. 122-6-1 du Code de la propriété intellectuelle ;",
                    "contourner les mesures de sécurité, les quotas de rendus ou les limites d'usage ;",
                    "importer des contenus illicites ou sur lesquels l'utilisateur ne détient pas les droits (photographies de tiers, visuels protégés) ;",
                    "utiliser les contenus générés de manière trompeuse, notamment en les présentant comme des photographies de réalisations réelles.",
                  ]}
                />
              </Article>
              <Article title="4. Intelligence artificielle">
                <p>
                  Certaines fonctions (rendus, compositions, assistant créatif écrit et vocal) reposent sur des modèles
                  d'intelligence artificielle. Les contenus produits sont générés automatiquement : ils constituent des
                  simulations indicatives et peuvent différer du rendu réel des produits (teinte, texture, échelle). Les
                  informations techniques données par l'assistant doivent être confirmées par les fiches techniques ou un
                  conseiller DICA France.
                </p>
                <p>
                  L'assistant vocal ne fonctionne qu'après activation volontaire du micro par l'utilisateur ; la
                  conversation est retranscrite dans le chat.
                </p>
              </Article>
              <Article title="5. Propriété intellectuelle">
                <p>
                  L'Application (code, design, structure, bases de données, algorithmes) est la propriété exclusive de
                  l'éditeur. Les catalogues, textures et visuels de décors appartiennent à DICA France ou à leurs ayants
                  droit. L'utilisateur conserve ses droits sur les photographies qu'il importe et concède à l'éditeur le
                  droit de les traiter pour les seuls besoins du service. Les rendus générés peuvent être utilisés par
                  l'utilisateur dans le cadre de son activité commerciale liée aux produits DICA.
                </p>
              </Article>
              <Article title="6. Disponibilité et évolutions">
                <p>
                  L'éditeur met en œuvre des moyens raisonnables pour assurer l'accès à l'Application 24 h/24, 7 j/7,
                  sans garantie de disponibilité absolue. Des interruptions peuvent intervenir pour maintenance, mise à
                  jour ou cas de force majeure. L'Application peut évoluer ; les fonctions essentielles décrites au
                  contrat sont maintenues.
                </p>
              </Article>
              <Article title="7. Suspension">
                <p>
                  L'éditeur ou DICA France peut suspendre un compte en cas de manquement aux CGU, d'usage frauduleux ou
                  d'atteinte à la sécurité du service, après notification sauf urgence.
                </p>
              </Article>
              <Article title="8. Modification des CGU">
                <p>
                  Les CGU peuvent être modifiées ; la version applicable est celle publiée sur cette page à la date de
                  connexion. Les modifications substantielles sont signalées dans l'Application.
                </p>
              </Article>
            </Doc>

            <Separator />

            {/* ─────────────────────────────── CGV ─────────────────────────────── */}
            <Doc id="cgv" eyebrow="03 / Entre professionnels — art. L. 441-1 du Code de commerce" title="Conditions générales de vente">
              <Article title="1. Champ d'application">
                <p>
                  Les présentes conditions générales de vente (CGV) s'appliquent à la fourniture par {COMPANY.name} de
                  l'Application en mode SaaS et des prestations associées (paramétrage, formation, support, évolutions)
                  à ses clients professionnels (« le Client »). Elles constituent le socle de la négociation commerciale
                  et prévalent sur les conditions d'achat du Client, sauf dérogation écrite. En cas de contradiction, le
                  contrat ou le bon de commande signé par les parties prévaut sur les CGV.
                </p>
              </Article>
              <Article title="2. Commande et durée">
                <p>
                  Le contrat est formé par la signature d'un bon de commande ou d'un contrat précisant le périmètre des
                  services, le nombre d'utilisateurs, les quotas, la durée et les modalités de reconduction et de
                  résiliation.
                </p>
              </Article>
              <Article title="3. Prix">
                <p>
                  Les prix sont exprimés en euros hors taxes, la TVA étant facturée au taux en vigueur. Ils sont fixés
                  par le contrat ou le bon de commande. Toute consommation au-delà des quotas convenus (rendus,
                  utilisateurs, services d'IA) est facturée selon les conditions qui y sont prévues.
                </p>
              </Article>
              <Article title="4. Facturation et paiement">
                <p>
                  La périodicité de facturation, le mode et le délai de paiement sont fixés par le contrat ou le bon de
                  commande. Conformément à l'article L. 441-10 du Code de commerce, le délai de paiement ne peut
                  dépasser soixante jours à compter de la date d'émission de la facture, ou quarante-cinq jours fin de
                  mois. Aucun escompte n'est accordé en cas de paiement anticipé, sauf mention contraire sur la facture.
                </p>
              </Article>
              <Article title="5. Retard de paiement">
                <p>Tout retard de paiement entraîne de plein droit, sans rappel préalable :</p>
                <List
                  items={[
                    "des pénalités de retard calculées au taux d'intérêt appliqué par la Banque centrale européenne à son opération de refinancement la plus récente, majoré de 10 points de pourcentage (art. L. 441-10 II du Code de commerce) ;",
                    "une indemnité forfaitaire pour frais de recouvrement de 40 € (art. D. 441-5 du Code de commerce), sans préjudice d'une indemnisation complémentaire sur justificatifs si les frais exposés sont supérieurs.",
                  ]}
                />
                <p>
                  Après mise en demeure restée sans effet pendant quinze jours, l'éditeur peut suspendre l'accès au
                  service jusqu'au complet paiement.
                </p>
              </Article>
              <Article title="6. Obligations de l'éditeur et support">
                <p>
                  L'éditeur fournit l'accès à l'Application, assure sa maintenance corrective et évolutive, la sécurité
                  des données hébergées et un support par e-mail à l'adresse <Mail />. Il est tenu d'une obligation de
                  moyens.
                </p>
              </Article>
              <Article title="7. Responsabilité">
                <p>
                  La responsabilité de l'éditeur ne peut être engagée qu'en cas de faute prouvée et pour les seuls
                  dommages directs. Sont exclus les dommages indirects tels que perte de chiffre d'affaires, de clientèle
                  ou d'image. Les visuels générés par IA étant des simulations, le Client demeure responsable des
                  décisions commerciales et techniques prises sur leur fondement. Sauf faute lourde ou dolosive, la
                  responsabilité totale de l'éditeur est limitée au montant hors taxes payé par le Client au titre des
                  douze mois précédant le fait générateur.
                </p>
              </Article>
              <Article title="8. Force majeure">
                <p>
                  Aucune partie n'est responsable d'un manquement résultant d'un cas de force majeure au sens de
                  l'article 1218 du Code civil, y compris la défaillance d'un hébergeur ou d'un fournisseur de services
                  d'IA hors du contrôle raisonnable de l'éditeur.
                </p>
              </Article>
              <Article title="9. Données du Client et réversibilité">
                <p>
                  Les données du Client lui appartiennent. L'éditeur les traite en qualité de sous-traitant dans les
                  conditions de l'article 28 du RGPD, précisées par un accord de traitement des données annexé au
                  contrat. En fin de contrat, le Client peut obtenir l'export de ses données dans un format standard
                  pendant trente jours, à l'issue desquels elles sont supprimées, sauf obligation légale de
                  conservation.
                </p>
              </Article>
              <Article title="10. Confidentialité">
                <p>
                  Chaque partie garde confidentielles les informations non publiques de l'autre partie pendant la durée
                  du contrat et cinq ans après son terme.
                </p>
              </Article>
              <Article title="11. Droit applicable et litiges">
                <p>
                  Les présentes CGV sont soumises au droit français. Les parties recherchent une solution amiable avant
                  toute action. À défaut d'accord dans un délai de trente jours, tout litige relatif à leur formation,
                  interprétation ou exécution est soumis à la compétence exclusive du tribunal de commerce de Grenoble,
                  y compris en cas de pluralité de défendeurs ou d'appel en garantie.
                </p>
              </Article>
            </Doc>

            <Separator />

            {/* ──────────────────────── Confidentialité ──────────────────────── */}
            <Doc id="confidentialite" eyebrow="04 / RGPD et loi Informatique et Libertés" title="Politique de confidentialité et cookies">
              <Article title="1. Rôles">
                <p>
                  <strong>DICA France</strong> est responsable des traitements de données réalisés via l'Application pour
                  la gestion de son réseau de revendeurs. <strong>{COMPANY.name}</strong> agit en qualité de sous-traitant
                  (art. 28 du RGPD) : elle traite les données uniquement sur instruction de DICA France et pour fournir le
                  service.
                </p>
              </Article>
              <Article title="2. Données traitées et finalités">
                <List
                  items={[
                    <><strong>Compte :</strong> adresse e-mail, nom, société, rôle, paramètres de co-branding — gestion des accès (exécution du contrat).</>,
                    <><strong>Contenus :</strong> photographies importées, rendus et compositions générés, projets, favoris — fourniture du service (exécution du contrat).</>,
                    <><strong>Assistant créatif :</strong> messages écrits, retranscriptions des échanges vocaux — réponses et générations demandées (exécution du contrat). Le flux audio n'est pas enregistré par l'Application.</>,
                    <><strong>Données techniques :</strong> journaux de connexion, statistiques d'usage, quotas — sécurité, prévention des abus et pilotage du service (intérêt légitime).</>,
                  ]}
                />
              </Article>
              <Article title="3. Destinataires et sous-traitants ultérieurs">
                <List
                  items={[
                    "Lovable Labs (hébergement de l'application, envoi des e-mails transactionnels, passerelle d'accès aux modèles d'IA) ;",
                    "Supabase (base de données, authentification, stockage des fichiers) ;",
                    "Google (modèles Gemini : génération d'images et de textes, via la passerelle Lovable) ;",
                    "OpenAI (assistant vocal en temps réel) ;",
                    "Cloudflare (réseau de diffusion et protection du site).",
                  ]}
                />
                <p>
                  Certains de ces prestataires sont établis ou traitent des données hors de l'Union européenne,
                  notamment aux États-Unis. Ces transferts sont encadrés par le cadre de protection des données UE–États-Unis
                  (Data Privacy Framework) lorsque le prestataire y adhère, ou à défaut par les clauses contractuelles
                  types de la Commission européenne.
                </p>
              </Article>
              <Article title="4. Durées de conservation">
                <List
                  items={[
                    "données de compte et contenus : pendant la durée du compte, puis suppression à la clôture du compte ou dans les trente jours suivant la fin du contrat ;",
                    "journaux d'envoi d'e-mails : 90 jours ;",
                    "pièces comptables : 10 ans (art. L. 123-22 du Code de commerce).",
                  ]}
                />
              </Article>
              <Article title="5. Sécurité">
                <p>
                  Les données sont chiffrées en transit, les accès sont cloisonnés par utilisateur et les fichiers privés
                  ne sont accessibles que par liens temporaires signés.
                </p>
              </Article>
              <Article title="6. Vos droits">
                <p>
                  Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, de portabilité et
                  d'opposition, ainsi que du droit de définir des directives sur le sort de vos données après votre
                  décès. Pour les exercer, contactez DICA France ou écrivez à <Mail />, qui transmettra votre demande. Vous
                  pouvez introduire une réclamation auprès de la CNIL (www.cnil.fr).
                </p>
              </Article>
              <Article title="7. Cookies et traceurs">
                <p>
                  L'Application n'utilise ni cookie publicitaire ni outil de mesure d'audience tiers. Elle enregistre
                  uniquement dans votre navigateur les éléments strictement nécessaires à son fonctionnement : session de
                  connexion, préférence de thème, progression de l'accueil et affichage des nouveautés. Conformément à
                  l'article 82 de la loi Informatique et Libertés, ces traceurs sont exemptés de consentement.
                </p>
              </Article>
            </Doc>
          </div>
        </div>
      </main>

      <footer className="mt-8 border-t border-border py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {COMPANY.name} pour DICA France — Application réservée à DICA France et à ses revendeurs autorisés
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Legal;
