import { describe, expect, it } from "vitest";
import { sparkline } from "./sparkline";

describe("sparkline", () => {
  it("produces one point per data value", () => {
    const { line } = sparkline([1, 2, 3, 4]);
    expect(line.trim().split(" ")).toHaveLength(4);
  });

  it("places the maximum value at the top and the minimum at the bottom", () => {
    const { line } = sparkline([0, 10]);
    const [low, high] = line
      .trim()
      .split(" ")
      .map((p) => p.split(",").map(Number));
    // y grows downward: the min value (0) sits lower (larger y) than the max (10)
    expect(low[1]).toBeGreaterThan(high[1]);
  });

  it("closes the area polygon along the baseline", () => {
    const { area } = sparkline([1, 2, 3], { w: 120, h: 30, pad: 2.5 });
    const pts = area.trim().split(" ");
    expect(pts[0]).toBe("0,27.5");
    expect(pts[pts.length - 1]).toBe("120,27.5");
  });

  it("handles an all-zero series without producing NaN", () => {
    const { line, area } = sparkline([0, 0, 0]);
    expect(line).not.toContain("NaN");
    expect(area).not.toContain("NaN");
  });

  it("spans the full width from x=0 to x=w", () => {
    const { line } = sparkline([3, 1, 4, 1, 5], { w: 120, h: 30, pad: 2.5 });
    const xs = line
      .trim()
      .split(" ")
      .map((p) => Number(p.split(",")[0]));
    expect(xs[0]).toBe(0);
    expect(xs[xs.length - 1]).toBe(120);
  });
});
