/**
 * @fileoverview Service de génération de structure éditoriale Magazine DICA
 * Génère une structure complète de magazine déco haut de gamme à partir de rendus IA
 * 
 * @author KOREV AI pour DICA France
 * @date Décembre 2025
 */

import type {
  RenderMetadata,
  DecorInfo,
  MagazineGenerationOptions,
  MagazineGenerationResult,
  MagazineDICA,
  MagazinePage,
  CoverPage,
  EditorialIntroPage,
  ZoomProductPage,
  AvantApresPage,
  StoryUseCasePage,
  ClosingPage,
  DecorsBloc,
  EchantillonsBloc,
  EchantillonDescription,
} from '@/types/magazine-generator.types';

/**
 * Phrases calligraphiées élégantes (ivoire style)
 * Courtes, évocatrices, max 12 mots
 */
const CALLIGRAPHIE_PHRASES = [
  "La lumière glisse, le décor raconte le reste.",
  "Une paroi, et le voyage change de direction.",
  "Le matériau devient l'histoire de l'espace.",
  "L'élégance naît dans le détail invisible.",
  "Chaque surface porte une intention de beauté.",
  "Le décor transforme, la matière sublime.",
  "L'espace s'anime sous la caresse du matériau.",
  "Une finition qui révèle l'âme du lieu.",
  "Le temps suspendu dans une texture choisie.",
  "La matière raconte ce que les mots ne disent pas.",
  "Entre fonction et poésie, le décor dessine l'horizon.",
  "L'artisanat rencontre l'innovation dans chaque panneau.",
];

/**
 * Service de génération de magazine DICA
 */
export class MagazineGeneratorService {
  private static instance: MagazineGeneratorService;

  private constructor() {}

  static getInstance(): MagazineGeneratorService {
    if (!this.instance) {
      this.instance = new MagazineGeneratorService();
    }
    return this.instance;
  }

  /**
   * Génère une structure complète de magazine DICA
   */
  async generateMagazine(options: MagazineGenerationOptions): Promise<MagazineGenerationResult> {
    try {
      // Validation des entrées
      const minRenders = (options.min_zoom_pages || 2) + 1; // Au moins 1 rendu de plus que les pages zoom
      if (!options.renders || options.renders.length < minRenders) {
        return {
          success: false,
          error: `Nombre de rendus insuffisant. Minimum requis: ${minRenders}, fourni: ${options.renders?.length || 0}`,
        };
      }

      // 1. Analyser et sélectionner les meilleurs rendus
      const selectedRenders = this.selectBestRenders(
        options.renders,
        options.min_zoom_pages || 2,
        options.max_zoom_pages || 6
      );

      // 2. Extraire tous les décors uniques
      const allDecors = this.extractUniqueDecors(options.renders);

      // 3. Générer les blocs décors et échantillons
      const decorsBloc = this.createDecorsBloc(allDecors);
      const echantillonsBloc = this.createEchantillonsBloc(allDecors);

      // 4. Générer les pages
      const pages: MagazinePage[] = [];

      // Cover
      const coverPage = this.createCoverPage(selectedRenders, allDecors);
      pages.push(coverPage);

      // Editorial Intro
      const introPage = this.createEditorialIntroPage(selectedRenders, allDecors);
      pages.push(introPage);

      // Zoom Product pages
      const zoomPages = this.createZoomProductPages(selectedRenders, allDecors);
      pages.push(...zoomPages);

      // Closing
      const closingPage = this.createClosingPage(allDecors);
      pages.push(closingPage);

      // 5. Construire le magazine
      const magazine: MagazineDICA = {
        titre_magazine: 'DICA DÉCOR',
        date_publication: new Date().toISOString().split('T')[0],
        pages,
        decors_utilises_total: allDecors,
      };

      return {
        success: true,
        magazine,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la génération du magazine',
      };
    }
  }

  /**
   * Sélectionne les meilleurs rendus pour les pages Zoom Produit
   */
  private selectBestRenders(
    renders: RenderMetadata[],
    minCount: number,
    maxCount: number
  ): RenderMetadata[] {
    // Trier par nombre de décors (prioriser ceux avec plus de décors)
    const sorted = [...renders].sort((a, b) => {
      // Priorité: nombre de décors, puis variété d'ambiances
      const scoreA = a.decors.length * 10 + a.ambiances.length;
      const scoreB = b.decors.length * 10 + b.ambiances.length;
      return scoreB - scoreA;
    });

    // Prendre les meilleurs, mais assurer la diversité d'usages
    const selected: RenderMetadata[] = [];
    const usedUsages = new Set<string>();
    
    for (const render of sorted) {
      if (selected.length >= maxCount) break;
      
      // Prioriser la diversité
      if (!usedUsages.has(render.usage) || selected.length < minCount) {
        selected.push(render);
        usedUsages.add(render.usage);
      }
    }

    // Si on n'a pas assez, prendre les suivants
    while (selected.length < minCount && selected.length < sorted.length) {
      const next = sorted.find(r => !selected.includes(r));
      if (next) {
        selected.push(next);
      } else {
        break;
      }
    }

    return selected.slice(0, maxCount);
  }

