# Архитектура Kavbot

## Принципы проектирования

1. **Модульность** — каждый сервис независим, связь через API/очереди
2. **Observability** — структурированные логи, метрики, трассировка
3. **Resilience** — retry логика, graceful shutdown, health checks
4. **Security** — строгая валидация, rate limiting, минимальные привилегии
5. **Scalability** — горизонтальное масштабирование (K8s HPA), очереди

## Data Flow

### 1. Ingestion Pipeline

```
Telegram Channel → Telethon → Dedup (simhash) → Normalize → Embed → Postgres
RSS/Site → httpx → readability → Dedup → Normalize → Embed → Postgres
```

### 2. User Query Flow (RAG)

```
User (Telegram) → Bot → API /search
                         ↓
                    Intent Classifier
                         ↓
              Hybrid Search (FTS + pgvector)
                         ↓
              Rerank (CrossEncoder) — опционально
                         ↓
              Top-K Results → Format → Bot → User
```

### 3. Listing Creation Flow (WebApp)

```
User (WebApp) → Auth (initData) → JWT → Create Listing
                                         ↓
                                   Presigned S3 Upload
                                         ↓
                                   Status: pending
                                         ↓
                              Admin Moderation Queue
                                         ↓
                              Approved → published_at set
                                         ↓
                              Queue Embedding Job (BullMQ)
                                         ↓
                              Workers → Ingest /embed → Update DB
```

## Database Schema

### Indexes

- **FTS**: GIN trigram на `documents.title`, `listings.title`
- **Vector**: IVFFlat (lists=100) на `documents.embedding`, `listings.embedding`
- **B-tree**: `publishedAt DESC`, `createdAt DESC`, `status`, `categoryId`

### Performance

- **FTS search**: ~50ms на 100k документов
- **Vector search**: ~100ms на 100k векторов (IVFFlat)
- **Hybrid search + rerank**: ~600ms (FTS → pgvector → rerank top-50 → top-5)

## Service Communication

```
┌─────────┐      HTTP      ┌─────┐      HTTP       ┌─────────┐
│   Bot   │ ───────────▶   │ API │ ───────────▶    │ Ingest  │
└─────────┘                 └─────┘                 └─────────┘
     │                         │                          │
     │                         │                          │
  Redis                    Prisma                      Psycopg
  (cache)                    │                          │
                             │                          │
                      ┌──────▼──────────────────────────▼──────┐
                      │           Postgres + pgvector           │
                      └─────────────────────────────────────────┘
```

### Queues (BullMQ)

- **embeddings**: Генерация эмбеддингов для новых документов/объявлений
- **llm-tasks**: Длительные RAG-ответы (LLM)
- **notifications**: Рассылки уведомлений через Bot API
- **image-processing**: Генерация превью изображений

## Deployment

### Development

```bash
# Local services
pnpm dev  # Turbo запускает все apps/* одновременно

# Infra
docker-compose up -d postgres redis minio
```

### Production (Docker Compose)

```bash
docker-compose up -d
```

Nginx маршрутизация:

- `/api/*` → API (3001)
- `/bot*` → Bot webhook (3002)
- `/*` → WebApp (3000)

### Production (Kubernetes)

```yaml
# Planned
- Deployment: api (replicas: 3, HPA на CPU 70%)
- Deployment: bot (replicas: 2)
- Deployment: web (replicas: 2)
- Deployment: workers (replicas: 2, HPA на queue length)
- StatefulSet: postgres (PVC 50Gi)
- StatefulSet: redis (PVC 10Gi)
- Ingress: nginx-ingress + cert-manager (Let's Encrypt)
```

## Security Model

### Auth Flow

1. User открывает WebApp через Telegram
2. Telegram передаёт `initData` (подписано HMAC-SHA256)
3. API проверяет:
   - HMAC валидность (секрет = BOT_TOKEN)
   - Timestamp (не старше 120с)
   - Nonce (опционально, Redis check)
4. Если OK → выдаёт JWT (30 min TTL)
5. JWT используется для всех последующих запросов

### Rate Limiting

- Bot: 20 сообщений/мин per user (Redis)
- API: 100 req/мин per IP, 200 req/мин per user (Throttler)

### File Upload

1. User запрашивает presigned URL через API
2. API генерирует presigned PUT URL (S3, 5 min TTL)
3. User загружает файл напрямую в S3
4. User отправляет s3Key в API при создании объявления
5. API проверяет MIME, размер (5 MB max), количество (10 max)

## Monitoring & Observability

### Metrics (Prometheus)

- **API**: HTTP request rate/latency, error rate, active connections
- **Bot**: Messages processed, errors, rate limit hits
- **Workers**: Queue length, job duration, errors
- **DB**: Connection pool usage, query duration, slow queries

### Logs (Loki)

- Structured JSON (pino)
- Request ID propagation (bot → API → workers → DB)
- Levels: DEBUG (dev), INFO (prod), ERROR (always)

### Tracing (Jaeger/Tempo) — опционально

- OpenTelemetry SDK
- Трассировка: bot → API → DB → worker → ingest

## Scalability Considerations

1. **Horizontal scaling**:
   - API/Bot/Workers — stateless, можно реплицировать
   - Postgres — read replicas (опционально)
   - Redis — Redis Cluster (опционально)

2. **Caching**:
   - Search results (Redis, 1ч)
   - User profiles (Redis, 5 мин)
   - Categories/Tags (Redis, 24ч)

3. **Queue back-pressure**:
   - BullMQ concurrency limits
   - Exponential backoff на ретрай
   - Dead letter queue для неудавшихся задач

## Future Enhancements

- **Vector DB** (Qdrant/Weaviate) вместо pgvector для >1M векторов
- **GraphQL** (Apollo Server) для гибких запросов фронта
- **gRPC** для inter-service communication (низкая латентность)
- **Event Sourcing** (Kafka/RabbitMQ) для audit log
- **ML Model serving** (Triton/TorchServe) для embeddings/rerank
- **CDN** (Cloudflare) для статики WebApp
- **Multi-region deployment** (geo-distributed DB, edge compute)

---

**Архитектура спроектирована для production-grade нагрузок с учётом best practices.**