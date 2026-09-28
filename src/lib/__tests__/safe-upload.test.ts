import { describe, expect, it } from "vitest";
import { isSupportedImage, safeImageFileName, UploadValidationError } from "../safe-upload";

const file = (type: string, size = 10, name = "photo.php.jpg") =>
  new File([new Uint8Array(size)], name, { type });

describe("safeImageFileName", () => {
  it("derives the extension from the MIME type, not the file name", () => {
    expect(safeImageFileName(file("image/png"))).toMatch(/^[0-9a-f-]{36}\.png$/);
  });

  it("returns a different name on each call", () => {
    expect(safeImageFileName(file("image/jpeg"))).not.toBe(safeImageFileName(file("image/jpeg")));
  });

  it("rejects unsupported types", () => {
    expect(() => safeImageFileName(file("image/svg+xml"))).toThrow(UploadValidationError);
    expect(() => safeImageFileName(file("text/html"))).toThrow(UploadValidationError);
  });

  it("rejects files over the size limit", () => {
    expect(() => safeImageFileName(file("image/webp", 2048), 1024)).toThrow(/dépasse/);
  });
});

describe("isSupportedImage", () => {
  it("accepts raster images only", () => {
    expect(isSupportedImage(file("image/jpeg"))).toBe(true);
    expect(isSupportedImage(file("image/svg+xml"))).toBe(false);
  });
});
