// ============================================================================
// Anti-SSRF Guard pour les Edge Functions DICA Decorator
// ----------------------------------------------------------------------------
// Empêche les utilisateurs authentifiés de faire fetcher la fonction Edge
// sur des URLs arbitraires (réseau interne, métadonnées cloud, services
// privés). Stratégie : whitelist de hostnames + blocage explicite des plages
// IP privées et des domaines de métadonnées cloud.
//
// Les fonctions Edge ont accès au réseau de l'environnement Supabase ; un
// SSRF y exposerait :
//   - Métadonnées AWS / GCP / Azure (169.254.169.254, metadata.google.internal)
//   - Services internes du tenant Supabase
//   - Plages IP privées (10/8, 172.16/12, 192.168/16, 169.254/16, 127/8, ::1)
//   - Endpoints de management cloud
//
// Ce module est volontairement minimaliste et lisible : pas de dépendance
// externe, pas de DNS resolution coûteuse (best-effort hostname-based).
//
// Auteur : KOREV AI
// ============================================================================

/**
 * Hostnames cloud / internes à BLOQUER explicitement (defense-in-depth).
 * Match exact ou suffix.
 */
const BLOCKED_HOSTNAMES = [
  // AWS Instance Metadata Service (IMDSv1/v2)
  "169.254.169.254",
  // GCP metadata
  "metadata.google.internal",
  "metadata",
  // Azure metadata
  "169.254.169.254", // partagé AWS/Azure
  // Loopback
  "localhost",
  "0.0.0.0",
  "::1",
  "ip6-localhost",
  "ip6-loopback",
];

/**
 * Plages CIDR privées RFC1918 + link-local + loopback (regex sur l'IP).
 * Les IPs publiques ne matchent pas ces patterns.
 */
const PRIVATE_IP_PATTERNS: RegExp[] = [
  /^10\./,                   // 10.0.0.0/8
  /^127\./,                  // 127.0.0.0/8 (loopback)
  /^169\.254\./,             // 169.254.0.0/16 (link-local + IMDS)
  /^192\.168\./,             // 192.168.0.0/16
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
  /^0\./,                    // 0.0.0.0/8
  /^fc[0-9a-f]{2}:/i,        // IPv6 ULA
  /^fe80:/i,                 // IPv6 link-local
  /^::1$/,                   // IPv6 loopback
];

export interface SsrfGuardOptions {
  /** Hostnames autorisés (suffix match). Ex: ["supabase.co", "trusted.example.com"] */
  allowedHostSuffixes?: string[];
  /** Si true, autorise uniquement HTTPS. Default: true. */
  httpsOnly?: boolean;
}

export class SsrfBlockedError extends Error {
  constructor(reason: string, url: string) {
    super(`SSRF blocked: ${reason} (url=${url})`);
    this.name = "SsrfBlockedError";
  }
}

/**
 * Valide une URL avant fetch côté Edge Function.
 * Lève `SsrfBlockedError` si l'URL est suspecte.
 *
 * @example
 *   assertSafeFetchUrl(textureUrl, {
 *     allowedHostSuffixes: ["supabase.co"],
 *   });
 *   const response = await fetch(textureUrl);
 */
export function assertSafeFetchUrl(
  rawUrl: string,
  options: SsrfGuardOptions = {},
): void {
  const { allowedHostSuffixes = [], httpsOnly = true } = options;

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new SsrfBlockedError("invalid URL syntax", rawUrl);
  }

  // 1. Schéma : seul HTTP(S) autorisé.
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new SsrfBlockedError(
      `protocol ${parsed.protocol} not allowed (only http/https)`,
      rawUrl,
    );
  }
  if (httpsOnly && parsed.protocol !== "https:") {
    throw new SsrfBlockedError("only HTTPS allowed", rawUrl);
  }

  // Normalise IPv6 : `new URL("http://[::1]/").hostname` retourne `[::1]`
  // selon le runtime — on retire les crochets éventuels pour matcher
  // les patterns IPv6 (::1, fe80::*, fc00::/7).
  const hostname = parsed.hostname
    .toLowerCase()
    .replace(/^\[/, "")
    .replace(/\]$/, "");

  // 2. Hostnames explicitement bloqués (cloud metadata, loopback).
  for (const blocked of BLOCKED_HOSTNAMES) {
    if (hostname === blocked) {
      throw new SsrfBlockedError(`blocked hostname: ${hostname}`, rawUrl);
    }
  }

  // 3. Plages IP privées (best-effort hostname-based, sans DNS resolution).
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      throw new SsrfBlockedError(`private IP range: ${hostname}`, rawUrl);
    }
  }

  // 4. Whitelist de suffixes (si configurée).
  if (allowedHostSuffixes.length > 0) {
    const matchesAllowed = allowedHostSuffixes.some(
      (suffix) =>
        hostname === suffix || hostname.endsWith(`.${suffix}`),
    );
    if (!matchesAllowed) {
      throw new SsrfBlockedError(
        `hostname not in allowed list: ${hostname} (allowed: ${allowedHostSuffixes.join(", ")})`,
        rawUrl,
      );
    }
  }
}

/**
 * Helper : `assertSafeFetchUrl` + `fetch` en une étape.
 * Utile quand on n'a pas besoin du `Response` raw.
 */
export async function safeFetch(
  rawUrl: string,
  init?: RequestInit,
  options?: SsrfGuardOptions,
): Promise<Response> {
  assertSafeFetchUrl(rawUrl, options);
  return fetch(rawUrl, init);
}
