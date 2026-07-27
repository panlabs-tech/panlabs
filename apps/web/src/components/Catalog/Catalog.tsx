import { PlaceholderCard } from "@/components/PlaceholderCard/PlaceholderCard";
import { SolutionCard } from "@/components/SolutionCard/SolutionCard";
import { solutions } from "@/data/solutions";
import { resolveVitality } from "@/lib/github";
import styles from "./Catalog.module.css";

export async function Catalog() {
  // Overlay live GitHub vitality on solutions that declare a repo (#12).
  const live = await Promise.all(solutions.map(resolveVitality));
  const count = live.length;

  return (
    <section className={styles.catalog}>
      <p className={styles.meta}>{`// ${count} soluções no ar · preview ao vivo`}</p>
      <div className={styles.grid}>
        {live.map((solution) => (
          <SolutionCard key={solution.slug} solution={solution} />
        ))}
        <PlaceholderCard />
      </div>
    </section>
  );
}
