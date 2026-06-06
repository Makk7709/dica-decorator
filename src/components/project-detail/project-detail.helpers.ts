/**
 * Helpers purs de la page ProjectDetail (LOT 4 — réduction de complexité).
 *
 * Ces fonctions extraient une logique auparavant imbriquée dans le composant
 * `ProjectDetail` afin d'abaisser sa complexité cognitive (S3776) et de
 * supprimer les imbrications profondes (S2004), SANS changer le comportement :
 * mêmes données produites, même tri, mêmes libellés.
 */

import type { PlaquetteImage } from "@/types/plaquette.types";
import type {
  CreativeImport,
  Decor,
  ProjectPhoto,
  RenderResult,
  RenderResultRow,
  RendersByPhoto,
} from "./project-detail.types";

/** Libellés français des cas d'usage de projet. */
export const getUseCaseLabel = (useCase: string): string => {
  const labels: Record<string, string> = {
    ascenseur: "Ascenseur",
    van: "Van aménagé",
    meuble: "Meuble",
    autre: "Autre",
  };
  return labels[useCase] || useCase;
};

/**
 * Répartit les lignes brutes `render_results` en :
 * - rendus décor classiques indexés par photo (decor_id non nul) ;
 * - créations de l'assistant IA (decor_id nul).
 *
 * Réplique exactement le traitement en une passe d'origine (Map O(n)).
 */
export const partitionRenderResults = (
  rows: RenderResultRow[] | null | undefined,
  photoIds: string[],
): { rendersByPhoto: RendersByPhoto; creativeImports: CreativeImport[] } => {
  const rendersByPhoto: RendersByPhoto = {};
  const creativeImports: CreativeImport[] = [];
  const photoIdSet = new Set(photoIds);

  for (const photoId of photoIds) {
    rendersByPhoto[photoId] = [];
  }

  for (const render of rows ?? []) {
    if (render.decor_id === null) {
      creativeImports.push({
        id: render.id,
        result_image_url: render.result_image_url,
        created_at: render.created_at,
        photoId: render.project_photo_id,
      });
    } else if (photoIdSet.has(render.project_photo_id)) {
      rendersByPhoto[render.project_photo_id].push(render);
    }
  }

  return { rendersByPhoto, creativeImports };
};

interface ExportImagesInput {
  renders: RendersByPhoto;
  photos: ProjectPhoto[];
  decors: Decor[];
  creativeImports: CreativeImport[];
}

const mapDecorRenderToImage = (
  render: RenderResult,
  photo: ProjectPhoto | undefined,
  decors: Decor[],
): PlaquetteImage => {
  const decor = decors.find((d) => d.id === render.decor_id);
  return {
    id: render.id,
    url: render.result_image_url,
    originalUrl: photo?.original_image_url,
    decorId: render.decor_id || "",
    decorName: decor?.name || "",
    decorCode: decor?.reference_code || "",
    createdAt: new Date(render.created_at),
    isHighResolution: true,
  };
};

/**
 * Construit la liste d'images pour l'export Brochure Revendeur :
 * rendus décors d'abord (priorité), puis créations IA.
 */
export const buildBrochureImages = ({
  renders,
  photos,
  decors,
  creativeImports,
}: ExportImagesInput): PlaquetteImage[] => {
  const decorImages = Object.entries(renders).flatMap(([photoId, photoRenders]) => {
    const photo = photos.find((p) => p.id === photoId);
    return photoRenders.map((render) => mapDecorRenderToImage(render, photo, decors));
  });

  const creativeImages: PlaquetteImage[] = creativeImports.map((creative) => ({
    id: creative.id,
    url: creative.result_image_url,
    originalUrl: photos.find((p) => p.id === creative.photoId)?.original_image_url,
    decorId: "creative",
    decorName: "Création Assistant IA",
    decorCode: "CREATIVE-AI",
    createdAt: new Date(creative.created_at),
    isHighResolution: true,
  }));

  return [...decorImages, ...creativeImages];
};

interface MagazineImagesInput extends ExportImagesInput {
  favoriteRenderIds: Set<string>;
  selectedRenderIds: Set<string>;
}

const compareByFavorite = (a: PlaquetteImage, b: PlaquetteImage): number => {
  if (a.isFavorite && !b.isFavorite) return -1;
  if (!a.isFavorite && b.isFavorite) return 1;
  return 0;
};

/**
 * Construit la liste d'images pour l'export Magazine DECO :
 * rendus décors + créations IA, filtrés par sélection éventuelle,
 * puis favoris triés en premier.
 */
export const buildMagazineImages = ({
  renders,
  photos,
  decors,
  creativeImports,
  favoriteRenderIds,
  selectedRenderIds,
}: MagazineImagesInput): PlaquetteImage[] => {
  const decorImages = Object.entries(renders).flatMap(([photoId, photoRenders]) => {
    const photo = photos.find((p) => p.id === photoId);
    return photoRenders.map((render) => ({
      ...mapDecorRenderToImage(render, photo, decors),
      isFavorite: favoriteRenderIds.has(render.id),
    }));
  });

  const creativeImages: PlaquetteImage[] = creativeImports.map((creative) => ({
    id: creative.id,
    url: creative.result_image_url,
    originalUrl: undefined,
    decorId: "",
    decorName: "Création Assistant IA",
    decorCode: "ASSISTANT_IA",
    createdAt: new Date(creative.created_at),
    isHighResolution: true,
    isFavorite: false,
  }));

  return [...decorImages, ...creativeImages]
    .filter((img) => selectedRenderIds.size === 0 || selectedRenderIds.has(img.id))
    .sort(compareByFavorite);
};
