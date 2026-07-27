# Acessibilidade

A11y **base** foi adição do as-built (ausente em Chosen, que é desktop-only) — o link é público e a
audiência abre no mobile/teclado ([ADR-0012](../adr/0012-design-oficial-chosen-e-faseamento.md)). Estes
são contratos, não enfeite: ao editar um componente, preserve-os.

## Foco

[`base.css`](../../apps/web/src/styles/base.css) — anel de foco **só para teclado** (`:focus-visible`), sem mudar
nada para o ponteiro:

```css
a:focus-visible, button:focus-visible, [tabindex]:focus-visible {
  outline: 2px solid var(--accent-violet);
  outline-offset: 2px;
}
```

O CTA do card trata `:hover` e `:focus-visible` **igualmente** (mesmo anel de marca + seta) — foco de
teclado recebe o mesmo destaque do mouse.

## Reduced-motion

Cada componente animado carrega seu **próprio** bloco `@media (prefers-reduced-motion: reduce)` (a
co-localização das keyframes força isso). Inventário:

| Componente | Sob reduced-motion |
|---|---|
| Hero | typewriter congela com o texto **cheio** (`max-width: 13ch`); caret **estático** (visível, sem piscar) |
| SolutionCard | sem lift/zoom (`transform: none`); shot fixo em `scale(1.06)`; sparkline **já desenhada** (`dashoffset: 0`); CTA sem fluxo e sem seta |
| Slot do próximo experimento | shimmer **off** (linhas/chips parados, visíveis) |
| Reveal (camadas) | conteúdo no estado **final** (visível, sem fade/translate nem transição) |
| Manifesto | anel **já desenhado** (`dashoffset: 0`); glow do logo **parado** (mark visível) |
| DomainArchitecture | conectores **já desenhados** (`dashoffset: 0`, sem transição) |
| Footer | caret **estático** (visível, sem piscar) |
| Global | `base.css` força `scroll-behavior: auto` |

Princípio: nada **some** sob reduced-motion — o efeito é removido, o conteúdo permanece no seu estado
final/legível.

### Reveal é JS-gated (trade-off consciente)

As camadas nascem em `opacity: 0` e o `Reveal` (IntersectionObserver) as revela ao rolar — **fiel ao
protótipo Chosen**, que também porta o reveal no JS. Implicações:

- **Reduced-motion:** o CSS mostra tudo no estado final, independente do JS (linha acima) — o caminho
  acessível está garantido.
- **Sem IntersectionObserver** (SSR/jsdom): `useReveal` liga `shown` no mount — nada fica preso escondido.
- **Sem JS + motion normal:** as camadas ficam invisíveis até o JS rodar. O HTML é SSR/estático (o conteúdo
  está no DOM para crawlers) e a maioria dos motores de busca executa JS. Mantido por fidelidade ao Chosen.
  Ver [components/reveal.md](components/reveal.md).


## Forced-colors (alto contraste)

- A **marca** (logo) leva `forced-color-adjust: none` — exceção deliberada para o mark não virar um
  retângulo de sistema (`Header.module.css`).
- Os **ícones** usam `fill="currentColor"`, então herdam a cor do texto e **sobrevivem** ao forced-colors
  sem tratamento especial ([`Icon.tsx`](../../apps/web/src/components/Icon/Icon.tsx)).

## Semântica & ARIA

- Marcação semântica: `header` / `main` / `footer` (landmark `contentinfo`, irmão do `main`) / `section` /
  `article` / `h1` (hero) / `h2` (tenets do Manifesto + `domínio único`) / `h3` (nome do card) / `ul`+`li`
  (tech-chips). NB: o catálogo é "headingless" por design (linha `// meta`, não heading), então os `h3` dos
  cards aparecem antes dos `h2` das camadas — artefato pré-existente, não regressão.
- `aria-hidden="true"` em tudo decorativo: cover do hero, caret (hero **e** footer), overlay e `statusDot`
  do card, `★`, `ctaArrow`, a `<svg>` da sparkline, as linhas/chips skeleton do slot, o `<svg>` do anel do
  Manifesto, o `<svg>` de conectores + os pontos (`dot`/`chipDot`) da arquitetura.
- `alt=""` em imagens decorativas (cover do hero, shot do card, `<Logo>` do card de domínio — a marca já é
  nomeada ao lado) — o conteúdo informativo vem do texto, não da imagem. O `<Logo>` do **momento de marca**
  do Manifesto mantém `alt="panlabs"` (é o foco daquele bloco).
- `aria-label="Próximo experimento a caminho"` no slot (o `article` não tem texto que o nomeie por conta
  própria).
- Ícones: `aria-hidden="true"` + `focusable="false"`.

## Contraste sub-AA

**Trade-off consciente, não bug.** Duas micro-labels ficam **abaixo do limiar AA** para texto normal:

- `statLabel` — `--text-faint` (`#5f656e`) em **9.5px** (`SolutionCard`).
- nav-tagline — `#6a7079` em **10.5px** (`Header`).

O bump de 8.5→9.5px (ver [design-spec](design-spec.md)) **ameniza** mas não cruza o limiar (e o texto é
pequeno demais para contar como "texto grande"). **Mantido por fidelidade a Chosen** — decisão do dono.
São rótulos auxiliares de prova-de-vida secundária ([ADR-0011](../adr/0011-produto-primeiro-indicadores-secundarios.md)),
não conteúdo crítico.

> Se um dia for revisitado: subir para `--text-muted` (`#7a808a`) ou aumentar o tamanho cruza o limiar
> sem mexer no layout.

## Idioma & links

- `lang="pt-BR"` no `<html>`.
- O CTA abre em nova aba com `target="_blank" rel="noopener noreferrer"` (segurança de `window.opener`).
