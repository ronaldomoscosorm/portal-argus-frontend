# Portal Argus — Frontend

SPA do **Portal Argus** (R&M Tecnologia): portal corporativo unificado de login (com MFA),
painel de aplicativos e **console de administração** (aplicativos, perfis de acesso, usuários
e vínculos usuário ↔ app ↔ perfil).

A SPA fala **apenas com o BFF** (`PortalArgus.Api`), que repassa as chamadas para a ArthosMFA.

## Stack

Vite 5 · React 18 · TypeScript · Tailwind CSS · shadcn/ui (componentes próprios) ·
TanStack Query · React Router 6 · Axios · Sonner (toasts). Padrão de frontend R&M Tecnologia.

## Rodar em desenvolvimento

```bash
cp .env.example .env      # ajuste VITE_AUTH_API_URL para a URL do BFF
npm install               # ou: bun install
npm run dev               # http://localhost:5173
```

Credenciais de teste (ver `PortalArgus/sql/01`): `admin@admin.com`.

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `VITE_AUTH_API_URL` | URL base do BFF (PortalArgus.Api). Dev: `https://localhost:5201`. |
| `VITE_CLIENT_NAME` | Nome exibido no header/título. Padrão: `Portal Argus`. |
| `VITE_BRAND_PRIMARY_HEX` | Cor primária (referência). Tokens efetivos em `src/index.css`. |

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento. |
| `npm run build` | Type-check (`tsc -b`) + build de produção. |
| `npm run lint` | ESLint. |
| `npm test` | Testes (vitest). |

## Rotas

| Rota | Tela | Acesso |
|---|---|---|
| `/login` | Login (credenciais → MFA) | público |
| `/forgot-password` | Esqueci minha senha | público |
| `/` | Painel de aplicativos | autenticado |
| `/security` | Configuração de 2FA | autenticado |
| `/admin` | Console — início | Administrator |
| `/admin/apps` · `/admin/apps/:id` | Aplicativos + perfis de acesso | Administrator |
| `/admin/users` · `/admin/users/:id` | Usuários + vínculos app/perfil | Administrator |

As rotas `/admin/*` só aparecem para usuários com a role global `Administrator`; a segurança
real é garantida pelo backend.

## Estrutura

```
src/
├── api/            camada HTTP (axios) por domínio + types.ts (contrato)
├── components/
│   ├── ui/         primitivos shadcn/ui
│   ├── admin/      diálogos de formulário (app, perfil, usuário)
│   └── layout/     AppShell, AdminLayout, AuthShell, header/footer
├── context/        AuthContext (sessão + isAdmin)
├── lib/            branding, utils, labels
└── pages/          telas (+ pages/admin para o console)
```

> **Backend (fora deste repo):** o console consome endpoints administrativos que o BFF ainda
> precisa proxiar (`/api/applications*`, `/api/access-profiles*`, `/api/users*`,
> `/api/userapplications*`, `/api/roles*`) — ver PRD §2.1. Sem isso, as telas de admin
> exibem estados de erro amigáveis, mas não operam end-to-end.

---

Powered by **R&M Tecnologia** — https://rmtecho.com.br
