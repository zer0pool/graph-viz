# Root Makefile for Lineage Platform
# Delegates most tasks to individual apps

LM_DIR=apps/backend/lineage_manager
DJM_DIR=apps/backend/dummy-job-manager

.PHONY: all venv-lm venv-djm venv-all run-lm run-djm kill-lm kill-djm test-lm test-djm test-all lint-all format-all clean-all help test-integration

all: help

help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "System Management:"
	@echo "  up                  - Start entire platform (Backend + Admin)"
	@echo "  down                - Stop entire platform"
	@echo "  logs                - View all platform logs"
	@echo "  clean-all           - Clean all application builds and venvs"
	@echo ""
	@echo "Backend Management (Lineage Manager):"
	@echo "  backend-up          - Start backend services"
	@echo "  backend-down        - Stop backend services"
	@echo "  backend-logs        - View backend logs"
	@echo "  venv-all            - Setup python environments for all backends"
	@echo "  test-all            - Run all backend unit tests"
	@echo ""
	@echo "Admin Console Management (MFEs):"
	@echo "  admin-up            - Start admin console MFEs"
	@echo "  admin-down          - Stop admin console MFEs"
	@echo "  admin-rebuild       - Rebuild and restart all admin MFEs (Shell, Lineage, Table)"
	@echo "  admin-logs          - View admin console logs"

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
	docker compose -f apps/admin_console/docker-compose.yml up -d

down:
	docker compose -f apps/admin_console/docker-compose.yml down
	docker compose -f apps/backend/docker-compose.yml down

backend-up:
	docker compose -f apps/backend/docker-compose.yml up -d

backend-down:
	docker compose -f apps/backend/docker-compose.yml down

backend-logs:
	docker compose -f apps/backend/docker-compose.yml logs -f

admin-up:
	docker compose -f apps/admin_console/docker-compose.yml up -d

admin-down:
	docker compose -f apps/admin_console/docker-compose.yml down

admin-rebuild:
	docker compose -f apps/admin_console/docker-compose.yml up -d --build web-shell web-lineage web-table-viewer

# (Internal/Secondary) Rebuild individual MFEs if needed
admin-lineage-rebuild:
	docker compose -f apps/admin_console/docker-compose.yml up -d --build web-lineage

admin-table-rebuild:
	docker compose -f apps/admin_console/docker-compose.yml up -d --build web-table-viewer

admin-shell-rebuild:
	docker compose -f apps/admin_console/docker-compose.yml up -d --build web-shell

admin-logs:
	docker compose -f apps/admin_console/docker-compose.yml logs -f

logs:
	docker compose -f apps/backend/docker-compose.yml -f apps/admin_console/docker-compose.yml logs -f
