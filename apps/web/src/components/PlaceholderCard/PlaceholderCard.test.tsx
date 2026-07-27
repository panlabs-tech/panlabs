import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlaceholderCard } from "./PlaceholderCard";

describe("PlaceholderCard", () => {
  it("renders the 'next experiment' draft slot", () => {
    render(<PlaceholderCard />);
    expect(
      screen.getByRole("article", { name: "Próximo experimento a caminho" }),
    ).toBeInTheDocument();
    expect(screen.getByText("em breve")).toBeInTheDocument();
    expect(screen.getByText(/incubando o próximo experimento/)).toBeInTheDocument();
  });

  it("exposes no link, stats, or sparkline (inert placeholder)", () => {
    const { container } = render(<PlaceholderCard />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(container.querySelector("polyline")).not.toBeInTheDocument();
  });
});