  /**
   * Extrait tous les décors uniques de tous les rendus
   */
  private extractUniqueDecors(renders: RenderMetadata[]): DecorInfo[] {
    const decorMap = new Map<string, DecorInfo>();
    
    renders.forEach(render => {
      render.decors.forEach(decor => {
        if (!decorMap.has(decor.id)) {
          decorMap.set(decor.id, decor);
        }
      });
    });

    return Array.from(decorMap.values());
  }

  /**
   * Crée un bloc de décors utilisés
   */
  private createDecorsBloc(decors: DecorInfo[]): DecorsBloc {
    return {
      titre: 'Décors DICA utilisés',
      decors: decors.map(d => ({
        nom: d.nom,
        code: d.code,
        famille: d.famille,
        effet: d.effet,
      })),
    };
  }

  /**
   * Crée un bloc d'échantillons avec descriptions courtes
   */
  private createEchantillonsBloc(decors: DecorInfo[]): EchantillonsBloc {
    const echantillons: EchantillonDescription[] = decors.map(decor => {
      // Générer une description courte (max 8 mots) basée sur les propriétés du décor
      const description = this.generateEchantillonDescription(decor);
      
      return {
        decor_id: decor.id,
        decor_nom: decor.nom,
        decor_code: decor.code,
        description_courte: description,
      };
    });

    return { echantillons };
  }

  /**
   * Génère une description courte d'échantillon (max 8 mots)
   */
  private generateEchantillonDescription(decor: DecorInfo): string {
    const parts: string[] = [];

    // Couleur/nom principal
    const nomParts = decor.nom.split(' ');
    if (nomParts[0]) {
      parts.push(nomParts[0].toLowerCase());
    }

    // Famille
    if (decor.famille === 'bois') {
      parts.push('boisé');
    } else if (decor.famille === 'metal') {
      parts.push('métallique');
    } else if (decor.famille === 'pierre') {
      parts.push('pierre');
    }

    // Effet
    if (decor.effet) {
      if (decor.effet === 'mat') {
        parts.push('mat');
      } else if (decor.effet === 'brossé') {
        parts.push('brossé');
      } else if (decor.effet === 'texturé') {
        parts.push('texturé');
      } else if (decor.effet === 'brillant') {
        parts.push('brillant');
      }
    }

    // Caractère
    parts.push('élégant');

    // Limiter à 8 mots max
    const description = parts.slice(0, 8).join(', ');
    return description.charAt(0).toUpperCase() + description.slice(1) + '.';
  }

  /**
   * Génère une phrase calligraphiée élégante (max 12 mots)
   */
  private generateCalligraphiePhrase(render: RenderMetadata): string {
    // Sélectionner une phrase basée sur l'usage et l'ambiance
    let phrases = [...CALLIGRAPHIE_PHRASES];

    // Adapter selon l'usage
    if (render.usage === 'ascenseur') {
      phrases.push("L'ascension devient un voyage esthétique.");
      phrases.push("Entre les étages, le décor élève l'esprit.");
    } else if (render.usage === 'van') {
      phrases.push("Le mouvement rencontre l'élégance intérieure.");
      phrases.push("L'aventure s'habille de finitions raffinées.");
    } else if (render.usage === 'terrasse') {
      phrases.push("L'extérieur devient extension naturelle de l'intérieur.");
    }

    // Sélectionner une phrase aléatoire
    const selected = phrases[Math.floor(Math.random() * phrases.length)];
    
    // Vérifier la longueur (max 12 mots)
    const words = selected.split(/\s+/);
    if (words.length > 12) {
      return words.slice(0, 12).join(' ');
    }
    
    return selected;
  }

  /**
   * Crée la page de couverture
   */
  private createCoverPage(renders: RenderMetadata[], allDecors: DecorInfo[]): CoverPage {
    const bestRender = renders[0]; // Le meilleur rendu pour la couverture

    return {
      type_page: 'cover',
      id_image_principale: bestRender.id_image,
      titre: 'DICA DÉCOR',
      sous_titre: 'La matière transforme l\'espace',
      phrase_calligraphie: this.generateCalligraphiePhrase(bestRender),
      texte_court: this.generateCoverText(renders),
      decors_utilises: this.createDecorsBloc(allDecors),
      echantillons: this.createEchantillonsBloc(allDecors),
    };
  }

