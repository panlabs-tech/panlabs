import { Suspense } from "react";
import { Catalog } from "@/components/Catalog/Catalog";
import { DomainArchitecture } from "@/components/DomainArchitecture/DomainArchitecture";
import { Footer } from "@/components/Footer/Footer";
import { Header } from "@/components/Header/Header";
import { HeroTerminal } from "@/components/HeroTerminal/HeroTerminal";
import { Manifesto } from "@/components/Manifesto/Manifesto";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <HeroTerminal />
        {/* Catalog pulls live GitHub vitality (#12); stream it so the hero
            never waits on the network. */}
        <Suspense>
          <Catalog />
        </Suspense>
        {/* Scroll layers below the catalog (camadas): the lab's story unfolds
            as you descend — manifesto, then the single-domain architecture. */}
        <Manifesto />
        <DomainArchitecture />
      </main>
      <Footer />
    </>
  );
}
