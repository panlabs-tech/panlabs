# Procedência & deltas — Chosen → as-built

> **Status:** **Fase 1 (auditoria) concluída** + log das fases seguintes.
> As seções §1–§7 são a **auditoria histórica** (Chosen → as-built, congelada como foi encontrada).
> A **Fase 2** (reconciliação de domínio) está registrada na **§8**; a **Fase 3** (execução: edições de
> código + materialização dos design docs) na **§9**. Onde §1–§7 ficaram factualmente superadas, a §9
> aponta a correção — leia §8 e §9 para o **estado corrente**.
>
> Mapa de navegação dos docs de design: [README.md](README.md).

---

## 1. Procedência

- **Origem:** **"Chosen"** — protótipo oficial e único (`panlabs.dc.html`), destilado pelo "Claude Design".
- **Extração:** 2026-06-22 · **versão do sistema:** 1.0.0 · **tema:** único (escuro).
- **Bundle:** `.claude/design/panlabs/` — `design-spec.md`, `tokens.json`, `theme.css`, `handoff.md`,
  `layout.md`, `accessibility.md`, `assets.md`, `components/*.md`.
- **Natureza:** o bundle é **congelado e gitignored** (`.gitignore` ignora `.claude/design`). Ele *documenta*
  Chosen; não o evolui ("Implementar exatamente como está" — `design-spec.md §11`). É a **origem creditada**,
  não a fonte-da-verdade viva.

## 2. Princípio de leitura

1. **`apps/web/src/` é a fonte-da-verdade** (as-built). Onde `apps/web/src/` e o bundle divergem, **`apps/web/src/` vence** — o bundle
   é o ponto de partida histórico.
2. **O design é dono da forma** ([ADR-0011](../adr/0011-produto-primeiro-indicadores-secundarios.md),
   [ADR-0012](../adr/0012-design-oficial-chosen-e-faseamento.md)). Evoluções de forma sobre Chosen são
   legítimas; os ADRs mandam em **intenção e invariantes**.
3. **Contradições com ADR são explicitadas** (não resolvidas em silêncio) — seção 4, marcadas `[Contradiz ADR]`.

**Legenda de classificação dos deltas:**

| Tag | Significado |
|---|---|
| `[Adição]` | as-built introduz algo ausente em Chosen |
| `[Forma]` | forma evoluída sobre Chosen (design é dono — ADR-0011/0012) |
| `[Lacuna fechada]` | recomendação/lacuna do `handoff.md` agora implementada |
| `[Contradiz ADR]` | conflito de intenção → **Fase 2** |
| `[Vestigial]` | token/artefato definido porém sem uso (verificado) |
| `[Defasado]` | comentário/artefato no código que descreve estado antigo → limpar na Fase 3 |

---

## 3. Mapa de deltas (Chosen → as-built)

### 3.A — Tokens (`apps/web/src/styles/theme.css` vs bundle `theme.css`)

Quatro valores mudaram; o resto é idêntico (com normalização cosmética de caixa nos hex de marca).

| Token | Chosen (origem) | as-built | Âncora | Classe |
|---|---|---|---|---|
| `--gradient-preview-overlay` | 3 paradas, cor única `rgba(11,12,16,·)` `.18 / .43@52% / .82` (`previewDarken=0.6`) | **4 paradas**, ink graduado: `rgba(7,8,10,.4) / rgba(8,9,12,.6)@42% / rgba(9,10,14,.9)@74% / rgba(12,13,17,.94)` — afunda o preview em ink quase-sólido | `theme.css:101-107` | `[Forma]` |
| `--fs-stat-value` | `14px` | **`15px`** | `theme.css:140` | `[Forma]` |
| `--fs-stat-label` | `8.5px` | **`9.5px`** | `theme.css:141` | `[Forma]` / parcialmente `[Lacuna fechada]` (a11y) |
| `--font-sans` / `--font-mono` | `'Manrope', …` / `'JetBrains Mono', …` | **prefixa var do `next/font`**: `var(--font-manrope), "Manrope", …` / `var(--font-jetbrains), …` | `theme.css:112-113` | `[Lacuna fechada]` (auto-hospedagem) |
| hex de marca (`--color-brand-*`, `--gradient-brand`) | maiúsculas (`#C44FD0`) | minúsculas (`#c44fd0`) | `theme.css:33-35,97` | cosmético |

