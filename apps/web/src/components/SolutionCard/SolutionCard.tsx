import Image from "next/image";
import { Icon } from "@/components/Icon/Icon";
import type { Solution } from "@/data/solutions";
import { sparkline } from "@/lib/sparkline";
import styles from "./SolutionCard.module.css";

export function SolutionCard({ solution }: { solution: Solution }) {
  const { slug, name, tagline, desc, status, tech, stats, weeks, shot, shotBg } = solution;
  const { line, area } = sparkline(weeks);
  const gradientId = `plspark-${slug}`;

  return (
    <article className={styles.card}>
      <div className={styles.preview} style={{ background: shotBg }}>
        <Image
          src={shot}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 340px"
          className={styles.shot}
        />
        <span className={styles.overlay} aria-hidden="true" />
        <div className={styles.titleRow}>
          <h3 className={styles.name}>{name}</h3>
          <span className={`${styles.status} ${styles[status]}`}>
            <span className={styles.statusDot} aria-hidden="true" />
            {status}
          </span>
        </div>
      </div>

      <div className={styles.body}>
        <p className={styles.tagline}>{tagline}</p>
        <p className={styles.desc}>{desc}</p>

        <ul className={styles.tech}>
          {tech.map((t) => (
            <li key={t.slug} className={styles.chip}>
              <Icon slug={t.slug} size={12} className={styles.chipIcon} />
              {t.label}
            </li>
          ))}
        </ul>

        <div className={styles.stats}>
          <div className={styles.statGroup}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>
                <Icon slug="github" size={9} />
                stars
              </span>
              <span className={styles.statValue}>
                <span className={styles.star} aria-hidden="true">
                  ★
                </span>{" "}
                {stats.stars}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>commits</span>
              <span className={styles.statValue}>{stats.commits}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>PRs</span>
              <span className={styles.statValue}>{stats.prs}</span>
            </div>
          </div>

          <div className={styles.activity}>
            <span className={styles.statLabel}>commit activity</span>
            <svg
              className={styles.spark}
              viewBox="0 0 120 30"
              width={104}
              height={28}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9b6cf0" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#9b6cf0" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon className={styles.sparkArea} points={area} fill={`url(#${gradientId})`} />
              <polyline className={styles.sparkLine} points={line} />
            </svg>
          </div>
        </div>

        <a className={styles.cta} href={`/go/${slug}`} target="_blank" rel="noopener noreferrer">
          <span className={styles.ctaText}>$ touch {slug}</span>
          <span className={styles.ctaArrow} aria-hidden="true">
            →
          </span>
        </a>
      </div>
    </article>
  );
}
