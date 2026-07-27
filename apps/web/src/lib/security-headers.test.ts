import { describe, expect, it } from "vitest";
import { securityHeaders, securityHeadersConfig } from "./security-headers";

function headerValue(key: string): string | undefined {
  return securityHeaders.find((h) => h.key.toLowerCase() === key.toLowerCase())?.value;
}

describe("securityHeaders", () => {
  it("forces HTTPS for two years across subdomains via HSTS", () => {
    const hsts = headerValue("Strict-Transport-Security");
    expect(hsts).toContain("max-age=63072000");
    expect(hsts).toContain("includeSubDomains");
  });

  it("does not commit to the HSTS preload list (kept as a deliberate opt-in)", () => {
    expect(headerValue("Strict-Transport-Security")).not.toContain("preload");
  });

  it("forbids being framed to block clickjacking", () => {
    expect(headerValue("X-Frame-Options")).toBe("DENY");
  });

  it("disables MIME-type sniffing", () => {
    expect(headerValue("X-Content-Type-Options")).toBe("nosniff");
  });

  it("limits referrer leakage to the origin on cross-site navigation", () => {
    expect(headerValue("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  it("denies powerful browser features the site never uses", () => {
    const policy = headerValue("Permissions-Policy");
    expect(policy).toContain("camera=()");
    expect(policy).toContain("microphone=()");
    expect(policy).toContain("geolocation=()");
  });

  it("locks content sources to same-origin via CSP", () => {
    const csp = headerValue("Content-Security-Policy");
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("base-uri 'self'");
  });

  it("blocks plugins and framing through CSP", () => {
    const csp = headerValue("Content-Security-Policy");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("upgrades any insecure subresource request to HTTPS via CSP", () => {
    expect(headerValue("Content-Security-Policy")).toContain("upgrade-insecure-requests");
  });

  it("applies every security header to all routes", () => {
    const config = securityHeadersConfig();
    expect(config).toHaveLength(1);
    expect(config[0].source).toBe("/:path*");
    expect(config[0].headers).toBe(securityHeaders);
  });
});
