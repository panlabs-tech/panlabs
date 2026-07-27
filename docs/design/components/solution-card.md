# Componente: SolutionCard

O **Card** de uma Solução — o herói da vitrine. Tudo nele existe para apresentar o produto; vitalidade é
prova-de-vida **secundária e discreta** ([ADR-0011](../../adr/0011-produto-primeiro-indicadores-secundarios.md),
[CONTEXT.md → Card](../../CONTEXT.md)).

## Código

- [`apps/web/src/components/SolutionCard/SolutionCard.tsx`](../../../apps/web/src/components/SolutionCard/SolutionCard.tsx)
- [`apps/web/src/components/SolutionCard/SolutionCard.module.css`](../../../apps/web/src/components/SolutionCard/SolutionCard.module.css)
- Consome: [`apps/web/src/data/solutions.ts`](../../../apps/web/src/data/solutions.ts) (`Solution`), [`apps/web/src/lib/sparkline.ts`](../../../apps/web/src/lib/sparkline.ts), [`Icon`](icon.md).

## Estrutura

```
<article.card>
  <div.preview style="background: {shotBg}">     ← 148px; fundo editorial inline
    <Image .shot fill alt=""/>                    ← screenshot, blur+brightness
    <span.overlay aria-hidden/>                   ← fade vertical 4-stop
    <div.titleRow>                                ← fixado no piso do preview
      <h3.name>{name}</h3>
      <span.status .{status}> <span.statusDot/> {status} </span>
  <div.body>
    <p.tagline>   ← lilás, uma linha
    <p.desc>      ← corpo
    <ul.tech> <li.chip> <Icon size=12/> {label} </li> … </ul>
    <div.stats>
      <div.statGroup> stars (★ + ícone github) · commits · PRs </div>
      <div.activity> "commit activity" + <svg.spark> sparkline </svg>
    <a.cta href="/go/{slug}" target="_blank" rel="noopener noreferrer">
      $ touch {slug}  →
```

## Preview

- `height: var(--size-preview-height)` (148px), `overflow: hidden`.
- **`shotBg` é editorial por-Solução** (vem de `data.shotBg`, aplicado **inline** como `background`) —
  **não é design token**. Acompanha o `shot` no PR que adiciona a Solução (ver
  [como-adicionar-uma-solucao.md](../como-adicionar-uma-solucao.md)).
- `.shot`: `next/image fill`, `object-fit: cover; object-position: top center`,
  `filter: blur(1.5px) brightness(0.76)` (blur reduzido de 2.5 de Chosen), base `scale(1.06)` → hover
  `scale(1.12)`.
- `.overlay`: `--gradient-preview-overlay` (4 paradas) afunda o preview em ink para o nome ler sobre
  quase-sólido.
- `.titleRow` fixada no piso (`bottom`/`left`/`right`), nome (`h3`, mono bold, ellipsis) + pílula de status.

## Status

Enum **`"live" | "beta"`** (só os dois estilizados no V1 — `idea`/`alpha`/`sunset` ficam reservados,
[CONTEXT.md → status](../../CONTEXT.md)). A pílula `.status` é mono uppercase com `backdrop-filter`; o
`.statusDot` recebe a cor por classe: `.live` → `--color-status-live`, `.beta` → `--color-status-beta`.

## Stats & sparkline

- Grupo: **stars** (`★` + ícone `github` 9px), **commits**, **PRs** — labels em `--text-faint`
  (micro-label sub-AA consciente, ver [accessibility.md](../accessibility.md#contraste-sub-aa)).
- Sparkline: `<svg viewBox="0 0 120 30">` com `<linearGradient>` de **id por slug** (`plspark-${slug}`,
  evita colisão entre cards). Pontos calculados por `lib/sparkline.ts` a partir de `weeks`. A `.sparkLine`
  desenha no hover via `stroke-dashoffset: 260 → 0`; a `.sparkArea` é o preenchimento.

## Vitalidade (live × curada)

Os valores de `stats`/`weeks` podem chegar **ao vivo** do GitHub (o `Catalog` chama `resolveVitality`) ou
cair para os **curados** de `solutions.ts` quando falta `GITHUB_TOKEN`/rede — degradação graciosa
([`lib/github.ts`](../../../apps/web/src/lib/github.ts), semântica em
[ADR-0013](../../adr/0013-semantica-vitalidade-live-commits-prs.md)). O card renderiza igual nos dois casos.

## CTA

- Texto `$ touch {slug}` + seta `→`; `href="/go/{slug}"`, `target="_blank" rel="noopener noreferrer"` —
  **redirect rastreado** ([CONTEXT.md → Redirect rastreado](../../CONTEXT.md)). O CTA sempre aponta para
  `/go`; a *gravação* do clique no-opa sem `DATABASE_URL` (ver
  [ADR-0012 §Reconciliação](../../adr/0012-design-oficial-chosen-e-faseamento.md)).
- Hover/focus: **anel** de gradiente desenhado só na borda via `mask-composite` (`.cta::before`, gradiente
  5-stop — literal consciente), fluxo `pl-cta-flow`, `box-shadow` glow, seta `translateX(3px)`. `:hover` e
  `:focus-visible` recebem **o mesmo** tratamento.
- **NB as-built:** o JSX tem `<span className={styles.ctaText}>`, mas **não existe regra `.ctaText`** no
  módulo — o span herda a tipografia de `.cta` (className resolve para `undefined`, sem efeito). É inócuo;
  não o trate como ponto de estilo.

## Movimento & a11y

- Durações `--duration-card/shot/cta/spark`; easings `--easing-card/standard`. Keyframe `pl-cta-flow`
  co-localizada.
- Reduced-motion: sem lift/zoom, shot fixo em `scale(1.06)`, sparkline já desenhada, CTA sem fluxo/seta.
- `≤ 639px`: CTA `min-height: 44px` (alvo de toque).
- `aria-hidden` em overlay, `statusDot`, `★`, `ctaArrow` e na `<svg>` da sparkline; `alt=""` no shot.

## Invariantes

- **Card ⟺ Solução real.** Não usar o Card para algo que não é uma Solução (para isso existe o
  [slot do próximo experimento](slot-proximo-experimento.md)).
- O **produto é o herói**; stars/commits/PRs/sparkline são secundários e discretos.
- CTA sempre via `/go/[slug]` (nunca link direto à `targetUrl`).
