import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Prompt } from "./Prompt";

describe("Prompt", () => {
  it("renders the panlabs terminal signature with command and argument", () => {
    render(<Prompt command="cat" arg="manifesto.txt" />);
    expect(screen.getByText("panini@panlabs")).toBeInTheDocument();
    expect(screen.getByText("manifesto.txt")).toBeInTheDocument();
  });
});
