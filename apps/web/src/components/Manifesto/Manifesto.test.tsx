import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Manifesto } from "./Manifesto";

describe("Manifesto", () => {
  it("opens on the manifesto prompt", () => {
    render(<Manifesto />);
    expect(screen.getByText("manifesto.txt")).toBeInTheDocument();
  });

  it("carries the brand mark as a real logo moment", () => {
    render(<Manifesto />);
    expect(screen.getByRole("img", { name: "panlabs" })).toBeInTheDocument();
  });

  it("states the lab tenets verbatim", () => {
    render(<Manifesto />);
    expect(screen.getByText("laboratório vivo")).toBeInTheDocument();
    expect(screen.getByText("catálogo de soluções")).toBeInTheDocument();
    expect(screen.getByText("trabalho assistido por AI")).toBeInTheDocument();
  });
});
