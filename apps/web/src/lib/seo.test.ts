import { describe, expect, it } from "vitest";
import { siteMetadata } from "./seo";

describe("siteMetadata", () => {
  it("advertises an Open Graph card with title and description", () => {
    expect(siteMetadata.openGraph?.title).toBeTruthy();
    expect(siteMetadata.openGraph?.description).toBeTruthy();
  });

  it("uses a large-image Twitter card", () => {
    const twitter = siteMetadata.twitter as { card?: string };
    expect(twitter.card).toBe("summary_large_image");
  });

  it("sets a metadataBase so social URLs resolve absolutely", () => {
    expect(String(siteMetadata.metadataBase)).toContain("panlabs.tech");
  });

  it("declares favicons in multiple sizes", () => {
    const icons = siteMetadata.icons as { icon: unknown[] };
    expect(Array.isArray(icons.icon)).toBe(true);
    expect(icons.icon.length).toBeGreaterThan(1);
  });
});
