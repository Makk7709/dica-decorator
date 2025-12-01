/**
 * @fileoverview Service de génération de structure éditoriale Magazine DICA V2
 * Version refondue avec thème personnalisé, sélection d'images et mise en forme améliorée
 * 
 * @author KOREV AI pour DICA France
 * @date Décembre 2025
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  SelectedImage,
  DecorInfo,
  MagazineGenerationOptions,
  MagazineGenerationResult,
  MagazineDICA,
  MagazinePage,
  CoverPage,
  EditorialIntroPage,
  ZoomProductPage,
  ClosingPage,
  DecorsBloc,
  EchantillonsBloc,
  EchantillonDescription,
} from '@/types/magazine-generator.types';

/**
 * Service de génération de magazine DICA V2
 */
export class MagazineGeneratorV2Service {
  private static instance: MagazineGeneratorV2Service;

  private constructor() {}

  static getInstance(): MagazineGeneratorV2Service {
    if (!this.instance) {
      this.instance = new MagazineGeneratorV2Service();
    }
    return this.instance;
  }

  /**
   * Génère une structure complète de magazine DICA avec thème personnalisé
   */
  async generateMagazine(options: MagazineGenerationOptions): Promise<MagazineGenerationResult> {
    try {
      // Validation des entrées
      if (!options.theme || options.theme.trim().length === 0) {
        return {
          success: false,
          error: 'Le thème du magazine est obligatoire',
        };
      }

      if (!options.coverImage) {
        return {
          success: false,
          error: 'Une image de couverture est obligatoire',
        };
      }

      const minZoom = options.min_zoom_pages || 2;
      if (!options.zoomImages || options.zoomImages.length < minZoom) {
        return {
          success: false,
          error: `Au moins ${minZoom} image(s) sont requises pour les pages Zoom Produit. Fourni: ${options.zoomImages?.length || 0}`,
        };
      }

      if (!options.decors || options.decors.length === 0) {
        return {
          success: false,
          error: 'Au moins un décor doit être fourni',
        };
      }

      // Limiter le nombre d'images zoom si nécessaire
      const maxZoom = options.max_zoom_pages || 6;
      const zoomImagesToUse = options.zoomImages.slice(0, maxZoom);

      // Extraire tous les décors uniques avec leurs couleurs
      const allDecors = this.extractUniqueDecors(options.decors);

      // Générer les blocs décors et échantillons
      const decorsBloc = this.createDecorsBloc(allDecors);
      const echantillonsBloc = this.createEchantillonsBloc(allDecors);

      // Générer les pages
      const pages: MagazinePage[] = [];

      // Cover
      const coverPage = await this.createCoverPage(
        options.coverImage,
        options.theme,
        allDecors
      );
      pages.push(coverPage);

      // Editorial Intro avec texte IA basé sur le thème
      const introPage = await this.createEditorialIntroPage(
        options.coverImage,
        options.theme,
        allDecors,
        zoomImagesToUse
      );
      pages.push(introPage);

      // Zoom Product pages
      const zoomPages = await this.createZoomProductPages(
        zoomImagesToUse,
        options.theme,
        allDecors
      );
      pages.push(...zoomPages);

      // Closing
      const closingPage = await this.createClosingPage(
        options.theme,
        allDecors
      );
      pages.push(closingPage);

      // Construire le magazine
      const magazine: MagazineDICA = {
        titre_magazine: 'DICA DÉCOR',
        theme: options.theme.trim(),
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
   * Extrait tous les décors uniques et enrichit avec les couleurs
   */
  private extractUniqueDecors(decors: DecorInfo[]): DecorInfo[] {
    const decorMap = new Map<string, DecorInfo>();
    
    decors.forEach(decor => {
      if (!decorMap.has(decor.id)) {
        // Enrichir avec couleur si manquante
        const enrichedDecor: DecorInfo = {
          ...decor,
          color_hex: decor.color_hex || this.estimateColorFromDecor(decor),
        };
        decorMap.set(decor.id, enrichedDecor);
      }
    });

    return Array.from(decorMap.values());
  }

  /**
   * Estime une couleur hex depuis les propriétés du décor
   */
  private estimateColorFromDecor(decor: DecorInfo): string {
    const nomLower = decor.nom.toLowerCase();
    
    // Estimations basées sur le nom
    if (nomLower.includes('vert') || nomLower.includes('sauge')) {
      return '#8B9A5B';
    } else if (nomLower.includes('noir')) {
      return '#1A1A1A';
    } else if (nomLower.includes('blanc') || nomLower.includes('ivoire')) {
      return '#FFFEF7';
    } else if (nomLower.includes('gris')) {
      return '#808080';
    } else if (nomLower.includes('bleu')) {
      return '#4A90E2';
    } else if (nomLower.includes('bois') || nomLower.includes('chêne')) {
      return '#D4A574';
    } else if (nomLower.includes('metal') || nomLower.includes('métal')) {
      return '#C0C0C0';
    }
    
    // Couleur par défaut selon la famille
    const defaultColors: Record<string, string> = {
      bois: '#D4A574',
      metal: '#C0C0C0',
      pierre: '#D3D3D3',
      uni: '#FFFFFF',
      deco: '#F5F5F5',
    };
    
    return defaultColors[decor.famille] || '#CCCCCC';
  }

  /**
   * Crée un bloc de décors utilisés avec couleurs
   */
  private createDecorsBloc(decors: DecorInfo[]): DecorsBloc {
    return {
      titre: 'Palette DICA',
      decors: decors.map(d => ({
        id: d.id,
        nom: d.nom,
        code: d.code,
        famille: d.famille,
        effet: d.effet,
        color_hex: d.color_hex,
        texture_image_url: d.texture_image_url,
      })),
    };
  }

  /**
   * Crée un bloc d'échantillons avec descriptions courtes et couleurs
   */
  private createEchantillonsBloc(decors: DecorInfo[]): EchantillonsBloc {
    const echantillons: EchantillonDescription[] = decors.map(decor => {
      const description = this.generateEchantillonDescription(decor);
      
      return {
        decor_id: decor.id,
        decor_nom: decor.nom,
        decor_code: decor.code,
        description_courte: description,
        color_hex: decor.color_hex,
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
      }
    }

    // Limiter à 8 mots max
    const description = parts.slice(0, 8).join(', ');
    return description.charAt(0).toUpperCase() + description.slice(1) + '.';
  }

  /**
   * Génère un texte éditorial via IA basé sur le thème (expert stratifié/storytelling)
   */
  private async generateAIEditorialText(
    theme: string,
    decors: DecorInfo[],
    zoomImages: SelectedImage[]
  ): Promise<string> {
    try {
      const decorNames = decors.map(d => d.nom).join(', ');
      const usageContexts = [...new Set(zoomImages.map(img => img.usage || ''))].filter(Boolean).join(', ');

      const { data, error } = await supabase.functions.invoke('generate-magazine-captions', {
        body: {
          theme,
          decorNames,
          usageContexts,
          style: 'expert_stratified_storytelling', // Style expert stratifié/storytelling
          type: 'editorial_intro',
        },
      });

      if (error || !data?.text) {
        // Fallback: générer un texte basique
        return this.generateFallbackEditorialText(theme, decors, zoomImages);
      }

      return data.text;
    } catch (error) {
      console.warn('Error generating AI editorial text, using fallback:', error);
      return this.generateFallbackEditorialText(theme, decors, zoomImages);
    }
  }

  /**
   * Génère un texte de fallback si l'IA échoue
   */
  private generateFallbackEditorialText(
    theme: string,
    decors: DecorInfo[],
    zoomImages: SelectedImage[]
  ): string {
    const decorNames = decors.map(d => d.nom).slice(0, 3).join(', ');
    
    return `Dans cet univers dédié à ${theme}, les décors DICA apportent une dimension nouvelle à chaque espace. Nos finitions ${decorNames} s'adaptent parfaitement aux contraintes techniques tout en préservant l'élégance et l'esthétique recherchée. Les stratifiés HPL de dernière génération offrent une résistance exceptionnelle aux chocs et à l'usure, garantissant une longévité optimale. Chaque matériau raconte une histoire, chaque texture suscite une émotion. La combinaison entre innovation technique et sens esthétique fait de DICA le partenaire privilégié pour des réalisations d'exception.`;
  }

  /**
   * Génère une phrase calligraphiée via IA pour une page zoom
   */
  private async generateAICalligraphyPhrase(
    theme: string,
    image: SelectedImage
  ): Promise<string> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-magazine-captions', {
        body: {
          theme,
          usage: image.usage || 'autre',
          projectName: image.projectName,
          style: 'calligraphy',
          type: 'zoom_phrase',
          maxWords: 15,
        },
      });

      if (error || !data?.text) {
        // Fallback: phrases élégantes basées sur le thème
        return this.generateFallbackCalligraphyPhrase(theme, image);
      }

      // Vérifier la longueur (max 15 mots)
      const words = data.text.split(/\s+/);
      if (words.length > 15) {
        return words.slice(0, 15).join(' ');
      }

      return data.text;
    } catch (error) {
      console.warn('Error generating AI calligraphy phrase, using fallback:', error);
      return this.generateFallbackCalligraphyPhrase(theme, image);
    }
  }

