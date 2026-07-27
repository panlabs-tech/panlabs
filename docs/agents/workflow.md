# Workflow de desenvolvimento

Doutrina de operação e fluxo padrão. Ver [ADR-0014](../adr/0014-autonomia-total-dos-agentes.md) para a decisão completa, premissa e gatilhos de reabertura.

## Doutrina de autonomia

**O agente opera com autonomia total sobre tudo no escopo do projeto** — implementar, fazer deploy/redeploy, mexer em env, gerar segredo que a máquina consegue gerar, rodar migration, criar/dropar recurso próprio no Coolify e mergear PR verde. Faça sozinho, sem reafirmar autonomia a cada vez.

**Pare e chame o operador em exatamente 4 casos:**

1. **Trancaria para fora** — senha de root/painel, credencial de acesso do operador, regra de firewall, ou rotacionar o token de infra que o próprio MCP usa.
2. **Recriaria o substrato** — destruir/recriar a VM ou o servidor Coolify.
3. **Exige segredo de terceiro** — `client_secret` de OAuth, API key paga de console externo.
4. **Tocaria outro projeto no Coolify** — confirme que o recurso pertence a este projeto antes de qualquer operação mutante.

Na dúvida sobre cair num dos quatro, pare. Fora deles, faça.

## Fluxo padrão

1. **`/grill-with-docs`** (ou `/grill-me`) — alinhar escopo, obter plano, resolver linguagem.
2. **`/to-tickets`**: fatiar em tickets independentes. Para features grandes, `/to-spec` primeiro, depois `/to-tickets`. (As duas skills já se chamaram `/to-issues` e `/to-prd`; os nomes antigos são revisão antiga e não existem mais.)
3. **`/tdd` + caveman full** — implementar; caveman full é o padrão para economizar tokens.
4. **`git worktree` por issue** — um worktree por issue para isolar contexto.
5. **Commit + push** — a esteira `pr-checks` dispara automaticamente.
6. **Merge autônomo no verde** — quando `pr-checks` fica verde e o PR é aberto automaticamente, o agente mergeia sem esperar operador.
7. **Encadear** — próxima issue, até a lista acabar. Para só se o operador pedir (ex.: para compactar contexto).

## Modo de implementação autônoma

Disparado por "implementa as issues" (ou equivalente):

1. Coletar issues abertas com label `ready-for-agent` via `gh issue list`.
2. Para cada issue, criar um `git worktree` em `worktree/<slug-da-issue>`.
3. Implementar com `/tdd` + caveman full.
4. Commit + push → PR aberto automaticamente → merge autônomo no verde.
5. Encadear até as issues acabarem.

## Economia de token

Usar a skill `caveman` em **full mode** por padrão durante implementação. Ativa com `/caveman` ou mencionando "caveman mode" — corta ~75% dos tokens de comunicação sem perder precisão técnica.

## Convenção de prompts

Prompts salvos como arquivo em `prompts/AAAAMMDDHHMMSS_slug-kebab.md` (corpo pt-BR, `# Título` no topo, sem frontmatter). Nunca só inline.
