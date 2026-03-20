# syntax=docker/dockerfile:1
FROM node:22-alpine AS builder

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

WORKDIR /app/server
ENV NODE_ENV=production

COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

COPY server/prisma ./prisma
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/client/dist ../client/dist

ENV DATABASE_URL="postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder"
RUN npx prisma generate

# Render and other hosts set PORT; default matches local dev.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
