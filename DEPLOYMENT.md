# Deployment Guide

## Предварительные требования

- Docker 24+ & Docker Compose 2.20+
- Domain с A-записью на ваш сервер
- SSL сертификат (Let's Encrypt рекомендуется)
- Минимум 4 GB RAM, 2 CPU, 20 GB диск

## Production Deploy (Docker Compose)

### 1. Клонирование репозитория

```bash
git clone https://github.com/yourorg/kavbot.git
cd kavbot
```

### 2. Настройка окружения

```bash
cp .env.example .env
nano .env
```

Обязательные переменные:

```env
BOT_TOKEN=your_actual_bot_token
JWT_SECRET=your_random_jwt_secret_32chars
TELEGRAM_API_ID=your_telegram_api_id
TELEGRAM_API_HASH=your_telegram_api_hash
WEBHOOK_URL=https://yourdomain.com
WEBAPP_URL=https://yourdomain.com
OPENAI_API_KEY=your_openai_key
```

### 3. Генерация секретов

```bash
# JWT Secret (32 символа)
openssl rand -hex 32

# Или используйте Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Build и запуск

```bash
# Build all images
docker-compose build

# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 5. Инициализация БД

```bash
# Wait for Postgres to be ready
docker-compose exec postgres pg_isready

# Run migrations
docker-compose exec api pnpm db:migrate

# Seed initial data
docker-compose exec api pnpm db:seed
```

### 6. Настройка Telegram Webhook

```bash
# Set webhook manually
curl -X POST https://api.telegram.org/bot<BOT_TOKEN>/setWebhook \
  -d "url=https://yourdomain.com/bot<BOT_TOKEN>" \
  -d "max_connections=100"

# Verify webhook
curl https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo
```

### 7. Создание S3 бакета (MinIO)

```bash
# Access MinIO console
# http://yourdomain.com:9001
# Login: minioadmin / minioadmin

# Create bucket "kavbot"
# Set policy: public read
```

Или через CLI:

```bash
docker-compose exec minio mc alias set local http://localhost:9000 minioadmin minioadmin
docker-compose exec minio mc mb local/kavbot
docker-compose exec minio mc policy set download local/kavbot
```

### 8. Добавление первого источника

```bash
docker-compose exec postgres psql -U kavbot -d kavbot -c \
  "INSERT INTO sources (id, type, handle_or_url, title, is_active) \
   VALUES (gen_random_uuid(), 'telegram', '@example_channel', 'Example Channel', true);"
```

### 9. Health Check

```bash
# API
curl http://localhost:3001/health

# Ingest
curl http://localhost:8000/health

# Nginx
curl http://localhost/health
```

## SSL/TLS Setup (Let's Encrypt)

### С использованием Certbot

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal (cron)
sudo certbot renew --dry-run
```

### Обновление Nginx конфига

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # ... rest of config
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

## Обновление Production

### Zero-downtime deploy

```bash
# Pull latest code
git pull origin main

# Build new images
docker-compose build

# Rolling update (one service at a time)
docker-compose up -d --no-deps --build api
docker-compose up -d --no-deps --build bot
docker-compose up -d --no-deps --build web
docker-compose up -d --no-deps --build workers

# Run migrations if needed
docker-compose exec api pnpm db:migrate
```

### Rollback

```bash
# Go back to previous commit
git checkout <previous-commit>

# Rebuild and restart
docker-compose up -d --build
```

## Backup & Restore

### Database Backup

```bash
# Backup
docker-compose exec postgres pg_dump -U kavbot kavbot > backup_$(date +%Y%m%d).sql

# Restore
docker-compose exec -T postgres psql -U kavbot kavbot < backup_20240101.sql
```

### Automated Backups (cron)

```bash
# Add to crontab
0 2 * * * cd /path/to/kavbot && docker-compose exec postgres pg_dump -U kavbot kavbot | gzip > /backups/kavbot_$(date +\%Y\%m\%d).sql.gz
```

### S3 Backup (MinIO)

```bash
# Sync to external S3 (AWS/Yandex/etc)
docker-compose exec minio mc mirror local/kavbot s3-external/kavbot-backup
```

## Monitoring Setup

### Prometheus + Grafana (опционально)

```yaml
# Add to docker-compose.yml
prometheus:
  image: prom/prometheus:latest
  volumes:
    - ./infra/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
  ports:
    - "9090:9090"

grafana:
  image: grafana/grafana:latest
  ports:
    - "3030:3000"
  environment:
    GF_SECURITY_ADMIN_PASSWORD: admin
```

### Loki + Promtail (логи)

```yaml
loki:
  image: grafana/loki:latest
  ports:
    - "3100:3100"

promtail:
  image: grafana/promtail:latest
  volumes:
    - /var/lib/docker/containers:/var/lib/docker/containers:ro
    - ./infra/promtail/promtail.yml:/etc/promtail/config.yml
```

## Troubleshooting

### Логи не появляются

```bash
# Check all services
docker-compose logs

# Check specific service
docker-compose logs api
docker-compose logs bot
```

### Webhook не работает

```bash
# Check webhook info
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo

# Check Nginx logs
docker-compose logs nginx

# Check bot logs
docker-compose logs bot
```

### DB migration failed

```bash
# Reset migrations (DANGER: dev only!)
docker-compose exec api pnpm prisma migrate reset

# Or manually fix
docker-compose exec postgres psql -U kavbot kavbot
# Run SQL commands manually
```

### Out of memory

```bash
# Check container memory usage
docker stats

# Increase limits in docker-compose.yml
services:
  api:
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
```

## Security Hardening

1. **Firewall** (UFW):
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

2. **Fail2ban**:
```bash
sudo apt-get install fail2ban
# Configure /etc/fail2ban/jail.local
```

3. **Regular Updates**:
```bash
sudo apt-get update && sudo apt-get upgrade -y
docker-compose pull
docker-compose up -d
```

4. **Secrets Management**:
- Используйте Docker Secrets или Vault
- Не коммитьте `.env` в git
- Ротация API ключей раз в 3 месяца

## Maintenance

### Очистка Docker

```bash
# Remove unused containers
docker system prune -a

# Remove unused volumes
docker volume prune
```

### Vacuum Postgres

```bash
docker-compose exec postgres psql -U kavbot kavbot -c "VACUUM ANALYZE;"
```

### Redis Memory Check

```bash
docker-compose exec redis redis-cli INFO memory
docker-compose exec redis redis-cli DBSIZE
```

---

**При возникновении проблем обратитесь к логам и документации.**