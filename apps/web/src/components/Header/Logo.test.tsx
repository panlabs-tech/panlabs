import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Logo } from "./Logo";

describe("Logo", () => {
  it("renders the brand logo image with an accessible name", () => {
    render(<Logo />);
    const mark = screen.getByRole("img", { name: "panlabs" });
    expect(mark.tagName.toLowerCase()).toBe("img");
    // the canonical apple-touch-icon raster, not a generic glyph
    expect(mark).toHaveAttribute("src");
  });

  it("forwards a className so the header can size and place it", () => {
    const { container } = render(<Logo className="x" />);
    expect(container.querySelector("img.x")).toBeInTheDocument();
  });
});
