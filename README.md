# Kavbot — Telegram Bot + WebApp (Monorepo)

Производственный монорепозиторий для Telegram-бота Кавалерово с RAG-поиском, доской объявлений и модульной архитектурой.

## 🏗 Архитектура

```
apps/
  bot/        # Telegram Bot (grammY, webhook)
  api/        # Backend API (NestJS, REST/GraphQL, Swagger)
  web/        # WebApp (Next.js 14 App Router + Tailwind + shadcn/ui)
  workers/    # BullMQ workers (embeddings, LLM tasks, notifications)

services/
  ingest/     # Python 3.11 FastAPI (Telethon, парсинг, эмбеддинги)

packages/
  shared/     # Общие DTO/типы, валидаторы, utils
  database/   # Prisma schema + клиент (Postgres + pgvector)

infra/
  docker/     # Dockerfiles для всех сервисов
  nginx/      # Nginx reverse proxy конфиг
```

## 🚀 Быстрый старт

### Требования

- Node.js 20+
- Python 3.11+
- pnpm 8+
- Docker & Docker Compose

### 1. Установка зависимостей

```bash
# Root
pnpm install

# Generate Prisma client
pnpm db:generate
```

### 2. Настройка окружения

```bash
cp .env.example .env
# Заполните все переменные в .env
```

### 3. Запуск инфраструктуры

```bash
# Поднять Postgres + Redis + MinIO
docker-compose up -d postgres redis minio

# Применить миграции
pnpm db:migrate

# Seed initial data (категории, теги)
cd packages/database && pnpm db:seed
```

### 4. Добавление тестовых данных (опционально)

```bash
# Добавить тестовые объявления, пользователей, документы
cd packages/database
pnpm db:seed:test

# Или через SQL (альтернатива)
# docker-compose exec postgres psql -U kavbot -d kavbot < packages/database/seed-test.sql
```

Тестовые данные включают:
- 3 пользователя (1 admin, 2 обычных)
- 8 объявлений (6 approved, 2 pending)
- 4 документа (новости, события, отключения)
- 2 комментария
- 1 источник (Telegram канал)
- 1 мероприятие
- 1 место (спортклуб)

### 5. Запуск сервисов (dev mode)

```bash
# В отдельных терминалах:

# API
cd apps/api && pnpm dev

# Bot
cd apps/bot && pnpm dev

# Web
cd apps/web && pnpm dev

# Workers
cd apps/workers && pnpm dev

# Ingest (Python)
cd services/ingest
pip install -r requirements.txt
uvicorn src.main:app --reload
```

### 5. Production deploy

```bash
# Build and run all services
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop
docker-compose down
```

## 📚 API Documentation

После запуска API доступна Swagger документация:

```
http://localhost:3001/api/docs
```

## 🧪 Тестирование

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Coverage
pnpm test:cov
```

## 📦 Основные команды

```bash
# Установка зависимостей
pnpm install

# Dev (все сервисы)
pnpm dev

# Build (все сервисы)
pnpm build

# Lint
pnpm lint

# Format
pnpm format

# Clean
pnpm clean

# Database
pnpm db:generate    # Generate Prisma client
pnpm db:push        # Push schema to DB (dev)
pnpm db:migrate     # Run migrations (prod)
pnpm db:seed        # Seed initial data

