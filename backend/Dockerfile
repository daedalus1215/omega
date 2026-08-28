# Multi-stage: neither the TypeScript toolchain nor the C++ build tools reach the shipped
# image.

# ── stage 1: compile the TypeScript ──────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── stage 2: production dependencies, including native ones ──────────────────────────
# Its own stage so python3/make/g++ are available to compile bcrypt and are then thrown
# away with the stage rather than shipping in the runtime image.
#
# 📌 Unlike nemesis, omega has no `prepare`/`postinstall` scripts, so no --ignore-scripts
#    workaround is needed here and bcrypt builds during npm ci as normal.
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ── stage 3: the runtime ─────────────────────────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# The Postgres baseline compiles to dist/typeorm/migrations/, and app.module.ts points
# TypeORM at __dirname, so `migrationsRun: true` finds it here. Deploying is migrating.
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
