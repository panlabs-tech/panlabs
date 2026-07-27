import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Icon } from "./Icon";

describe("Icon", () => {
  it("renders an inline svg with the slug's path (no external request)", () => {
    const { container } = render(<Icon slug="nextdotjs" />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("fill")).toBe("currentColor");
    expect(container.querySelector("path")?.getAttribute("d")?.startsWith("M")).toBe(true);
  });

  it("is decorative (aria-hidden) by default", () => {
    const { container } = render(<Icon slug="github" />);
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders nothing for an unknown slug", () => {
    const { container } = render(<Icon slug="nope" />);
    expect(container.querySelector("svg")).toBeNull();
  });
});
