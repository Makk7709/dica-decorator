import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface RenderImageProps {
  renderId: string;
  fallbackUrl?: string;
  alt: string;
  className?: string;
  onResolved?: (url: string) => void;
}

/**
 * Charge l'URL d'un rendu de façon robuste:
 * - Affiche immédiatement l'image (même base64)
 * - Migre automatiquement les anciens renders base64 vers Storage en arrière-plan
 */
export function RenderImage({
  renderId,
  fallbackUrl,
  alt,
  className,
  onResolved,
}: RenderImageProps) {
  const [url, setUrl] = useState<string>(fallbackUrl || "");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const hasFetched = useRef(false);

  useEffect(() => {
    // Éviter les double-fetches en mode strict React
    if (hasFetched.current) return;
    hasFetched.current = true;

    let cancelled = false;

    async function load() {
      try {
        // Fetch l'URL du render
        const { data, error } = await supabase
          .from("render_results")
          .select("result_image_url")
          .eq("id", renderId)
          .single();

        if (error) {
          console.error(`[RenderImage] Erreur fetch ${renderId}:`, error.message);
          throw error;
        }

        const resultUrl = data?.result_image_url || "";

        if (!resultUrl) {
          console.warn(`[RenderImage] URL vide pour ${renderId}`);
          if (!cancelled) setIsLoading(false);
          return;
        }

        // Afficher immédiatement l'image (même si base64)
        if (!cancelled) {
          setUrl(resultUrl);
          setIsLoading(false);
          onResolved?.(resultUrl);
        }

        // Si c'est du base64, migrer en arrière-plan (non bloquant)
        if (resultUrl.startsWith("data:image")) {
          console.log(`[RenderImage] Migration base64 en arrière-plan: ${renderId}`);
          
          // Migration asynchrone - ne pas attendre
          supabase.functions
            .invoke("migrate-render-image", {
              body: { renderId, dataUrl: resultUrl },
            })
            .then(({ data: migrateData, error: migrateError }) => {
              if (migrateError) {
                console.error(`[RenderImage] Migration échouée ${renderId}:`, migrateError);
                return;
              }
              const migratedUrl = migrateData?.publicUrl as string | undefined;
              if (migratedUrl && !cancelled) {
                console.log(`[RenderImage] Migration réussie ${renderId} → Storage`);
                setUrl(migratedUrl);
                onResolved?.(migratedUrl);
              }
            })
            .catch((e) => {
              console.error(`[RenderImage] Erreur migration ${renderId}:`, e);
            });
        }
      } catch (e) {
        console.error(`[RenderImage] Erreur globale ${renderId}:`, e);
        // fallback silencieux
        if (!cancelled) {
          setIsLoading(false);
          if (fallbackUrl) setUrl(fallbackUrl);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [renderId, fallbackUrl, onResolved]);

  // Afficher un skeleton pendant le chargement initial
  if (isLoading && !url) {
    const base = (className || "w-full").replace(/\bh-auto\b/g, "").trim();
    return <Skeleton className={`${base} aspect-[4/3]`} />;
  }

  // Si pas d'URL, afficher un placeholder
  if (!url) {
    return (
      <div className={`bg-muted flex items-center justify-center ${className || "w-full aspect-[4/3]"}`}>
        <span className="text-xs text-muted-foreground">Image non disponible</span>
      </div>
    );
  }

  return <img src={url} alt={alt} className={className} loading="lazy" />;
}
