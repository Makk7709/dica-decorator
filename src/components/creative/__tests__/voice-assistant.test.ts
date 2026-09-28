import { describe, it, expect } from "vitest";
import { resolveReferences } from "../VoiceAssistant";
import type { Decor } from "@/hooks/use-decors";

const decor = (reference_code: string, name: string): Decor => ({
  id: reference_code,
  name,
  reference_code,
  texture_image_url: `/decor-textures/${reference_code}.jpg`,
  usage_contexts: [],
  category: "Bois",
  is_active: true,
});

const catalog = [decor("3040 BN FC", "Chêne clair"), decor("M-102", "Marbre blanc"), decor("U-10", "Blanc")];

describe("resolveReferences", () => {
  it("matches references regardless of case, spaces and punctuation", () => {
    const { found, unknown } = resolveReferences(catalog, ["3040bnfc", "m 102"]);
    expect(found.map((d) => d.reference_code)).toEqual(["3040 BN FC", "M-102"]);
    expect(unknown).toEqual([]);
  });

  it("reports references that are not in the catalog", () => {
    const { found, unknown } = resolveReferences(catalog, ["U-10", "FAKE-999"]);
    expect(found.map((d) => d.reference_code)).toEqual(["U-10"]);
    expect(unknown).toEqual(["FAKE-999"]);
  });

  it("deduplicates and caps at four decors", () => {
    const many = [...catalog, decor("A1", "A"), decor("B2", "B")];
    const { found } = resolveReferences(many, ["U-10", "u10", "M-102", "A1", "B2", "3040 BN FC"]);
    expect(found).toHaveLength(4);
    expect(new Set(found).size).toBe(4);
  });

  it("ignores malformed input", () => {
    expect(resolveReferences(catalog, "U-10").found).toEqual([]);
    expect(resolveReferences(catalog, [42, null, ""]).found).toEqual([]);
  });
});
