# Deploy (fast path: Render)

The app is packaged as **one Docker image**: Express serves `/api/*` and the built Vite app from the same origin, so no CORS or `VITE_*` URL changes are needed.

## Prerequisite: Git + GitHub

[Render](https://render.com) deploys from a Git repository. Initialize git in this folder, commit, and push to GitHub (or GitLab / Bitbucket).

## One-click blueprint

1. In Render: **New** → **Blueprint**.
2. Connect your repo and select the branch.
3. Render reads [`render.yaml`](./render.yaml), provisions a **free PostgreSQL** database, wires `DATABASE_URL`, and builds the **Dockerfile**.
4. After the first deploy, open the web service URL — migrations run automatically on startup (`prisma migrate deploy`).

**Note:** Free web services spin down after idle and can take ~30s to wake on first request.

## Local development (PostgreSQL)

SQLite is no longer used; the schema targets PostgreSQL everywhere.

1. From the repo root: `docker compose up -d`
2. Copy [`server/.env.example`](./server/.env.example) to `server/.env` (same `DATABASE_URL` is fine).
3. Apply the schema once:

   ```bash
   cd server && npx prisma migrate deploy
   ```

4. Run as before: from repo root, `npm run dev` (or `npm run dev:server` / `npm run dev:client`).

Existing data in `server/prisma/dev.db` is **not** migrated automatically; treat cloud as a fresh database or export/import manually if you need old rows.

## Other hosts (Railway, Fly.io, etc.)

Any platform that can run a Docker image and provide a PostgreSQL `DATABASE_URL` works the same way: build with the repo [`Dockerfile`](./Dockerfile), set `DATABASE_URL` and `NODE_ENV=production`, expose the platform’s `PORT`.
