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

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/migrations ./migrations

# Schema migration script (idempotent — safe to run on every boot)
COPY apply-schema.js ./apply-schema.js

# Copy the compiled better-sqlite3 native addon
COPY --from=deps /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=deps /app/node_modules/bindings ./node_modules/bindings
COPY --from=deps /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path

# bcryptjs is needed by apply-schema.js for admin password hashing at startup
COPY --from=deps /app/node_modules/bcryptjs ./node_modules/bcryptjs

RUN mkdir -p /data

EXPOSE 3000

# Run schema migrations on every boot (idempotent), then start the app
CMD ["sh", "-c", "node apply-schema.js && node server.js"]
