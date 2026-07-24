import { Reveal } from "@/components/Reveal/Reveal";
import { Prompt } from "@/components/Terminal/Prompt";
import styles from "./Footer.module.css";

/**
 * Camada 3 — terminal sign-off. Closes the page the way the hero opened it: a
 * `panini@panlabs:~$` prompt, a quiet `keep building and sharing` with a
 * blinking caret, a one-line colophon, and a quiet link back to the GitHub
 * org. No CTA, no funnel — the lab just leaves the cursor blinking (ADR-0007).
 */
export function Footer() {
  return (
    <footer className={styles.footer}>
      <Reveal className={styles.inner}>
        <Prompt command="cat" arg="next_steps.md" />
        <p className={styles.headline}>
          keep building and sharing
          <span className={styles.caret} aria-hidden="true" />
        </p>
        <p className={styles.colophon}>dark-native · pt-BR · Manrope + JetBrains Mono · sem CDN</p>
        <p className={styles.orgLine}>
          <a
            className={styles.orgLink}
            href="https://github.com/panlabs-tech"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/panlabs-tech
          </a>
        </p>
      </Reveal>
    </footer>
  );
}
