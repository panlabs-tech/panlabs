import { describe, expect, it } from "vitest";
import { getIcon } from "./icons";

describe("getIcon", () => {
  it("returns a local path definition for a known tech slug", () => {
    const icon = getIcon("nextdotjs");
    expect(icon).toBeDefined();
    expect(icon?.title).toBe("Next.js");
    expect(icon?.path.startsWith("M")).toBe(true);
  });

  it("returns the github mark", () => {
    expect(getIcon("github")?.title).toBe("GitHub");
  });

  it("returns undefined for an unknown slug (no external fallback)", () => {
    expect(getIcon("not-a-real-icon")).toBeUndefined();
  });
});
