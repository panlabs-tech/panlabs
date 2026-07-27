import { getIcon } from "@/lib/icons";

interface IconProps {
  /** Simple Icons slug, resolved against the local icon set */
  slug: string;
  /** square size in px (default 12) */
  size?: number;
  className?: string;
}

/**
 * Inline, self-hosted brand icon. Renders nothing for an unknown slug so a
 * missing icon degrades to no-icon instead of a broken external request (#15).
 * Uses `currentColor`, so the parent's text colour tints it and forced-colors
 * keeps it visible.
 */
export function Icon({ slug, size = 12, className }: IconProps) {
  const def = getIcon(slug);
  if (!def) return null;

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d={def.path} />
    </svg>
  );
}
