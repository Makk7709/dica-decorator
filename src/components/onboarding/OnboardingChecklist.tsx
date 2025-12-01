/**
 * @fileoverview OnboardingChecklist - Checklist progressive pour nouveaux utilisateurs
 * Guide pas-à-pas vers la première génération IA
 * 
 * @author KOREV AI pour DICA France
 * @version 1.0.0
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Check, 
  Circle,
  LogIn,
  FolderPlus,
  Image,
  Palette,
  Sparkles,
  ChevronRight,
  X,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  completed: boolean;
  action?: () => void;
  actionLabel?: string;
}

interface OnboardingChecklistProps {
  items: ChecklistItem[];
  onDismiss: () => void;
  className?: string;
}

// ============================================================================
// Default Checklist Items
// ============================================================================

export const getDefaultChecklistItems = (
  isLoggedIn: boolean,
  hasProjects: boolean,
  hasPhotos: boolean,
  hasRenders: boolean,
  navigate: (path: string) => void
): ChecklistItem[] => [
  {
    id: 'login',
    title: 'Se connecter',
    description: 'Accédez à votre espace personnel',
    icon: LogIn,
    completed: isLoggedIn,
    action: () => navigate('/auth'),
    actionLabel: 'Connexion',
  },
  {
    id: 'project',
    title: 'Créer un projet',
    description: 'Organisez vos visualisations par client',
    icon: FolderPlus,
    completed: hasProjects,
    action: () => navigate('/project/new'),
    actionLabel: 'Nouveau projet',
  },
  {
    id: 'photo',
    title: 'Ajouter une photo',
    description: 'Uploadez une photo de surface à décorer',
    icon: Image,
    completed: hasPhotos,
    actionLabel: 'Dans le projet',
  },
  {
    id: 'decor',
    title: 'Appliquer un décor',
    description: 'Choisissez un décor DICA et générez',
    icon: Palette,
    completed: hasRenders,
    actionLabel: 'Dans le projet',
  },
  {
    id: 'done',
    title: 'Découvrir l\'Assistant IA',
    description: 'Créez des mood boards et plaquettes',
    icon: Sparkles,
    completed: false,
    action: () => navigate('/creative'),
    actionLabel: 'Explorer',
  },
];

// ============================================================================
// Component
// ============================================================================

export const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({
  items,
  onDismiss,
  className = '',
}) => {
  const completedCount = items.filter(item => item.completed).length;
  const progress = (completedCount / items.length) * 100;
  const allCompleted = completedCount === items.length;

  // Find next incomplete item
  const nextItem = items.find(item => !item.completed);

  return (
    <div className={`bg-card border rounded-xl shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Guide de démarrage</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-3">
          <Progress value={progress} className="flex-1 h-2" />
          <span className="text-sm font-medium text-muted-foreground">
            {completedCount}/{items.length}
          </span>
        </div>
      </div>

      {/* Checklist */}
      <div className="p-2">
        {items.map((item, index) => {
          const Icon = item.icon;
          const isNext = item === nextItem;
          
          return (
            <div
              key={item.id}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                item.completed 
                  ? 'opacity-60' 
                  : isNext 
                    ? 'bg-primary/5 ring-1 ring-primary/20'
                    : ''
              }`}
            >
              {/* Status indicator */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                item.completed 
                  ? 'bg-green-500 text-white' 
                  : isNext
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
              }`}>
                {item.completed ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${item.completed ? 'line-through' : ''}`}>
                    {item.title}
                  </span>
                  {isNext && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                      Suivant
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {item.description}
                </p>
              </div>

              {/* Action button */}
              {!item.completed && item.action && (
                <Button
                  variant={isNext ? 'default' : 'outline'}
                  size="sm"
                  onClick={item.action}
                  className="flex-shrink-0"
                >
                  {item.actionLabel}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {allCompleted && (
        <div className="p-4 bg-green-50 dark:bg-green-950/20 border-t text-center">
          <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
            <Check className="h-5 w-5" />
            <span className="font-medium">Félicitations ! Vous êtes prêt·e 🎉</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnboardingChecklist;

