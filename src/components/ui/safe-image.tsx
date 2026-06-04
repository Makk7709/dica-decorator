import { useState } from "react";
import { ImageOff } from "lucide-react";
import { useSignedUrl } from "@/hooks/use-signed-url";

type Props = {
  src: string;
  alt: string;
  className?: string;
  /** Optional: keep layout stable while loading */
  width?: number;
  height?: number;
  loading?: "lazy" | "eager";
  decoding?: "async" | "sync" | "auto";
  referrerPolicy?: React.ImgHTMLAttributes<HTMLImageElement>["referrerPolicy"];
};

export function SafeImage({
  src,
  alt,
  className,
  width,
  height,
  loading = "lazy",
  decoding = "async",
  referrerPolicy = "no-referrer",
}: Props) {
  const [hasError, setHasError] = useState(false);
  // Résout automatiquement les URLs Supabase Storage privées en URLs signées
  const { url: resolvedSrc, isLoading: isSigning } = useSignedUrl(src);

  if (!src || hasError) {
    return (
      <div
        className={[
          "flex items-center justify-center rounded-md bg-muted text-muted-foreground",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ width, height }}
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

  if (isSigning || !resolvedSrc) {
    return (
      <div
        className={["animate-pulse bg-muted", className].filter(Boolean).join(" ")}
        style={{ width, height }}
        aria-label={`${alt} (chargement)`}
        role="img"
      />
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      width={width}
      height={height}
      loading={loading}
      decoding={decoding}
      referrerPolicy={referrerPolicy}
      onError={() => setHasError(true)}
    />
  );
}
