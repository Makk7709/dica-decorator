/**
 * @fileoverview useOnboarding - Hook pour gérer l'état de l'onboarding
 * Persiste l'état dans localStorage
 * 
 * @author KOREV AI pour DICA France
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

interface OnboardingState {
  welcomeCompleted: boolean;
  checklistDismissed: boolean;
  lastSeenVersion: string;
  completedSteps: string[];
}

interface UseOnboardingReturn {
  // State
  showWelcome: boolean;
  showChecklist: boolean;
  completedSteps: string[];
  isNewUser: boolean;
  
  // Actions
  completeWelcome: () => void;
  dismissChecklist: () => void;
  completeStep: (stepId: string) => void;
  resetOnboarding: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'dica-onboarding';
const CURRENT_VERSION = '2.1.0';

const DEFAULT_STATE: OnboardingState = {
  welcomeCompleted: false,
  checklistDismissed: false,
  lastSeenVersion: '',
  completedSteps: [],
};

// ============================================================================
// Hook
// ============================================================================

export const useOnboarding = (): UseOnboardingReturn => {
  const [state, setState] = useState<OnboardingState>(DEFAULT_STATE);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load state from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as OnboardingState;
        setState(parsed);
      }
    } catch (error) {
      console.error('[Onboarding] Error loading state:', error);
    }
    setIsInitialized(true);
  }, []);

  // Save state to localStorage
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        console.error('[Onboarding] Error saving state:', error);
      }
    }
  }, [state, isInitialized]);

  // Check if this is a new user or new version
  const isNewUser = !state.welcomeCompleted;
  state.lastSeenVersion !== CURRENT_VERSION;

  // Computed values
  const showWelcome = isInitialized && !state.welcomeCompleted;
  const showChecklist = isInitialized && state.welcomeCompleted && !state.checklistDismissed;

  // Actions
  const completeWelcome = useCallback(() => {
    setState(prev => ({
      ...prev,
      welcomeCompleted: true,
      lastSeenVersion: CURRENT_VERSION,
    }));
  }, []);

  const dismissChecklist = useCallback(() => {
    setState(prev => ({
      ...prev,
      checklistDismissed: true,
    }));
  }, []);

  const completeStep = useCallback((stepId: string) => {
    setState(prev => ({
      ...prev,
      completedSteps: prev.completedSteps.includes(stepId)
        ? prev.completedSteps
        : [...prev.completedSteps, stepId],
    }));
  }, []);

  const resetOnboarding = useCallback(() => {
    setState(DEFAULT_STATE);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    showWelcome,
    showChecklist,
    completedSteps: state.completedSteps,
    isNewUser,
    completeWelcome,
    dismissChecklist,
    completeStep,
    resetOnboarding,
  };
};

export default useOnboarding;

