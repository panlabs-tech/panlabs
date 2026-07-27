# Componente: Icon

Ícones de marca **inline e auto-hospedados** (paths do Simple Icons, CC0/MIT). Substituem a dependência de
runtime do `cdn.simpleicons.org` (#15) — nada de request externo por ícone.

## Código

- [`apps/web/src/components/Icon/Icon.tsx`](../../../apps/web/src/components/Icon/Icon.tsx)
- [`apps/web/src/lib/icons.ts`](../../../apps/web/src/lib/icons.ts)

## Contrato

`<Icon slug size? className? />`:

- Resolve `slug` (slug do Simple Icons) contra o set local `ICONS`.
- **Slug desconhecido → renderiza `null`** (degrada para sem-ícone, nunca um request quebrado).
- Renderiza `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">` com um
  único `<path>`.
- `size` em px (quadrado), default **12**. Usos: chips de tech 12px; ícone `github` do stat 9px.
- `currentColor` → a cor do texto do pai tinge o ícone e o **forced-colors** o mantém visível.

## Set atual

`nextdotjs`, `postgresql`, `typescript`, `fastapi`, `github`. (Sem `python` — nenhuma Solução usa; o set é
enxuto de propósito.)

## Como adicionar um ícone

1. Pegue o `path` do mark no [Simple Icons](https://simpleicons.org) (um único `d` num viewBox 24×24).
2. Adicione a entrada em `ICONS` (`apps/web/src/lib/icons.ts`) com `title` (nome acessível da fonte) e `path`.
3. Referencie pelo `slug` em `tech[].slug` da Solução em `apps/web/src/data/solutions.ts` (ver
   [como-adicionar-uma-solucao.md](../como-adicionar-uma-solucao.md)).

## Invariantes

- Um ícone é **decorativo** (acompanha um label de texto) — sempre `aria-hidden`.
- Não introduzir fetch externo de ícone (a auto-hospedagem é a decisão; #15).
