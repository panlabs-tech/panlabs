import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ethitorial } from "@/data/solutions";
import { SolutionCard } from "./SolutionCard";

describe("SolutionCard", () => {
  it("renders the solution as an article titled by its name", () => {
    render(<SolutionCard solution={ethitorial} />);
    const card = screen.getByRole("article");
    expect(within(card).getByRole("heading", { name: "ethitorial" })).toBeInTheDocument();
  });

  it("shows the tagline, description, and status", () => {
    render(<SolutionCard solution={ethitorial} />);
    expect(screen.getByText("Hub pessoal de aprendizado")).toBeInTheDocument();
    expect(screen.getByText(/Blog, cursos, livros/)).toBeInTheDocument();
    expect(screen.getByText("live")).toBeInTheDocument();
  });

  it("lists the tech stack labels", () => {
    render(<SolutionCard solution={ethitorial} />);
    expect(screen.getByText("Next.js")).toBeInTheDocument();
    expect(screen.getByText("Postgres")).toBeInTheDocument();
    expect(screen.getByText("TS")).toBeInTheDocument();
  });

  it("shows repository stats", () => {
    render(<SolutionCard solution={ethitorial} />);
    expect(screen.getByText("248")).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
  });

  it("routes its CTA through the tracked redirect, opening safely in a new tab", () => {
    render(<SolutionCard solution={ethitorial} />);
    const cta = screen.getByRole("link", { name: /touch ethitorial/ });
    // the CTA points at /go/[slug] (the app's only write path), not the raw url
    expect(cta).toHaveAttribute("href", "/go/ethitorial");
    expect(cta).toHaveAttribute("target", "_blank");
    expect(cta.getAttribute("rel")).toContain("noopener");
  });

  it("renders the activity sparkline", () => {
    const { container } = render(<SolutionCard solution={ethitorial} />);
    expect(container.querySelector("polyline")).toBeInTheDocument();
  });

  it("hides decorative graphics from assistive tech", () => {
    render(<SolutionCard solution={ethitorial} />);
    // the sparkline and icons are decorative; the numbers already convey the data
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders tech and github icons locally, with no external icon request (#15)", () => {
    const { container } = render(<SolutionCard solution={ethitorial} />);
    // no <img> pointing at the Simple Icons CDN
    expect(container.querySelector('img[src*="simpleicons"]')).toBeNull();
    // tech chips render inline svg paths instead
    const chipIcons = container.querySelectorAll(`.${"chip"} svg, [class*='chip'] svg`);
    expect(chipIcons.length).toBeGreaterThanOrEqual(ethitorial.tech.length);
  });
});
