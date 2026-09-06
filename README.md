# Sprig Restaurant QR Menu

A responsive Restaurant QR Menu and Ordering System MVP built with React, TypeScript, and Vite.

## Current architecture

- `src/App.tsx`: typed domain models, local persistence, admin navigation, customer menu, cart, ordering, kitchen flow, table QR controls, and reports.
- `src/index.css`: responsive design system for the admin workspace and mobile-first customer experience.
- Browser `localStorage`: persistence for menu items and orders in this frontend-only build. This makes the flows functional during development without pretending to have a remote database.

## Included workflows

- Owner dashboard with live order totals, revenue, popular items, recent orders, and a revenue chart.
- Menu management: quick-add menu items and enable/disable availability.
- Order queue with status transitions: New, Preparing, Ready, Completed, and Cancelled.
- Kitchen display with ticket actions and customer notes.
- Tables and QR management view with table state, QR action feedback, and print action feedback.
- Reports for sales, volume, average order value, category share, and peak times.
- Customer preview with restaurant branding, category filtering, search, item cards, cart, and order submission.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Use **Preview menu** to switch into the customer experience. Admin changes and orders persist in the browser.

## Validate

```bash
npm run build
npm run lint
```

## Production architecture to add

For a deployable SaaS, replace the local storage adapter with a backend API and PostgreSQL database. Suggested tables are `users`, `restaurants`, `staff`, `categories`, `menu_items`, `restaurant_tables`, `qr_codes`, `orders`, `order_items`, `payments`, and `settings`. Every tenant-owned record should carry `restaurant_id`, with composite indexes such as `(restaurant_id, created_at)` and database row-level security where supported.

Authentication should use secure, HTTP-only sessions with CSRF protection, role checks at the API boundary, schema validation, rate limiting on public order endpoints, and transaction-based order creation. QR payloads should contain an opaque signed restaurant/table token rather than trusted raw identifiers.

Payment methods are intentionally recorded only as order metadata in this MVP: Cash, Bank, Digital wallet, Card, and Other. No payment gateway is connected.

## Deployment

Build with `npm run build` and serve the `dist` directory from a static host or CDN. A production release should deploy the frontend alongside the authenticated API, database migrations, object storage for menu images, monitoring, backups, and audit logging.

## Future SaaS improvements

- Multi-user invitations and role-based staff permissions.
- PostgreSQL-backed tenant isolation and migrations.
- Real QR image generation/download/print, signed QR rotation, and disabled token handling.
- Image uploads, drag-and-drop menu reordering, category editing, taxes, discounts, and modifiers.
- Customer order tracking via server-sent events or WebSockets.
- Payment provider integrations, printer integrations, receipts, and scheduled reports.
- Automated unit, API, accessibility, and end-to-end tests.
"# Resturant_QR_System" 
