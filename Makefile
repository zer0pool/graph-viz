# Root Makefile for Lineage Platform
# Delegates most tasks to individual apps

LM_DIR=apps/backend/lineage_manager_v2
DJM_DIR=apps/backend/dummy-job-manager

.PHONY: all venv-lm venv-djm venv-all run-lm run-djm kill-lm kill-djm test-lm test-djm test-all lint-all format-all clean-all help test-integration

all: help

help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "System Management:"
	@echo "  up                  - Start entire platform (Backend + Frontend)"
	@echo "  down                - Stop entire platform"
	@echo "  logs                - View all platform logs"
	@echo "  clean-all           - Clean all application builds and venvs"
	@echo "  docker-rmi          - Delete all Docker images on the system"
	@echo "  docker-clean        - Prune all unused Docker data (images, containers, volumes)"
	@echo ""
	@echo "Backend Management (Lineage Manager):"
	@echo "  backend-up          - Start backend services"
	@echo "  backend-down        - Stop backend services"
	@echo "  backend-rebuild     - Rebuild and restart backend apps"
	@echo "  infra-up            - Start only DB/Cache infrastructure"
	@echo "  backend-logs        - View backend logs"
	@echo "  venv-all            - Setup python environments for all backends"
	@echo "  test-all            - Run all backend unit tests"
	@echo ""
	@echo "Frontend Management (MFEs):"
	@echo "  frontend-up            - Start frontend MFEs"
	@echo "  frontend-down          - Stop frontend MFEs"
	@echo "  frontend-rebuild       - Rebuild and restart all frontend MFEs (Shell, Lineage, Table)"
	@echo "  frontend-logs          - View frontend logs"

# Lineage Manager delegation
venv-lm:
	$(MAKE) -C $(LM_DIR) venv

run-lm:
	$(MAKE) -C $(LM_DIR) run

test-lm:
	$(MAKE) -C $(LM_DIR) test

kill-lm:
	$(MAKE) -C $(LM_DIR) kill

# Dummy Job Manager delegation
venv-djm:
	$(MAKE) -C $(DJM_DIR) venv

run-djm:
	$(MAKE) -C $(DJM_DIR) run

kill-djm:
	$(MAKE) -C $(DJM_DIR) kill

# All apps targets
venv-all: venv-lm venv-djm

test-all:
	$(MAKE) -C $(LM_DIR) test
	# Add DJM tests if they exist

test-integration:
	@echo "Running integration tests..."
	# In the new structure, PYTHONPATH should include the app roots directly
	. $(LM_DIR)/.venv/bin/activate && PYTHONPATH=$(shell pwd)/$(LM_DIR):$(shell pwd)/$(DJM_DIR) pytest tests/integration -v

lint-all:
	$(MAKE) -C $(LM_DIR) lint

format-all:
	$(MAKE) -C $(LM_DIR) format

clean-all:
	$(MAKE) -C $(LM_DIR) clean
	$(MAKE) -C $(DJM_DIR) clean

# Docker Compose commands
up:
	docker compose -f apps/backend/docker-compose.yml up -d
	docker compose -f apps/frontend/docker-compose.yml up -d

down:
	docker compose -f apps/frontend/docker-compose.yml down
	docker compose -f apps/backend/docker-compose.yml down

backend-up:
	docker compose -f apps/backend/docker-compose.yml up -d

backend-down:
	docker compose -f apps/backend/docker-compose.yml down

backend-rebuild:
	docker compose -f apps/backend/docker-compose.yml up -d --build lineage-manager app-job-dummy

infra-up:
	docker compose -f apps/backend/docker-compose.yml up -d redis-cache mysql-db

backend-logs:
	docker compose -f apps/backend/docker-compose.yml logs -f

frontend-up:
	docker compose -f apps/frontend/docker-compose.yml up -d

frontend-down:
	docker compose -f apps/frontend/docker-compose.yml down

frontend-rebuild:
	docker compose -f apps/frontend/docker-compose.yml up -d --build frontend-console-app frontend-mfe-lineage frontend-mfe-catalog
	docker system prune -f

# (Internal/Secondary) Rebuild individual MFEs if needed
frontend-lineage-rebuild:
	docker compose -f apps/frontend/docker-compose.yml up -d --build frontend-mfe-lineage

frontend-catalog-rebuild:
	docker compose -f apps/frontend/docker-compose.yml up -d --build frontend-mfe-catalog

frontend-container-rebuild:
	docker compose -f apps/frontend/docker-compose.yml up -d --build frontend-console-app

frontend-logs:
	docker compose -f apps/frontend/docker-compose.yml logs -f

logs:
	docker compose -f apps/backend/docker-compose.yml -f apps/frontend/docker-compose.yml logs -f

docker-rmi:
	@echo "⚠️  [WARNING] Deleting ALL docker images..."
	-docker rmi -f $$(docker images -q)

docker-clean:
	@echo "⚠️  [WARNING] Pruning ALL unused Docker resources (system + volumes)..."
	docker system prune -a --volumes -f
