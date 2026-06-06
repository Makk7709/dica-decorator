/**
 * @fileoverview Types partagés de l'Assistant Créatif (page Creative).
 *
 * Extraits de `src/pages/Creative.tsx` lors du LOT 4 (réduction de complexité
 * cognitive) afin d'être réutilisés par les helpers (`src/lib/creative-*.ts`)
 * et les sous-composants de présentation sans dépendance circulaire.
 */

export interface DecorReference {
  reference: string;
  label: string;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  sourceImageUrls?: string[];
  sourceImageUrl?: string;
  decorReferences?: DecorReference[];
}

export interface UploadedImage {
  url: string;
  label: string;
}

export interface Decor {
  id: string;
  name: string;
  reference_code: string;
  category: string;
  usage_contexts: string[];
  texture_image_url: string;
}

export interface Favorite {
  id: string;
  title: string;
  prompt: string;
  response: string;
  image_data: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  title: string;
  use_case: string;
}
