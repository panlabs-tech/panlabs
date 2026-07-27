import { describe, expect, it, vi } from "vitest";
import { handleGo, targetForSlug } from "./go";

describe("targetForSlug", () => {
  it("resolves a known solution slug to its product url", () => {
    expect(targetForSlug("ethitorial")).toBe("https://ethitorial.panlabs.tech");
  });

  it("returns undefined for an unknown slug", () => {
    expect(targetForSlug("not-a-solution")).toBeUndefined();
  });
});

describe("handleGo", () => {
  const target = "https://ethitorial.panlabs.tech";

  it("302-redirects a known slug to its target and records the click", async () => {
    const record = vi.fn(async () => {});
    const res = await handleGo("ethitorial", { resolve: () => target, record });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(target);
    expect(record).toHaveBeenCalledWith("ethitorial");
  });

  it("404s an unknown slug and does NOT record anything", async () => {
    const record = vi.fn(async () => {});
    const res = await handleGo("nope", { resolve: () => undefined, record });
    expect(res.status).toBe(404);
    expect(record).not.toHaveBeenCalled();
  });

  it("still redirects when recording fails (tracking never blocks the user)", async () => {
    const record = vi.fn(async () => {
      throw new Error("db down");
    });
    const res = await handleGo("ethitorial", { resolve: () => target, record });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(target);
  });
});
