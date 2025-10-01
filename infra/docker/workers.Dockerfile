FROM node:20-alpine AS base

RUN npm install -g pnpm

FROM base AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/workers ./apps/workers

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @kavbot/database db:generate
RUN pnpm --filter @kavbot/workers build

FROM base AS runner

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/workers/dist ./dist
COPY --from=builder /app/apps/workers/package.json ./package.json

CMD ["node", "dist/index.js"]