  /**
   * Génère une phrase calligraphiée de fallback
   */
  private generateFallbackCalligraphyPhrase(theme: string, image: SelectedImage): string {
    const phrases = [
      'L\'espace se transforme, le décor sublime l\'instant.',
      'Chaque détail raconte une histoire de beauté et de technique.',
      'L\'élégance naît dans la rencontre entre matière et lumière.',
      'Le décor devient l\'âme silencieuse de l\'espace.',
      'Une finition, une intention, une expérience sensorielle unique.',
    ];

    // Sélectionner une phrase selon le thème
    const themeLower = theme.toLowerCase();
    if (themeLower.includes('van') || themeLower.includes('voyage')) {
      return 'L\'aventure s\'habille de finitions qui traversent les kilomètres.';
    } else if (themeLower.includes('ascenseur') || themeLower.includes('vertical')) {
      return 'L\'ascension devient un voyage esthétique et sensoriel.';
    }

    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  /**
   * Crée la page de couverture
   */
  private async createCoverPage(
    coverImage: SelectedImage,
    theme: string,
    allDecors: DecorInfo[]
  ): Promise<CoverPage> {
    const decorsBloc = this.createDecorsBloc(allDecors);
    const echantillonsBloc = this.createEchantillonsBloc(allDecors);

    // Générer un titre basé sur le thème
    const title = this.generateCoverTitle(theme);

    return {
      type_page: 'cover',
      id_image_principale: coverImage.id,
      titre: title,
      sous_titre: `Découvrez nos réalisations sur le thème : ${theme}`,
      phrase_calligraphie: await this.generateAICalligraphyPhrase(theme, coverImage),
      theme,
      decors_utilises: decorsBloc,
      echantillons: echantillonsBloc,
    };
  }

  /**
   * Génère un titre de couverture depuis le thème
   */
  private generateCoverTitle(theme: string): string {
    // Capitaliser et formater le thème
    const words = theme.trim().split(/\s+/);
    const capitalized = words.map(w => 
      w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    ).join(' ');
    
    return `DICA DÉCOR - ${capitalized}`;
  }

  /**
   * Crée la page éditoriale intro avec texte IA
   */
  private async createEditorialIntroPage(
    coverImage: SelectedImage,
    theme: string,
    allDecors: DecorInfo[],
    zoomImages: SelectedImage[]
  ): Promise<EditorialIntroPage> {
    const decorsBloc = this.createDecorsBloc(allDecors);
    const echantillonsBloc = this.createEchantillonsBloc(allDecors);

    // Générer le texte éditorial via IA
    const editorialText = await this.generateAIEditorialText(theme, allDecors, zoomImages);

    return {
      type_page: 'editorial_intro',
      id_image_principale: coverImage.id, // Utiliser l'image de couverture aussi pour l'intro
      titre: 'Notre vision',
      sous_titre: `Quand ${theme} rencontre l'excellence DICA`,
      texte_court: editorialText,
      theme,
      decors_utilises: decorsBloc,
      echantillons: echantillonsBloc,
    };
  }

  /**
   * Crée les pages Zoom Produit
   */
  private async createZoomProductPages(
    zoomImages: SelectedImage[],
    theme: string,
    allDecors: DecorInfo[]
  ): Promise<ZoomProductPage[]> {
    const pages: ZoomProductPage[] = [];

    for (const image of zoomImages) {
      // Décors utilisés dans cette image spécifique
      const imageDecors = allDecors.filter(d => 
        image.decorId && d.id === image.decorId
      );
      
      const renderDecors = imageDecors.length > 0 ? imageDecors : allDecors; // Fallback sur tous les décors
      const renderDecorsBloc = this.createDecorsBloc(renderDecors);
      const renderEchantillonsBloc = this.createEchantillonsBloc(renderDecors);

      // Générer la phrase calligraphiée via IA
      const phrase = await this.generateAICalligraphyPhrase(theme, image);

      pages.push({
        type_page: 'zoom_product',
        id_image_principale: image.id,
        phrase_calligraphie: phrase,
        texte_court: this.generateZoomProductText(image, theme),
        theme,
        projectInfo: image.projectId ? {
          projectId: image.projectId,
          projectName: image.projectName,
        } : undefined,
        decors_utilises: renderDecorsBloc,
        echantillons: renderEchantillonsBloc,
      });
    }

    return pages;
  }

  /**
   * Génère le texte pour une page Zoom Produit
   */
  private generateZoomProductText(image: SelectedImage, theme: string): string {
    const decorName = image.decorName || 'Décor DICA';
    const usageText = image.usage ? `espace ${image.usage}` : 'espace personnalisé';
    const projectName = image.projectName ? `Projet ${image.projectName}` : 'Cette réalisation';

    return `${projectName} illustre parfaitement comment le décor ${decorName} transforme cet ${usageText} dans l'univers ${theme}. La finition apporte une profondeur et une chaleur qui subliment l'architecture, tout en offrant les performances techniques attendues pour une utilisation intensive.`;
  }

  /**
   * Crée la page de clôture
   */
  private async createClosingPage(
    theme: string,
    allDecors: DecorInfo[]
  ): Promise<ClosingPage> {
    const decorsBloc = this.createDecorsBloc(allDecors);
    const echantillonsBloc = this.createEchantillonsBloc(allDecors);

    return {
      type_page: 'closing',
      id_image_principale: null,
      titre: 'Découvrez l\'univers DICA',
      texte_court: `Les décors DICA offrent une infinité de possibilités pour transformer vos espaces sur le thème ${theme}. Chaque finition est pensée pour répondre aux exigences les plus élevées en matière de qualité, de durabilité et d'esthétique. Que vous soyez revendeur, agenceur ou particulier, nos solutions s'adaptent à vos projets les plus ambitieux. Contactez-nous pour découvrir comment DICA peut accompagner vos réalisations.`,
      call_to_action: 'Pour découvrir notre catalogue complet : www.dica-france.fr',
      theme,
      decors_utilises: decorsBloc,
      echantillons: echantillonsBloc,
    };
  }
}

// Export singleton instance
export const magazineGeneratorV2Service = MagazineGeneratorV2Service.getInstance();

