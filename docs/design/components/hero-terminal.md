# Componente: HeroTerminal

Hero da landing — cover full-bleed atrás de uma "voz de terminal" que datilografa `ls ./panlabs`.

## Código

- [`apps/web/src/components/HeroTerminal/HeroTerminal.tsx`](../../../apps/web/src/components/HeroTerminal/HeroTerminal.tsx)
- [`apps/web/src/components/HeroTerminal/HeroTerminal.module.css`](../../../apps/web/src/components/HeroTerminal/HeroTerminal.module.css)

## Estrutura

```
<section.hero>                       ← isolation: isolate; overflow: hidden
  <div.cover aria-hidden>            ← camada full-bleed (z 0)
    <Image hero-cover-v2.png fill priority/>
    <span.coverScrim/>              ← gradiente escuro por cima
  <div.inner>                        ← container 1080px (z 1)
    <div.prompt> panini@panlabs : ~ $ ls ./panlabs
    <h1.title> <span.type>ls <span.gradient>./panlabs</span></span> <span.cursor/>
    <p.lede> Laboratório vivo …
```

## Cover (adição sobre Chosen)

`/assets/hero-cover-v2.png`, `next/image fill priority sizes="100vw"`, `alt=""`. Tratamento controlado por
**knobs** na `.hero` (TUNE HERE):

- `--hero-cover-blur: 3px` — desfoque da imagem.
- `--hero-cover-brightness: 0.3` — escurecimento.
- `--hero-cover-scrim: 0.72` — opacidade do véu (`.coverScrim`, gradiente 3-stop em `rgba(7,8,10,·)`).

A imagem leva `transform: scale(1.06)` para esconder as bordas suaves que o `blur()` deixa.

## Prompt

Linha mono `--fs-hero-prompt`, montada por spans coloridos: `.user` (verde terminal, semibold) `.colon`
(faint) `.tilde` (azul terminal) `.dollar` (body) `.space` `.command` (muted) → `panini@panlabs:~$
ls ./panlabs`.

## Título — typewriter

- `.type` clipa `ls ./panlabs` por `max-width` em `pl-type` `steps(--type-steps)` — um passo por glifo.
- Knobs na `.title`: `--type-steps: 12`, `--type-duration: 1.4s`, `--type-delay: 280ms`,
  `--caret-blink-at: 1750ms`.
- `.gradient` aplica `--gradient-brand` (background-clip: text) **só em `./panlabs`**; o `ls ` fica em
  `--text-max`.
- `.cursor` (caret): bloco `--accent-violet`, `--size-cursor-w/h`; **sólido enquanto "digita"**, começa a
  piscar (`pl-blink`) só em `--caret-blink-at`.
- Roda **a cada load/refresh**.

## Lede

`--fs-hero-lede`, `--lh-hero-lede`, `--text-hero`, `max-width: var(--size-hero-lede-max)` (580px).

## Movimento

Keyframes `pl-type` e `pl-blink` **co-localizadas** neste módulo (ver
[design-spec](../design-spec.md#movimento)). Sob reduced-motion: `.type` fica com o texto cheio (sem
animação) e o caret estático (visível).

## Responsivo

`≤ 639px`: `.inner` padding `var(--space-10) var(--space-5)`; título `32px`/`-1px`; caret `10×28`,
`vertical-align: -4px`.

## Copy

Strings canônicas em [design-spec](../design-spec.md#voz--copy). **Atenção:** o lede aqui diz "soluções de
**softwares**" — diverge do "software" (singular) da OG/`seo.ts`. Mantido como está (não é trabalho de
design alterar copy).

## a11y

`.cover` e `.cursor` são `aria-hidden`. O `h1` carrega o texto real do título.
