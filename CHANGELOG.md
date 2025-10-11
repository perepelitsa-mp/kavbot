# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- ESLint configuration with `no-console` rule enforcement
- CI/CD pipeline using GitHub Actions
  - Automated linting and type checking
  - Unit and E2E test execution
  - Docker build validation
  - Deployment workflow
- Comprehensive unit tests for AuthService and ListingsService
- E2E tests for listings endpoints
- Graceful shutdown handling for API server (SIGTERM/SIGINT)
- Health check endpoint (`/health`) with database status
- Docker HEALTHCHECK instructions for API and Web containers
- Prisma exception filter for better error handling
- Recursive comment threading with infinite nesting support
- Rate limiting already configured (100 req/min per IP)

### Changed
- Replaced all `console.log` with proper Logger usage
- Updated `.env.example` with secure placeholder values
- Improved `.dockerignore` for optimized builds
- Fixed comment reply functionality to show parent user names

### Security
- Removed default passwords from `.env.example`
- Added global Prisma exception filter
- Enforced `no-console` ESLint rule

## [1.0.0] - Initial Release

### Added
- Telegram Bot with grammY framework
- NestJS API with Prisma ORM
- Next.js WebApp with Telegram WebApp SDK
- BullMQ workers for background tasks
- Python FastAPI ingest service
- PostgreSQL with pgvector for RAG
- Redis for caching and queues
- MinIO for S3-compatible storage
- Helmet security middleware
- CORS configuration
- JWT authentication
- Telegram WebApp auth validation
- Listings CRUD with moderation
- Comment system
- Category and tag management
- Photo uploads via S3 presigned URLs
- Full-text search
- Docker Compose setup
- Swagger API documentation
