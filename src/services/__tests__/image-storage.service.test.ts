/**
 * @fileoverview TDD Tests for Image Storage Service
 * 
 * Phase 1.1: Migration images base64 vers Supabase Storage
 * 
 * Requirements:
 * - Convert base64 images to binary and upload to Storage
 * - Generate unique file paths with user isolation
 * - Return public URLs instead of base64 data URLs
 * - Handle upload errors gracefully
 * - Validate image formats before upload
 * - Support both PNG and JPEG formats
 * - Clean up failed uploads
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {ImageStorageService, ImageUploadError, InvalidImageFormatError, StorageQuotaExceededError, type ImageUploadOptions} from '../image-storage.service';
import {createMockSupabaseClient} from '@/test/test-utils';

describe('ImageStorageService', () => {
  let service: ImageStorageService;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    service = new ImageStorageService(mockSupabase as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadBase64Image', () => {
    const validPngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const validJpegBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAr/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwC/AB//2Q==';
    const userId = 'user-123-uuid';
    const photoId = 'photo-456-uuid';

    it('should convert base64 PNG to binary and upload to storage', async () => {
      // Arrange
      const options: ImageUploadOptions = {
        base64Data: validPngBase64,
        userId,
        photoId,
        bucket: 'render-results'
      };

      mockSupabase.storage.from().upload.mockResolvedValue({
        data: { path: `${userId}/${photoId}/render-123.png` },
        error: null
      });

      mockSupabase.storage.from().getPublicUrl.mockReturnValue({
        data: { publicUrl: `https://test.supabase.co/storage/v1/object/public/render-results/${userId}/${photoId}/render-123.png` }
      });

      // Act
      const result = await service.uploadBase64Image(options);

      // Assert
      expect(result.success).toBe(true);
      expect(result.publicUrl).toContain('https://');
      expect(result.publicUrl).toContain('render-results');
      expect(result.publicUrl).not.toContain('data:image');
      expect(result.storagePath).toContain(userId);
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('render-results');
    });

    it('should convert base64 JPEG to binary and upload to storage', async () => {
      // Arrange
      const options: ImageUploadOptions = {
        base64Data: validJpegBase64,
        userId,
        photoId,
        bucket: 'render-results'
      };

      mockSupabase.storage.from().upload.mockResolvedValue({
        data: { path: `${userId}/${photoId}/render-123.jpg` },
        error: null
      });

      mockSupabase.storage.from().getPublicUrl.mockReturnValue({
        data: { publicUrl: `https://test.supabase.co/storage/v1/object/public/render-results/${userId}/${photoId}/render-123.jpg` }
      });

      // Act
      const result = await service.uploadBase64Image(options);

      // Assert
      expect(result.success).toBe(true);
      expect(result.mimeType).toBe('image/jpeg');
    });

    it('should generate unique file paths with timestamp and random suffix', async () => {
      // Arrange
      const options: ImageUploadOptions = {
        base64Data: validPngBase64,
        userId,
        photoId,
        bucket: 'render-results'
      };

      let capturedPath = '';
      mockSupabase.storage.from().upload.mockImplementation((path: string) => {
        capturedPath = path;
        return Promise.resolve({ data: { path }, error: null });
      });

      mockSupabase.storage.from().getPublicUrl.mockReturnValue({
        data: { publicUrl: `https://test.supabase.co/${capturedPath}` }
      });

      // Act
      await service.uploadBase64Image(options);

      // Assert
      expect(capturedPath).toMatch(new RegExp(`^${userId}/${photoId}/render-\\d+-[a-z0-9]+\\.png$`));
    });

    it('should isolate files by user ID in storage path', async () => {
      // Arrange
      const user1Options: ImageUploadOptions = {
        base64Data: validPngBase64,
        userId: 'user-AAA',
        photoId,
        bucket: 'render-results'
      };

      const user2Options: ImageUploadOptions = {
        base64Data: validPngBase64,
        userId: 'user-BBB',
        photoId,
        bucket: 'render-results'
      };

      const capturedPaths: string[] = [];
      mockSupabase.storage.from().upload.mockImplementation((path: string) => {
        capturedPaths.push(path);
        return Promise.resolve({ data: { path }, error: null });
      });

      mockSupabase.storage.from().getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://test.supabase.co/file.png' }
      });

      // Act
      await service.uploadBase64Image(user1Options);
      await service.uploadBase64Image(user2Options);

      // Assert
      expect(capturedPaths[0]).toContain('user-AAA');
      expect(capturedPaths[1]).toContain('user-BBB');
      expect(capturedPaths[0]).not.toEqual(capturedPaths[1]);
    });

    it('should throw InvalidImageFormatError for invalid base64 format', async () => {
      // Arrange
      const invalidBase64 = 'not-a-valid-base64-image';
      const options: ImageUploadOptions = {
        base64Data: invalidBase64,
        userId,
        photoId,
        bucket: 'render-results'
      };

      // Act & Assert
      await expect(service.uploadBase64Image(options))
        .rejects
        .toThrow(InvalidImageFormatError);
    });

    it('should throw InvalidImageFormatError for unsupported mime type', async () => {
      // Arrange
      const svgBase64 = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==';
      const options: ImageUploadOptions = {
        base64Data: svgBase64,
        userId,
        photoId,
        bucket: 'render-results'
      };

      // Act & Assert
      await expect(service.uploadBase64Image(options))
        .rejects
        .toThrow(InvalidImageFormatError);
    });

    it('should throw ImageUploadError when storage upload fails', async () => {
      // Arrange
      const options: ImageUploadOptions = {
        base64Data: validPngBase64,
        userId,
        photoId,
        bucket: 'render-results'
      };

      mockSupabase.storage.from().upload.mockResolvedValue({
        data: null,
        error: { message: 'Storage error', statusCode: '500' }
      });

      // Act & Assert
      await expect(service.uploadBase64Image(options))
        .rejects
        .toThrow(ImageUploadError);
    });

    it('should throw StorageQuotaExceededError when storage is full', async () => {
      // Arrange
      const options: ImageUploadOptions = {
        base64Data: validPngBase64,
        userId,
        photoId,
        bucket: 'render-results'
      };

      mockSupabase.storage.from().upload.mockResolvedValue({
        data: null,
        error: { message: 'Quota exceeded', statusCode: '413' }
      });

      // Act & Assert
      await expect(service.uploadBase64Image(options))
        .rejects
        .toThrow(StorageQuotaExceededError);
    });

    it('should return file size in bytes after successful upload', async () => {
      // Arrange
      const options: ImageUploadOptions = {
        base64Data: validPngBase64,
        userId,
        photoId,
        bucket: 'render-results'
      };

      mockSupabase.storage.from().upload.mockResolvedValue({
        data: { path: 'test.png' },
        error: null
      });

      mockSupabase.storage.from().getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://test.supabase.co/test.png' }
      });

      // Act
      const result = await service.uploadBase64Image(options);

      // Assert
      expect(result.fileSizeBytes).toBeGreaterThan(0);
      expect(typeof result.fileSizeBytes).toBe('number');
    });
  });

  describe('parseBase64DataUrl', () => {
    it('should correctly parse PNG data URL', () => {
      // Arrange
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAAN==';

      // Act
      const result = service.parseBase64DataUrl(dataUrl);

      // Assert
      expect(result.mimeType).toBe('image/png');
      expect(result.extension).toBe('png');
      expect(result.base64Data).toBe('iVBORw0KGgoAAAAN==');
    });

    it('should correctly parse JPEG data URL', () => {
      // Arrange
      const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJR==';

      // Act
      const result = service.parseBase64DataUrl(dataUrl);

      // Assert
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.extension).toBe('jpg');
      expect(result.base64Data).toBe('/9j/4AAQSkZJR==');
    });

    it('should throw for malformed data URL', () => {
      // Arrange
      const invalidDataUrl = 'not-a-data-url';

      // Act & Assert
      expect(() => service.parseBase64DataUrl(invalidDataUrl))
        .toThrow(InvalidImageFormatError);
    });

    it('should throw for data URL without base64 encoding', () => {
      // Arrange
      const noBase64 = 'data:image/png,rawdata';

      // Act & Assert
      expect(() => service.parseBase64DataUrl(noBase64))
        .toThrow(InvalidImageFormatError);
    });
  });

  describe('base64ToBlob', () => {
    it('should convert base64 string to Blob with correct type', () => {
      // Arrange
      const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const mimeType = 'image/png';

      // Act
      const blob = service.base64ToBlob(base64, mimeType);

      // Assert
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe(mimeType);
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should produce correct binary data from base64', () => {
      // Arrange - This is a 1x1 red pixel PNG
      const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
      const mimeType = 'image/png';

      // Act
      const blob = service.base64ToBlob(base64, mimeType);

      // Assert
      expect(blob.size).toBe(70); // Known size for this specific PNG
    });
  });

  describe('generateStoragePath', () => {
    it('should include user ID, photo ID, timestamp and random suffix', () => {
      // Arrange
      const userId = 'user-123';
      const photoId = 'photo-456';
      const extension = 'png';

      // Act
      const path = service.generateStoragePath(userId, photoId, extension);

      // Assert
      expect(path).toMatch(/^user-123\/photo-456\/render-\d+-[a-z0-9]+\.png$/);
    });

    it('should generate unique paths on consecutive calls', () => {
      // Arrange
      const userId = 'user-123';
      const photoId = 'photo-456';
      const extension = 'png';

      // Act
      const path1 = service.generateStoragePath(userId, photoId, extension);
      const path2 = service.generateStoragePath(userId, photoId, extension);

      // Assert
      expect(path1).not.toBe(path2);
    });
  });

  describe('validateImageFormat', () => {
    it('should accept image/png', () => {
      expect(() => service.validateImageFormat('image/png')).not.toThrow();
    });

    it('should accept image/jpeg', () => {
      expect(() => service.validateImageFormat('image/jpeg')).not.toThrow();
    });

    it('should accept image/jpg as alias for jpeg', () => {
      expect(() => service.validateImageFormat('image/jpg')).not.toThrow();
    });

    it('should accept image/webp', () => {
      expect(() => service.validateImageFormat('image/webp')).not.toThrow();
    });

    it('should reject image/svg+xml', () => {
      expect(() => service.validateImageFormat('image/svg+xml'))
        .toThrow(InvalidImageFormatError);
    });

    it('should reject image/gif', () => {
      expect(() => service.validateImageFormat('image/gif'))
        .toThrow(InvalidImageFormatError);
    });

    it('should reject non-image mime types', () => {
      expect(() => service.validateImageFormat('application/pdf'))
        .toThrow(InvalidImageFormatError);
    });
  });

  describe('deleteImage', () => {
    it('should delete image from storage by path', async () => {
      // Arrange
      const storagePath = 'user-123/photo-456/render-789.png';
      mockSupabase.storage.from().remove = vi.fn().mockResolvedValue({
        data: [{ name: storagePath }],
        error: null
      });

      // Act
      const result = await service.deleteImage(storagePath, 'render-results');

      // Assert
      expect(result.success).toBe(true);
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('render-results');
    });

    it('should handle deletion errors gracefully', async () => {
      // Arrange
      const storagePath = 'nonexistent/path.png';
      mockSupabase.storage.from().remove = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Object not found' }
      });

      // Act
      const result = await service.deleteImage(storagePath, 'render-results');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('migrateBase64ToStorage', () => {
    it('should migrate existing base64 render result to storage', async () => {
      // Arrange
      const renderResult = {
        id: 'render-123',
        project_photo_id: 'photo-456',
        result_image_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      };
      const userId = 'user-123';

      mockSupabase.storage.from().upload.mockResolvedValue({
        data: { path: 'user-123/photo-456/render-123.png' },
        error: null
      });

      mockSupabase.storage.from().getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://test.supabase.co/storage/render.png' }
      });

      mockSupabase.from().update.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null })
      });

      // Act
      const result = await service.migrateBase64ToStorage(renderResult, userId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.newUrl).toContain('https://');
      expect(result.newUrl).not.toContain('data:image');
    });

    it('should skip already migrated results (non-base64 URLs)', async () => {
      // Arrange
      const renderResult = {
        id: 'render-123',
        project_photo_id: 'photo-456',
        result_image_url: 'https://already-migrated.supabase.co/storage/render.png'
      };
      const userId = 'user-123';

      // Act
      const result = await service.migrateBase64ToStorage(renderResult, userId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.newUrl).toBe(renderResult.result_image_url);
    });
  });
});

describe('ImageStorageService - Integration with Edge Function', () => {
  it('should provide correct interface for apply-decor function', () => {
    // This test documents the expected interface
    const expectedInterface = {
      uploadBase64Image: expect.any(Function),
      parseBase64DataUrl: expect.any(Function),
      base64ToBlob: expect.any(Function),
      generateStoragePath: expect.any(Function),
      validateImageFormat: expect.any(Function),
      deleteImage: expect.any(Function),
      migrateBase64ToStorage: expect.any(Function),
    };

    const mockSupabase = createMockSupabaseClient();
    const service = new ImageStorageService(mockSupabase as any);

    expect(service).toMatchObject(expectedInterface);
  });
});

