# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

This repo is **single-context**. Note the docs live under `docs/` (not at the repo root): `docs/CONTEXT.md`, `docs/VISION.md`, `docs/adr/`.

## Before exploring, read these

- **`docs/CONTEXT.md`** — the glossary + invariants (the project's shared domain language).
- **`docs/VISION.md`** — what panlabs is, its scope, and the V1 success criterion.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in (`docs/adr/README.md` is the index, 0001–0014).

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

Single-context repo, docs nested under `docs/`:

```
/
├── AGENTS.md                         ← source of truth for agent guidance
├── CLAUDE.md                         ← defers to AGENTS.md
├── docs/
│   ├── CONTEXT.md
│   ├── VISION.md
│   └── adr/
│       ├── README.md
│       ├── 0001-vitrine-agregador-read-only.md
│       └── … 0014-autonomia-total-dos-agentes.md
└── apps/web/src/                     ← the application code
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `docs/CONTEXT.md` (e.g. **Solução**, **Card**, **URL-alvo**, **Redirect rastreado** `/go/[slug]`, **Vitalidade**, **tech-chips**). Don't drift to synonyms the glossary explicitly avoids (e.g. "app do panlabs").

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0005 (indicadores) — but worth reopening because…_

**Design-authority exception (panlabs-specific).** The official design "Chosen" holds **form authority** ([ADR-0011](../adr/0011-produto-primeiro-indicadores-secundarios.md) / [ADR-0012](../adr/0012-design-oficial-chosen-e-faseamento.md)): where the design contradicts an ADR about *form* (placement, which indicators appear, visual treatment), **the design wins** — still surface the contradiction, but follow the design. ADRs remain authoritative on *intent and invariants*.
