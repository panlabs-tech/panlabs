import styles from "./PlaceholderCard.module.css";

/**
 * "Next experiment" slot — reframed as the *draft* of a future solution card:
 * an "em breve" badge (pinned where the real cards carry their status pill) and
 * shimmering skeleton lines standing in for the tagline, copy and tech it will
 * eventually carry. Inert (no link, stats, CTA, no clickable `+`), but it reads
 * as a card-in-the-making rather than a dead `// TODO`.
 */
export function PlaceholderCard() {
  return (
    <article className={styles.card} aria-label="Próximo experimento a caminho">
      <div className={styles.preview}>
        <span className={styles.badge}>em breve</span>
      </div>

      <div className={styles.body}>
        <span className={`${styles.line} ${styles.lineSm}`} aria-hidden="true" />
        <span className={`${styles.line} ${styles.lineLg}`} aria-hidden="true" />
        <span className={styles.chips} aria-hidden="true">
          <span className={styles.chip} />
          <span className={styles.chip} />
          <span className={styles.chip} />
        </span>
        <p className={styles.copy}>{"// incubando o próximo experimento"}</p>
      </div>
    </article>
  );
}
