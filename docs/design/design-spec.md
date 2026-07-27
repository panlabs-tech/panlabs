# Design spec — tokens, tipografia, voz, movimento

Vocabulário visual do panlabs **as-built**. A fonte-da-verdade dos valores é
[`apps/web/src/styles/theme.css`](../../apps/web/src/styles/theme.css) — este doc descreve a **taxonomia, as regras de uso e
as decisões**, não recopia cada valor (que derivaria). Quando precisar do valor exato, leia o token no
`theme.css`.

## Arquitetura de tokens

Três camadas, do bruto ao aplicado. **Consuma sempre a camada mais semântica disponível.**

```
primitive   →   semantic        →   component
#07080a         --bg-root            (usado direto pelos módulos)
--color-gray-10 --text-default       --bg-cta-rest, --border-cta, …
```

1. **Primitive** — paleta crua e escalas sem intenção: `--color-ink-*`, `--color-gray-00…70`,
   `--color-brand-*`, `--color-terminal-*`, `--color-status-*`, alphas (`--color-w-*`, `--color-b-50`),
   além das escalas de `--space-*`, `--fs-*`, `--radius-*`, etc. **Não use primitives de cor direto num
   componente** se existir um semantic equivalente.
2. **Semantic** — apelidam o primitive por **papel**: `--bg-*`, `--text-*` (escala `max → strong →
   default → hero → body → chip → muted → faint`), `--accent-*`, `--border-*`, `--feedback-*`. É a camada
   que os componentes devem preferir.
3. **Component** — o `*.module.css` de cada peça consome os semantics (e alguns primitives utilitários
   como `--space-*`, `--radius-*`).

Tema **único (escuro)**. Não há alternância de tema.

### Grupos de token (referência rápida)

Âncoras em `theme.css`; veja lá os valores.

- **Cor · primitive:** `--color-ink-950/940/900` (fundos), `--color-gray-00…70` (escala de cinza),
  `--color-brand-magenta/violet/blue/violet-light/lilac`, `--color-terminal-green/blue`,
  `--color-status-idea/alpha/beta/live`, `--color-star`, alphas brancos `--color-w-*` e `--color-b-50`,
  `--color-hover-glow/border`.
- **Cor · semantic:** `--bg-root/header/surface/card-header/cta-rest/chip/badge`;
  `--text-max/strong/default/hero/body/chip/muted/faint/on-badge`;
  `--accent-lilac/violet/star`; `--feedback-success/warning/info/neutral`;
  `--border-subtle/default/header/chip/cta`.
- **Gradientes:** `--gradient-brand` (a assinatura magenta→violet→blue), `--gradient-spark-fill`,
  `--gradient-preview-overlay` (fade vertical de 4 paradas que afunda o preview do card em ink).
- **Tipografia:** `--font-sans`, `--font-mono`; pesos `--fw-regular…extrabold`; tamanhos/medidas por papel
  (`--fs-*`, `--lh-*`, `--ls-*`).
- **Espaço:** `--space-0…24` (escala com meios-passos: `1-5`, `2-5`, `3-5`, `4-5`, `5-5`, `10-5`).
- **Tamanho:** `--size-container-max`, `--size-header-height`, `--size-preview-height`, `--size-spark-w/h`,
  etc.
- **Raio / borda / sombra / opacidade:** `--radius-chip/control/card/pill/full`; `--border-w-hairline`;
  `--shadow-card-hover`; `--opacity-tech-icon/spark-fill`.
- **Movimento:** `--duration-*`, `--easing-card/standard` (ver §Movimento).
- **Z-index:** `--z-header: 1` (única camada empilhada; o header sticky a usa).

### Como escolher um token

- Cor de texto → escolha pela hierarquia (`--text-max` para o mais forte … `--text-faint` para o mais
  apagado). Não pegue `--color-gray-*` direto.
- Fundo de superfície/controle → `--bg-*`.
- Borda → `--border-*` (todas são alphas brancos hairline).
- Espaçamento/raio → escala `--space-*` / `--radius-*`. Se faltar um degrau, **prefira o degrau existente
  mais próximo** a inventar um literal.

## Tipografia

Duas famílias, **auto-hospedadas** via `next/font/local` (woff2, subset latino — zero request a Google
Fonts), em [`apps/web/src/app/layout.tsx`](../../apps/web/src/app/layout.tsx):

- **Sans — Manrope** (`--font-sans`, var `--font-manrope`, peso `200 800`): corpo, lede, tagline do card,
  wordmark.
