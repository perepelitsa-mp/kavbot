.PHONY: help install dev build clean test docker-up docker-down docker-logs db-migrate db-seed

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	pnpm install

dev: ## Run all services in dev mode
	pnpm dev

build: ## Build all services
	pnpm build

clean: ## Clean build artifacts
	pnpm clean

test: ## Run tests
	pnpm test

lint: ## Lint code
	pnpm lint

format: ## Format code
	pnpm format

docker-up: ## Start all Docker services
	docker-compose up -d

docker-down: ## Stop all Docker services
	docker-compose down

docker-logs: ## View Docker logs
	docker-compose logs -f

docker-restart: ## Restart all Docker services
	docker-compose restart

db-generate: ## Generate Prisma client
	pnpm db:generate

db-migrate: ## Run database migrations
	pnpm db:migrate

db-push: ## Push Prisma schema to DB (dev only)
	pnpm db:push

db-seed: ## Seed database (categories, tags)
	cd packages/database && pnpm db:seed

db-seed-test: ## Seed test data (users, listings, documents)
	cd packages/database && pnpm db:seed:test

db-studio: ## Open Prisma Studio
	cd packages/database && pnpm db:studio