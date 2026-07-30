FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/web/package.json apps/web/package.json
COPY packages packages
RUN pnpm install --filter @seeding/web... --frozen-lockfile=false

COPY apps/web apps/web
RUN pnpm --filter @seeding/web build

CMD ["pnpm", "--filter", "@seeding/web", "start"]
