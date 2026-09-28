import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary, isChunkLoadError } from "../ErrorBoundary";

const Boom = () => {
  throw new Error("kaboom");
};

describe("ErrorBoundary", () => {
  it("renders a fallback instead of a blank page", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Une erreur inattendue est survenue");
    expect(screen.getByRole("button", { name: "Recharger" })).toBeInTheDocument();
  });

  it("detects stale lazy chunks", () => {
    expect(isChunkLoadError(new TypeError("Failed to fetch dynamically imported module: /assets/x.js"))).toBe(true);
    expect(isChunkLoadError(new Error("kaboom"))).toBe(false);
  });
});
