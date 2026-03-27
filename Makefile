.PHONY: help setup reset dev build start lint type-check test test-watch test-coverage test-integration test-all validate-i18n docker-dev docker-dev-build docker-down docker-clean prisma-validate prisma-generate db-seed db-reset

help:
	@echo "Inbound Forge — Makefile targets"
	@echo ""
	@echo "Setup & Bootstrap:"
	@echo "  make setup              Setup completo (bootstrap.sh)"
	@echo "  make reset              Resetar ambiente (limpar + novo setup)"
	@echo ""
	@echo "Development:"
	@echo "  make dev                Iniciar dev server (next dev)"
	@echo "  make build              Build producao (next build)"
	@echo "  make start              Iniciar servidor (next start)"
	@echo "  make lint               Lint (next lint)"
	@echo "  make type-check         Type check (tsc)"
	@echo ""
	@echo "Testing:"
	@echo "  make test               Rodar testes (vitest)"
	@echo "  make test-watch         Testes em watch mode"
	@echo "  make test-coverage      Coverage de testes"
	@echo "  make test-integration   Testes de integracao"
	@echo "  make test-all           Todos os testes"
	@echo ""
	@echo "Database:"
	@echo "  make db-seed            Seed data (prisma)"
	@echo "  make db-reset           Reset completo (prisma migrate reset)"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-dev         Subir containers (docker compose up)"
	@echo "  make docker-dev-build   Subir com rebuild (docker compose up --build)"
	@echo "  make docker-down        Parar containers"
	@echo "  make docker-clean       Parar e limpar volumes"
	@echo ""
	@echo "Prisma:"
	@echo "  make prisma-validate    Validar schema"
	@echo "  make prisma-generate    Gerar cliente Prisma"
	@echo ""
	@echo "Other:"
	@echo "  make validate-i18n      Validar i18n"
	@echo ""

setup:
	@./scripts/bootstrap.sh

reset:
	@./scripts/bootstrap.sh --reset

dev:
	npm run dev

build:
	npm run build

start:
	npm run start

lint:
	npm run lint

type-check:
	npm run type-check

test:
	npm test

test-watch:
	npm run test:watch

test-coverage:
	npm run test:coverage

test-integration:
	npm run test:integration

test-all:
	npm run test:all

validate-i18n:
	npm run validate:i18n

prisma-validate:
	npm run prisma:validate

prisma-generate:
	npm run prisma:generate

db-seed:
	npm run db:seed

db-reset:
	npm run db:reset

docker-dev:
	docker compose up

docker-dev-build:
	docker compose up --build

docker-down:
	docker compose down

docker-clean:
	docker compose down -v
