# Design system — panlabs

Contrato de design **as-built** do panlabs, escrito **para agentes** (e humanos). Descreve a forma
real que está em produção: tokens, layout, movimento, acessibilidade e o contrato de cada componente.
Leia isto antes de qualquer trabalho visual/UI.

> **Objetivo deste diretório:** dar um escopo de design **extremamente bem definido**, para que novas
> construções e prototipações partam de um contrato firme — não de leitura de código nem de adivinhação.

## Princípio: origem ≠ fonte-da-verdade

- **Fonte-da-verdade (viva):** o **código** em `apps/web/src/`. Os tokens vivem em
  [`apps/web/src/styles/theme.css`](../../apps/web/src/styles/theme.css); resets e foco em
  [`apps/web/src/styles/base.css`](../../apps/web/src/styles/base.css); a forma de cada componente no seu
  `*.module.css` co-localizado.
- **Origem creditada (congelada):** **"Chosen"** — o protótipo oficial e único do V1, extraído em
  2026-06-22 (v1.0.0), em `.claude/design/panlabs/` (**gitignored**, não versionar, não des-ignorar).
  Chosen é o **ponto de partida histórico**, não a verdade corrente. Onde o as-built divergiu de Chosen,
  o as-built vence — a procedência e cada delta estão em [procedencia-e-deltas.md](procedencia-e-deltas.md).

## Autoridade de forma

O design é **dono da forma** (placement, quais indicadores aparecem, tratamento visual) —
[ADR-0011](../adr/0011-produto-primeiro-indicadores-secundarios.md) e
[ADR-0012](../adr/0012-design-oficial-chosen-e-faseamento.md). Os ADRs/CONTEXT mandam em **intenção e
invariantes**. Onde a forma contraria um ADR, **a forma vence** — mas a contradição é **explicitada**,
nunca silenciada.

## Onde mora cada coisa

| Camada | Arquivo(s) | Papel |
|---|---|---|
| Tokens | `apps/web/src/styles/theme.css` | Fonte-da-verdade dos design tokens (3 camadas: primitive → semantic → component) |
| Reset + foco | `apps/web/src/styles/base.css` | Box-sizing, reset, `:focus-visible`, reduced-motion global |
| Forma do componente | `apps/web/src/components/*/*.module.css` | CSS Modules; **`@keyframes` co-localizadas** (escopo de `animation-name`) |
| Editorial das Soluções | `apps/web/src/data/solutions.ts` | Conteúdo curado por Solução (inclui `shot`/`shotBg`) — **não é design token** |
| Ícones | `apps/web/src/lib/icons.ts`, `apps/web/src/components/Icon/` | SVGs auto-hospedados inline (Simple Icons) |
| SEO / OG | `apps/web/src/lib/seo.ts`, `apps/web/src/app/opengraph-image.tsx` | Metadata e imagem social (usa **hex literais** — ver design-spec) |

## Mapa dos documentos

| Doc | Para quê |
|---|---|
| [design-spec.md](design-spec.md) | Taxonomia de tokens, tipografia, voz & copy, movimento, **literais conscientes**, tokens de reserva |
| [layout.md](layout.md) | Estrutura da página, grid, container, **header sticky**, breakpoints responsivos |
| [accessibility.md](accessibility.md) | Foco, reduced-motion, forced-colors, semântica e o **trade-off de contraste sub-AA** |
| [components/header.md](components/header.md) | Barra fixa: logo, wordmark, tagline |
| [components/hero-terminal.md](components/hero-terminal.md) | Hero: cover, prompt, typewriter, lede |
| [components/solution-card.md](components/solution-card.md) | Card de Solução: preview, stats, sparkline, CTA `/go` |
| [components/slot-proximo-experimento.md](components/slot-proximo-experimento.md) | Placeholder inerte do próximo experimento |
| [components/icon.md](components/icon.md) | Ícones de marca inline, auto-hospedados |
| [components/reveal.md](components/reveal.md) | Primitivos das camadas: `Reveal` (scroll-driven) + `Prompt` |
| [components/manifesto.md](components/manifesto.md) | Camada 1: momento de marca + tenets |
| [components/domain-architecture.md](components/domain-architecture.md) | Camada 2: pilares → conectores → domínio único |
| [components/footer.md](components/footer.md) | Camada 3: fechamento de terminal (`contentinfo`) |
| [como-adicionar-uma-solucao.md](como-adicionar-uma-solucao.md) | Guia operacional: nova Solução no catálogo |
| [procedencia-e-deltas.md](procedencia-e-deltas.md) | Auditoria Chosen → as-built + log de reconciliação |

## Ordem de leitura

1. Este README (princípios + onde mora cada coisa).
2. [design-spec.md](design-spec.md) — o vocabulário visual.
3. [layout.md](layout.md) + [accessibility.md](accessibility.md) — as regras transversais.
4. O `components/*.md` da peça em que você vai mexer.

## Convenções que todo agente deve seguir

- **Token, não literal.** Use as CSS vars de `theme.css`. As únicas exceções são os **literais
  conscientes** catalogados na [design-spec](design-spec.md#literais-conscientes) (ex.: OG, anel do CTA) —
  ao tocar num deles, mantenha o token-espelho em sincronia.
- **Keyframes co-localizadas.** CSS Modules escopam `animation-name`; uma `@keyframes` global em
  `theme.css` **nunca** casaria com a referência escopada. Declare a keyframe no `*.module.css` que a usa.
- **Reduced-motion por componente.** Todo componente animado carrega seu próprio bloco
  `@media (prefers-reduced-motion: reduce)`.
- **Copy em pt-BR.** Não traduza a copy de terminal nem mude a caixa dos nomes de Solução (são lowercase
  por design).
- **A11y é contrato, não enfeite.** Veja [accessibility.md](accessibility.md).

## Tarefa de asset em aberto

A marca canônica deveria ser um **SVG**; hoje o header renderiza o raster `apple-touch-icon.png` recortado
em círculo (pode cortar imperfeito). Produzir o SVG é tarefa de asset aberta — ver
[components/header.md](components/header.md).
