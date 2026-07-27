# Design system

How engineering/design agents should consume the panlabs design system when doing any visual or UI work.

This repo has an **as-built design contract** under [`docs/design/`](../design/README.md). Read it before
touching styling, layout, components, motion, or accessibility. It describes the form that is **actually in
production**, written for agents.

## Before any visual work, read these

- [`docs/design/README.md`](../design/README.md) — principles + where each thing lives.
- [`docs/design/design-spec.md`](../design/design-spec.md) — token taxonomy, typography, voice & copy,
  motion, conscious literals.
- [`docs/design/layout.md`](../design/layout.md) and [`docs/design/accessibility.md`](../design/accessibility.md)
  — the cross-cutting rules.
- The relevant `docs/design/components/*.md` for the piece you're editing.

If any of these don't exist yet, proceed silently.

## Source of truth vs origin

- **Source of truth (live):** the code in `apps/web/src/`. Tokens in `apps/web/src/styles/theme.css`; resets/focus in
  `apps/web/src/styles/base.css`; each component's form in its co-located `*.module.css`.
- **Credited origin (frozen):** "Chosen", the official prototype, in `.claude/design/panlabs/` —
  **gitignored**. Don't un-ignore it; don't treat it as current truth. Where as-built diverged from Chosen,
  as-built wins. The full delta map is [`docs/design/procedencia-e-deltas.md`](../design/procedencia-e-deltas.md).

## Form authority

The design owns **form** (placement, which indicators appear, visual treatment) —
[ADR-0011](../adr/0011-produto-primeiro-indicadores-secundarios.md),
[ADR-0012](../adr/0012-design-oficial-chosen-e-faseamento.md). ADRs/CONTEXT own **intent and invariants**.
Where form contradicts an ADR, follow the form — but **surface the contradiction explicitly**, never
silently. (Same rule as [domain.md](domain.md#flag-adr-conflicts).)

## Conventions you must follow

- **Token, not literal.** Use the CSS vars from `theme.css`. The only exceptions are the **conscious
  literals** catalogued in the [design-spec](../design/design-spec.md#literais-conscientes) (OG image, CTA
  ring, sparkline gradient, hero scrim) — when you touch one, keep its mirror token in sync.
- **Co-locate keyframes.** CSS Modules scope `animation-name`; a global `@keyframes` in `theme.css` would
  never match a scoped reference and the animation silently no-ops. Declare each keyframe in the
  `*.module.css` that uses it.
- **Per-component reduced-motion.** Every animated component carries its own
  `@media (prefers-reduced-motion: reduce)` block; nothing should *disappear* under it.
- **Copy is pt-BR.** Don't translate the terminal copy; don't change the lowercase casing of solution names.
- **A11y is a contract.** Focus-visible ring, `aria-hidden` on decorative nodes, `alt=""` on decorative
  images — see [accessibility.md](../design/accessibility.md).

## Common tasks

- **Add a solution to the catalog** → [`docs/design/como-adicionar-uma-solucao.md`](../design/como-adicionar-uma-solucao.md).
- **Add a tech icon** → [`docs/design/components/icon.md`](../design/components/icon.md).

## Use the glossary's vocabulary

Name domain concepts with the terms from [`docs/CONTEXT.md`](../CONTEXT.md) (**Solução**, **Card**,
**Slot do próximo experimento**, **URL-alvo**, **Redirect rastreado**, **Vitalidade**, **tech-chips**). The
slot is **not** a Card and a Card is **not** anything but a real Solução.
