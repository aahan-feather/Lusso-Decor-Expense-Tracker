# Agent instructions

Read this file when making changes to the database, API, or data export/import.

## Database schema changes

When you add, remove, or rename a Prisma model in `server/prisma/schema.prisma`:

1. Create a migration (`npx prisma migrate dev` locally, or add a migration SQL file).
2. Run `npm run db:generate` so the Prisma client matches the schema.
3. **Backup export updates automatically** — no manual table list to edit. Export reads all models from the Prisma schema at runtime via `server/src/lib/backupExport.ts`.
4. Add or update API routes, client types in `client/src/api.ts`, and any UI that uses the new data.
5. If you change backup file layout or semantics in a breaking way, bump `BACKUP_FORMAT_VERSION` in `server/src/lib/backupExport.ts`.
6. When import exists, update import logic to match the new schema and import order.

### Backup export (dashboard)

- **Endpoint:** `GET /api/backup/export`
- **Implementation:** `server/src/lib/backupExport.ts`
- **UI:** Export button on `client/src/pages/Dashboard.tsx`
- **Format:** Zip with `manifest.json` plus `data/<model>s.json` per table (raw rows, ISO dates, IDs preserved).
- **Import order:** Computed from foreign-key relations in the schema.

New tables appear in backups as soon as the migration is applied and `prisma generate` has run. Column-only changes on existing models require no backup code changes.

## Project layout

- `client/` — React + Vite front end
- `server/` — Express API, Prisma schema and migrations
- `server/prisma/schema.prisma` — source of truth for database models
- `server/src/lib/backupExport.ts` — full-database backup export

## Commands

| Command | Use |
|---------|-----|
| `npm run dev` | Run API + client |
| `npm run db:generate` | Regenerate Prisma client after schema changes |
| `npm run build` | Production build |

See [README.md](./README.md) for setup and [DEPLOY.md](./DEPLOY.md) for deployment.
