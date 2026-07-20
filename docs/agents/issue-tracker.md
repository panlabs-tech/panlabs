# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues in `panlabs-tech/panlabs`. Use the `gh` CLI for all operations.

> O remote local de muitos clones ainda aponta para `ThiagoPanini/panlabs` (o GitHub redireciona). Passe `-R panlabs-tech/panlabs` explicitamente quando quiser garantir o alvo.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`, filtering comments by `jq` and also fetching labels.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v` — `gh` does this automatically when run inside a clone.

## Pull requests as a triage surface

**PRs as a request surface: no.** panlabs is a solo personal showcase; external feature requests don't arrive as PRs. The author's own PRs (e.g. adding a new solution) are `OWNER`-authored and dropped by `/triage` regardless. _(Set to `yes` if this repo ever treats external PRs as feature requests; `/triage` reads this flag.)_

When set to `yes`, PRs run through the same labels and states as issues, using the `gh pr` equivalents:

- **Read a PR**: `gh pr view <number> --comments` and `gh pr diff <number>` for the diff.
- **List external PRs for triage**: `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments` then keep only `authorAssociation` of `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, or `NONE` (drop `OWNER`/`MEMBER`/`COLLABORATOR`).
- **Comment / label / close**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

GitHub shares one number space across issues and PRs, so a bare `#42` may be either — resolve with `gh pr view 42` and fall back to `gh issue view 42`.

## Wayfinding operations

O `/wayfinder` chart a rota de um esforço grande como um **mapa** (issue-raiz) com **tickets** (sub-issues). Este repo usa as relações **nativas** do GitHub — sub-issues e dependências — para que a fronteira apareça na própria UI, sem convenção de texto no corpo.

**Labels.** O mapa leva `wayfinder:map`. Cada ticket leva exatamente uma de `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling`, `wayfinder:task`.

**Criar o mapa**: `gh issue create -R panlabs-tech/panlabs --title "..." --label "wayfinder:map" --body-file <arquivo>`.

**Criar tickets e ligar ao mapa.** As duas APIs de relação exigem o **`id`** interno da issue, não o número — resolva com `gh api repos/panlabs-tech/panlabs/issues/<numero> --jq .id`.

```bash
# ticket como sub-issue do mapa
gh api -X POST repos/panlabs-tech/panlabs/issues/<MAPA>/sub_issues -F sub_issue_id=<ID_TICKET>

# ticket A bloqueado pelo ticket B
gh api -X POST repos/panlabs-tech/panlabs/issues/<NUM_A>/dependencies/blocked_by -F issue_id=<ID_B>
```

Crie todos os tickets primeiro e ligue as arestas num **segundo passe** — uma issue precisa existir antes de poder ser referenciada.

**Listar os filhos do mapa**: `gh api repos/panlabs-tech/panlabs/issues/<MAPA>/sub_issues --jq '.[] | {number, title, state, assignees: [.assignees[].login]}'`

**Ler os bloqueadores de um ticket**: `gh api repos/panlabs-tech/panlabs/issues/<NUM>/dependencies/blocked_by --jq '[.[] | select(.state=="open") | .number]'`

**A fronteira** — tickets tomáveis agora — são os filhos do mapa que estão **abertos**, **sem assignee** e cuja lista `blocked_by` não tem nenhuma issue aberta.

**Reivindicar um ticket**, antes de qualquer trabalho, para que sessões concorrentes o pulem: `gh issue edit <NUM> -R panlabs-tech/panlabs --add-assignee @me`.

**Resolver um ticket**: publique a resposta como comentário e feche — `gh issue close <NUM> -R panlabs-tech/panlabs --comment "<resposta>"` — e depois acrescente uma linha em **Decisions so far** no corpo do mapa, apontando para o ticket. A decisão mora no ticket; o mapa só a resume e linka.

**Referir-se a mapa e tickets** em texto para humano sempre pelo **título**, com o link embutido — nunca por `#42` solto.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.
