@AGENTS.md

## Específico do Claude Code

- **Skills, subagents e commands são equipamento de máquina**, instalados globalmente em `~/.agents` e symlinkados em `~/.claude`. Este repo **não** versiona nenhum deles: a cópia global é a única (cláusula de zero redundância). Não vendorize. O que já foi vendorizado aqui foi removido no retrofit de anatomia, e `.gitignore` guarda a fronteira.
- **Permissions e statusline** são globais, com override apenas em `settings.local.json`, que é gitignored. Este repo não versiona lista de permissões.
- **`.claude/context-economy-protocol.md`** fica: é protocolo de trabalho deste repo, não equipamento.
- **MCPs** são versionados em `.mcp.json` na raiz, com `${VARIAVEL}` no lugar de todo segredo. O Claude Code expande a variável a partir do ambiente; o valor mora no `.env`, gitignored. Ver [docs/agents/mcps.md](docs/agents/mcps.md).
