import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convertit une URL relative de texture décor en URL Supabase Storage complète.
 * Ex: "/decor-textures/1071 VELVET 2.jpg" → "https://...supabase.co/storage/v1/object/public/decor-textures/1071%20VELVET%202.jpg"
 */
export function getTextureStorageUrl(textureUrl: string): string {
  if (!textureUrl) return "";
  
  // Si déjà une URL absolue Supabase, retourner tel quel
  if (textureUrl.startsWith("https://") && textureUrl.includes("supabase.co")) {
    return textureUrl;
  }
  
  // Extraire le nom du fichier depuis le chemin relatif
  const filename = textureUrl.split("/").pop() || "";
  if (!filename) return textureUrl;
  
  // Encoder le nom du fichier pour les espaces et caractères spéciaux
  const encodedFilename = encodeURIComponent(filename);
  
  // Construire l'URL Supabase Storage
  const supabaseProjectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "urkftxznsynmvkskytih";
  return `https://${supabaseProjectId}.supabase.co/storage/v1/object/public/decor-textures/${encodedFilename}`;
}
