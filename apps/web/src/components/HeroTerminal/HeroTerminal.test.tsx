import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HeroTerminal } from "./HeroTerminal";

describe("HeroTerminal", () => {
  it("renders the h1 with the ls ./panlabs command as its accessible name", () => {
    render(<HeroTerminal />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveAccessibleName(/ls \.\/panlabs/);
  });

  it("renders the terminal prompt identity", () => {
    render(<HeroTerminal />);
    expect(screen.getByText("panini@panlabs")).toBeInTheDocument();
  });

  it("renders the pt-BR lede", () => {
    render(<HeroTerminal />);
    expect(screen.getByText(/Laboratório vivo de soluções/)).toBeInTheDocument();
  });
});
