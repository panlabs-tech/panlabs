import { Logo } from "@/components/Header/Logo";
import { Reveal } from "@/components/Reveal/Reveal";
import { Prompt } from "@/components/Terminal/Prompt";
import styles from "./Manifesto.module.css";

/**
 * Camada 1 — manifesto. The first layer below the catalog: `cat manifesto.txt`
 * and four tenets that restate the panlabs invariants in the lab's own terminal
 * voice (CONTEXT.md / ADR-0011), closing on a brand *moment* — the logo drawn
 * inside a brand-gradient ring that strokes itself in, the mark itself breathing
 * a soft violet glow.
 */

interface Claim {
  n: string;
  title: string;
  gloss: string;
}

const claims: Claim[] = [
  {
    n: "01",
    title: "laboratório vivo",
    gloss: "software assistido por IA que virou produto real, no ar.",
  },
  {
    n: "02",
    title: "catálogo de soluções",
    gloss: "o panlabs é uma vitrine de soluções de software do autor.",
  },
  {
    n: "03",
    title: "velocidade de desenvolvimento",
    gloss: "o padrão estabelecido ajuda a tirar ideias do papel.",
  },
  {
    n: "04",
    title: "trabalho assistido por AI",
    gloss: "diferencial entre vibe-codar e construir com eficiência.",
  },
];

export function Manifesto() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <Reveal className={styles.promptRow}>
          <Prompt command="cat" arg="manifesto.txt" />
        </Reveal>

        <div className={styles.grid}>
          {claims.map((claim) => (
            <Reveal key={claim.n}>
              <article className={styles.card}>
                <div className={styles.cardIndex}>/{claim.n}</div>
                <h2 className={styles.cardTitle}>{claim.title}</h2>
                <p className={styles.cardGloss}>{claim.gloss}</p>
              </article>
            </Reveal>
          ))}
        </div>

        {/* brand moment (closing flourish): ring strokes in on reveal, mark pulses a soft glow */}
        <Reveal className={styles.logoMoment}>
          <div className={styles.ringWrap}>
            <svg className={styles.ringSvg} viewBox="0 0 230 230" aria-hidden="true">
              <circle
                className={styles.ring}
                cx="115"
                cy="115"
                r="101"
                fill="none"
                stroke="url(#manifesto-ring)"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="manifesto-ring" x1="0" y1="0" x2="1" y2="1">
                  <stop className={styles.ringStop0} offset="0" />
                  <stop className={styles.ringStop1} offset="0.5" />
                  <stop className={styles.ringStop2} offset="1" />
                </linearGradient>
              </defs>
            </svg>
            <div className={styles.avatar}>
              <Logo size={190} priority={false} className={styles.avatarImg} />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
