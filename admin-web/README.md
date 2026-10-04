# Pathora Admin Portal

Internal web portal for the Pathora admin team. Covers one workflow for this MVP: reviewing
company registration requests (PENDING / APPROVED / REJECTED) and approving or rejecting them.

This is a separate app from the React Native mobile app — admins are never part of the mobile
experience. It talks to the same backend as the mobile app, using only the existing
`/api/v1/auth/login` and `/api/v1/admin/company-requests*` endpoints.

Stack: React + TypeScript + Vite + React Router. No UI framework — plain components and CSS
using Pathora's existing color/spacing tokens (ported from the mobile app's design system).

## Prerequisites

- The Pathora backend running locally on port 8080 (see `backend/`).
- At least one ADMIN account already provisioned on that backend (via
  `PATHORA_ADMIN_EMAIL` / `PATHORA_ADMIN_PASSWORD` — see the backend's own docs). There is no
  admin registration screen anywhere in this app, on purpose.
- Node.js 20+.

## Local development

```
npm install
npm run dev
```

Open the printed `http://localhost:5173` URL and log in with an admin account's email and
password.

The dev server proxies any request starting with `/api` to `http://localhost:8080` (see
`vite.config.ts`), so the frontend only ever calls relative URLs like `/api/v1/auth/login` and
never needs CORS configuration or a hardcoded backend host.

## LAN access (another laptop on the same network)

To let a teammate open this portal from their own machine while you run it:

```
npm run dev -- --host 0.0.0.0
```

Vite will print a "Network" URL — share `http://<your-machine's-LAN-IP>:5173` with your
teammate. Their browser still only ever calls relative `/api/...` paths, which your machine's
Vite dev server proxies to `http://localhost:8080` on *your* machine — so only the frontend's
port (5173) needs to be reachable on the network, never PostgreSQL (5432/5433) or anything
else. Do not expose the database.

On Windows, the first time you run with `--host`, Windows Firewall may prompt to allow Node.js
on **Private networks** — allow it (do not allow Public networks). If your teammate still can't
connect, double-check both machines are on the same network and that the firewall prompt was
accepted.

Never hardcode a LAN IP anywhere in this project — it's only ever the value Vite prints at
startup, which changes between networks and machines.

## Environment configuration

Copy `.env.example` to `.env` if you need to override anything (optional for local dev):

```
cp .env.example .env
```

`VITE_API_BASE_URL` is the only variable. Leave it empty for local development (relative
`/api/v1`, routed through the Vite proxy above). **Never put a backend secret in this file** —
anything prefixed `VITE_` is bundled into the built JavaScript and shipped to the browser in
plain text. Admin credentials are always typed into the login screen; they are never read from
an env file by this app.

## Future production deployment (not done in this task)

Concept only — nothing is deployed here:

- Admin frontend: `https://admin.pathora.com` (a static build of this app, e.g. via
  `npm run build` → `dist/`)
- Backend: `https://api.pathora.com`
- In that setup, the admin frontend's `VITE_API_BASE_URL` would be set to
  `https://api.pathora.com/api/v1` at build time, and the backend would need to allow CORS
  from `https://admin.pathora.com` (there is no dev proxy in a static production deployment).

## Session handling

The admin's JWT is stored in `sessionStorage` under the key `pathora_admin_token` — cleared on
logout, on a 401 from any API call, and naturally when the browser tab closes. It is never
logged, written to a cookie, or put in a URL.

## Scope

Deliberately limited to company-request review. No analytics, user management, internship or
applicant moderation, messaging, or settings pages exist in this portal — see the project's
MVP milestone notes if you're looking for those.
