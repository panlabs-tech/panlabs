# Componente: Manifesto (Camada 1)

Primeira camada de scroll **abaixo do catálogo**: `cat manifesto.txt` e quatro **tenets** que reafirmam as
invariantes do panlabs na voz de terminal do laboratório, **fechando** num **momento de marca** (a logo
desenhada dentro de um anel de gradiente que se traça, a marca respirando um glow violeta).

## Código

- [`apps/web/src/components/Manifesto/Manifesto.tsx`](../../../apps/web/src/components/Manifesto/Manifesto.tsx)
- [`apps/web/src/components/Manifesto/Manifesto.module.css`](../../../apps/web/src/components/Manifesto/Manifesto.module.css)

## Estrutura

```
<section.section>                      ← gradiente ink-950 → ink-940, border-top hairline
  <div.inner>                          ← container 1080px, padding 84/40/100
    <Reveal.promptRow>  <Prompt cat manifesto.txt/>
    <div.grid (2 col)>
      <Reveal> <article.card> /0N · título · gloss </article> </Reveal>  × 4
    <Reveal.logoMoment>                ← fechamento; flex coluna centrado, margin-top 64
      <div.ringWrap (230×230)>
        <svg.ringSvg rotate(-90)>      ← <circle.ring> traça em url(#manifesto-ring)
        <div.avatar>                   ← inset 20px, glow pulsante
          <Logo size=190 priority=false/>
```

## Momento de marca

- **Logo:** reusa o `<Logo>` (apple-touch-icon canônico) a **190px**, `priority={false}` (abaixo da dobra),
  recortado em círculo. É o "logo em contexto significativo" pedido para as camadas — não um favicon.
- **Anel** (`.ring`): `<circle r=101>` com `stroke="url(#manifesto-ring)"` (gradiente magenta→violet→blue
  via `.ringStop0/1/2`, **tokens** `--color-brand-*`). Desenha-se com `stroke-dashoffset` (`--len: 635`)
  quando o `.logoMoment` revela (`[data-shown="true"]`), `--duration-draw`. O `rotate(-90deg)` começa o
  traço às 12h.
- **Glow** (`.avatar`): `manifesto-pulse` (`--duration-pulse`, 3.4s) oscila `box-shadow` entre
  `--shadow-logo-rest` e `--shadow-logo-peak` (violeta suave).

## Tenets (claim cards)

Quatro `<article.card>` em grid 2-col (`--bg-surface`, `--border-default`, `--radius-card`). Cada um:
`/0N` (mono, `--text-faint`) · `<h2>` título (Manrope 23px, bold, `--text-strong`) · gloss (mono 12.5px,
`--text-muted`). Conteúdo **verbatim** — restata as invariantes do laboratório
([ADR-0011](../../adr/0011-produto-primeiro-indicadores-secundarios.md), CONTEXT.md):

| # | título | gloss |
|---|---|---|
| 01 | laboratório vivo | software assistido por IA que virou produto real, no ar. |
| 02 | catálogo de soluções | o panlabs é uma vitrine de soluções de software do autor. |
| 03 | velocidade de desenvolvimento | o padrão estabelecido ajuda a tirar ideias do papel. |
| 04 | trabalho assistido por AI | diferencial entre vibe-codar e construir com eficiência. |

## Movimento & a11y

- Reveal por bloco (logo, prompt, cada card) — ver [reveal.md](reveal.md). Keyframe `manifesto-pulse`
  **co-localizada**.
- **Reduced-motion:** anel já desenhado (`dashoffset: 0`), glow parado, reveals no estado final.
- O `<svg>` do anel é `aria-hidden` (decorativo); o nome da marca vem do `alt` do `<Logo>`.

## Responsivo

`≤ 639px`: grid → 1 coluna; `.inner` padding `56/20/72`; títulos dos cards deixam de ser `nowrap`.