  /**
   * Génère le texte de couverture
   */
  private generateCoverText(renders: RenderMetadata[]): string {
    const usages = new Set(renders.map(r => r.usage));
    const usageText = Array.from(usages).slice(0, 3).join(', ');
    
    return `Découvrez une sélection exceptionnelle de réalisations DICA qui illustrent la polyvalence et l'élégance de nos décors stratifiés. De ${usageText}, chaque espace devient une expérience sensorielle unique. Le magazine DICA DÉCOR vous emmène à la rencontre de ces transformations où la matière rencontre l'architecture avec grâce et sophistication.`;
  }

  /**
   * Crée la page éditoriale intro
   */
  private createEditorialIntroPage(renders: RenderMetadata[], allDecors: DecorInfo[]): EditorialIntroPage {
    const introImage = renders[1] || renders[0];

    return {
      type_page: 'editorial_intro',
      id_image_principale: introImage.id_image,
      titre: 'Notre vision',
      sous_titre: 'Quand le décor devient art de vivre',
      texte_court: this.generateIntroText(renders, allDecors),
      decors_utilises: this.createDecorsBloc(allDecors),
      echantillons: this.createEchantillonsBloc(allDecors),
    };
  }

  /**
   * Génère le texte d'introduction (3-5 phrases)
   */
  private generateIntroText(renders: RenderMetadata[], decors: DecorInfo[]): string {
    const decorFamilies = new Set(decors.map(d => d.famille));
    const familyText = Array.from(decorFamilies).join(', ');

    return `Dans chaque projet, le décor DICA apporte une dimension nouvelle à l'espace. Nos finitions ${familyText} s'adaptent à tous les univers, des espaces les plus contemporains aux ambiances les plus classiques. Chaque matériau raconte une histoire, chaque texture suscite une émotion. Ce magazine célèbre ces transformations où la technique rencontre l'esthétique, où la fonctionnalité épouse la beauté. Bienvenue dans l'univers DICA, où chaque détail compte.`;
  }

  /**
   * Crée les pages Zoom Produit
   */
  private createZoomProductPages(renders: RenderMetadata[], allDecors: DecorInfo[]): ZoomProductPage[] {
    return renders.map((render, index) => {
      // Décors utilisés dans ce rendu spécifique
      const renderDecors = render.decors;
      const renderDecorsBloc = this.createDecorsBloc(renderDecors);
      const renderEchantillonsBloc = this.createEchantillonsBloc(renderDecors);

      return {
        type_page: 'zoom_product',
        id_image_principale: render.id_image,
        phrase_calligraphie: this.generateCalligraphiePhrase(render),
        texte_court: this.generateZoomProductText(render),
        decors_utilises: renderDecorsBloc,
        echantillons: renderEchantillonsBloc,
      };
    });
  }

  /**
   * Génère le texte pour une page Zoom Produit
   */
  private generateZoomProductText(render: RenderMetadata): string {
    const decorNames = render.decors.map(d => d.nom).join(' et ');
    const usageText = this.getUsageLabel(render.usage);

    return `Le décor ${decorNames} transforme cet espace ${usageText} avec élégance. La finition apporte une profondeur et une chaleur qui subliment l'architecture. Chaque détail contribue à créer une ambiance harmonieuse et raffinée.`;
  }

  /**
   * Retourne le libellé d'un usage
   */
  private getUsageLabel(usage: string): string {
    const labels: Record<string, string> = {
      ascenseur: "d'ascenseur",
      van: "de van aménagé",
      terrasse: "de terrasse",
      showroom: "de showroom",
      bureau: "de bureau",
      autre: "personnalisé",
    };
    return labels[usage] || usage;
  }

  /**
   * Crée la page de clôture
   */
  private createClosingPage(allDecors: DecorInfo[]): ClosingPage {
    return {
      type_page: 'closing',
      id_image_principale: null,
      titre: 'Découvrez l\'univers DICA',
      texte_court: `Les décors DICA offrent une infinité de possibilités pour transformer vos espaces. Chaque finition est pensée pour répondre aux exigences les plus élevées en matière de qualité et d'esthétique. Que vous soyez revendeur, agenceur ou particulier, nos solutions s'adaptent à vos projets les plus ambitieux. Contactez-nous pour découvrir comment DICA peut accompagner vos réalisations.`,
      call_to_action: 'Pour découvrir notre catalogue complet : www.dica-france.fr',
      decors_utilises: this.createDecorsBloc(allDecors),
      echantillons: this.createEchantillonsBloc(allDecors),
    };
  }
}

// Export singleton instance
export const magazineGeneratorService = MagazineGeneratorService.getInstance();

