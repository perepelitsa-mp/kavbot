FROM node:20-alpine AS base

RUN npm install -g pnpm

FROM base AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/bot ./apps/bot

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @kavbot/bot build

FROM base AS runner

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/bot/dist ./dist
COPY --from=builder /app/apps/bot/package.json ./package.json

EXPOSE 3002

CMD ["node", "dist/index.js"]