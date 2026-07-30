FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/worker/package.json apps/worker/package.json
COPY packages packages
RUN pnpm install --filter @seeding/worker... --frozen-lockfile=false

COPY apps/worker apps/worker
RUN pnpm --filter @seeding/worker build

CMD ["pnpm", "--filter", "@seeding/worker", "start"]
