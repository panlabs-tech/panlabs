import styles from "./Prompt.module.css";

interface PromptProps {
  /** the command after the `$` (e.g. "cat") — sits in the muted prompt colour */
  command: string;
  /** highlighted argument (e.g. "manifesto.txt") — rendered near-white */
  arg: string;
  /** composed onto the line (callers add spacing/size context) */
  className?: string;
}

/**
 * The `panini@panlabs:~$ <command> <arg>` terminal signature, assembled from
 * coloured spans (green user · faint colon · blue tilde · body `$`). Shared by
 * the camadas that open on a prompt line (Manifesto, Footer). The hero builds
 * its own variant inline because there the same line also drives the typewriter.
 */
export function Prompt({ command, arg, className }: PromptProps) {
  const cls = className ? `${styles.prompt} ${className}` : styles.prompt;

  return (
    <p className={cls}>
      <span className={styles.user}>panini@panlabs</span>
      <span className={styles.colon}>:</span>
      <span className={styles.tilde}>~</span>
      <span className={styles.dollar}>$</span> {command} <span className={styles.arg}>{arg}</span>
    </p>
  );
}
