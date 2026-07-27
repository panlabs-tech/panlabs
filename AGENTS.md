# panlabs

Vitrine/agregador **read-only** em pt-BR no apex `panlabs.tech` que cataloga as soluções SaaS do autor. História **independente**: nada do design ou do contexto das outras soluções se aplica aqui, só o scaffolding de deploy é compartilhado.

Este arquivo é a **fonte-da-verdade** da orientação de agente neste repo. O `CLAUDE.md` referencia este documento e só acrescenta o que é específico do Claude Code.

## Orientação de domínio, antes de qualquer trabalho substantivo

- [docs/CONTEXT.md](docs/CONTEXT.md): glossário e invariantes (a linguagem comum).
- [docs/VISION.md](docs/VISION.md): o que é, posicionamento, escopo e critério de sucesso do V1.
- [docs/adr/](docs/adr/README.md): decisões de arquitetura (0001 a 0014).

Design oficial ("Chosen") e faseamento **V1.0 visual / V1.1 backend** em [ADR-0012](docs/adr/0012-design-oficial-chosen-e-faseamento.md). Onde o design contraria um ADR sobre *forma*, **o design vence** ([ADR-0011](docs/adr/0011-produto-primeiro-indicadores-secundarios.md)); ADRs seguem mandando em *intenção e invariantes*. O contrato de design **as-built** (tokens, layout, componentes, a11y) vive em [docs/design/](docs/design/README.md), e é leitura obrigatória antes de trabalho visual.

## Layout

Monorepo, com cada aplicação numa subpasta de `apps/`. Hoje existe uma:

```
/
├── apps/web/          a vitrine (Next.js)
│   └── Dockerfile     symlink para o da raiz, que é root-context
├── docs/              domínio, ADRs, design e configuração de agente
├── Dockerfile         a receita de produção, com contexto na raiz
├── package.json       raiz do workspace: só scripts e ferramenta transversal
├── pnpm-workspace.yaml
└── pnpm-lock.yaml     um lockfile só, na raiz, para o workspace inteiro
```

O gerenciador de pacotes é **pnpm**, e o lockfile da raiz é o único. Rodar `npm install` aqui produz um `package-lock.json` que não deveria existir, e o portão de conformidade da org reprova por isso.

Os scripts da raiz são a interface que a CI compartilhada chama, e não são todos da mesma espécie: `typecheck`, `test` e `build` delegam para o workspace, e `lint` roda na raiz, com um biome só para o repo inteiro (inclusive o que não é aplicação). Trabalho de aplicação também pode ser rodado direto de `apps/web/`.

## Convenções

- **Idioma:** pt-BR em prosa, comentários e commits ([ADR-0009](docs/adr/0009-idioma-pt-br.md)). Identificador de código em inglês.
- **Conventional Commits**, subject minúsculo. O padrão é mecânico: `commitlint.config.mjs` na raiz, chamado pelo portão local.
- **Token, não literal** no CSS; keyframes co-localizadas; `prefers-reduced-motion` por componente. Ver [docs/agents/design.md](docs/agents/design.md).

## Os dois portões

**Local, antes do commit** ([`lefthook.yml`](lefthook.yml)): formatação e verificação com biome, padrão de mensagem de commit com commitlint, e scan de segredos com `gitleaks`. O scanner é o mesmo da CI de propósito: um portão local que rodasse outro faria "passou no local" e "passou na CI" significarem coisas diferentes.

**Na CI, antes do merge** ([`.github/workflows/pr-checks.yml`](.github/workflows/pr-checks.yml)): o caller referencia os reusable workflows compartilhados de [`panlabs-tech/.github`](https://github.com/panlabs-tech/.github/tree/main/.github/workflows) em vez de copiar YAML. Os dois required checks da org são `checks` (o rollup das pernas por superfície) e `security`.

`checks` é um job de **rollup**: ele declara `needs` sobre as pernas daquele repo e agrega o resultado explicitamente, com `if: always()`. Sem isso, uma perna vermelha faria o rollup ser *pulado*, e pulado não é reprovado.

## Equipamento global de agente não é versionado aqui

Skill, subagente, comando, hook portável, lista de permissões e barra de status moram num lugar só: instalados globalmente na máquina (`~/.agents`, symlinkados em `~/.claude`). Este repo **não** versiona nenhum deles, e `.gitignore` guarda essa fronteira. Copiar uma skill para dentro do repo cria uma segunda cópia que vira fóssil, e é a cláusula de zero redundância do padrão da org que isso viola.

O que **é** versionado é declaração: `.mcp.json` (com placeholder de variável de ambiente) e os documentos de `docs/agents/`.

## Configuração local

`.env.example` lista toda variável que este repo lê, sem valor nenhum. Copie para `.env` e preencha. As duas da aplicação (`DATABASE_URL` e `GITHUB_TOKEN`) degradam graciosamente quando faltam; as demais são de MCP, e estão documentadas em [docs/agents/mcps.md](docs/agents/mcps.md).

## Agent skills

### Issue tracker

Issues vivem no GitHub (`panlabs-tech/panlabs`), via `gh` CLI. PRs externos **não** são superfície de triagem. Ver [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md).

### Triage labels

Vocabulário canônico verbatim: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. Ver [docs/agents/triage-labels.md](docs/agents/triage-labels.md).

### Domain docs

Single-context; os docs de domínio moram em `docs/`, não na raiz. Ver [docs/agents/domain.md](docs/agents/domain.md).

### Design system

Contrato de design **as-built** em `docs/design/` (fonte-da-verdade é o código; "Chosen" é origem creditada, gitignored). Ver [docs/agents/design.md](docs/agents/design.md).

### MCPs

Três servidores versionados em `.mcp.json`, com o segredo no `.env`. Ver [docs/agents/mcps.md](docs/agents/mcps.md).

## Autonomia e fluxo de desenvolvimento

Doutrina completa em [ADR-0014](docs/adr/0014-autonomia-total-dos-agentes.md) e [docs/agents/workflow.md](docs/agents/workflow.md).

**O agente opera com autonomia total:** implementar, mergear PR verde, fazer deploy e redeploy, mexer em env, criar e dropar recurso próprio no Coolify. Faça sozinho, sem reafirmar autonomia a cada operação.

**Pare e chame o operador em exatamente 4 casos:** (1) trancaria o operador para fora (senha root, credencial, token de infra do MCP); (2) recriaria o substrato (VM ou Coolify); (3) exige segredo de terceiro (`client_secret` de OAuth, API key paga); (4) tocaria outro projeto no Coolify (confirme o alvo antes de mutar).

### Fluxo padrão

`/grill-with-docs` → `/to-tickets` → `/tdd` + caveman full → worktree por issue → commit → push → PR automático → **merge autônomo no verde** → encadear.

"Implementa as issues" significa modo autônomo completo: coletar as issues `ready-for-agent`, worktree por issue, implementar, mergear, encadear sem parar.

### Prompts

Salvar em `prompts/AAAAMMDDHHMMSS_slug-kebab.md` (pt-BR, `# Título` no topo, sem frontmatter). Nunca só inline.
