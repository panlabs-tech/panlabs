# Como adicionar uma Solução ao catálogo

Guia operacional para colocar uma nova **Solução** ([CONTEXT.md → Solução](../CONTEXT.md)) na vitrine. O
editorial é **curado em código** ([ADR-0006](../adr/0006-catalogo-tres-fontes.md)); a vitalidade é puxada
do GitHub; os acessos são medidos pelo `/go`. Três fontes, donos distintos.

> **Invariante de honestidade:** só Soluções **reais** viram Card. Status deve ser real. Algo que ainda não
> existe é o [slot do próximo experimento](components/slot-proximo-experimento.md), não um Card com dados
> inventados.

## 1. Adicionar a entrada editorial

Em [`apps/web/src/data/solutions.ts`](../../apps/web/src/data/solutions.ts), crie um `Solution` e inclua-o no array
`solutions`. Campos da interface `Solution`:

| Campo | O quê | Notas |
|---|---|---|
| `slug` | identificador URL | lowercase; vira `/go/{slug}` e o id da sparkline |
| `name` | nome exibido | **lowercase** (`ethitorial`) — não capitalizar |
| `tagline` | uma linha lilás | curta, editorial |
| `desc` | descrição | texto plano, ~2 linhas |
| `url` | a **URL-alvo** (`targetUrl`) | para onde o `/go` redireciona; trocar de domínio = só este campo |
| `repo?` | `owner/name` no GitHub | **se presente**, a vitalidade é puxada ao vivo (#12) |
| `status` | ciclo de vida | no V1 só `"live"` e `"beta"` têm badge ([CONTEXT.md → status](../CONTEXT.md)) |
| `tech` | `TechBadge[]` | cada `slug` **deve existir** em [`icons.ts`](components/icon.md); senão o ícone some |
| `stats` | `{ stars, commits, prs }` | valores **curados** = fallback quando o GitHub está fora |
| `weeks` | `number[]` | série semanal **curada** = fallback da sparkline |
| `shot` | caminho do screenshot | em `/public/assets/shot-{slug}.png` |
| `shotBg` | cor sólida atrás do shot | **editorial por-Solução** (hex inline), não é design token |

## 2. Adicionar o screenshot

Coloque `shot-{slug}.png` em [`apps/web/public/assets/`](../../apps/web/public/assets) e escolha um `shotBg` que combine com
a borda do screenshot (o preview dá `blur(1.5px)` + `brightness(0.76)`; o `shotBg` aparece nas bordas do
blur). Ver [solution-card.md → Preview](components/solution-card.md#preview).

## 3. (Se preciso) adicionar um ícone de tech

Se alguma `tech[].slug` não estiver no set de ícones, adicione-a em `apps/web/src/lib/icons.ts` — passo a passo em
[components/icon.md](components/icon.md#como-adicionar-um-ícone).

## 4. O que acontece automaticamente

- O **Card** é renderizado pelo `Catalog` na ordem do array, antes do slot do próximo experimento.
- O **CTA** liga em `/go/{slug}` (redirect rastreado, nova aba) — nenhuma fiação manual.
- A **vitalidade**: se houver `repo`, `stars`/`commits`/`PRs`/`weeks` vêm ao vivo (cache de 1h); sem
  `repo` (ou sem `GITHUB_TOKEN`/rede), valem os valores curados. Semântica de contagem em
  [ADR-0013](../adr/0013-semantica-vitalidade-live-commits-prs.md).
- A **meta da seção** (`// N soluções no ar`) conta `solutions` automaticamente.

## 5. Trocar de domínio depois

Só edite `url` na entrada da Solução — é a **única amarra** entre o panlabs e a Solução
([CONTEXT.md → invariantes](../CONTEXT.md)).

## Cross-links

- Contrato visual do Card: [components/solution-card.md](components/solution-card.md).
- Glossário (Solução, Card, URL-alvo, Vitalidade, status): [CONTEXT.md](../CONTEXT.md).
- Três fontes do catálogo: [ADR-0006](../adr/0006-catalogo-tres-fontes.md).
