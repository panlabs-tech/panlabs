# MCPs

Os servidores MCP deste repo são versionados em [`.mcp.json`](../../.mcp.json), na raiz. O arquivo carrega **placeholder de variável de ambiente**, nunca valor literal: o segredo mora no `.env`, que é gitignored, e o contrato de quais variáveis existem mora em [`.env.example`](../../.env.example).

Antes desta convergência a configuração real ficava gitignorada com o token escrito dentro, e um `.codex/config.toml.example` duplicava a mesma lista de servidores para outro agente. Duas cópias, nenhuma compartilhada, e o token no arquivo que ninguém revisa. O arquivo versionado com placeholder resolve as três coisas de uma vez.

## Os três servidores

| servidor | transporte | para que serve | variáveis |
| --- | --- | --- | --- |
| `hostinger-vps` | stdio | operações no VPS que hospeda o Coolify | `HOSTINGER_API_TOKEN` |
| `coolify` | stdio | deploy, redeploy e configuração do app da vitrine | `COOLIFY_BASE_URL` (com default), `COOLIFY_ACCESS_TOKEN` |
| `cloudflare` | http | zona e DNS de `panlabs.tech` | nenhuma (autentica no navegador) |

`COOLIFY_BASE_URL` é o único com default (`https://vps.panlabs.tech`), porque é endereço público e não segredo. Declarar a variável no `.env` só é necessário para apontar para outra instância.

O da Cloudflare não pede variável nenhuma: é HTTP, e autentica no navegador. O `CLOUDFLARE_DNS_TOKEN` que o `.env.example` lista existe para operação de DNS feita à mão, e não passa por aqui.

Nenhum destes é lido pela aplicação: são ferramenta de trabalho de infra. As duas variáveis que a **aplicação** lê são `DATABASE_URL` e `GITHUB_TOKEN`, e as duas degradam graciosamente quando faltam (ADR-0012, ADR-0013).

## O portão que sustenta o placeholder

Trocar valor literal por placeholder só é seguro se alguma coisa impedir o literal de voltar. O portão local roda `gitleaks` antes do commit ([`lefthook.yml`](../../lefthook.yml)), e o mesmo scanner roda na CI compartilhada sobre o histórico inteiro. Um token colado no `.mcp.json` reprova no primeiro dos dois, antes de chegar ao remoto.

## Ao adicionar um servidor

1. Acrescente a entrada em `.mcp.json`, com `${VARIAVEL}` para todo segredo.
2. Acrescente a variável em `.env.example`, sem valor, com uma linha dizendo para que serve.
3. Acrescente a linha na tabela acima.

Um servidor que só existe na sua máquina é configuração local: ele mora em `~/.claude.json` (escopo de usuário), não aqui.
