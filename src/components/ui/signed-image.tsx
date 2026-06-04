/**
 * SignedImage — <img> qui résout automatiquement les URLs Supabase Storage
 * privées en URLs signées avant rendu. Inclut un fallback visuel sur erreur.
 */

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { useSignedUrl } from "@/hooks/use-signed-url";

type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackClassName?: string;
};

export function SignedImage({
  src,
  alt,
  className,
  fallbackClassName,
  ...imgProps
}: Props) {
  const { url, isLoading } = useSignedUrl(src);
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={[
          "flex items-center justify-center rounded-md bg-muted text-muted-foreground",
          fallbackClassName ?? className,
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label={alt}
        role="img"
      >
        <div className="flex flex-col items-center gap-2 p-4 text-center">
          <ImageOff className="h-5 w-5" />
          <span className="text-xs">Image indisponible</span>
        </div>
      </div>
    );
  }

  if (isLoading || !url) {
    return (
      <div
        className={["animate-pulse bg-muted", className].filter(Boolean).join(" ")}
        aria-label={`${alt} (chargement)`}
        role="img"
      />
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      {...imgProps}
    />
  );
}
