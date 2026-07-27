export type SolutionStatus = "live" | "beta";

export interface TechBadge {
  label: string;
  /** Simple Icons slug → self-hosted inline path in src/lib/icons.ts */
  slug: string;
}

export interface Solution {
  slug: string;
  name: string;
  /** short, lilac one-liner */
  tagline: string;
  /** longer plain description */
  desc: string;
  url: string;
  /** GitHub `owner/name`; when set, vitality is pulled live (#12). */
  repo?: string;
  status: SolutionStatus;
  tech: TechBadge[];
  stats: { stars: number; commits: number; prs: number };
  /** weekly activity series powering the sparkline */
  weeks: number[];
  /** screenshot path under /public */
  shot: string;
  /** solid background shown behind the screenshot */
  shotBg: string;
}

export const ethitorial: Solution = {
  slug: "ethitorial",
  name: "ethitorial",
  tagline: "Hub pessoal de aprendizado",
  desc: "Blog, cursos, livros, certificações e apresentações técnicas reunidos num só lugar para registrar e compartilhar o que estudo.",
  url: "https://ethitorial.panlabs.tech",
  repo: "ThiagoPanini/ethitorial",
  status: "live",
  tech: [
    { label: "Next.js", slug: "nextdotjs" },
    { label: "Postgres", slug: "postgresql" },
    { label: "TS", slug: "typescript" },
  ],
  stats: { stars: 9, commits: 248, prs: 14 },
  weeks: [2, 3, 1, 4, 5, 3, 6, 4, 7, 5, 8, 6, 9, 7, 6, 8, 10, 7, 9, 11, 8, 10, 9, 12, 10, 13],
  shot: "/assets/shot-ethitorial.png",
  shotBg: "#101826",
};

export const travelmanager: Solution = {
  slug: "travelmanager",
  name: "travelmanager",
  tagline: "Planejar viagens em grupo, juntos",
  desc: "Caderno de bordo compartilhado: o grupo cadastra a viagem, desenha as paradas cidade a cidade e decide o translado a várias mãos.",
  url: "https://travelmanager.panlabs.tech",
  repo: "ThiagoPanini/travelmanager",
  status: "beta",
  tech: [
    { label: "Next.js", slug: "nextdotjs" },
    { label: "FastAPI", slug: "fastapi" },
    { label: "Postgres", slug: "postgresql" },
  ],
  stats: { stars: 6, commits: 132, prs: 9 },
  weeks: [0, 1, 0, 2, 1, 3, 2, 4, 3, 2, 5, 4, 6, 5, 7, 6, 5, 8, 7, 9, 8, 10, 9, 11, 10, 12],
  shot: "/assets/shot-travelmanager.png",
  shotBg: "#1a1420",
};

export const luc: Solution = {
  slug: "luc",
  name: "LUC (life under control)",
  tagline: "Organizar a vida adulta a dois",
  desc: "Portal doméstico para casais: finanças, saúde, carro e gastronomia reunidos num cockpit com acesso simétrico — o mesmo dado, para os dois, sem hierarquia.",
  url: "https://luc.panlabs.tech",
  repo: "ThiagoPanini/life-under-control",
  status: "beta",
  tech: [
    { label: "Next.js", slug: "nextdotjs" },
    { label: "Postgres", slug: "postgresql" },
    { label: "TS", slug: "typescript" },
  ],
  stats: { stars: 0, commits: 8, prs: 6 },
  weeks: [0, 0, 1, 0, 1, 2, 1, 0, 2, 1, 3, 2, 1, 3, 2, 4, 3, 2, 4, 3, 5, 4, 3, 5, 4, 6],
  shot: "/assets/shot-luc.jpg",
  shotBg: "#0f1a14",
};

export const solutions: Solution[] = [ethitorial, travelmanager, luc];