**Arquitetura de tokens — mudança estrutural (não muda valor):**
- Chosen colocava `@keyframes pl-blink` e um `@media (prefers-reduced-motion)` *blanket* **dentro de `theme.css`**.
  No as-built ambos saíram de lá: **keyframes co-localizadas em cada `*.module.css`** (CSS Modules escopam
  `animation-name`; keyframe global nunca casaria) e reduced-motion tratado por componente + `base.css`.
  Há NB explicando no próprio arquivo (`theme.css:210-213`). `[Forma]`
- As paradas de breakpoint comentadas no `theme.css` de Chosen foram removidas; breakpoints reais vivem nos módulos.

### 3.B — HeroTerminal (`apps/web/src/components/HeroTerminal/`)

| Delta | Chosen | as-built | Âncora | Classe |
|---|---|---|---|---|
| Cover full-bleed | hero **sem imagem** (copy sobre o ink raiz) | imagem `/assets/hero-cover-v2.png` atrás da copy, com knobs `--hero-cover-blur:3px`, `--hero-cover-brightness:.3`, `--hero-cover-scrim:.72` (scrim em gradiente 3-stop) | `HeroTerminal.tsx:10-20`, `.module.css:11-42` | `[Adição]` |
| Typewriter | h1 **estático** + cursor sempre piscando (`pl-blink`) | h1 **datilografa** `ls ./panlabs` (`pl-type`, `--type-steps:12`, `--type-duration:1.4s`, `--type-delay:280ms`); o caret só começa a piscar em `--caret-blink-at:1750ms` | `.module.css:98-138,184-202`; `tsx:31-36` | `[Adição]` |
| Gradiente no h1 | "h1 `ls ./panlabs` (gradiente)" | gradiente aplicado **só em `./panlabs`**; `ls ` fica em `--text-max` | `tsx:32-34` | `[Forma]` (nuance) |
| Responsivo | sem media queries | título cai p/ `32px` e caret encolhe `<640px` | `.module.css:162-177` | `[Lacuna fechada]` |
| Reduced-motion | — | congela typewriter (texto cheio) + caret estático | `.module.css:150-159` | `[Lacuna fechada]` |

### 3.C — SolutionCard + preview (`apps/web/src/components/SolutionCard/`)

| Delta | Chosen | as-built | Âncora | Classe |
|---|---|---|---|---|
| Render do shot | CSS `background-size:cover; position:top center` | `next/image` `fill` (`object-fit:cover; object-position:top center`) | `tsx:15-21`, `.module.css:27-29` | `[Forma]`/`[Lacuna fechada]` (otimização) |
| Filtro do shot | `blur(2.5px) brightness(0.76)` (`design-spec §7`) | **`blur(1.5px)` brightness(0.76)** (blur reduzido) | `.module.css:30-34` | `[Forma]` — comentário "2.5" **corrigido na Fase 3 (Trilha A)** ✅ |
| Zoom do shot | hover `scale(1.05)` | base `scale(1.06)` → hover `scale(1.12)` | `.module.css:31,36-38` | `[Forma]` |
| Overlay | token 3-stop leve | token 4-stop pesado (ver 3.A) | `.module.css:40-45` | `[Forma]` |
| Título + status | badge + nome sobre o preview | **variante `statusInline`**: `h3` nome + pílula de status na mesma `titleRow`, fixada no piso do preview | `tsx:23-29`, `.module.css:48-99` | `[Forma]` (variante sancionada) |
| Enum de status | 4 (`idea/alpha/beta/live`) | **`"live" \| "beta"`** (só os dois estilizados) | `data/solutions.ts:1`, `.module.css:81-87` | `[Forma]` (escopo V1.0) |
| Sparkline id | `<linearGradient id="plgrad">` único | **id por slug** `plspark-${slug}` (evita colisão entre cards) | `tsx:10,79-85` | `[Forma]` |
| CTA destino | `$ touch <slug> →` direto p/ `targetUrl` (V1.0) | `href={/go/${slug}}` `target=_blank rel="noopener noreferrer"` (redirect rastreado) | `tsx:91` | `[Contradiz ADR]` (fase, ver 4.2) |
| CTA hover | "fundo vira gradiente de marca" (`design-spec §6`) | **anel** de gradiente (border via `mask-composite`) + fluxo `pl-cta-flow` + seta `translateX(3px)`; mesmo tratamento em `:focus-visible` | `.module.css:261-300` | `[Forma]` + `[Lacuna fechada]` (foco) |
| Touch target | ~38px | `min-height:44px` no CTA `<640px` | `.module.css:303-310` | `[Lacuna fechada]` |
| Reduced-motion | — | sem lift/zoom; sparkline já desenhada; sem fluxo/seta | `.module.css:313-339` | `[Lacuna fechada]` |

