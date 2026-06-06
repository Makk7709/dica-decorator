/**
 * @fileoverview Helpers de persistance (Storage + tables) de l'Assistant Créatif.
 *
 * Extraits de `src/pages/Creative.tsx` (LOT 4 — réduction de complexité
 * cognitive S3776) : la fonction `saveImageToProject` cumulait une complexité
 * de 25. En isolant ici la conversion base64, l'upload Storage, la création de
 * projet/photo et l'insertion du rendu, l'orchestration côté composant
 * redescend très largement sous le seuil, à comportement strictement identique.
 *
 * Les appels Supabase, les messages d'erreur et les logs `console.error` sont
 * repris à l'identique de l'implémentation d'origine.
 */

import { supabase } from "@/integrations/supabase/client";

/** Convertit une data URL base64 en `Blob` (+ type MIME détecté). */
export function dataUrlToBlob(dataUrl: string): { blob: Blob; mimeType: string } {
  const base64Data = dataUrl.split(",")[1];
  const mimeType = dataUrl.split(":")[1]?.split(";")[0] || "image/png";

  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });

  return { blob, mimeType };
}

/** Crée un nouveau projet « autre » et renvoie son identifiant. */
export async function createCreativeProject(userId: string, title: string): Promise<string> {
  const { data: newProject, error: projectError } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      title,
      use_case: "autre",
    })
    .select()
    .single();

  if (projectError) {
    console.error("Project creation error:", projectError);
    throw projectError;
  }

  return newProject.id;
}

/**
 * Résout l'URL publique de l'image à enregistrer : si c'est une data URL
 * base64, elle est convertie puis uploadée dans le Storage ; sinon l'URL
 * existante est renvoyée telle quelle. Conserve l'imbrication d'erreurs
 * d'origine (`Erreur upload: …` enveloppée par `Erreur de conversion d'image: …`).
 */
export async function uploadCreativeImageToStorage(
  selectedImageUrl: string,
  userId: string
): Promise<string> {
  if (!selectedImageUrl.startsWith("data:image")) {
    return selectedImageUrl;
  }

  try {
    const { blob, mimeType } = dataUrlToBlob(selectedImageUrl);

    const extension = mimeType.split("/")[1] || "png";
    const fileName = `creative-${Date.now()}.${extension}`;
    const filePath = `${userId}/creative/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("project-photos")
      .upload(filePath, blob, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new Error(`Erreur upload: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from("project-photos").getPublicUrl(filePath);
    return data.publicUrl;
  } catch (conversionError: unknown) {
    console.error("Base64 conversion error:", conversionError);
    const message = conversionError instanceof Error ? conversionError.message : "Erreur inconnue";
    throw new Error(`Erreur de conversion d'image: ${message}`);
  }
}

/**
 * Garantit l'existence d'une `project_photo` pour le projet : en crée une
 * (avec `original_image_url = fallbackImageUrl`) si aucune n'existe, et renvoie
 * l'identifiant de la photo.
 */
export async function ensureProjectPhoto(
  projectId: string,
  fallbackImageUrl: string
): Promise<string> {
  const { data: existingPhotos } = await supabase
    .from("project_photos")
    .select("id")
    .eq("project_id", projectId)
    .limit(1);

  if (!existingPhotos || existingPhotos.length === 0) {
    const { data: newPhoto, error: photoError } = await supabase
      .from("project_photos")
      .insert({
        project_id: projectId,
        original_image_url: fallbackImageUrl,
      })
      .select()
      .single();

    if (photoError) {
      console.error("Photo creation error:", photoError);
      throw photoError;
    }
    return newPhoto.id;
  }

  return existingPhotos[0].id;
}

/** Enregistre l'image en tant que `render_result` (zoom/export/plaquette). */
export async function saveCreativeRenderResult(photoId: string, imageUrl: string): Promise<void> {
  const { error: renderError } = await supabase.from("render_results").insert({
    project_photo_id: photoId,
    result_image_url: imageUrl,
    decor_id: null,
  });

  if (renderError) {
    console.error("Render result error:", renderError);
    throw renderError;
  }
}
