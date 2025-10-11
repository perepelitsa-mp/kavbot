FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm

FROM base AS builder

WORKDIR /app

# Copy root files
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/api ./apps/api

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN pnpm --filter @kavbot/database db:generate

# Build
RUN pnpm --filter @kavbot/api build

FROM base AS runner

WORKDIR /app

# Copy built files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/main.js"]