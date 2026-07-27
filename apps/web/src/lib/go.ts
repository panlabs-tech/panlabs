import { solutions } from "@/data/solutions";

/**
 * Tracked-redirect logic for `/go/[slug]` (#11). The redirect is the app's
 * single write path (ADR-0001/0012): a click is recorded, then the visitor is
 * sent on to the product. Recording must never block or break the redirect.
 */

/** The product url a slug points at, or undefined when no solution matches. */
export function targetForSlug(slug: string): string | undefined {
  return solutions.find((s) => s.slug === slug)?.url;
}

export interface GoDeps {
  /** slug → target url (undefined ⇒ unknown) */
  resolve: (slug: string) => string | undefined;
  /** persist one click for the slug */
  record: (slug: string) => Promise<void>;
}

export async function handleGo(slug: string, deps: GoDeps): Promise<Response> {
  const target = deps.resolve(slug);
  if (!target) {
    return new Response("Not Found", { status: 404 });
  }

  try {
    await deps.record(slug);
  } catch {
    // A tracking failure must not deny the visitor the product.
  }

  return new Response(null, { status: 302, headers: { Location: target } });
}
