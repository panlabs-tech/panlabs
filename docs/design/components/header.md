# Componente: Header

Barra fixa do topo — marca + wordmark + mote. Read-only, **sem navegação** (a superfície V1 é uma landing
única, [ADR-0008](../../adr/0008-superficie-v1-landing-unica.md)).

## Código

- [`apps/web/src/components/Header/Header.tsx`](../../../apps/web/src/components/Header/Header.tsx)
- [`apps/web/src/components/Header/Logo.tsx`](../../../apps/web/src/components/Header/Logo.tsx)
- [`apps/web/src/components/Header/Header.module.css`](../../../apps/web/src/components/Header/Header.module.css)

## Estrutura

```
<header.header>            ← sticky, translúcido, backdrop-blur
  <Logo.logo size=30/>     ← marca circular (raster apple-touch-icon)
  <span.wordmark>panlabs   ← Manrope extrabold
  <span.meta>/ catálogo    ← mono, faint
  <span.spacer/>           ← flex: 1
  <span.tagline>           ← mono: build * automate * innovate
    build <*.astBlue> automate <*.astViolet> innovate
```

## Forma

- **Sticky:** `position: sticky; top: 0; z-index: var(--z-header)`; `background: var(--bg-header)`
  (translúcido) + `backdrop-filter: blur(12px)`; `height: 58px`; `border-bottom` hairline. A translucidez
  **depende** do alpha de `--bg-header` — não troque por uma cor sólida sem revisar o efeito.
- **Wordmark** `panlabs`: `--fs-wordmark`, `--fw-extrabold`, `--text-strong`.
- **Meta** `/ catálogo`: mono, `--fs-nav-meta`, `--text-faint`.
- **Tagline** `build * automate * innovate`: mono, `--text` cinza-60; os `*` recebem `.astBlue`
  (`--color-brand-blue`) e `.astViolet` (`--color-brand-violet-light`).

## Logo

- Renderiza o raster **`/assets/apple-touch-icon.png`** via `next/image`, `priority` (above-the-fold),
  `alt="panlabs"`, quadrado `size` (30px no header).
- O CSS o recorta em **círculo** (`border-radius: var(--radius-full)` = 50%) — "marca circular" de Chosen,
  restaurada na Fase 3.
- `forced-color-adjust: none` (exceção de marca — ver [accessibility.md](../accessibility.md#forced-colors-alto-contraste)).

> **Tarefa de asset em aberto:** a marca canônica deveria ser um **SVG**. O app-icon raster recortado em
> círculo pode cortar imperfeito. Produzir o SVG é tarefa separada (candidata a issue). Até lá, o raster
> circular é o estado sancionado.

## Responsivo

`≤ 767px`: a tagline some (`display: none`) — é ruído em tela pequena. Logo + wordmark + meta permanecem.

## Invariantes

- Sem links de navegação (landing única).
- A marca é exibição, não CTA — não vira link/ação.
