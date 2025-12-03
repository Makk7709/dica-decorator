/**
 * Index des hooks personnalisés
 */

// Hooks de données avec React Query
export { useProjects, useCreateProject, useDeleteProject, useRenameProject, prefetchProjects, type Project } from "./use-projects";
export { useDecors, useDecorsByContext, useDecorsByCategory, type Decor } from "./use-decors";

// Hooks utilitaires
export { useIsMobile } from "./use-mobile";
export { useToast } from "./use-toast";
export { useDecorContextCache } from "./use-decor-context-cache";
export { useOptimisticRender } from "./use-optimistic-render";
export { useCreativeImageExport, type CreativeExportState, type CreativeExportResult, type UseCreativeImageExportReturn } from "./use-creative-image-export";