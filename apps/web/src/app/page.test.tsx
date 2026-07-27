import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "./page";

describe("Home page (scaffold)", () => {
  // Catalog streams behind <Suspense> and pulls GitHub vitality; stub the
  // network so the header smoke test stays hermetic and offline.
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 404 })),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("renders the panlabs wordmark in the header", () => {
    render(<Home />);
    expect(screen.getByText("panlabs")).toBeInTheDocument();
  });
});
