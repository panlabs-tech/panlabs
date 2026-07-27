import { recordClick } from "@/lib/db";
import { handleGo, targetForSlug } from "@/lib/go";

// Needs the Node runtime (pg) and must run per-request — it writes a click and
// must never be cached/prerendered.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  return handleGo(slug, { resolve: targetForSlug, record: recordClick });
}
