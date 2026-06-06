import { z } from "zod";

/**
 * Schémas et helpers de validation dédiés à la page d'authentification
 * (`src/pages/Auth.tsx`) et à ses sous-formulaires (`src/components/auth/`).
 *
 * Extraits de `Auth.tsx` lors du LOT 4 (vague 2) pour réduire la complexité
 * cognitive (SonarLint S3776) des formulaires : la logique de validation
 * (try/catch + mapping des messages Zod) est ici regroupée en fonctions pures,
 * sans dépendance React, ce qui allège d'autant les composants appelants.
 *
 * Les messages utilisateur sont STRICTEMENT identiques à ceux d'avant refacto.
 */

// Schémas de validation (déplacés à l'identique depuis Auth.tsx).
export const emailSchema = z.string().email("Email invalide").trim();

export const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères")
  .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
  .regex(/[a-z]/, "Le mot de passe doit contenir au moins une minuscule")
  .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre")
  .regex(/[^A-Za-z0-9]/, "Le mot de passe doit contenir au moins un caractère spécial");

/**
 * Renvoie le premier message d'une erreur Zod, ou le `fallback` fourni si
 * l'erreur n'est pas une `ZodError` (ou si le message est vide). Reproduit
 * exactement l'expression `error.errors[0]?.message || fallback` utilisée
 * historiquement dans les blocs `catch` d'Auth.tsx.
 */
export function firstZodMessage(error: unknown, fallback: string): string {
  if (error instanceof z.ZodError) {
    return error.errors[0]?.message || fallback;
  }
  return fallback;
}

/**
 * Valide un email. Renvoie `null` si l'email est valide, sinon le message
 * d'erreur à afficher (message Zod ou "Email invalide" par défaut).
 */
export function checkEmail(email: string): string | null {
  try {
    emailSchema.parse(email);
    return null;
  } catch (error: unknown) {
    return firstZodMessage(error, "Email invalide");
  }
}

/**
 * Valide un mot de passe. Renvoie `null` si le mot de passe respecte la
 * politique, sinon le message d'erreur (message Zod ou "Mot de passe
 * invalide" par défaut).
 */
export function checkPassword(password: string): string | null {
  try {
    passwordSchema.parse(password);
    return null;
  } catch (error: unknown) {
    return firstZodMessage(error, "Mot de passe invalide");
  }
}

/**
 * Indique si un email est valide (booléen simple, sans message). Utilisé par
 * le parcours « Mot de passe oublié ? » qui n'affiche qu'un message générique.
 */
export function isValidEmail(email: string): boolean {
  try {
    emailSchema.parse(email);
    return true;
  } catch {
    return false;
  }
}
