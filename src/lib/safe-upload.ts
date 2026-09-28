const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export class UploadValidationError extends Error {}

/**
 * Valide une image avant upload et renvoie un nom de fichier non devinable.
 * L'extension vient du type MIME, jamais du nom fourni par l'utilisateur.
 */
export function safeImageFileName(file: File, maxBytes = MAX_IMAGE_BYTES): string {
  const ext = IMAGE_EXTENSIONS[file.type];
  if (!ext) {
    throw new UploadValidationError("Format d'image non supporté (JPEG, PNG, WebP, GIF, AVIF)");
  }
  if (file.size > maxBytes) {
    throw new UploadValidationError(`L'image dépasse ${Math.round(maxBytes / 1024 / 1024)} Mo`);
  }
  return `${crypto.randomUUID()}.${ext}`;
}

export function isSupportedImage(file: File): boolean {
  return file.type in IMAGE_EXTENSIONS;
}
