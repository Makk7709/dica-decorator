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
