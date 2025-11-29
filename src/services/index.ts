/**
 * @fileoverview Services Index
 * 
 * Exports all services for use throughout the application.
 * Each service is designed with TDD and follows SOLID principles.
 */

// Image Storage Service - Phase 1.1
export {
  ImageStorageService,
  ImageUploadError,
  InvalidImageFormatError,
  StorageQuotaExceededError,
  createImageStorageService,
  type ImageUploadOptions,
  type ImageUploadResult,
  type ParsedDataUrl,
  type DeleteResult,
  type MigrationResult,
} from './image-storage.service';

// Rate Limiter Service - Phase 1.2
export {
  RateLimiterService,
  RateLimitExceededError,
  QuotaExceededError,
  createRateLimiterService,
  type RateLimitConfig,
  type RateLimitCheckResult,
  type CombinedRateLimitResult,
  type UsageRecord,
} from './rate-limiter.service';

// URL Validator Service - Phase 1.3
export {
  UrlValidatorService,
  SsrfBlockedError,
  InvalidUrlError,
  createUrlValidatorService,
  type UrlValidationConfig,
  type UrlValidationResult,
} from './url-validator.service';

// Auth Guard Service - Phase 1.4 & 1.5
export {
  AuthGuardService,
  UnauthorizedError,
  ForbiddenError,
  createAuthGuardService,
  type AuthGuardConfig,
  type UserContext,
  type PermissionCheck,
  type OrganizationMembership,
} from './auth-guard.service';

// Organization Service - Phase 2.0
export {
  OrganizationService,
  OrganizationNotFoundError,
  MemberAlreadyExistsError,
  InvitationExpiredError,
  createOrganizationService,
  type Organization,
  type OrganizationMember,
  type OrganizationInvitation,
  type CreateOrganizationInput,
  type UpdateOrganizationInput,
  type SubscriptionTier,
} from './organization.service';

// Quota Service - Phase 2.1
export {
  QuotaService,
  QuotaExhaustedError,
  createQuotaService,
  type QuotaConfig,
  type QuotaStatus,
  type UsageReport,
} from './quota.service';

// Gemini Image Service - Phase 2.2
export {
  GeminiImageService,
  createGemini3ProService,
  createDefaultService,
  DEFAULT_IMAGE_MODEL,
  GEMINI_3_PRO_IMAGE_MODEL,
  GOOGLE_AI_ENDPOINT,
  SUPPORTED_ASPECT_RATIOS,
  FORMAT_TO_RATIO_MAP,
  type GeminiImageConfig,
  type ImageGenerationRequest,
  type ImageGenerationResponse,
  type GeminiApiRequest,
} from './gemini-image.service';

// Image Comparison Service - Phase 3.0 (Comparateur Avant/Après)
export {
  ImageComparisonService,
  ComparisonError,
  type ComparisonConfig,
  type ComparisonState,
  type SliderPosition,
  type ImagePair,
  type ValidationResult,
  type ClipPaths,
  type HandlePosition,
  type ExportOptions,
  type ComparisonExport,
  type AnimationOptions,
  type LoadResult,
  type AriaAttributes,
  type FocusAttributes,
  type SliderOrientation,
  type EasingFunction,
  type ExportFormat,
  type PresetName,
} from './image-comparison.service';

// PDF Export Service - Phase 3.1 (Export PDF Professionnel)
export {
  PDFExportService,
  PDFExportError,
  type PDFConfig,
  type PDFTemplate,
  type PageOrientation,
  type PageSize,
  type PDFContent,
  type PlaquetteData,
  type DevisData,
  type ComparisonData,
  type HeaderConfig,
  type FooterConfig,
  type BrandingConfig,
  type RenderInfo,
  type DevisItem,
  type DevisTotals,
  type ContentElement,
  type PageContent,
} from './pdf-export.service';

// Share Link Service - Phase 3.2 (Partage par Lien)
export {
  ShareLinkService,
  ShareLinkError,
  type ShareLinkConfig,
  type ShareLinkData,
  type ShareLinkPermissions,
  type ShareLinkValidation,
  type ExpirationPreset,
  type AccessLog,
  type ShareLinkStats,
  type CreateShareLinkInput,
  type AccessLogInput,
  type BatchCreateInput,
  type ListLinksOptions,
} from './share-link.service';

