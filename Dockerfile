ARG BASE_IMAGE=zbyte.tencentcloudcr.com/common/powerdrill-bloom-base-bun:1.0.1

# Build stage (bun for install, node for next build)
FROM ${BASE_IMAGE} AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Build-time .env so next build can load routes that import env (e.g. db client); runtime uses real .env from Helm
COPY .env.example .env
RUN bun run build

# Production stage
FROM builder AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1000 nodejs
RUN adduser --system --uid 1000 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
