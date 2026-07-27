import styles from "./Header.module.css";
import { Logo } from "./Logo";

export function Header() {
  return (
    <header className={styles.header}>
      <Logo size={30} className={styles.logo} />
      <span className={styles.wordmark}>panlabs</span>
      <span className={styles.meta}>/ catálogo</span>
      <span className={styles.spacer} />
      <span className={styles.tagline}>
        build <span className={styles.astBlue}>*</span> automate{" "}
        <span className={styles.astViolet}>*</span> innovate
      </span>
    </header>
  );
}
