/**
 * @fileoverview WelcomeModal - Modal d'accueil pour nouveaux utilisateurs
 * Onboarding DICA Decorator - 3 minutes max
 * 
 * @author KOREV AI pour DICA France
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Sparkles, 
  Image, 
  FolderKanban, 
  Palette, 
  Download,
  ArrowRight,
  Check,
  Zap,
  Clock,
  Shield,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface WelcomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  userName?: string;
}

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

// ============================================================================
// Constants
// ============================================================================

const STEPS: Step[] = [
  {
    id: 'welcome',
    title: 'Bienvenue sur DICA Decorator',
    description: 'Visualisez instantanément les décors DICA sur vos photos grâce à l\'IA',
    icon: Sparkles,
    color: 'text-primary',
  },
  {
    id: 'project',
    title: 'Créez un projet',
    description: 'Organisez vos visualisations par client, ascenseur, van ou autre',
    icon: FolderKanban,
    color: 'text-blue-500',
  },
  {
    id: 'photo',
    title: 'Uploadez une photo',
    description: 'Ajoutez une photo de la surface à décorer (cabine, paroi, sol...)',
    icon: Image,
    color: 'text-green-500',
  },
  {
    id: 'decor',
    title: 'Appliquez un décor',
    description: 'Choisissez parmi +200 décors DICA et l\'IA fait le reste en 30 secondes',
    icon: Palette,
    color: 'text-purple-500',
  },
  {
    id: 'export',
    title: 'Exportez & Partagez',
    description: 'Téléchargez vos rendus, créez des plaquettes PDF ou partagez par lien',
    icon: Download,
    color: 'text-orange-500',
  },
];

const BENEFITS = [
  { icon: Zap, text: 'Rendus en 30 secondes', color: 'text-yellow-500' },
  { icon: Clock, text: 'Gagnez 90% de temps', color: 'text-blue-500' },
  { icon: Shield, text: 'Résultats professionnels', color: 'text-green-500' },
];

// ============================================================================
// Component
// ============================================================================

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  open,
  onOpenChange,
  onComplete,
  userName,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
      onOpenChange(false);
    }
  };

  const handleSkip = () => {
    onComplete();
    onOpenChange(false);
  };

  const currentStepData = STEPS[currentStep];
  const Icon = currentStepData.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        {/* Header avec gradient */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 pb-4">
          <DialogHeader>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <img 
                  src="/images/dica-logo.png" 
                  alt="DICA" 
                  className="h-8 w-auto"
                />
              </div>
              <div className="text-xs text-muted-foreground">
                {currentStep + 1} / {STEPS.length}
              </div>
            </div>
            
            <Progress value={progress} className="h-1 mb-4" />
            
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-background shadow-lg mb-4 ${currentStepData.color}`}>
              <Icon className="h-8 w-8" />
            </div>
            
            <DialogTitle className="text-2xl">
              {currentStep === 0 && userName ? (
                <>Bienvenue, {userName} ! 👋</>
              ) : (
                currentStepData.title
              )}
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              {currentStepData.description}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="p-6 pt-2">
          {/* Benefits on first step */}
          {currentStep === 0 && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              {BENEFITS.map((benefit, index) => (
                <div 
                  key={index}
                  className="flex flex-col items-center text-center p-3 rounded-lg bg-muted/50"
                >
                  <benefit.icon className={`h-5 w-5 mb-2 ${benefit.color}`} />
                  <span className="text-xs text-muted-foreground">{benefit.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Steps indicator on other steps */}
          {currentStep > 0 && (
            <div className="flex items-center gap-2 mb-6">
              {STEPS.slice(1).map((step, index) => {
                const StepIcon = step.icon;
                const isCompleted = index + 1 < currentStep;
                const isCurrent = index + 1 === currentStep;
                
                return (
                  <div
                    key={step.id}
                    className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                      isCompleted 
                        ? 'bg-primary text-primary-foreground' 
                        : isCurrent
                          ? 'bg-primary/20 text-primary ring-2 ring-primary'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <StepIcon className="h-4 w-4" />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              Passer
            </Button>
            
            <Button onClick={handleNext} className="gap-2">
              {currentStep < STEPS.length - 1 ? (
                <>
                  Suivant
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  Commencer
                  <Sparkles className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeModal;