### 3.D — Header / Logo (`apps/web/src/components/Header/`)

| Delta | Chosen | as-built | Âncora | Classe |
|---|---|---|---|---|
| Marca | `assets/logo.png` 30×30 (`design-spec §7`) | **`/assets/apple-touch-icon.png`** (raster) via `next/image`, `priority` | `Logo.tsx:15-25` | `[Forma]` |
| Raio da marca | `border-radius:50%` (círculo) | era `border-radius:8px`; **restaurado para `var(--radius-full)` (círculo) na Fase 3 (Trilha A)** ✅ | `Header.module.css:19-26` | `[Forma]` — resolvido |
| Logo SVG | handoff pedia logo **SVG** | continua **raster** (SVG não produzido) | — | lacuna **aberta** (tarefa de asset) |
| Header fixo | "Barra fixa" + `--bg-header` translúcido + `--z-header` | era não-sticky (regressão); **sticky restaurado na Fase 3 (Trilha A)** — `position:sticky`, `backdrop-filter`, `--z-header` agora em uso ✅ | `Header.module.css:1-17` | `[Forma]` — resolvido |
| Forced-colors | — | `forced-color-adjust:none` na marca | `Header.module.css:15` | `[Lacuna fechada]` |
| Responsivo | — | tagline some `<768px` | `Header.module.css:53-57` | `[Lacuna fechada]` |

### 3.E — PlaceholderCard (`apps/web/src/components/PlaceholderCard/`)

| Delta | [ADR-0012](../adr/0012-design-oficial-chosen-e-faseamento.md) §3 (draft slot) | as-built | Âncora | Classe |
|---|---|---|---|---|
| Slot do "próximo" | anônimo `// TODO`, **sem badge**, sem link/stats/CTA, preview vazio, **zero motion** | badge **`em breve`** (no lugar da pílula de status) + **linhas/chips skeleton com shimmer** (`pl-shimmer` 2.6s) + copy `// incubando o próximo experimento`; bordas tracejadas; inerte (sem link/stats/CTA) | `PlaceholderCard.tsx:10-29`, `.module.css:20-34,45-98,118-125` | **`[Contradiz ADR]`** (ver 4.1) |

> Mantém a **intenção** do ADR (slot inerte, não clicável, que não finge ser solução real), mas viola duas
> restrições literais: "sem badge" e "zero motion".

### 3.F — Catalog (`apps/web/src/components/Catalog/`)

| Delta | Chosen / ADR | as-built | Âncora | Classe |
|---|---|---|---|---|
| Composição | 3 cards (incl. `querymind`) em Chosen; ADR-0012 = 2 reais + 1 placeholder | 2 reais (`epistemix`, `traveltogether`) + 1 `PlaceholderCard` | `Catalog.tsx:15-20`, `data/solutions.ts:68` | OK (segue ADR-0012) |
| `querymind` | 3º card (status `alpha/idea`, `shot-querymind`) | **removido**. _(Correção §8: **os 3** `--color-shot-*` eram vestigiais — não só o de querymind — pois o fundo do preview é `data.shotBg`. Todos **removidos** na Fase 3, Trilha A.)_ ✅ | `solutions.ts:27`, `theme.css:16-18` | `[Vestigial]` — resolvido (drift verificado: nenhum, ver §8) |
| Meta da seção | `// 3 soluções no ar · preview ao vivo` | `// ${count} soluções no ar · preview ao vivo` com `count = live.length` (= 2) | `Catalog.tsx:14` | `[Forma]` (contagem dinâmica) |
| Vitalidade | curada estática (V1.0) | **vitalidade GitHub ao vivo**: `Promise.all(solutions.map(resolveVitality))`, overlay sobre os valores curados, semântica [ADR-0013](../adr/0013-semantica-vitalidade-live-commits-prs.md) | `Catalog.tsx:9`, `lib/github.ts` | `[Contradiz ADR]` (fase, ver 4.2) |
| Streaming | — | `<Suspense>` isola o catálogo p/ o hero não esperar a rede | `app/page.tsx:14-16` | `[Adição]` |

