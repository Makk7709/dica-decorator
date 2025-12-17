import { useEffect, useState } from "react";
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
 * - évite de charger des payloads énormes (base64) dans la requête principale
 * - migre automatiquement les anciens renders en base64 vers Storage (bucket render-results)
 */
export function RenderImage({
  renderId,
  fallbackUrl,
  alt,
  className,
  onResolved,
}: RenderImageProps) {
  const [url, setUrl] = useState<string>(fallbackUrl || "");
  const [isLoading, setIsLoading] = useState<boolean>(!fallbackUrl);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);

        const { data, error } = await supabase
          .from("render_results")
          .select("result_image_url")
          .eq("id", renderId)
          .single();

        if (error) throw error;
        const resultUrl = data?.result_image_url || "";

        // Migrer les vieux renders base64 vers Storage
        if (resultUrl.startsWith("data:image")) {
          const { data: migrateData, error: migrateError } = await supabase.functions.invoke(
            "migrate-render-image",
            {
              body: {
                renderId,
                dataUrl: resultUrl,
              },
            }
          );

          if (migrateError) throw migrateError;

          const migratedUrl = migrateData?.publicUrl as string | undefined;
          if (!migratedUrl) throw new Error("Migration image: URL manquante");

          if (!cancelled) {
            setUrl(migratedUrl);
            onResolved?.(migratedUrl);
          }
          return;
        }

        if (!cancelled) {
          setUrl(resultUrl);
          if (resultUrl) onResolved?.(resultUrl);
        }
      } catch (e) {
        // fallback silencieux: on garde fallbackUrl si fourni
        if (!cancelled && fallbackUrl) setUrl(fallbackUrl);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [renderId, fallbackUrl, onResolved]);

  if (isLoading && !url) {
    return <Skeleton className={className || "w-full aspect-[4/3]"} />;
  }

  return <img src={url} alt={alt} className={className} loading="lazy" />;
}
