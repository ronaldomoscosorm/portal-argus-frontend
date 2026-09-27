import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { existsSync, readFileSync } from "node:fs";

// SSO cross-site em dev: o cookie rmtecho_token é SameSite=Lax + Domain=.rmtecho.com.br.
// Para o login setar o cookie de forma first-party (e o clearid conseguir enviá-lo ao
// backend), o portal precisa rodar sob um host *.rmtecho.com.br por HTTPS.
// Gere o certificado com mkcert (ver clearid-identity-hub/docs/DEV_SSO_SETUP.md).
// Sem o certificado, o `dev` normal (http://localhost:5173) segue funcionando.
// HTTPS opt-in: liga apenas com DEV_HTTPS=1 (e certificado presente).
const CERT_DIR = path.resolve(__dirname, "certs");
const KEY = path.resolve(CERT_DIR, "dev-portal.rmtecho.com.br-key.pem");
const CERT = path.resolve(CERT_DIR, "dev-portal.rmtecho.com.br.pem");
const httpsReady = process.env.DEV_HTTPS === "1" && existsSync(KEY) && existsSync(CERT);

export default defineConfig({
  server: {
    host: "::",
    port: 5173,
    allowedHosts: ["dev-portal.rmtecho.com.br"],
    ...(httpsReady
      ? { https: { key: readFileSync(KEY), cert: readFileSync(CERT) } }
      : {}),
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
