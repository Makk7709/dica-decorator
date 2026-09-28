import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useWhatsNew, WHATS_NEW_VERSION } from "../WhatsNewDialog";

describe("useWhatsNew", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("shows the dialog until the current version is marked as seen", () => {
    const { result } = renderHook(() => useWhatsNew());
    expect(result.current.showWhatsNew).toBe(true);

    act(() => result.current.markWhatsNewSeen());

    expect(result.current.showWhatsNew).toBe(false);
    expect(localStorage.getItem("dica-whats-new")).toBe(WHATS_NEW_VERSION);
    expect(renderHook(() => useWhatsNew()).result.current.showWhatsNew).toBe(false);
  });

  it("shows again when a previous version was seen", () => {
    localStorage.setItem("dica-whats-new", "older-version");
    expect(renderHook(() => useWhatsNew()).result.current.showWhatsNew).toBe(true);
  });
});
