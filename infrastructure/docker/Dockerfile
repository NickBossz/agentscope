FROM oven/bun:1.3.14-alpine AS base
WORKDIR /app

FROM base AS dependencies
COPY package.json bun.lock* ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/sdk-node/package.json packages/sdk-node/package.json
COPY packages/telemetry/package.json packages/telemetry/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN bun install --frozen-lockfile

FROM dependencies AS development
COPY --chown=bun:bun . .
USER bun

FROM dependencies AS build
COPY . .
RUN bun run build

FROM base AS production
ENV NODE_ENV=production
COPY --from=build --chown=bun:bun /app /app
USER bun
CMD ["bun", "run", "start"]