### 3.G — Iconografia (`apps/web/src/lib/icons.ts`, `apps/web/src/components/Icon/`)

| Delta | Chosen | as-built | Âncora | Classe |
|---|---|---|---|---|
| Fonte dos ícones | **CDN** `cdn.simpleicons.org` (`design-spec §7`) | **auto-hospedado**: paths inline (Simple Icons CC0/MIT), `<svg currentColor>`, retorna `null` p/ slug desconhecido | `lib/icons.ts`, `Icon.tsx` | `[Lacuna fechada]` |
| Conjunto | inclui `python` | `nextdotjs, postgresql, typescript, fastapi, github` (sem `python` — nenhuma solução usa) | `lib/icons.ts:15-36` | `[Forma]` |
| Comentário | — | era "used to build the CDN icon URL"; **corrigido na Fase 3 (Trilha A)** para "self-hosted inline path in src/lib/icons.ts" | `data/solutions.ts:5` | `[Defasado]` — resolvido ✅ |

### 3.H — Fontes (`apps/web/src/app/layout.tsx`)

| Delta | Chosen | as-built | Âncora | Classe |
|---|---|---|---|---|
| Entrega | famílias por nome (Google Fonts implícito) | **`next/font/local`** com woff2 latinos (`manrope`/`jetbrains-mono`), variáveis, `display:swap` | `app/layout.tsx:1-20`, `apps/web/src/fonts/*.woff2` | `[Lacuna fechada]` |

### 3.I — Acessibilidade (global)

`accessibility.md` **recomendava**; o as-built **implementou**:
- `:focus-visible` outline `2px var(--accent-violet)` offset 2px (`base.css:42-47`) — fecha I-04. `[Lacuna fechada]`
- `prefers-reduced-motion` por componente + `base.css:49-53`. `[Lacuna fechada]`
- HTML semântico `header/main/article/h3/ul/li` (I-09). `[Lacuna fechada]`
- `forced-color-adjust` na marca; `aria-hidden`/`focusable=false` em ícones e sparkline; `aria-label` no placeholder; `alt=""` em imagens decorativas. `[Lacuna fechada]`
- **Caveat persistente:** micro-labels seguem nas cores sub-AA (`--text-faint` `#5f656e` em `statLabel` 9.5px; nav-tagline `#6a7079` 10.5px). O bump 8.5→9.5px ameniza mas não cruza o limiar de "texto grande". Mantido por fidelidade (decisão de Chosen/handoff). `[Forma]`

### 3.J — SEO / Open Graph / favicons (`apps/web/src/lib/seo.ts`, `apps/web/src/app/opengraph-image.tsx`)

Inexistentes em Chosen (protótipo HTML único). `[Adição]` / `[Lacuna fechada]` parcial:
- `siteMetadata`: title/description, canonical, favicons (`favicon-32`, `favicon-192`, `apple-touch-icon`), OpenGraph `pt_BR`, Twitter `summary_large_image` (`lib/seo.ts`).
- OG dinâmica 1200×630 reproduzindo o hero (`app/opengraph-image.tsx`) — **usa hex literais** (runtime de borda não lê CSS vars; precisa sincronia manual com os tokens). `[Defasado-risco]`
- **logo SVG** ainda pendente (lacuna do handoff aberta — ver 3.D).
- Observação: a wordmark da OG é `panlabs` (gradiente), enquanto o hero exibe `ls ./panlabs` — divergência de marca provavelmente intencional (OG mostra a marca limpa).

### 3.K — Backend V1.1 já presente (contexto p/ o conflito de fase)

Fora da camada de design, mas decisivo para 4.2:
- `/go/[slug]` redirect rastreado (302) com gravação de clique que nunca bloqueia o visitante — `app/go/[slug]/route.ts`, `lib/go.ts`.
- Persistência de clique — `lib/db.ts`. Cabeçalhos de segurança — `lib/security-headers.ts`.
- Vitalidade GitHub ao vivo com cache/revalidate e degradação graciosa — `lib/github.ts`.

