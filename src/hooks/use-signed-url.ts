/**
 * useSignedUrl — résout une URL Supabase Storage privée vers une URL signée.
 * Retourne immédiatement les URLs non-storage ou externes (pas de loading).
 */

import { useEffect, useState } from "react";
import { signStorageUrl } from "@/lib/signed-storage";

export function useSignedUrl(
  url: string | null | undefined,
  ttlSeconds?: number,
): { url: string; isLoading: boolean } {
  const [resolved, setResolved] = useState<string>(url ?? "");
  const [isLoading, setIsLoading] = useState<boolean>(!!url);

  useEffect(() => {
    let cancelled = false;
    if (!url) {
      setResolved("");
      setIsLoading(false);
      return;
    }
    // Optim : si l'URL n'a clairement pas besoin d'être signée, on saute
    if (!url.includes("/storage/v1/object/")) {
      setResolved(url);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    signStorageUrl(url, ttlSeconds)
      .then((signed) => {
        if (!cancelled) {
          setResolved(signed);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolved(url);
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [url, ttlSeconds]);

  return { url: resolved, isLoading };
}