# Docker
pnpm docker:up      # Start all services
pnpm docker:down    # Stop all services
pnpm docker:logs    # View logs
```

## 🔑 Ключевые особенности

### Bot (apps/bot)

- ✅ Webhook режим (продакшн) + long polling (dev)
- ✅ Rate limiting (20 req/min per user)
- ✅ Idempotency (Redis, 5 min TTL)
- ✅ Intent routing (news/outage/event/training/ads/general)
- ✅ Grounded answers (только факты из БД, с датами и источниками)
- ✅ WebApp integration (открытие доски объявлений)

### API (apps/api)

- ✅ NestJS + Prisma ORM
- ✅ Telegram WebApp auth (HMAC-SHA256 validation)
- ✅ JWT (30 min TTL)
- ✅ CRUD listings (create, read, update, archive)
- ✅ Search (FTS + pgvector hybrid)
- ✅ Admin moderation
- ✅ S3 presigned URLs (photo upload)
- ✅ Swagger docs
- ✅ Rate limiting, CORS, Helmet

### WebApp (apps/web)

- ✅ Next.js 14 App Router + SSR/ISR
- ✅ Tailwind + shadcn/ui
- ✅ Framer Motion (плавные анимации)
- ✅ TanStack Query (кэширование, infinite scroll)
- ✅ React Hook Form + Zod
- ✅ Telegram WebApp SDK (@twa-dev/sdk)
- ✅ Поддержка темной/светлой темы Telegram
- ✅ Живая лента, поиск, фильтры, создание объявлений

### Ingest (services/ingest)

- ✅ Telethon (парсинг Telegram-каналов)
- ✅ Deduplication (simhash)
- ✅ Embeddings (multilingual-e5-base, 768-dim)
- ✅ Периодические задачи (APScheduler, каждый час)
- ✅ REST API (FastAPI)

### Workers (apps/workers)

- ✅ BullMQ + Redis
- ✅ Embeddings worker (5 concurrency)
- ✅ LLM tasks worker (2 concurrency)
- ✅ Notifications worker (10 concurrency)
- ✅ Image processing worker (3 concurrency)
- ✅ Graceful shutdown

## 🗄 База данных

Postgres 16 + pgvector

Основные таблицы:

- `users` — пользователи (Telegram ID, роли)
- `sources` — источники контента (Telegram/RSS/сайты)
- `documents` — унифицированные тексты для RAG (с эмбеддингами)
- `events` — нормализованные события
- `places` — организации/секции/залы
- `listings` — объявления (с эмбеддингами)
- `categories` — категории объявлений
- `tags` — теги (динамические)
- `listing_photos` — фото объявлений (S3 ключи)
- `comments` — комментарии (с поддержкой веток)
- `ingest_state` — состояние парсеров (last_item_id, cursor)

## 🔒 Безопасность

- ✅ Строгая проверка Telegram initData (HMAC-SHA256, окно ≤120с, nonce)
- ✅ JWT с коротким TTL (30 мин)
- ✅ Rate limiting (per-IP, per-user)
- ✅ CORS (только доверенные домены)
- ✅ Helmet (security headers)
- ✅ Санитайзинг пользовательского текста
- ✅ Presigned S3 URLs (upload only)
- ✅ Файловые ограничения (5 MB, 10 фото max)

## 📊 Мониторинг

- `/health` — health check (API, DB)
- `/metrics` — Prometheus metrics (uptime, memory, custom)
- Structured logs (pino, JSON)
- Sentry integration (опционально)
- OpenTelemetry (опционально)

## 🛠 Дополнительно

### Добавление нового источника (Telegram канал)

```sql
INSERT INTO sources (id, type, handle_or_url, title, is_active)
VALUES (gen_random_uuid(), 'telegram', '@example_channel', 'Example Channel', true);
```

После этого ingest service автоматически начнёт парсить канал каждый час.

### Ручной запуск парсинга

```bash
curl -X POST http://localhost:8000/ingest/run \
  -H "Content-Type: application/json" \
  -d '{"source_id": "your-source-uuid"}'
```

### Создание категории/тега вручную

```sql
-- Категория
INSERT INTO categories (id, slug, name)
VALUES (gen_random_uuid(), 'electronics', 'Электроника');

-- Тег
INSERT INTO tags (id, slug, name)
VALUES (gen_random_uuid(), 'новое', 'Новое');
```

## 📝 Roadmap

- [ ] Reranker (CrossEncoder) для улучшения поиска
- [ ] Кэширование RAG-ответов (Redis, 1-6ч TTL)
- [ ] Admin UI (модерация, статистика)
- [ ] RSS/сайты парсинг (feedparser, readability)
- [ ] Геолокация (фильтры по региону)
- [ ] Push-уведомления (новые объявления, ответы на комментарии)
- [ ] CI/CD (GitHub Actions, auto-deploy)
- [ ] Kubernetes (HPA, Ingress, cert-manager)

## 🤝 Contributing

1. Fork
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT

---

**Made with ❤️ by Senior Solution Architect + Lead Full-Stack Engineer**