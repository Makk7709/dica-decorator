// ============================================================================
// Logger conditionnel pour les Edge Functions DICA Decorator
// ----------------------------------------------------------------------------
// Permet de réduire le bruit dans les Edge Logs Supabase en production tout
// en conservant un mode debug puissant en développement.
//
// IMPORTANT : le runtime Edge Supabase ne définit PAS NODE_ENV par défaut.
// On adopte donc une politique opt-in :
//
//   - Logs verbeux DESACTIVES par défaut en production Edge.
//   - Logs verbeux ACTIVES si :
//       * DICA_VERBOSE_LOGS === "1"        (toggle ad hoc, sécurisé)
//       * NODE_ENV === "development"       (vitest, vite dev)
//       * NODE_ENV === "test"              (vitest)
//
// Niveaux :
//   logDebug : verbeux uniquement (filtré en prod par défaut)
//   logInfo  : toujours (faible volume attendu)
//   logWarn  : toujours (alerte non bloquante)
//   logError : toujours (erreur réelle)
//
// Auteur : KOREV AI
// ============================================================================

const VERBOSE_LOGS =
  Deno.env.get("DICA_VERBOSE_LOGS") === "1" ||
  Deno.env.get("NODE_ENV") === "development" ||
  Deno.env.get("NODE_ENV") === "test";

export function logDebug(...args: unknown[]): void {
  if (VERBOSE_LOGS) console.log(...args);
}

export function logInfo(...args: unknown[]): void {
  console.log(...args);
}

export function logWarn(...args: unknown[]): void {
  console.warn(...args);
}

export function logError(...args: unknown[]): void {
  console.error(...args);
}

/**
 * Extrait un message d'erreur d'une valeur `unknown` (catch block).
 *
 * Couvre les Error standards, les strings, null/undefined, et fallback
 * JSON pour les objets plus exotiques (e.g. Supabase API errors).
 *
 * Note : `JSON.stringify(undefined)` retourne `undefined` (pas "undefined")
 * en JavaScript — d'où le `?? String(err)` défensif après.
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err === null || err === undefined) return String(err);
  try {
    return JSON.stringify(err) ?? String(err);
  } catch {
    return String(err);
  }
}

export const isVerboseLogsEnabled = (): boolean => VERBOSE_LOGS;
