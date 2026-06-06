/**
 * @fileoverview Image Storage Service
 * 
 * Handles uploading base64 images to Supabase Storage,
 * replacing the previous pattern of storing base64 data URLs in the database.
 * 
 * Benefits:
 * - Reduced database size (base64 images are ~33% larger than binary)
 * - Faster database queries (no large text fields)
 * - CDN caching for images via Supabase Storage
 * - Proper content-type headers for images
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ImageUploadOptions {
  /** The base64 data URL (e.g., "data:image/png;base64,iVBOR...") */
  base64Data: string;
  /** The user ID for path isolation */
  userId: string;
  /** The photo ID for organizing renders */
  photoId: string;
  /** The storage bucket name */
  bucket: 'render-results' | 'project-photos' | 'decor-textures';
}

export interface ImageUploadResult {
  success: boolean;
  /** The public URL of the uploaded image */
  publicUrl: string;
  /** The storage path (for deletion) */
  storagePath: string;
  /** The mime type of the image */
  mimeType: string;
  /** The file size in bytes */
  fileSizeBytes: number;
}

export interface ParsedDataUrl {
  mimeType: string;
  extension: string;
  base64Data: string;
}

export interface DeleteResult {
  success: boolean;
  error?: string;
}

export interface MigrationResult {
  success: boolean;
  skipped?: boolean;
  newUrl: string;
  error?: string;
}

// ============================================================================
// Custom Errors
// ============================================================================

export class ImageUploadError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'ImageUploadError';
  }
}

export class InvalidImageFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidImageFormatError';
  }
}

export class StorageQuotaExceededError extends Error {
  constructor(message: string = 'Storage quota exceeded') {
    super(message);
    this.name = 'StorageQuotaExceededError';
  }
}

// ============================================================================
// Constants
// ============================================================================

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg', // Alias for jpeg
  'image/webp',
]);

const MIME_TO_EXTENSION: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
};

const DATA_URL_REGEX = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/;

// ============================================================================
// Service Implementation
// ============================================================================

export class ImageStorageService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Uploads a base64 image to Supabase Storage
   * 
   * @param options - Upload options including base64 data and metadata
   * @returns Upload result with public URL and metadata
   * @throws {InvalidImageFormatError} If the image format is not supported
   * @throws {ImageUploadError} If the upload fails
   * @throws {StorageQuotaExceededError} If storage quota is exceeded
   */
  async uploadBase64Image(options: ImageUploadOptions): Promise<ImageUploadResult> {
    const { base64Data, userId, photoId, bucket } = options;

    // Parse and validate the data URL
    const parsed = this.parseBase64DataUrl(base64Data);
    this.validateImageFormat(parsed.mimeType);

    // Convert to blob
    const blob = this.base64ToBlob(parsed.base64Data, parsed.mimeType);

    // Generate unique storage path
    const storagePath = this.generateStoragePath(userId, photoId, parsed.extension);

    // Upload to storage
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(storagePath, blob, {
        contentType: parsed.mimeType,
        upsert: false,
      });

    if (error) {
      if (error.message?.includes('Quota') || error.message?.includes('413')) {
        throw new StorageQuotaExceededError(error.message);
      }
      throw new ImageUploadError(error.message);
    }

    // Get public URL
    const { data: urlData } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    return {
      success: true,
      publicUrl: urlData.publicUrl,
      storagePath,
      mimeType: parsed.mimeType,
      fileSizeBytes: blob.size,
    };
  }

  /**
   * Parses a base64 data URL into its components
   * 
   * @param dataUrl - The full data URL (e.g., "data:image/png;base64,...")
   * @returns Parsed components including mime type, extension, and raw base64
   * @throws {InvalidImageFormatError} If the data URL is malformed
   */
  parseBase64DataUrl(dataUrl: string): ParsedDataUrl {
    const match = dataUrl.match(DATA_URL_REGEX);
    
    if (!match) {
      throw new InvalidImageFormatError(
        'Invalid data URL format. Expected "data:image/<type>;base64,<data>"'
      );
    }

    const [, mimeType, base64Data] = match;
    const extension = MIME_TO_EXTENSION[mimeType] || 'bin';

    return {
      mimeType,
      extension,
      base64Data,
    };
  }

  /**
   * Converts a base64 string to a Blob
   * 
   * @param base64 - The raw base64 string (without data URL prefix)
   * @param mimeType - The MIME type of the image
   * @returns A Blob containing the binary image data
   */
  base64ToBlob(base64: string, mimeType: string): Blob {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.codePointAt(i);
    }
    
    return new Blob([bytes], { type: mimeType });
  }

  /**
   * Generates a unique storage path for an image
   * 
   * Format: {userId}/{photoId}/render-{timestamp}-{randomSuffix}.{extension}
   * 
   * @param userId - The user's ID
   * @param photoId - The photo's ID
   * @param extension - The file extension
   * @returns A unique storage path
   */
  generateStoragePath(userId: string, photoId: string, extension: string): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `${userId}/${photoId}/render-${timestamp}-${randomSuffix}.${extension}`;
  }

  /**
   * Validates that the MIME type is allowed
   * 
   * @param mimeType - The MIME type to validate
   * @throws {InvalidImageFormatError} If the MIME type is not allowed
   */
  validateImageFormat(mimeType: string): void {
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new InvalidImageFormatError(
        `Unsupported image format: ${mimeType}. Allowed formats: ${Array.from(ALLOWED_MIME_TYPES).join(', ')}`
      );
    }
  }

  /**
   * Deletes an image from storage
   * 
   * @param storagePath - The path of the image to delete
   * @param bucket - The storage bucket
   * @returns Delete result
   */
  async deleteImage(storagePath: string, bucket: string): Promise<DeleteResult> {
    const { error } = await this.supabase.storage
      .from(bucket)
      .remove([storagePath]);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  }

  /**
   * Migrates an existing base64 render result to storage
   * 
   * This is used for migrating existing data from the old base64 format
   * to the new storage-based format.
   * 
   * @param renderResult - The render result to migrate
   * @param userId - The user's ID
   * @returns Migration result
   */
  async migrateBase64ToStorage(
    renderResult: { id: string; project_photo_id: string; result_image_url: string },
    userId: string
  ): Promise<MigrationResult> {
    const { id, project_photo_id, result_image_url } = renderResult;

    // Skip if already migrated (not a base64 URL)
    if (!result_image_url.startsWith('data:image')) {
      return {
        success: true,
        skipped: true,
        newUrl: result_image_url,
      };
    }

    try {
      // Upload to storage
      const uploadResult = await this.uploadBase64Image({
        base64Data: result_image_url,
        userId,
        photoId: project_photo_id,
        bucket: 'render-results',
      });

      // Update database record
      const { error: updateError } = await this.supabase
        .from('render_results')
        .update({ result_image_url: uploadResult.publicUrl })
        .eq('id', id);

      if (updateError) {
        // Rollback: delete uploaded file
        await this.deleteImage(uploadResult.storagePath, 'render-results');
        throw new ImageUploadError(`Failed to update database: ${updateError.message}`);
      }

      return {
        success: true,
        newUrl: uploadResult.publicUrl,
      };
    } catch (error) {
      return {
        success: false,
        newUrl: result_image_url,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// ============================================================================
// Factory function for creating service with Supabase client
// ============================================================================

export const createImageStorageService = (supabase: SupabaseClient): ImageStorageService => {
  return new ImageStorageService(supabase);
};

