import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Catalog } from "./Catalog";

/** Route the global fetch by URL suffix so Catalog's vitality pull is hermetic. */
function stubFetch(routes: Record<string, { status?: number; body: unknown }>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL | Request) => {
      const href = String(url);
      const key = Object.keys(routes).find((k) => href.endsWith(k));
      if (!key) return new Response("{}", { status: 404 });
      const { status = 200, body } = routes[key];
      return new Response(JSON.stringify(body), { status });
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("Catalog", () => {
  // Default: GitHub unavailable → curated values render (card never breaks).
  beforeEach(() => stubFetch({}));

  it("shows section meta with the live count", async () => {
    render(await Catalog());
    expect(screen.getByText(/\/\/ 3 soluções no ar/)).toBeInTheDocument();
  });

  it("renders the three real solutions plus the placeholder", async () => {
    render(await Catalog());
    expect(screen.getAllByRole("article")).toHaveLength(4);
    expect(screen.getByRole("heading", { name: "ethitorial" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "travelmanager" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "LUC (life under control)" })).toBeInTheDocument();
    expect(
      screen.getByRole("article", { name: "Próximo experimento a caminho" }),
    ).toBeInTheDocument();
  });

  it("links real solutions directly and safely", async () => {
    render(await Catalog());
    const cta = screen.getByRole("link", { name: /touch travelmanager/ });
    expect(cta).toHaveAttribute("href", "/go/travelmanager");
    expect(cta.getAttribute("rel")).toContain("noopener");
  });

  it("shows live GitHub stars on the ethitorial card (#12 tracer)", async () => {
    stubFetch({
      "/repos/ThiagoPanini/ethitorial": { body: { stargazers_count: 99 } },
      "/stats/commit_activity": { body: Array.from({ length: 52 }, (_, i) => ({ total: i })) },
    });
    render(await Catalog());
    expect(screen.getByText("99")).toBeInTheDocument();
  });
});
