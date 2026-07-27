import Image from "next/image";

interface LogoProps {
  /** rendered size in px (square); defaults to the header mark size */
  size?: number;
  className?: string;
  /** above-the-fold marks load eagerly; below-the-fold ones pass `false` */
  priority?: boolean;
  /** decorative placements pass "" (the brand is already named nearby) */
  alt?: string;
}

/**
 * panlabs brand logo. Renders the canonical apple-touch-icon raster (the same
 * mark used as the home-screen/app icon) so the brand carries the real face
 * instead of a generic terminal glyph. The header instance is above-the-fold
 * (`priority`); the camadas reuse it lower down with `priority={false}`. The
 * surrounding CSS clips it to a circle (Chosen). A canonical SVG brand mark is
 * still pending — open asset task (see docs/design).
 */
export function Logo({ size = 30, className, priority = true, alt = "panlabs" }: LogoProps) {
  return (
    <Image
      src="/assets/apple-touch-icon.png"
      alt={alt}
      width={size}
      height={size}
      className={className}
      priority={priority}
    />
  );
}
