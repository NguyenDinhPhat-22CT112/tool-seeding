FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json apps/api/package.json
COPY packages packages
RUN pnpm install --filter @seeding/api... --frozen-lockfile=false

COPY apps/api apps/api
RUN pnpm --filter @seeding/api build

CMD ["pnpm", "--filter", "@seeding/api", "start"]
