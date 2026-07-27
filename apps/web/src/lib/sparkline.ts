export interface SparklineOptions {
  /** viewBox width */
  w?: number;
  /** viewBox height */
  h?: number;
  /** vertical padding kept clear of the top/bottom edges */
  pad?: number;
}

export interface Sparkline {
  /** points for the trend `<polyline>` */
  line: string;
  /** points for the filled `<polygon>`, closed along the baseline */
  area: string;
}

/**
 * Turn a numeric series into SVG point strings for a sparkline.
 *
 * The series is scaled so its maximum touches the top padding and zero rests on
 * the baseline (`h - pad`). An empty/all-zero series degrades gracefully: the
 * divisor is clamped to 1 so no point is ever `NaN`.
 */
export function sparkline(values: number[], options: SparklineOptions = {}): Sparkline {
  const { w = 120, h = 30, pad = 2.5 } = options;
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  const baseline = h - pad;
  const span = h - pad * 2;

  const line = values
    .map((value, i) => {
      const x = +(i * step).toFixed(1);
      const y = +(baseline - (value / max) * span).toFixed(1);
      return `${x},${y}`;
    })
    .join(" ");

  const area = `0,${baseline} ${line} ${w},${baseline}`;

  return { line, area };
}
