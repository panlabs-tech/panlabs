import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Reveal } from "./Reveal";

describe("Reveal", () => {
  it("renders its children", () => {
    render(
      <Reveal>
        <p>conteúdo revelado</p>
      </Reveal>,
    );
    expect(screen.getByText("conteúdo revelado")).toBeInTheDocument();
  });

  it("falls back to shown when IntersectionObserver is unavailable (jsdom)", () => {
    // jsdom ships no IntersectionObserver, so the hook reveals on mount — the
    // safety net that keeps content from being trapped hidden without JS.
    render(
      <Reveal>
        <span>x</span>
      </Reveal>,
    );
    expect(screen.getByText("x").parentElement).toHaveAttribute("data-shown", "true");
  });

  it("composes a caller className onto the motion wrapper", () => {
    render(
      <Reveal className="layout-class">
        <span>y</span>
      </Reveal>,
    );
    expect(screen.getByText("y").parentElement).toHaveClass("layout-class");
  });
});
