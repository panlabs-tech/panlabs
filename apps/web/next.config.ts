import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import { securityHeadersConfig } from "./src/lib/security-headers";

// A raiz do workspace, e não a da aplicação. Sem isto o Next infere a raiz de
// rastreamento sozinho, e num workspace pnpm ele escolhe um diretório que não
// contém os módulos linkados a partir da raiz: a saída `standalone` sai sem
// parte das dependências, e a falha só aparece no container, em tempo de
// execução.
const workspaceRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: workspaceRoot,
  async headers() {
    return securityHeadersConfig();
  },
};

export default nextConfig;
