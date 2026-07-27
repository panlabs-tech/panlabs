# panlabs

A vitrine da [panlabs.tech](https://panlabs.tech): o site que cataloga as soluções SaaS que passaram no gatilho de avaliação, com o estado de vida de cada uma.

Agregador **read-only**. Ele não hospeda solução nenhuma: lê o catálogo, mostra o card de cada uma e manda o visitante para o lugar certo por um redirect rastreado (`/go/<slug>`). Cada solução tem repo, deploy e história próprios, e nada do contexto de uma vale para a outra.

## Stack

Next.js (App Router) com TypeScript, Postgres para o registro de clique, biome para formatação e verificação, vitest para teste. Imagem de produção em Docker, no modo `standalone` do Next, hospedada em Coolify num VPS atrás da Cloudflare ([ADR-0004](docs/adr/0004-hospedagem-vps-coolify-compartilhada.md)).

## Layout

Monorepo, com cada aplicação numa subpasta de `apps/`. Hoje existe uma:

```
/
├── apps/web/          a vitrine (Next.js)
│   └── Dockerfile     symlink para o da raiz, que builda com contexto na raiz
├── docs/              domínio, ADRs, contrato de design e configuração de agente
├── Dockerfile         a receita de produção da imagem
├── package.json       raiz do workspace: só scripts e ferramenta transversal
├── pnpm-workspace.yaml
└── pnpm-lock.yaml     um lockfile só, na raiz, para o workspace inteiro
```

## Rodando local

Requer Node na versão de `.node-version` e [pnpm](https://pnpm.io).

```bash
pnpm install
cp .env.example .env    # e preencha o que for usar
pnpm dev                # http://localhost:3000
```

Nenhuma variável de ambiente é obrigatória para subir. Sem `DATABASE_URL` o redirect `/go/<slug>` continua respondendo e só a gravação do clique vira no-op; sem `GITHUB_TOKEN` a vitalidade das soluções cai para os valores curados. As duas degradações são decisão, não acaso ([ADR-0012](docs/adr/0012-design-oficial-chosen-e-faseamento.md), [ADR-0013](docs/adr/0013-semantica-vitalidade-live-commits-prs.md)).

| comando | o que faz |
| --- | --- |
| `pnpm dev` | sobe a aplicação em modo de desenvolvimento |
| `pnpm lint` | verifica e formata com biome |
| `pnpm typecheck` | checa tipos com `tsc --noEmit` |
| `pnpm test` | roda a suíte com vitest |
| `pnpm build` | compila a saída `standalone` do Next |

## Os dois portões

**Antes do commit**, local: biome, commitlint e `gitleaks`, via [`lefthook.yml`](lefthook.yml). O `pnpm install` instala o hook sozinho.

**Antes do merge**, na CI: [`.github/workflows/pr-checks.yml`](.github/workflows/pr-checks.yml) referencia os reusable workflows compartilhados de [`panlabs-tech/.github`](https://github.com/panlabs-tech/.github) em vez de copiar YAML. Os dois status checks obrigatórios da org são `checks` e `security`.

**Depois do merge na main**, o deploy: [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) chama a API do Coolify, que clona o repo, builda o `Dockerfile` e sobe o container novo.

## Documentação

- [docs/VISION.md](docs/VISION.md): o que é, para quem, escopo e critério de sucesso.
- [docs/CONTEXT.md](docs/CONTEXT.md): glossário e invariantes.
- [docs/adr/](docs/adr/README.md): as decisões de arquitetura, 0001 a 0014.
- [docs/design/](docs/design/README.md): o contrato de design as-built (tokens, layout, componentes, acessibilidade).
- [AGENTS.md](AGENTS.md): a orientação para agentes que trabalham este repo.

## Licença

[MIT](LICENSE).
