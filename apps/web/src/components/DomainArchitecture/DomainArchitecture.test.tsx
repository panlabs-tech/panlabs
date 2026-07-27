import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DomainArchitecture } from "./DomainArchitecture";

describe("DomainArchitecture", () => {
  it("titles the single-domain architecture section", () => {
    render(<DomainArchitecture />);
    expect(screen.getByRole("heading", { name: "domínio único" })).toBeInTheDocument();
  });

  it("names the three pillars of the method", () => {
    render(<DomainArchitecture />);
    expect(screen.getByText("desenvolvimento padronizado")).toBeInTheDocument();
    expect(screen.getByText("soluções agênticas")).toBeInTheDocument();
    expect(screen.getByText("harness garantido")).toBeInTheDocument();
  });

  it("plugs everything into the one domain", () => {
    render(<DomainArchitecture />);
    expect(screen.getByText("panlabs.tech")).toBeInTheDocument();
  });
});
