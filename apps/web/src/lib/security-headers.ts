export interface HttpHeader {
  key: string;
  value: string;
}

// Content-Security-Policy. `script-src`/`style-src` keep `'unsafe-inline'`
// because Next.js injects inline hydration scripts and styles without a nonce;
// for a read-only vitrine with no user input the residual XSS surface is
// negligible. Tighten to a nonce-based policy if dynamic/user content lands.
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "font-src 'self' data:",
  "img-src 'self' data:",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const permissionsPolicy = [
  "camera=()",
  "microphone=()",
  "geolocation=()",
  "payment=()",
  "usb=()",
  "magnetometer=()",
  "gyroscope=()",
  "accelerometer=()",
  "interest-cohort=()",
].join(", ");

export const securityHeaders: HttpHeader[] = [
  // 2y HSTS across subdomains. `preload` is intentionally omitted: it is a
  // near-irreversible commitment (removal from the browser preload list takes
  // months), so it stays a deliberate manual opt-in.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: permissionsPolicy },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

export interface HeaderRule {
  source: string;
  headers: HttpHeader[];
}

// Shape consumed by Next's `headers()`: every route gets the full set.
export function securityHeadersConfig(): HeaderRule[] {
  return [{ source: "/:path*", headers: securityHeaders }];
}
