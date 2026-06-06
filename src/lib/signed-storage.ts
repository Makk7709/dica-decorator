/**
 * Signed Storage URL Helper
 *
 * Bascule des buckets `project-photos` et `render-results` en privés :
 * les URLs publiques historiquement stockées en base sont parsées pour en
 * extraire (bucket, path), puis re-signées à la demande via createSignedUrl.
 *
 * Les URLs déjà signées, base64, externes ou de buckets publics restants
 * (decor-textures) sont retournées telles quelles.
 */

import { supabase } from "@/integrations/supabase/client";

const PRIVATE_BUCKETS = new Set(["project-photos", "render-results"]);
const DEFAULT_TTL_SECONDS = 60 * 60; // 1h

interface CacheEntry {
  url: string;
  expiresAt: number; // ms epoch
}

const cache = new Map<string, CacheEntry>();

/** Extrait {bucket, path} d'une URL Supabase Storage publique ou signée. */
function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  if (!url || typeof url !== "string") return null;
  // Format public  : .../storage/v1/object/public/{bucket}/{path}
  // Format signé   : .../storage/v1/object/sign/{bucket}/{path}?token=...
  // Format auth    : .../storage/v1/object/authenticated/{bucket}/{path}
  const match = url.match(
    /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/([^?]+)/,
  );
  if (!match) return null;
  return { bucket: match[1], path: decodeURIComponent(match[2]) };
}

/**
 * Retourne une URL exploitable pour afficher / fetcher la ressource.
 * - Bucket privé → URL signée (avec cache mémoire)
 * - Sinon → URL inchangée
 */
export async function signStorageUrl(
  url: string | null | undefined,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<string> {
  if (!url) return "";
  // Pas de bucket Supabase → on retourne l'URL telle quelle (ex: data:, https externe)
  const parsed = parseStorageUrl(url);
  if (!parsed) return url;
  if (!PRIVATE_BUCKETS.has(parsed.bucket)) return url;

  const cacheKey = `${parsed.bucket}/${parsed.path}`;
  const now = Date.now();
  const hit = cache.get(cacheKey);
  // Marge de sécurité : on resigne 60s avant expiration
  if (hit && hit.expiresAt - 60_000 > now) return hit.url;

  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, ttlSeconds);

  if (error || !data?.signedUrl) {
    // Fallback : URL d'origine (génèrera un 400 mais évite un crash UI)
    return url;
  }

  cache.set(cacheKey, {
    url: data.signedUrl,
    expiresAt: now + ttlSeconds * 1000,
  });
  return data.signedUrl;
}

/** Variante batch : signe plusieurs URLs en parallèle. */
export async function signStorageUrls(
  urls: Array<string | null | undefined>,
  ttlSeconds?: number,
): Promise<string[]> {
  return Promise.all(urls.map((u) => signStorageUrl(u, ttlSeconds)));
}

/** Vide le cache (utile pour les tests / déconnexion). */
export function clearSignedUrlCache(): void {
  cache.clear();
}
