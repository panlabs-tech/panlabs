# Primitivo: Reveal (scroll-driven) + Prompt

Duas peças compartilhadas que nasceram com as **camadas de scroll** (Manifesto, DomainArchitecture,
Footer). Não desenham nada sozinhas — dão o **movimento** e a **voz de terminal** que as três camadas
herdam.

## Reveal — revelar ao rolar

- [`apps/web/src/components/Reveal/Reveal.tsx`](../../../apps/web/src/components/Reveal/Reveal.tsx) — wrapper `"use client"`.
- [`apps/web/src/components/Reveal/useReveal.ts`](../../../apps/web/src/components/Reveal/useReveal.ts) — o hook do observer.
- [`apps/web/src/components/Reveal/Reveal.module.css`](../../../apps/web/src/components/Reveal/Reveal.module.css) — a forma.

`<Reveal>` é um `div` **semanticamente neutro**: o conteúdo (heading, parágrafo, card, diagrama) vive
**dentro** dele. Na primeira vez que entra na viewport, faz fade + sobe `--reveal-shift` (26px) para o
lugar — **reveal-once** (depois desobserva). É o primeiro (e único) componente client do `apps/web/src/`.

- **Observer** (`useReveal`): `IntersectionObserver` com `threshold: 0.16` e `rootMargin:
  "0px 0px -7% 0px"` (dispara um tico antes de estar 100% na tela). Espelha o protótipo Chosen das camadas.
- **Estado exposto:** o root recebe `data-shown="true"|"false"`. Descendentes que **desenham** ao revelar
  (traços SVG) leem esse atributo do seu **próprio** módulo: `.diagram[data-shown="true"] .connector { … }`
  — atributo global + classe local compõem entre módulos sem vazar.
- **Motion:** `opacity`/`transform` com `--duration-reveal` (900ms); easings `--easing-standard` (opacity) e
  `--easing-card` (transform).

### Degradação & reduced-motion

- **Sem IntersectionObserver** (SSR, jsdom, engines antigas): o hook liga `shown` no mount — o conteúdo
  **nunca fica preso escondido**.
- **Reduced-motion:** `.rv` já nasce no estado final (visível, sem transição). Nada **some**.
- **Trade-off consciente (JS-gated):** com motion normal **e JS desligado**, a camada fica em `opacity:0`
  até o JS revelar — fiel ao protótipo Chosen, que também porta o reveal no JS. O HTML é SSR/estático
  (crawlers leem o conteúdo) e reduced-motion mostra tudo. Ver
  [accessibility.md](../accessibility.md#reduced-motion).

## Prompt — assinatura de terminal

- [`apps/web/src/components/Terminal/Prompt.tsx`](../../../apps/web/src/components/Terminal/Prompt.tsx) + `Prompt.module.css`.

A linha `panini@panlabs:~$ <command> <arg>` montada por spans coloridos — os **mesmos papéis** do prompt do
hero (`.user` verde · `.colon` faint · `.tilde` azul terminal · `.dollar` body), com o `command` em
`--text-muted` e o `arg` (arquivo lido) em `--text-default`. Tamanho `--fs-hero-prompt` (13px).

Usado por **Manifesto** (`cat manifesto.txt`) e **Footer** (`cat next_steps.md`). O hero **não** usa este
componente: lá a mesma linha também dirige o typewriter, então é montada inline.
