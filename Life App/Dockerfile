# Stage 1: Install dependencies
# node:20-slim (Debian) gives us glibc + standard libcurl so that
# garmin-connect-client's native addon (node-libcurl-ja3) can use
# prebuilt binaries instead of needing to compile from source.
FROM node:20-slim AS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ libcurl4-openssl-dev \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

# Stage 2: Build the Next.js standalone application
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx drizzle-kit generate
RUN npm run build

# Stage 3: Production runner
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV DB_PATH=/data/life-app.db
ENV CURL_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt
ENV SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt

RUN apt-get update && apt-get install -y --no-install-recommends \
    gosu libcurl4 ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/migrations ./migrations

COPY --chown=nextjs:nodejs apply-schema.js ./apply-schema.js
COPY --chown=nextjs:nodejs scripts ./scripts

# Copy all node_modules from deps stage — ensures native addons (better-sqlite3,
# garmin-connect-client → node-libcurl-ja3 → deasync) and all serverExternalPackages
# are available at runtime. Image is slightly larger but avoids fragile per-package COPYs.
COPY --from=deps /app/node_modules ./node_modules

RUN mkdir -p /data

EXPOSE 3000

CMD ["sh", "-c", "chown -R nextjs:nodejs /data && gosu nextjs sh -c 'node apply-schema.js && node server.js'"]
