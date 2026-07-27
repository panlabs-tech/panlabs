import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Header } from "./Header";

describe("Header", () => {
  it("renders as a banner landmark", () => {
    render(<Header />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("shows the panlabs wordmark and the catálogo meta", () => {
    render(<Header />);
    expect(screen.getByText("panlabs")).toBeInTheDocument();
    expect(screen.getByText("/ catálogo")).toBeInTheDocument();
  });

  it("shows the logo with an accessible name", () => {
    render(<Header />);
    expect(screen.getByRole("img", { name: "panlabs" })).toBeInTheDocument();
  });

  it("shows the build * automate * innovate tagline", () => {
    render(<Header />);
    expect(screen.getByText(/build/)).toBeInTheDocument();
    expect(screen.getByText(/automate/)).toBeInTheDocument();
    expect(screen.getByText(/innovate/)).toBeInTheDocument();
  });
});
