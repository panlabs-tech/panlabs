# syntax=docker/dockerfile:1
# Imagem de produção da vitrine (Next.js, saída `standalone`), para o Coolify
# (ADR-0004).
#
# **O contexto de build é a raiz do repositório, não `apps/web`.** Num workspace
# pnpm o lockfile, o manifesto da raiz e o `pnpm-workspace.yaml` moram lá, e um
# build que só enxergasse `apps/web` não teria de onde instalar do lockfile.
#
# É por isso que a receita mora aqui, e não dentro de `apps/web`: o arquivo é
# root-context por natureza. `apps/web/Dockerfile` é um **symlink** para cá, e
# aponta a aplicação para o seu build, que é o que a anatomia da org cobra do
# tipo aplicação. As duas invocações abaixo são a mesma coisa:
#
#     docker build .
#     docker build -f apps/web/Dockerfile .
#
# A direção do symlink não é arbitrária. O Coolify builda o Dockerfile da raiz
# do repo clonado (ADR-0004), e o caminho que produção lê continua sendo um
# arquivo comum, exatamente como antes do retrofit de layout: uma falha de build
# lá dentro não reprovaria `deploy.yml`, que só chama a API e faz smoke test
# contra o container **antigo**, ainda no ar. Deixar o caminho de produção
# inalterado é o que impede esse verde silencioso.
#
# No dia em que uma segunda aplicação entrar em `apps/`, cada uma ganha a sua
# receita de verdade e este arquivo vira o que sobra do shim.

FROM node:22-alpine AS base
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install --global pnpm@11.17.0

# ---- deps: instala a partir do lockfile ----
# Só os manifestos primeiro, para que a camada de instalação só invalide quando
# uma dependência mudar, e não a cada edição de código.
#
# --ignore-scripts: pula os lifecycle hooks (o `prepare` da raiz instala o git
# hook, que precisa de git e de uma árvore de trabalho que não existem aqui).
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile --ignore-scripts

# ---- builder: compila o servidor standalone ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
# Garante que public/ exista, para que o COPY do runner nunca falhe quando o
# repo ainda não tiver ativo estático nenhum (o Next trata public/ como
# opcional).
RUN mkdir -p apps/web/public
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter web build

# ---- runner: runtime mínimo ----
# A saída standalone de um monorepo espelha a árvore do workspace: o servidor
# sai em `apps/web/server.js` e as dependências na raiz, e é por isso que o
# COPY aterrissa em `./` e o CMD aponta para dentro de `apps/web`.
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
