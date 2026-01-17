# Root Makefile for Lineage Platform
# Delegates most tasks to individual apps

LM_DIR=apps/backend/lineage_manager
DJM_DIR=apps/backend/dummy-job-manager

.PHONY: all venv-lm venv-djm venv-all run-lm run-djm kill-lm kill-djm test-lm test-djm test-all lint-all format-all clean-all help test-integration

all: help

help:
	@echo "Available commands:"
	@echo "  make venv-lm          - Create venv for lineage-manager"
	@echo "  make venv-djm         - Create venv for dummy-job-manager"
	@echo "  make venv-all         - Create venv for all apps"
	@echo "  make run-lm           - Run lineage-manager"
	@echo "  make run-djm          - Run dummy-job-manager"
	@echo "  make test-lm          - Test lineage-manager (unit tests)"
	@echo "  make test-djm         - Test dummy-job-manager"
	@echo "  make test-all         - Run all unit tests"
	@echo "  make test-integration - Run integration tests (requires LM and DJM)"
	@echo "  make lint-all         - Lint all apps"
	@echo "  make format-all       - Format all apps"
	@echo "  make clean-all        - Clean all apps"
	@echo "  make admin-up         - Start admin console"
	@echo "  make admin-down       - Stop admin console"
	@echo "  make admin-lineage-rebuild - Rebuild and restart Lineage MFE"
	@echo "  make admin-table-rebuild   - Rebuild and restart Table Viewer MFE"
	@echo "  make compose-down     - Stop infrastructure"

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
	docker-compose -f apps/backend/docker-compose.yml up -d
	docker-compose -f apps/admin_console/docker-compose.yml up -d

down:
	docker-compose -f apps/admin_console/docker-compose.yml down
	docker-compose -f apps/backend/docker-compose.yml down

backend-up:
	docker-compose -f apps/backend/docker-compose.yml up -d

backend-down:
	docker-compose -f apps/backend/docker-compose.yml down

backend-logs:
	docker-compose -f apps/backend/docker-compose.yml logs -f

admin-up:
	docker-compose -f apps/admin_console/docker-compose.yml up -d

admin-down:
	docker-compose -f apps/admin_console/docker-compose.yml down

admin-lineage-rebuild:
	docker-compose -f apps/admin_console/docker-compose.yml up -d --build web-lineage

admin-table-rebuild:
	docker-compose -f apps/admin_console/docker-compose.yml up -d --build web-table-viewer

admin-shell-rebuild:
	docker-compose -f apps/admin_console/docker-compose.yml up -d --build web-shell

admin-logs:
	docker-compose -f apps/admin_console/docker-compose.yml logs -f

logs:
	docker-compose -f apps/backend/docker-compose.yml -f apps/admin_console/docker-compose.yml logs -f
