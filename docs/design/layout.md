# Layout & responsivo

Estrutura da página, container, grid e breakpoints **as-built**. Os breakpoints **não existiam em Chosen**
(protótipo desktop) — foram adicionados porque o link é público e a audiência abre no mobile
([ADR-0012](../adr/0012-design-oficial-chosen-e-faseamento.md)).

## Estrutura da página (DOM)

[`apps/web/src/app/layout.tsx`](../../apps/web/src/app/layout.tsx) + [`apps/web/src/app/page.tsx`](../../apps/web/src/app/page.tsx):

```
<html lang="pt-BR" class="{--font-manrope} {--font-jetbrains}">
  <body>
    <Header/>                      ← barra fixa (sticky)
    <main>
      <HeroTerminal/>              ← section, full-bleed cover + copy
      <Suspense>
        <Catalog/>                 ← section, meta + grid de cards
      </Suspense>
      <Manifesto/>                 ← camada 1: momento de marca + tenets
      <DomainArchitecture/>        ← camada 2: pilares → domínio único
    </main>
    <Footer/>                      ← camada 3: terminal (contentinfo, fora do <main>)
```

O `<Suspense>` isola o catálogo (que faz fetch de vitalidade ao vivo no GitHub) para o hero **nunca
esperar a rede** — o hero pinta na hora, o grid faz stream depois.

## Camadas de scroll (abaixo do catálogo)

A história do laboratório se revela conforme se **desce** a página — continuação nativa do topo, não
redesenho. Três camadas, todas no mesmo container 1080px, separadas por `border-top` hairline:

1. **Manifesto** — gradiente `ink-950 → ink-940`; momento de marca (anel + logo) + `cat manifesto.txt` +
   grid 2-col de tenets. Ver [components/manifesto.md](components/manifesto.md).
2. **DomainArchitecture** — `bg-root`; diagrama flex `920×340` (pilares → conectores → card de domínio).
   Ver [components/domain-architecture.md](components/domain-architecture.md).
3. **Footer** — `ink-940`; fechamento de terminal. Landmark `contentinfo`, **irmão** do `<main>`. Ver
   [components/footer.md](components/footer.md).

O movimento (reveal ao rolar + traço SVG) é o primitivo `Reveal` — ver
[components/reveal.md](components/reveal.md). É **JS-gated** e honra reduced-motion por componente.


## Container

`--size-container-max: 1080px`, centralizado (`margin: 0 auto`). Aplicado ao `.inner` do hero e ao
`.catalog`. O header **não** usa o container — ele é full-width com padding lateral próprio
(`--space-5-5`).

## Header (barra fixa)

[`Header.module.css`](../../apps/web/src/components/Header/Header.module.css) — "barra fixa" de Chosen, restaurada
na Fase 3:

- `position: sticky; top: 0; z-index: var(--z-header)` — flutua sobre o conteúdo rolado.
- `background: var(--bg-header)` (translúcido) + `backdrop-filter: blur(12px)` (e `-webkit-`) — borra o que
  passa por baixo. A translucidez **depende** do alpha em `--bg-header`.
- `height: var(--size-header-height)` (58px), `padding: 0 var(--space-5-5)`, `border-bottom` hairline.
- Conteúdo em linha: `logo · wordmark · meta · spacer(flex:1) · tagline`.

Detalhes em [components/header.md](components/header.md).

## Hero

[`HeroTerminal.module.css`](../../apps/web/src/components/HeroTerminal/HeroTerminal.module.css):

- `.hero` — `position: relative; isolation: isolate; overflow: hidden`, `border-bottom` hairline. Carrega
  os **knobs do cover** (`--hero-cover-blur/brightness/scrim`).
- `.cover` — camada full-bleed `absolute inset:0 z-index:0` (imagem + scrim), `pointer-events:none`.
- `.inner` — `position: relative; z-index: 1`, container 1080px, padding `var(--space-15) var(--space-10)`
  (60px / 40px).

## Catálogo & grid

[`Catalog.module.css`](../../apps/web/src/components/Catalog/Catalog.module.css):

- `.catalog` — container 1080px, padding `var(--space-10-5) var(--space-10) var(--space-24)`.
- `.meta` — linha mono `// N soluções no ar · preview ao vivo`.
- `.grid` — `display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-4-5);
  align-items: stretch`. O `align: stretch` é o que faz o **slot do próximo experimento** acompanhar a
  altura dos cards reais.

A ordem do grid é: cards reais (na ordem do array `solutions`) **+ 1 `PlaceholderCard` ao final**.

## Breakpoints

| Largura | O que muda | Onde |
|---|---|---|
| `≤ 1023px` | grid 3 → **2 colunas** | `Catalog.module.css` |
| `≤ 880px` | diagrama da arquitetura **empilha** (conectores somem) | `DomainArchitecture.module.css` |
| `≤ 767px` | tagline do header **some** | `Header.module.css` |
| `≤ 639px` | grid → **1 coluna**; padding lateral do catálogo → `--space-5`; hero `.inner` → `var(--space-10) var(--space-5)`; título do hero → `32px`/`-1px`; caret encolhe (`10×28`); CTA do card ganha `min-height: 44px` (alvo de toque); camadas reduzem padding (Manifesto grid → 1 col, headings menores) | `Catalog`, `HeroTerminal`, `SolutionCard`, `Manifesto`, `DomainArchitecture`, `Footer` |

Sequência de colunas do grid: **3 → 2 → 1**. Não há breakpoint acima de 1080px (o container trava a
largura).

## Z-index & empilhamento

Uma única camada empilhada: `--z-header: 1` (header sticky). Dentro do hero, `isolation: isolate` cria um
contexto próprio — `.cover` fica em `z-index: 0` e `.inner` em `z-index: 1` **sem** competir com o resto da
página.
