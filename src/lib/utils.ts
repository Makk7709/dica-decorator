import type React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extrait un message lisible à partir d'une valeur d'erreur de type `unknown`,
 * renvoyée notamment par les blocs `catch` en TypeScript strict (cf. ESLint
 * @typescript-eslint/no-explicit-any et SonarLint S6671).
 *
 * - Si `error` est une instance d'`Error`, renvoie son `message`.
 * - Si `error` est une chaîne, la renvoie telle quelle.
 * - Si `error` est un objet avec une propriété `message` de type chaîne, la renvoie.
 * - Sinon, renvoie `fallback` (par défaut : "Une erreur inconnue est survenue").
 */
export function getErrorMessage(error: unknown, fallback = "Une erreur inconnue est survenue"): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}

/**
 * Variante typée d'`Error` pour les erreurs émises par Supabase et par d'autres
 * APIs qui renvoient un objet plat avec `message` et éventuellement `code`.
 */
export interface ApiErrorLike {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

/**
 * Test de forme : indique si la valeur ressemble à une erreur d'API
 * (`{ message: string, code?: string }`).
 */
export function isApiErrorLike(value: unknown): value is ApiErrorLike {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof (value as { message: unknown }).message === "string"
  );
}

/**
 * Construit un gestionnaire `onKeyDown` qui exécute la même action que
 * `onClick` lorsqu'on appuie sur Entrée ou Espace, et empêche le scroll
 * navigateur sur Espace. À utiliser sur les éléments non natifs interactifs
 * (cartes cliquables, lignes de tableau, etc.) qui doivent rester
 * accessibles au clavier (cf. WCAG 2.1 - 2.1.1 Keyboard, et règle ESLint
 * jsx-a11y/click-events-have-key-events).
 *
 * Combine en pratique avec `role="button"` et `tabIndex={0}`.
 *
 * @example
 * <div
 *   role="button"
 *   tabIndex={0}
 *   onClick={handleClick}
 *   onKeyDown={(e) => onActivateKeyDown(e, handleClick)}
 * >...</div>
 */
export function onActivateKeyDown<E extends Element = HTMLElement>(
  event: React.KeyboardEvent<E>,
  handler: (event: React.KeyboardEvent<E>) => void
): void {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    handler(event);
  }
}
