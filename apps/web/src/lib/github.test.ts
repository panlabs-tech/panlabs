import { describe, expect, it, vi } from "vitest";
import { ethitorial } from "@/data/solutions";
import { fetchVitality, withVitality } from "./github";

/** Build a fake `fetch` that answers by URL substring. */
function fakeFetch(routes: Record<string, { status?: number; body: unknown }>) {
  return vi.fn(async (url: string | URL | Request) => {
    const href = String(url);
    const key = Object.keys(routes).find((k) => href.endsWith(k));
    if (!key) return new Response("not found", { status: 404 });
    const { status = 200, body } = routes[key];
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
}

const weeks52 = Array.from({ length: 52 }, (_, i) => ({ total: i }));

describe("fetchVitality", () => {
  it("returns live stars from the repo endpoint", async () => {
    const fetchImpl = fakeFetch({
      "/repos/ThiagoPanini/ethitorial": { body: { stargazers_count: 9 } },
      "/stats/commit_activity": { body: weeks52 },
    });
    const v = await fetchVitality("ThiagoPanini/ethitorial", { fetchImpl });
    expect(v.stars).toBe(9);
  });

  it("derives total commits (default branch, all-time) from the commits Link header", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes("/commits?per_page=1")) {
        return new Response("[{}]", {
          status: 200,
          headers: {
            link: '<https://api.github.com/repositories/1/commits?per_page=1&page=2>; rel="next", <https://api.github.com/repositories/1/commits?per_page=1&page=139>; rel="last"',
          },
        });
      }
      return new Response(JSON.stringify({ stargazers_count: 0 }), { status: 200 });
    }) as unknown as typeof fetch;
    const v = await fetchVitality("o/r", { fetchImpl, sleep: async () => {} });
    expect(v.commits).toBe(139);
  });

  it("counts the returned commits when there is no Link header (≤1 commit)", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes("/commits?per_page=1")) {
        return new Response(JSON.stringify([{ sha: "abc" }]), { status: 200 });
      }
      return new Response(JSON.stringify({ stargazers_count: 0 }), { status: 200 });
    }) as unknown as typeof fetch;
    const v = await fetchVitality("o/r", { fetchImpl, sleep: async () => {} });
    expect(v.commits).toBe(1);
  });

  it("returns merged PR count (all-time) from the search endpoint total_count", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes("/search/issues")) {
        return new Response(JSON.stringify({ total_count: 81, items: [] }), { status: 200 });
      }
      return new Response(JSON.stringify({ stargazers_count: 0 }), { status: 200 });
    }) as unknown as typeof fetch;
    const v = await fetchVitality("o/r", { fetchImpl, sleep: async () => {} });
    expect(v.prs).toBe(81);
  });

  it("reduces the 52-week commit_activity to the last 26 weekly totals", async () => {
    const fetchImpl = fakeFetch({
      "/repos/ThiagoPanini/ethitorial": { body: { stargazers_count: 9 } },
      "/stats/commit_activity": { body: weeks52 },
    });
    const v = await fetchVitality("ThiagoPanini/ethitorial", { fetchImpl });
    expect(v.weeks).toHaveLength(26);
    expect(v.weeks).toEqual(Array.from({ length: 26 }, (_, i) => i + 26));
  });

  it("sends an Authorization header only when a token is provided", async () => {
    const calls: Array<Record<string, string>> = [];
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      calls.push((init?.headers as Record<string, string>) ?? {});
      return new Response(JSON.stringify({ stargazers_count: 0 }), { status: 200 });
    }) as unknown as typeof fetch;

    await fetchVitality("o/r", { fetchImpl });
    expect(calls.every((h) => !("Authorization" in h))).toBe(true);

    calls.length = 0;
    await fetchVitality("o/r", { fetchImpl, token: "ghp_x" });
    expect(calls.every((h) => h.Authorization === "Bearer ghp_x")).toBe(true);
  });

  it("degrades each signal to null independently when GitHub is unavailable", async () => {
    // repo 404 (stars gone) but stats computing (202) → both null, no throw
    const fetchImpl = fakeFetch({
      "/repos/o/r": { status: 404, body: { message: "Not Found" } },
      "/stats/commit_activity": { status: 202, body: {} },
    });
    const v = await fetchVitality("o/r", { fetchImpl, sleep: async () => {} });
    expect(v).toEqual({ stars: null, commits: null, prs: null, weeks: null });
  });

  it("never throws when the network is down (safe at static build time)", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("ENOTFOUND api.github.com");
    }) as unknown as typeof fetch;
    await expect(fetchVitality("o/r", { fetchImpl })).resolves.toEqual({
      stars: null,
      commits: null,
      prs: null,
      weeks: null,
    });
  });

  it("retries commit_activity while GitHub answers 202 (stats still computing)", async () => {
    let statsCalls = 0;
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const href = String(url);
      if (href.endsWith("/stats/commit_activity")) {
        statsCalls += 1;
        return statsCalls < 3
          ? new Response("{}", { status: 202 })
          : new Response(JSON.stringify(weeks52), { status: 200 });
      }
      return new Response(JSON.stringify({ stargazers_count: 0 }), { status: 200 });
    }) as unknown as typeof fetch;

    const sleep = vi.fn(async () => {});
    const v = await fetchVitality("o/r", { fetchImpl, retries: 3, sleep });
    expect(statsCalls).toBe(3);
    expect(v.weeks).toHaveLength(26);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("gives up after the retry budget and degrades the heartbeat to null", async () => {
    let statsCalls = 0;
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      if (String(url).endsWith("/stats/commit_activity")) {
        statsCalls += 1;
        return new Response("{}", { status: 202 });
      }
      return new Response(JSON.stringify({ stargazers_count: 3 }), { status: 200 });
    }) as unknown as typeof fetch;

    const v = await fetchVitality("o/r", { fetchImpl, retries: 2, sleep: async () => {} });
    expect(statsCalls).toBe(3); // initial + 2 retries
    expect(v).toEqual({ stars: 3, commits: null, prs: null, weeks: null });
  });

  it("passes the revalidate window to fetch so navigation is served from cache", async () => {
    const inits: RequestInit[] = [];
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      inits.push(init ?? {});
      return new Response(JSON.stringify({ stargazers_count: 0 }), { status: 200 });
    }) as unknown as typeof fetch;

    await fetchVitality("o/r", { fetchImpl, revalidate: 3600 });
    expect(inits.length).toBeGreaterThan(0);
    expect(
      inits.every((i) => (i as { next?: { revalidate?: number } }).next?.revalidate === 3600),
    ).toBe(true);
  });
});

describe("withVitality", () => {
  it("overlays every live signal (stars, commits, prs, weeks) onto a solution", () => {
    const live = withVitality(ethitorial, { stars: 42, commits: 500, prs: 73, weeks: [1, 2, 3] });
    expect(live.stats.stars).toBe(42);
    expect(live.stats.commits).toBe(500);
    expect(live.stats.prs).toBe(73);
    expect(live.weeks).toEqual([1, 2, 3]);
  });

  it("keeps curated values for any signal that came back null", () => {
    const live = withVitality(ethitorial, { stars: null, commits: null, prs: null, weeks: null });
    expect(live.stats.stars).toBe(ethitorial.stats.stars);
    expect(live.stats.commits).toBe(ethitorial.stats.commits);
    expect(live.stats.prs).toBe(ethitorial.stats.prs);
    expect(live.weeks).toEqual(ethitorial.weeks);
  });
});
