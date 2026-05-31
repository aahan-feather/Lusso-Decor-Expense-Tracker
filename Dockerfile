# syntax=docker/dockerfile:1
FROM node:22-alpine AS builder

# Prisma engines need OpenSSL at build time; Alpine minimal images omit it.
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY server/package.json server/package-lock.json ./server/
COPY client/package.json client/package-lock.json ./client/

RUN cd server && npm ci
RUN cd client && npm ci

COPY server ./server
COPY client ./client

# prisma generate only needs a syntactically valid URL
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build"

RUN cd server && npx prisma generate && npm run build
RUN cd client && npm run build

FROM node:22-alpine AS runner

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app/server
ENV NODE_ENV=production

COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

COPY server/prisma ./prisma
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/client/dist ../client/dist

# Generate client at build time only; runtime DATABASE_URL comes from the host.
RUN DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build" npx prisma generate

# Render, Railway, and other hosts set PORT and DATABASE_URL at runtime.
CMD ["sh", "-c", "if [ -z \"$DATABASE_URL\" ]; then echo 'ERROR: DATABASE_URL is not set. Link a Postgres service and add DATABASE_URL to this service.' >&2; exit 1; fi; npx prisma migrate deploy && node dist/index.js"]
