# Componente: Slot do próximo experimento

O terceiro item do grid — o *rascunho* de uma Solução futura. **Não é um Card** e **não é uma Solução**
([CONTEXT.md → Slot do próximo experimento](../../CONTEXT.md)). Identificador de código: `PlaceholderCard`.

## Código

- [`apps/web/src/components/PlaceholderCard/PlaceholderCard.tsx`](../../../apps/web/src/components/PlaceholderCard/PlaceholderCard.tsx)
- [`apps/web/src/components/PlaceholderCard/PlaceholderCard.module.css`](../../../apps/web/src/components/PlaceholderCard/PlaceholderCard.module.css)

## Estrutura

```
<article.card aria-label="Próximo experimento a caminho">   ← bordas tracejadas
  <div.preview>
    <span.badge>em breve</span>                ← na posição da pílula de status
  <div.body>
    <span.line.lineSm aria-hidden/>            ← skeleton (52%)
    <span.line.lineLg aria-hidden/>            ← skeleton (96%, delay 0.18s)
    <span.chips aria-hidden> <chip×3/> </span>  ← skeleton (56/44/50px, delays escalonados)
    <p.copy>// incubando o próximo experimento</p>
```

## Forma

- `background: var(--color-w-022)`, `border: hairline dashed var(--border-default)`, `border-radius:
  var(--radius-card)`. **Inerte** — sem hover lift (o draft anima sozinho).
- `.preview`: mesma altura do card real (148px), `border-bottom` tracejado.
- `.badge` `em breve`: fixado no **mesmo ponto** da pílula de status do card real (piso do preview,
  direita), para alinhar com os badges `live`/`beta` na grade. Mono uppercase, `--accent-lilac`, borda
  `--color-hover-border`.
- Skeleton: `.line`/`.chip` com gradiente `--color-w-045 → --color-w-10 → --color-w-045` animado por
  `pl-shimmer` (2.6s), com `animation-delay` escalonados.
- `.copy`: mono, `--text-muted`, empurrada para o rodapé (`margin-top: auto`).

## Movimento & a11y

- Keyframe `pl-shimmer` **co-localizada**. Reduced-motion: shimmer **off** (linhas/chips parados,
  visíveis).
- `aria-label` nomeia o `article`; linhas/chips skeleton são `aria-hidden`.

## Invariante de honestidade

O slot anuncia "próximo experimento a caminho" **sem fingir** vitalidade, redirect ou status reais:

- O `em breve` **não é** um status real (`live`/`beta`) — é um sinal de "vindo".
- O skeleton **não são** dados falsos — são placeholders de forma.
- **Sem** link, stats ou CTA (não clicável).

A forma (badge + shimmer) foi **abençoada** na Fase 2 sobre a letra do
[ADR-0012 §3](../../adr/0012-design-oficial-chosen-e-faseamento.md) (que pedia `// TODO` anônimo, "sem
badge, zero motion"): o card-em-rascunho comunica melhor que um slot morto, **preservando a invariante**
(ver §Reconciliação as-built do ADR). Existe para o grid não "mancar", não para representar um produto.
