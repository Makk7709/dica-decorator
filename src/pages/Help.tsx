/**
 * @fileoverview Help - Page d'aide et nouveautés DICA Decorator
 * Centre d'aide intégré avec guide, FAQ et nouveautés
 * 
 * @author KOREV AI pour DICA France
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from '@/components/ui/accordion';
import { PremiumLayout, ContentContainer, SectionTitle } from '@/components/ui/premium-layout';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {ArrowLeft, HelpCircle, BookOpen, Sparkles, Zap, Image, Palette, Heart, Moon, Share2, FileText, BarChart3, Play, MessageSquare, Mail} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface Feature {
  icon: React.ElementType;
  title: string;
  description: string;
  isNew?: boolean;
}

interface FAQItem {
  question: string;
  answer: string;
}

// ============================================================================
// Data
// ============================================================================

const FEATURES: Feature[] = [
  {
    icon: Sparkles,
    title: 'Visualisation IA instantanée',
    description: 'Appliquez les décors DICA sur vos photos en 30 secondes grâce à l\'IA Gemini.',
  },
  {
    icon: Palette,
    title: '+200 décors disponibles',
    description: 'Métal, bois, marbre, unis... Tout le catalogue DICA à portée de clic.',
  },
  {
    icon: Image,
    title: 'Assistant Créatif',
    description: 'Créez des mood boards, combinez plusieurs images et laissez l\'IA imaginer.',
  },
  {
    icon: Heart,
    title: 'Favoris & Organisation',
    description: 'Marquez vos rendus préférés et organisez vos projets par client.',
  },
  {
    icon: FileText,
    title: 'Export PDF Premium',
    description: 'Générez des plaquettes commerciales professionnelles avec co-branding.',
    isNew: true,
  },
  {
    icon: Share2,
    title: 'Partage par lien',
    description: 'Partagez vos projets avec vos clients via un lien sécurisé.',
    isNew: true,
  },
  {
    icon: BarChart3,
    title: 'Analytics (Admin)',
    description: 'Suivez les statistiques d\'utilisation et exportez en JSON, Excel ou PDF.',
    isNew: true,
  },
  {
    icon: Moon,
    title: 'Mode sombre',
    description: 'Basculez entre mode jour et nuit pour un confort optimal.',
  },
];

const WHATS_NEW = [
  {
    version: '2.1.0',
    date: 'Décembre 2025',
    items: [
      '✨ Export Analytics en Excel, PDF et JSON',
      '❤️ Bouton favoris visible sur chaque rendu',
      '🎨 Correction des icônes en mode sombre',
      '📊 Dashboard Analytics amélioré',
    ],
  },
  {
    version: '2.0.0',
    date: 'Novembre 2025',
    items: [
      '📄 Plaquette PDF Premium avec co-branding',
      '📊 Magazine DÉCO style AD Magazine',
      '🔗 Partage de projets par lien sécurisé',
      '🎬 Mode présentation plein écran',
      '⚖️ Comparaison Avant/Après améliorée',
    ],
  },
  {
    version: '1.5.0',
    date: 'Octobre 2025',
    items: [
      '🤖 Intégration Gemini 3 Pro Image',
      '📷 Combinaison multi-images (jusqu\'à 5)',
      '🏷️ Références DICA sur les images générées',
      '🌙 Mode nuit complet',
    ],
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'Combien de temps prend une génération ?',
    answer: 'Une génération prend environ 30 à 60 secondes selon la complexité de l\'image. Pour 4 rendus, comptez 2 à 4 minutes.',
  },
  {
    question: 'Quels formats de photos sont acceptés ?',
    answer: 'JPG, PNG et WEBP sont acceptés. Pour des résultats optimaux, utilisez des images d\'au moins 1024x1024 pixels avec un éclairage uniforme.',
  },
  {
    question: 'Comment améliorer la qualité des rendus ?',
    answer: 'Utilisez des photos haute résolution, bien éclairées, avec les surfaces bien visibles. Choisissez le bon cas d\'usage (ascenseur, van, etc.) pour guider l\'IA.',
  },
  {
    question: 'Puis-je utiliser les rendus commercialement ?',
    answer: 'Oui, les rendus générés sont destinés à un usage professionnel dans le cadre de votre activité avec DICA France.',
  },
  {
    question: 'Comment fonctionne le système de quotas ?',
    answer: 'Chaque utilisateur dispose d\'un quota quotidien (50 rendus par défaut) et mensuel selon son forfait. Le compteur se réinitialise à minuit.',
  },
  {
    question: 'Comment ajouter un rendu aux favoris ?',
    answer: 'Cliquez sur l\'icône cœur (❤️) visible en haut à droite de chaque rendu. Le cœur devient rouge pour indiquer un favori.',
  },
  {
    question: 'Comment exporter une plaquette PDF ?',
    answer: 'Dans un projet, cliquez sur "Plaquette PDF" dans le header. Vous pouvez personnaliser le co-branding et ajouter des commentaires IA.',
  },
  {
    question: 'L\'application fonctionne-t-elle hors ligne ?',
    answer: 'Non, une connexion internet est nécessaire car les générations sont effectuées sur les serveurs Google AI.',
  },
];

// ============================================================================
// Component
// ============================================================================

const Help: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('guide');

  return (
    <PremiumLayout backgroundImage="/images/page-projets.png">
      {/* Header */}
      <header className="header-premium sticky top-0 z-50">
        <div className="container mx-auto flex h-16 md:h-20 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <HelpCircle className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">Centre d'aide</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <ContentContainer className="py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="guide" className="gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Guide</span>
            </TabsTrigger>
            <TabsTrigger value="new" className="gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Nouveautés</span>
            </TabsTrigger>
            <TabsTrigger value="faq" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">FAQ</span>
            </TabsTrigger>
          </TabsList>

          {/* Guide Tab */}
          <TabsContent value="guide" className="space-y-8">
            <div>
              <SectionTitle 
                title="Fonctionnalités" 
                subtitle="Tout ce que DICA Decorator peut faire pour vous"
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {FEATURES.map((feature, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-xl bg-card border hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <feature.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{feature.title}</h3>
                          {feature.isNew && (
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                              Nouveau
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Start */}
            <div className="p-6 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border">
              <div className="flex items-center gap-3 mb-4">
                <Play className="h-6 w-6 text-primary" />
                <h3 className="text-lg font-semibold">Démarrage rapide</h3>
              </div>
              
              <ol className="space-y-3 ml-4">
                <li className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">1</span>
                  <span>Créez un projet et choisissez le cas d'usage (ascenseur, van...)</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">2</span>
                  <span>Uploadez une photo de la surface à décorer</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">3</span>
                  <span>Cliquez "Appliquer un décor" et choisissez dans le catalogue</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">4</span>
                  <span>L'IA génère le rendu en 30 secondes !</span>
                </li>
              </ol>

              <Button className="mt-6" onClick={() => navigate('/project/new')}>
                <Zap className="h-4 w-4 mr-2" />
                Créer mon premier projet
              </Button>
            </div>
          </TabsContent>

          {/* What's New Tab */}
          <TabsContent value="new" className="space-y-8">
            <SectionTitle 
              title="Nouveautés" 
              subtitle="Les dernières améliorations de DICA Decorator"
            />
            
            <div className="space-y-6">
              {WHATS_NEW.map((release, index) => (
                <div
                  key={release.version}
                  className="p-6 rounded-xl bg-card border"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      index === 0 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      v{release.version}
                    </div>
                    <span className="text-sm text-muted-foreground">{release.date}</span>
                    {index === 0 && (
                      <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                        Actuel
                      </span>
                    )}
                  </div>
                  
                  <ul className="space-y-2">
                    {release.items.map((item, idx) => (
                      <li key={idx} className="text-sm">{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* FAQ Tab */}
          <TabsContent value="faq" className="space-y-8">
            <SectionTitle 
              title="Questions fréquentes" 
              subtitle="Trouvez rapidement les réponses à vos questions"
            />
            
            <Accordion type="single" collapsible className="w-full">
              {FAQ_ITEMS.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {/* Contact */}
            <div className="p-6 rounded-xl bg-muted/50 border mt-8">
              <h3 className="font-semibold mb-2">Besoin d'aide supplémentaire ?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Notre équipe support est disponible pour vous accompagner.
              </p>
              <Button variant="outline" asChild>
                <a href="mailto:support@dica-france.com">
                  <Mail className="h-4 w-4 mr-2" />
                  support@dica-france.com
                </a>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </ContentContainer>
    </PremiumLayout>
  );
};

export default Help;

