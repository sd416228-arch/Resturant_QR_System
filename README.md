# Sprig Restaurant QR Menu

QR ordering + kitchen display built with React, TypeScript, Vite, and a small Node API.

## What this is

A working single-restaurant ordering loop:

```
customer scans table QR → fetches the live menu from the API
  → builds a cart → order POSTed to the server
  → server validates every item + recomputes the price against the canonical menu
  → kitchen display polls the API → staff move the order through statuses
  → customer sees confirmation + receives status updates
```

The server owns the menu. `data/menu.json` is the single source of truth that
every device (the owner's admin tab **and** every customer phone) loads from, so
an owner's menu edit appears on customer devices on their next load. Customer
orders and kitchen/order statuses live in `data/orders.json` on the server.

## Run locally

```bash
npm install
npm run api     # starts the API on http://localhost:8787
npm run dev     # starts Vite on http://localhost:5173
```

Open `http://localhost:5173` for the admin dashboard. The API URL is derived
from `window.location.hostname` port `8787`, so testing from a phone on the same
LAN works out of the box when you set `VITE_PUBLIC_URL` to your machine's LAN IP.

To try the customer flow without scanning: start the API and open
`http://localhost:8787/api/tables/token` via a POST for a table number, then visit
`http://localhost:5173/?t=<returned-token>`.

Use the **Tables & QR** view to download real QR codes per table.

## Project structure

```
src/
  components/      Admin and customer views (Overview, Orders, Kitchen, Menu,
                   Tables & QR, Reports, Customer, shared UI)
  hooks/           useMenu (server-backed canonical menu), useOrders (polling)
  lib/             api.ts (typed API client), money.ts (integer-paisa NPR formatting)
  types.ts         Domain models (MenuItem, Order, OrderLine, …)
server.mjs         Validated HTTP API (menu, orders, table-QR tokens)
data/menu.json     Canonical menu (the source of truth)
data/orders.json   Stored orders (server-owned)
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/menu` | Canonical menu for all devices |
| PUT | `/api/menu` | 🔒 Owner saves menu edits (persisted server-side) |
| GET | `/api/orders` | Order queue (admin/kitchen) |
| POST | `/api/orders` | Customer places an order |
| PATCH | `/api/orders/:id` | Status transition (New → Preparing → Ready → …) |
| POST | `/api/tables/token` | 🔒 Issue a signed, opaque table QR token |
| GET | `/api/tables/verify?token=` | Resolve a QR token back to a table |
| GET | `/api/health` | Health / readiness |

🔒 = requires `Authorization: Bearer <ADMIN_TOKEN>` when a token is configured.

### What the server enforces

- **Server-side pricing.** Order totals are recomputed from `data/menu.json`.
  A client cannot send its own `total`; unknown items and invalid quantities are
  rejected. Table numbers come from the verified QR token, never the request.
- **Guarded JSON parsing.** Malformed bodies return `400` instead of crashing.
- **Status validation.** Only the five known statuses are accepted, and completed /
  cancelled orders are locked (`409`).
- **Signed table tokens.** QR codes encode an HMAC-signed opaque token, not a raw
  `?table=99`. Tokens are bound to the restaurant id and verified server-side.
- **Authenticated owner writes.** `PUT /api/menu` and `POST /api/tables/token`
  require `Authorization: Bearer <ADMIN_TOKEN>` once a token is configured, so a
  stranger on the network can't rewrite the menu or mint their own QR codes.
  Unconfigured, these stay open (development only, warned on startup).
- **Rate limiting.** Order POSTs are capped per-IP (30/min) to blunt scripted spam.
- **Atomic file writes.** Orders are written to a temp file then renamed.
- **Restricted CORS.** `ALLOWED_ORIGIN` (env) restricts which origins may call the
  API; defaults to wildcard in development with a console warning.

## Environment

Copy `.env.example` to `.env` and set at least:

- `VITE_PUBLIC_URL` — the URL your QR codes point to (your machine's LAN IP when
  testing from a phone).
- `QR_TOKEN_SECRET` — a long random string. Without it the server uses a dev-only
  default and warns on startup.
- `ADMIN_TOKEN` — a long random string guarding the owner write endpoints
  (menu edits, QR token issuance). Mirror it in `VITE_ADMIN_TOKEN` for the admin
  UI. Without it those endpoints stay open and the server warns on startup.
- `ALLOWED_ORIGIN` — set to your frontend origin in production.

`npm run api` loads `.env` automatically (Node ≥ 22).

## Validate

```bash
npm run build   # tsc + vite build
npm run lint    # oxlint
```

## Honest-numbers guarantee

Every number in the admin dashboard is computed from real data:
`data/orders.json` drives revenue, order volume, averages, dish-share bars, and
peak ordering hours. There is no fabricated padding. The date is always today's.

## What is intentionally not built yet

- Authentication and staff roles (owner write endpoints are guarded by a shared
  bearer token — `ADMIN_TOKEN` — but there is no per-user login or role model;
  secure before deploying beyond trusted devices).
- PostgreSQL / multi-tenancy (file-backed storage serves one restaurant).
- Payment gateway recording.
- Offline-first customer ordering (requires connectivity to place an order).
- WebSocket live updates (the UI polls every 2s).

See the roadmap in your pitch deck: backend + DB, staff auth, payment recording,
and customer order-tracking are the next milestones for a production deployment.