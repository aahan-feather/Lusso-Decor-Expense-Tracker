# Papa Expense Tracker

Internal expense and project tracker: React + Vite front end, Express API, Prisma + PostgreSQL.

## Requirements

- **Node.js** 20+ (22 LTS recommended)
- **PostgreSQL** for local dev — easiest via [Docker Compose](./docker-compose.yml) (`docker compose up -d`)

## First-time setup

```bash
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

Create `server/.env` from [`server/.env.example`](./server/.env.example) (defaults match Docker Compose). Apply the schema:

```bash
cd server && npx prisma migrate deploy && cd ..
```

## Development

From the repo root:

| Command        | Description                          |
|----------------|--------------------------------------|
| `npm run dev`  | API (port **3001**) + Vite (**5173**) |
| `npm run dev:server` | API only                       |
| `npm run dev:client` | Front end only (proxies `/api` to 3001) |

Open **http://localhost:5173** while developing.

## Build

```bash
npm run build
```

Produces `server/dist` and `client/dist`. In production, the server serves `client/dist` when present so the app and `/api` share one origin.

## Database helpers

| Command              | Description        |
|----------------------|--------------------|
| `npm run db:studio`  | Prisma Studio      |
| `npm run db:generate`| Regenerate client  |
| `npm run db:push`    | Push schema (dev shortcuts; prefer `migrate` when using migrations) |
| `npm run db:clear`   | Delete all rows (keeps tables) |

## Deploy

See **[DEPLOY.md](./DEPLOY.md)** for Render (Docker + managed Postgres) and notes for other hosts.

## Layout

- **`client/`** — Vite + React + TypeScript  
- **`server/`** — Express API, Prisma schema & migrations  
- **`Dockerfile`** — production image  
- **`render.yaml`** — Render Blueprint (DB + web service)