- **Mono — JetBrains Mono** (`--font-mono`, var `--font-jetbrains`, peso `100 800`): toda a "voz de
  terminal" — prompt, título do hero, badges/status, chips, stats, CTA, meta de seção.

Os literais `"Manrope"`/`"JetBrains Mono"` ficam como fallback **depois** da var do `next/font`, mantendo
fidelidade se a fonte local não carregar. `display: swap`.

Tamanhos por papel são tokens (`--fs-hero-title`, `--fs-card-name`, `--fs-stat-value`, …). Dois valores
**evoluíram** sobre Chosen por legibilidade: `--fs-stat-value` 14→**15px** e `--fs-stat-label`
8.5→**9.5px** (ver [accessibility.md](accessibility.md#contraste-sub-aa) sobre o contraste das micro-labels).

## Voz & copy

Tom: **laboratório vivo**, voz de terminal/CLI, pt-BR, lúdico-técnico. Strings canônicas (verbatim — não
traduzir, não mudar caixa):

| String | Onde | Papel |
|---|---|---|
| `panini@panlabs:~$ ls ./panlabs` | hero (montado por spans), OG | prompt assinatura |
| `ls ./panlabs` | hero h1 (typewriter; gradiente só em `./panlabs`) | título |
| `build * automate * innovate` | header tagline, OG | mote (os `*` em azul/violeta) |
| `// N soluções no ar · preview ao vivo` | `Catalog.tsx` (N = contagem real) | meta da seção |
| `$ touch <slug>` | CTA do card | ação "visitar" |
| `em breve` | badge do slot do próximo experimento | sinal de "vindo" |
| `// incubando o próximo experimento` | copy do slot | legenda do placeholder |
| `panini@panlabs:~$ cat manifesto.txt` | Manifesto (via `Prompt`) | abre a camada 1 |
| `// arquitetura` · `domínio único` | DomainArchitecture (eyebrow + `h2`) | abre a camada 2 |
| `// soluções plugadas no domínio` | card de domínio | nota do diagrama |
| `soluções no ar` · `preview ao vivo` | chips do card de domínio | sinais (não métricas) |
| `panini@panlabs:~$ cat next_steps.md` | Footer (via `Prompt`) | abre a camada 3 |
| `keep building and sharing` | Footer headline (caret piscando) | fechamento — **sem CTA** |
| `dark-native · pt-BR · Manrope + JetBrains Mono · sem CDN` | Footer colofão | colofão honrando os inegociáveis |

Nomes de Solução são **lowercase** (`ethitorial`, `travelmanager`) — não capitalizar. A copy das camadas
(tenets do Manifesto, pilares da arquitetura) é **editorial inline** no componente, não token.

**Caveat de sincronia de copy (atenção do dono):** existem 3 variações próximas da tagline-mestra —
o hero diz "soluções de **softwares**" ([`HeroTerminal.tsx`](../../apps/web/src/components/HeroTerminal/HeroTerminal.tsx)),
enquanto a OG e o `seo.ts` dizem "soluções de **software**"; o lede do hero e a `description` do `seo.ts`
têm fraseado levemente diferente. Mantidos como estão (não é trabalho de design alterar copy), mas se for
unificar, estes são os pontos.

## Movimento

Durações e easings são tokens: `--duration-cta 180ms`, `--duration-card 220ms`, `--duration-shot 300ms`,
`--duration-spark 1100ms`, `--duration-blink 1060ms`, `--duration-reveal 900ms`, `--duration-draw 1500ms`,
`--duration-pulse 3400ms`; `--easing-card cubic-bezier(0.2,0.7,0.3,1)`, `--easing-standard ease`. Os três
últimos durations e os shadows `--shadow-logo-rest/peak` e `--shadow-domain-card` nasceram com as **camadas
de scroll**.

**Regra crítica — keyframes co-localizadas.** CSS Modules escopam `animation-name` para um nome hasheado
local; uma `@keyframes` declarada no `theme.css` global **nunca** casaria com a referência escopada e a
animação no-opa em silêncio. Por isso **cada keyframe vive no `*.module.css` que a usa** (há NB explicando
em `theme.css`).

Inventário de animações:

| Keyframe / efeito | Onde | O quê |
|---|---|---|
| `pl-type` | `HeroTerminal.module.css` | typewriter: revela `ls ./panlabs` por `max-width` em `steps(12)` |
| `pl-blink` | `HeroTerminal.module.css` | caret pisca após `--caret-blink-at` (1750ms) |
| `pl-cta-flow` | `SolutionCard.module.css` | fluxo do anel de gradiente no CTA (hover/focus) |
| `pl-shimmer` | `PlaceholderCard.module.css` | shimmer das linhas/chips skeleton |
| sparkline draw | `SolutionCard.module.css` | `stroke-dashoffset 260→0` no hover (sem keyframe; transição) |
| reveal ao rolar | `Reveal.module.css` | fade + `translateY` ao entrar na viewport (`[data-shown]`; sem keyframe — transição). Ver [reveal.md](components/reveal.md) |
| traço SVG (draw) | `Manifesto`/`DomainArchitecture` `.module.css` | `stroke-dashoffset --len→0` ao revelar (anel + conectores; sem keyframe; transição `--duration-draw`) |
| `manifesto-pulse` | `Manifesto.module.css` | glow do logo oscila entre `--shadow-logo-rest/peak` (`--duration-pulse`) |
| `footer-blink` | `Footer.module.css` | caret do rodapé pisca (`--duration-blink`, step-end) |

Todo componente animado tem bloco `prefers-reduced-motion` — ver [accessibility.md](accessibility.md).

## Literais conscientes

Valores que **duplicam** um token como hex/medida crua e exigem **sincronia manual**. Não são bug — são
decisões conscientes (runtime de borda, mask-composite, etc.). Ao editar um, ajuste o token-espelho junto.

| Literal | Onde | Token-espelho | Por que é literal |
|---|---|---|---|
| Paleta inteira em hex (`#07080a`, `#c44fd0`, `#8b5cf6`, `#3d9be0`, `#9b6cf0`, `#aab0ba`, `#7a808a`, `#6a7079`) | [`opengraph-image.tsx`](../../apps/web/src/app/opengraph-image.tsx) | `--bg-root`, `--color-brand-*`, `--color-brand-violet-light`, `--color-gray-*` | O runtime de borda (`next/og`) **não lê CSS vars** |
| Gradiente do anel do CTA `#c44fd0,#8b5cf6,#3d9be0,#8b5cf6,#c44fd0` (5 paradas) | `SolutionCard.module.css` `.cta::before` | `--gradient-brand` (3 paradas) | Precisa de 5 paradas para o `pl-cta-flow` correr; `mask-composite` desenha só no anel |
| `<linearGradient>` da sparkline `#9b6cf0` (stops 0.35→0) | `SolutionCard.tsx` `<defs>` | `--color-brand-violet-light` / `--gradient-spark-fill` | SVG inline com id por slug (`plspark-${slug}`) para não colidir entre cards |
| Scrim do hero em `rgba(7,8,10,·)` | `HeroTerminal.module.css` `.coverScrim` | `--color-ink-950` (`#07080a`) | Gradiente calculado a partir do knob local `--hero-cover-scrim` |
| Brand wash `rgba(196,79,208,.2),rgba(139,92,246,.15),rgba(61,155,224,.18)` | `DomainArchitecture.module.css` `.domainCardHead` | `--gradient-brand` (magenta→violet→blue) | Tinta translúcida da assinatura; alphas específicos do efeito, sem token-espelho |
| `blur(1.5px)`, `stroke-width:1.6`, `stroke-dasharray:260` | `SolutionCard.module.css` | — (medidas finas de efeito) | Ajustes finos sem token dedicado |
| Knobs do cover `--hero-cover-blur/brightness/scrim` | `HeroTerminal.module.css` `.hero` | — (locais, intencionais) | Pontos de tunagem do hero, escopados ao componente |

## Tokens de reserva (definidos, não fiados)

Tokens **definidos em `theme.css` mas sem uso** no `apps/web/src/` (verificado). São **reserva intencional** — não
remover sem decisão, e **não assumir que estão ligados**:

- `--feedback-success/warning/info/neutral` — o status do card usa `--color-status-live/beta` direto.
- `--gradient-spark-fill` — a sparkline usa `<linearGradient>` inline por slug.
- `--bg-card-header` — o slot usa `--color-w-022` direto.
- `--size-tech-icon`, `--size-github-icon`, `--size-logo` — tamanhos passados como prop numérica no JSX.

> Removidos na Fase 3 (já não existem): os 3 `--color-shot-*` (o fundo do preview é editorial — `data.shotBg`
> em `solutions.ts`, **não** token) e a antiga vestigialidade de `--z-header` (agora o header sticky o usa).
> Ver [procedencia-e-deltas.md](procedencia-e-deltas.md).
