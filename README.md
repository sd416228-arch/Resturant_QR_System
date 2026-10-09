# Restaurant QR Ordering System

A restaurant QR ordering system built with HTML, CSS, JavaScript, and React on the frontend, Node.js for the backend, and PostgreSQL for the database.

## Project goal

This project keeps the same aim as the original version: a restaurant can use QR codes on each table so customers can browse the menu, place orders, and receive status updates without needing a waiter.

The system includes:
- Customer table QR access
- Menu viewing
- Order placement
- Kitchen order tracking
- Admin dashboard for order and report management

## Updated technology stack

- Frontend: HTML, CSS, JavaScript, React
- Backend: Node.js
- Database: PostgreSQL
- Build tool: Vite

## Run on a phone over Wi-Fi

Start the API and the web app in separate terminals:

```bash
npm run api
npm run dev
```

Keep both processes running. Open the Vite network URL on the restaurant computer
and scan its table QR code from a phone connected to the same Wi-Fi. The web app
forwards `/api` requests to the API, so only the web app's network port needs to
be reachable from the phone. Orders are confirmed only after the API accepts
them; an offline phone-only order will not appear in the kitchen.

### Dashboard links

Use the same host and port for each role:

- Admin dashboard: `/admin`
- Kitchen display: `/kitchen`
- Customer menu: `/customer?table=01` (change `01` to the table number)

For example, on the restaurant computer these are `http://localhost:5173/admin`,
`http://localhost:5173/kitchen`, and `http://localhost:5173/customer?table=01`.
On a phone on the same Wi-Fi, replace `localhost` with the computer's Wi-Fi IP.
These links open separate screens; they do not currently enforce role-based
login or permissions.

## How it works

```
Customer scans table QR → opens menu in browser
→ selects food/drinks → submits order
→ order is stored in backend/database
→ kitchen staff views pending orders
→ status changes from New to Preparing to Ready to Completed
→ admin can monitor orders, menu, and reports
```

## Same functionality as before

This version keeps the same business idea and project flow, but changes the language stack to match your requirement:
- frontend in HTML, CSS, JS, and React
- backend in Node.js
- database in PostgreSQL

## Project structure

```bash
src/              # React frontend components and logic
server/           # Node.js backend APIs
database/         # PostgreSQL schema and queries
public/           # Static assets
```

## Features

- QR code table access
- Restaurant menu display
- Customer order creation
- Order status tracking
- Kitchen management panel
- Admin reporting
- Menu and product management

## Summary

The aim and project are the same, but the language/technology stack is now updated to:

- Frontend: HTML, CSS, JavaScript, React
- Backend: Node.js
- Database: PostgreSQL

This maintains the same restaurant QR system concept while matching your requested stack.