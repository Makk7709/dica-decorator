import { describe, it, expect } from "vitest";
import { sanitizeMessages, deriveTitle, type ChatMessage } from "../use-creative-conversation";
import { formatRelativeDate } from "@/components/creative/ConversationHistory";

describe("sanitizeMessages", () => {
  it("drops inline data URLs but keeps storage URLs", () => {
    const messages: ChatMessage[] = [
      {
        role: "user",
        content: "Salle de bain",
        sourceImageUrls: ["data:image/png;base64,AAAA", "https://x.supabase.co/storage/v1/object/public/project-photos/u/a.jpg"],
      },
      { role: "assistant", content: "Voici", imageUrl: "data:image/png;base64,BBBB" },
      { role: "assistant", content: "Voilà", imageUrl: "https://x.supabase.co/storage/v1/object/public/project-photos/u/b.png" },
    ];

    const [user, inline, stored] = sanitizeMessages(messages);

    expect(user.sourceImageUrls).toEqual(["https://x.supabase.co/storage/v1/object/public/project-photos/u/a.jpg"]);
    expect(inline.imageUrl).toBeUndefined();
    expect(inline.content).toBe("Voici");
    expect(stored.imageUrl).toContain("/project-photos/u/b.png");
  });

  it("keeps only the most recent messages and truncates huge contents", () => {
    const many: ChatMessage[] = Array.from({ length: 250 }, (_, i) => ({ role: "user", content: `m${i}` }));
    const result = sanitizeMessages(many);
    expect(result).toHaveLength(200);
    expect(result[0].content).toBe("m50");

    const [long] = sanitizeMessages([{ role: "assistant", content: "x".repeat(30_000) }]);
    expect(long.content.length).toBe(20_000);
  });

  it("strips unknown fields from decor references", () => {
    const [m] = sanitizeMessages([
      {
        role: "assistant",
        content: "ok",
        decorReferences: [{ reference: "H1180", label: "Chêne", extra: 1 } as never],
      },
    ]);
    expect(m.decorReferences).toEqual([{ reference: "H1180", label: "Chêne" }]);
  });
});

describe("deriveTitle", () => {
  it("uses the first user message without voice prefixes", () => {
    expect(
      deriveTitle([
        { role: "assistant", content: "Bonjour" },
        { role: "user", content: "🎤 Composition : cabine d'ascenseur chêne clair" },
      ]),
    ).toBe("cabine d'ascenseur chêne clair");
  });

  it("falls back to a default title and truncates long prompts", () => {
    expect(deriveTitle([])).toBe("Nouvelle conversation");
    const title = deriveTitle([{ role: "user", content: "a".repeat(100) }]);
    expect(title.length).toBeLessThanOrEqual(58);
    expect(title.endsWith("…")).toBe(true);
  });
});

describe("formatRelativeDate", () => {
  const now = new Date("2026-09-28T15:00:00");

  it("formats recent dates relatively", () => {
    expect(formatRelativeDate("2026-09-28T14:59:40", now)).toBe("à l'instant");
    expect(formatRelativeDate("2026-09-28T14:20:00", now)).toBe("il y a 40 min");
    expect(formatRelativeDate("2026-09-27T10:00:00", now)).toBe("hier");
  });
});