→ O `apps/web/src/` está **em território V1.1**, não V1.0.

---

## 4. Conflitos as-built ↔ ADR (worklist da Fase 2)

> Canal: **`/grill-with-docs` → `/domain-modeling`** (edição de ADR/CONTEXT/VISION é da Fase 2, **não** deste
> trabalho de design). Cada item traz **resolução proposta** — a decisão é do dono do domínio.

### 4.1 — Draft slot: ADR-0012 §3 × `PlaceholderCard` `[Contradiz ADR]`
- **ADR diz:** placeholder anônimo `// TODO`, **sem badge**, **zero motion**.
- **as-built faz:** badge `em breve` + skeleton com shimmer + copy `// incubando o próximo experimento`.
- **Proposta:** adicionar **nota de reconciliação** no ADR-0012 §3 abençoando a forma enviada (o "card-em-rascunho"
  lê melhor que um `// TODO` morto; design é dono da forma — ADR-0011), **preservando a invariante** (inerte,
  não clicável, não finge ser solução real). Alternativa, se o dono priorizar a restrição: reverter o
  `PlaceholderCard` para a forma austera. **Recomendado:** reconciliar o ADR à forma enviada.

### 4.2 — Faseamento V1.0/V1.1: ADR-0012 §2 × `/go` + vitalidade ao vivo `[Contradiz ADR]`
- **ADR diz:** V1.0 = front-end + estático curado, CTA **direto**; V1.1 = `/go/[slug]` + Postgres + vitalidade ao vivo.
- **as-built faz:** `/go`, DB, e vitalidade ao vivo **já em produção** (3.C, 3.F, 3.K).
- **Proposta:** atualizar ADR-0012 §2 registrando que **V1.1 aterrissou** (ou que o faseamento colapsou), tornando
  CTA `/go` + vitalidade ao vivo o **estado corrente sancionado**, não futuro. A Fase 2 decide se marca V1.1 como
  "em andamento/concluída" ou re-escopa. **Recomendado:** registrar V1.1 como corrente.

### 4.3 — `querymind` / catálogo: ADR-0006 e CONTEXT/VISION `[verificar drift]`
- **as-built:** `querymind` não está no catálogo; sobra `--color-shot-querymind` `[Vestigial]`.
- **Proposta:** na Fase 2, varrer CONTEXT/VISION/[ADR-0006](../adr/0006-catalogo-tres-fontes.md) por menções que
  tratem `querymind` como item vigente do catálogo e alinhar com a composição real (2 reais + 1 placeholder).
  Manter o token vestigial é aceitável ("status `idea` definido p/ futuro" — `handoff.md §6`); decidir explicitamente.

> **Não são conflito de ADR** (design é dono da forma; ficam documentados como deltas e nada exigem da Fase 2):
> stat `14→15`/`8.5→9.5`, overlay 4-stop, cover/typewriter do hero, anel do CTA, marca raster 8px, header não-sticky.
> O bump de stat encosta em [ADR-0005](../adr/0005-indicadores.md)/[ADR-0011](../adr/0011-produto-primeiro-indicadores-secundarios.md)
> (indicadores secundários) mas permanece dentro do "secundário".

---

## 5. Higiene do sistema de tokens

### 5.1 — Tokens vestigiais (definidos em `theme.css`, **zero uso** no `apps/web/src/` — verificado)

**Reserva documentada** (permanecem; não remover sem decisão — parte é reserva intencional, `handoff.md §6`):
`--feedback-success/warning/info/neutral` (status usa `--color-status-live/beta` direto) · `--gradient-spark-fill`
(sparkline usa `<linearGradient>` inline por slug) · `--bg-card-header` (slot usa `--color-w-022` direto) ·
`--size-tech-icon`, `--size-github-icon`, `--size-logo` (tamanhos passados como prop numérica no JSX).

**Removidos na Fase 3 (Trilha A):** os **3** `--color-shot-*` (o fundo do preview é `data.shotBg`, editorial — não
token). **Saiu da lista de vestigiais:** `--z-header` (o header sticky restaurado passou a usá-lo).

