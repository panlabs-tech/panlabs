import { Logo } from "@/components/Header/Logo";
import { Reveal } from "@/components/Reveal/Reveal";
import styles from "./DomainArchitecture.module.css";

/**
 * Camada 2 — arquitetura / domínio único. Three pillars of the lab's working
 * method (padronização, agentes, harness) whose connectors stroke themselves
 * into a single domain card on reveal — the literal picture of "soluções
 * plugadas em um único domínio" (CONTEXT.md / ADR-0010). Decorative diagram,
 * so the SVG is aria-hidden and the meaning lives in the surrounding text.
 */

interface Pillar {
  name: string;
  detail: string;
  dotClass: string;
}

const pillars: Pillar[] = [
  {
    name: "desenvolvimento padronizado",
    detail: "organização de repositórios em um padrão testado de desenvolvimento acelerado",
    dotClass: styles.dotMagenta,
  },
  {
    name: "soluções agênticas",
    detail: "uso de agentes como Claude Code, Codex e GitHub Copilot como catalisadores",
    dotClass: styles.dotViolet,
  },
  {
    name: "harness garantido",
    detail: "aplicação das melhores práticas de AI para desenvolvimento confiável",
    dotClass: styles.dotBlue,
  },
];

export function DomainArchitecture() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <Reveal className={styles.eyebrowRow}>
          <p className={styles.eyebrow}>{"// arquitetura"}</p>
        </Reveal>
        <Reveal className={styles.headingRow}>
          <h2 className={styles.heading}>domínio único</h2>
        </Reveal>
        <Reveal className={styles.ledeRow}>
          <p className={styles.lede}>
            Soluções plugadas em um único domínio e que compartilham de um processo acelerado de
            desenvolvimento padronizado e assistido por AI.
          </p>
        </Reveal>

        <Reveal className={styles.diagram}>
          {/* pillars */}
          <div className={styles.pillars}>
            {pillars.map((pillar) => (
              <div key={pillar.name} className={styles.pillar}>
                <div className={styles.pillarHead}>
                  <span className={`${styles.dot} ${pillar.dotClass}`} aria-hidden="true" />
                  <span className={styles.pillarName}>{pillar.name}</span>
                </div>
                <span className={styles.pillarDetail}>{pillar.detail}</span>
              </div>
            ))}
          </div>

          {/* connectors: the three pillars converge into one node */}
          <svg
            className={styles.connectors}
            viewBox="0 0 200 340"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              className={`${styles.connector} ${styles.connectorMagenta}`}
              d="M0 50 C110 50 120 170 200 170"
              fill="none"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              className={`${styles.connector} ${styles.connectorViolet}`}
              d="M0 170 L200 170"
              fill="none"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              className={`${styles.connector} ${styles.connectorBlue}`}
              d="M0 290 C110 290 120 170 200 170"
              fill="none"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle className={styles.node} cx="200" cy="170" r="4" />
          </svg>

          {/* the single domain everything plugs into */}
          <div className={styles.domain}>
            <span className={styles.domainLabel}>= um domínio</span>
            <div className={styles.domainCard}>
              <div className={styles.domainCardHead}>
                <Logo size={30} priority={false} alt="" className={styles.domainLogo} />
                <span className={styles.domainName}>panlabs.tech</span>
              </div>
              <div className={styles.domainCardBody}>
                <p className={styles.domainNote}>{"// soluções plugadas no domínio"}</p>
                <div className={styles.chips}>
                  <span className={styles.chip}>
                    <span
                      className={`${styles.chipDot} ${styles.chipDotLive}`}
                      aria-hidden="true"
                    />
                    soluções no ar
                  </span>
                  <span className={styles.chip}>
                    <span
                      className={`${styles.chipDot} ${styles.chipDotPreview}`}
                      aria-hidden="true"
                    />
                    preview ao vivo
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
