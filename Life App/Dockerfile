# Stage 1: Install dependencies (including native build tools for better-sqlite3)
FROM node:20-alpine AS deps
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build the Next.js standalone application
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx drizzle-kit generate
RUN npm run build

# Stage 3: Production runner (slim image)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
# Default DB path — override via Railway volume env var if needed
ENV DB_PATH=/data/life-app.db

RUN apk add --no-cache su-exec && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/migrations ./migrations

# Schema migration script (idempotent — safe to run on every boot)
COPY --chown=nextjs:nodejs apply-schema.js ./apply-schema.js

# Copy the compiled better-sqlite3 native addon
COPY --from=deps /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=deps /app/node_modules/bindings ./node_modules/bindings
COPY --from=deps /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path

# bcryptjs is needed by apply-schema.js for admin password hashing at startup
COPY --from=deps /app/node_modules/bcryptjs ./node_modules/bcryptjs

# Create /data as root so it exists; startup script will chown it before dropping privileges
RUN mkdir -p /data

EXPOSE 3000

# Startup: chown /data to nextjs (handles Railway volume mounts owned by root),
# then drop to unprivileged user to run migrations and start the server.
CMD ["sh", "-c", "chown -R nextjs:nodejs /data && su-exec nextjs sh -c 'node apply-schema.js && node server.js'"]