→ **Disposição:** ✅ feito. A reserva está catalogada como "definidos para futuro / não materializados" em
[design-spec.md → Tokens de reserva](design-spec.md#tokens-de-reserva-definidos-não-fiados).

### 5.2 — Literais fora do sistema de tokens (risco de drift)
Valores que duplicam tokens como hex/medida crua e precisam de sincronia manual:
- `app/opengraph-image.tsx` — paleta inteira em hex literais (runtime de borda; **não** lê CSS vars).
- `SolutionCard.module.css` — gradiente do anel do CTA (`#c44fd0,#8b5cf6,#3d9be0…`, 5-stop p/ o fluxo) e
  `<linearGradient>` da sparkline (`#9b6cf0`); `blur(1.5px)`, `stroke-width:1.6`, `stroke-dasharray:260`.
- `Header.module.css` — `border-radius:8px` da marca.
- `HeroTerminal.module.css` — scrim em `rgba(7,8,10,·)` literal; knobs `--hero-cover-*` (locais, intencionais).

→ **Disposição (Fase 3):** documentar como "literais conscientes" com o token-espelho ao lado, para que edições
mantenham os dois em sincronia.

### 5.3 — Comentários/cabeçalhos defasados `[Defasado]` — ✅ corrigidos na Fase 3 (Trilha A)
- `theme.css:1-8` — cabeçalho reescrito: o **próprio `theme.css` é a fonte-da-verdade**; Chosen creditado como
  origem; aponta para `docs/design/design-spec.md`. ✅
- `data/solutions.ts:5` — "CDN icon URL" → "self-hosted inline path in src/lib/icons.ts". ✅
- `SolutionCard.module.css:30` — "previewBlur 2.5" → "blur 1.5 + brightness 0.76 (reduzido de Chosen 2.5)". ✅

---

## 6. Procedência dos valores de origem

Os valores da coluna "Chosen" vêm de `.claude/design/panlabs/project/design-system/` (`theme.css`,
`design-spec.md §1–11`, `handoff.md §5–6`). Na Fase 3, `procedencia-e-deltas.md` recebe um **apêndice textual leve
do `tokens.json` de origem** (com os `$description` ricos, úteis como glossário histórico) — sem copiar screenshots
nem o `.dc.html`, superados pelo as-built. O bundle segue gitignored como origem creditada.

---

## 7. Próximos passos

- **Fase 2 — domínio:** ✅ concluída — ver **§8** (decisões + edições em CONTEXT/VISION/ADR-0012).
- **Fase 3 — execução:** ✅ ver **§9** — Trilha A (edições de código) e Trilha B (materialização dos design docs).
- **Pendências remanescentes** (fora do contrato de design em si):
  - **SVG da marca** — tarefa de asset aberta (candidata a issue); ver [components/header.md](components/header.md).
  - **Apêndice textual do `tokens.json` de origem** (§6) — opcional, ainda **não** anexado.

---

## 8. Fase 2 — decisões da reconciliação (2026-06-23)

Sabatina `/grill-with-docs`. Princípio aplicado: onde o as-built divergiu de Chosen como **evolução deliberada**, abençoa-se (design é dono da forma); onde divergiu com **fingerprint de descuido**, restaura-se a intenção de Chosen.

**Edições de domínio aplicadas nesta sessão:**

- **4.1 — Slot do próximo experimento.** Abençoada a forma enviada (badge "em breve" + skeleton/shimmer); invariante de honestidade preservada (inerte, não finge Solução real). → nota em `ADR-0012` (§"Reconciliação as-built"); **termo canônico novo** em `CONTEXT.md`: **"Slot do próximo experimento"** (código `PlaceholderCard`), deliberadamente **não** chamado de "Card" (Card ⟺ Solução).
- **4.2 — Faseamento.** O split V1.0/V1.1 **colapsou**: a superfície completa (`/go` + DB + vitalidade live) embarca de uma vez com **degradação graciosa por infra** (`DATABASE_URL`/`GITHUB_TOKEN`) — fronteira de fase virou toggle de ops. → `ADR-0012` (§"Reconciliação") + frase corrigida na `VISION.md`. O CTA aponta para `/go`.

**Decisões de forma/higiene (sem edição de domínio — executam na Fase 3):**

- **4.3 — shotBg.** **Sem drift de domínio** (querymind já tratado corretamente no `ADR-0012`; ausente em `CONTEXT`/`VISION`/`ADR-0006`). `data.shotBg` é a verdade; **remover os 3 `--color-shot-*`** de `theme.css` — **todos** vestigiais (a §3.F/§5.1 acima erraram ao listar só o de querymind; corrigir na finalização). Documentar `shotBg` como campo editorial por-solução (junto do `shot`).
- **Header sticky — restaurar.** `position: sticky; top: 0; z-index: var(--z-header); backdrop-filter: …` no `.header`. Honra "barra fixa" de Chosen e cura os órfãos: **`--z-header` deixa de ser vestigial** e a translucidez de `--bg-header` passa a ter função.
- **Logo — seguir Chosen.** Marca **circular** (`border-radius: 50%`, revertendo o `8px`) e **SVG como asset canônico**. Estado atual: raster `apple-touch-icon.png`, cantos `8px`, **nenhum SVG em `apps/web/public/`**. → Fase 3: corrigir o raio; **produzir o SVG é tarefa de asset aberta** (o app-icon raster pode cortar mal em círculo).
- **Contraste sub-AA** (micro-labels `statLabel` 9.5px `#5f656e`; nav-tagline 10.5px `#6a7079`). **Manter** (decisão do dono) — documentar em `accessibility.md` como **trade-off consciente** (fidelidade a Chosen), não bug.
- **OG image em hex literais.** **Manter** — documentar em `design-spec.md` como **literais conscientes** (runtime de borda não lê CSS vars), com o token-espelho ao lado para sincronia manual.

**Lista de vestigiais atualizada (substitui a §5.1 na finalização):** **saem** `--z-header` (header sticky passa a usá-lo) e os 3 `--color-shot-*` (removidos). **Permanecem** como "reserva documentada": `--feedback-success/warning/info/neutral`, `--gradient-spark-fill`, `--bg-card-header`, `--size-tech-icon`, `--size-github-icon`, `--size-logo`.

---

## 9. Fase 3 — execução (2026-06-23)

Materialização do contrato de design. Duas trilhas.

### Trilha A — edições de código (alinhar `apps/web/src/` às decisões das §8/§5)

7 edições, em 5 arquivos:

- `theme.css` — cabeçalho reescrito (declara-se fonte-da-verdade; Chosen = origem creditada; aponta para
  `docs/design/design-spec.md`); **3 `--color-shot-*` removidos** + NB explicando que `data.shotBg` é editorial.
- `Header.module.css` — `.header` **sticky** restaurado (`position:sticky; top:0; z-index:var(--z-header);
  backdrop-filter:blur(12px)`); `.logo` → **círculo** (`border-radius:var(--radius-full)`).
- `Logo.tsx` — comentário reflete o recorte circular + SVG canônico pendente.
- `solutions.ts` — comentário do `slug` corrigido (ícones auto-hospedados).
- `SolutionCard.module.css` — comentário do filtro corrigido (`blur 1.5 + brightness 0.76`).

**Verificação:** `tsc --noEmit` limpo · `biome check .` exit 0 (49 arquivos) · `vitest` 69/69 · `next build`
exit 0. _(NB ferramental: o sumarizador do `rtk` reportou um falso "2 errors" no lint; o `rtk proxy npx biome
check .` confirmou exit 0.)_

### Trilha B — materialização dos design docs (`docs/design/`)

Criados:

- [README.md](README.md) — ponto de entrada, princípios (origem ≠ fonte-da-verdade), onde mora cada coisa, mapa.
- [design-spec.md](design-spec.md) — taxonomia de tokens, tipografia, voz & copy, movimento, **literais
  conscientes**, tokens de reserva.
- [layout.md](layout.md) — estrutura, container, grid 3→2→1, **header sticky**, breakpoints.
- [accessibility.md](accessibility.md) — foco, reduced-motion, forced-colors, semântica, **contraste sub-AA**
  (trade-off consciente).
- [components/](components/) — `header.md`, `hero-terminal.md`, `solution-card.md`,
  `slot-proximo-experimento.md`, `icon.md` (contratos por fronteira de código).
- [como-adicionar-uma-solucao.md](como-adicionar-uma-solucao.md) — guia (cruza `CONTEXT.md` ↔ `data/solutions.ts`).
- [`docs/agents/design.md`](../agents/design.md) — agent skill; item "Design system" adicionado ao `CLAUDE.md`.

ADRs/CONTEXT/VISION já reconciliados na Fase 2 (§8) são linkados a partir desses docs.
