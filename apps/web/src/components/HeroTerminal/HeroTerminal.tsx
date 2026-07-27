import Image from "next/image";
import styles from "./HeroTerminal.module.css";

export function HeroTerminal() {
  return (
    <section className={styles.hero}>
      {/* full-bleed cover photo, blurred + darkened so it sits behind the
          terminal copy without stealing focus or hurting legibility.
          Tune blur/darkness in HeroTerminal.module.css (.hero knobs). */}
      <div className={styles.cover} aria-hidden="true">
        <Image
          src="/assets/hero-cover-v2.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className={styles.coverImg}
        />
        <span className={styles.coverScrim} />
      </div>

      <div className={styles.inner}>
        <div className={styles.prompt}>
          <span className={styles.user}>panini@panlabs</span>
          <span className={styles.colon}>:</span>
          <span className={styles.tilde}>~</span>
          <span className={styles.dollar}>$</span>
          <span className={styles.space} />
          <span className={styles.command}>ls ./panlabs</span>
        </div>
        <h1 className={styles.title}>
          <span className={styles.type}>
            ls <span className={styles.gradient}>./panlabs</span>
          </span>
          <span className={styles.cursor} aria-hidden="true" />
        </h1>
        <p className={styles.lede}>
          Laboratório vivo de soluções de softwares criadas com AI. Experimentos que viraram SaaS
          reais atualmente listados, versionados e disponíveis em produção.
        </p>
      </div>
    </section>
  );
}
