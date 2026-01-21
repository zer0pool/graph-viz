PY=python3.12
APP_NAME=Lineage-Manager
PORT=5003

# Paths relative to this Makefile
TESTS_DIR=tests
VENV=.venv
PYTHONPATH=$(shell pwd)

.PHONY: venv run clean test lint format install-dev all kill db-revision db-upgrade db-downgrade db-history db-current docker-up docker-down docker-logs
.PHONY: dev build helm-install helm-upgrade helm-template helm-uninstall docker-build docker-push deploy confirm

# Environment Configuration (Default: dev)
# Usage: make <target> ENV=prd
ENV ?= dev

# Namespace and Image Repo mapping
ifeq ($(ENV),prd)
  NAMESPACE := self-scheduling-prd
  IMAGE_REPO := asia-northeast3-docker.pkg.dev/sec-bdp-user-prd/self-scheduling-prd/lineage-manager
else
  # Default development environment
  NAMESPACE := self-scheduling-dev1
  IMAGE_REPO := asia-northeast3-docker.pkg.dev/sec-bdp-user-dev/self-scheduling-dev1/lineage-manager
endif

CHART_NAME := lineage-manager
CHART_PATH := ./deploy/helm
IMAGE_TAG := latest

# Detect if make is running with --dry-run or -n
IS_DRY_RUN := $(findstring n,$(MAKEFLAGS))

# Add helm dry-run flags if make is in dry-run mode (use client-side to avoid cluster check)
HELM_DRY_RUN_FLAGS := $(if $(IS_DRY_RUN),--dry-run=client --debug)

# Prefix commands with + to force execution during make --dry-run
EXEC_ALWAYS := $(if $(IS_DRY_RUN),+)

# Safety Confirmation for Production
confirm:
ifeq ($(ENV),prd)
	@echo "⚠️  [WARNING] You are targeting the PRODUCTION environment!"
	@echo "Environment: $(ENV)"
	@echo "Namespace:   $(NAMESPACE)"
	@echo "Image Repo:  $(IMAGE_REPO)"
	@echo "--------------------------------------------------------"
	@echo "Type 'confirm' to proceed with production deployment (case-insensitive):"
	@read -p "> " CONFIRM && [ "$$(echo $$CONFIRM | tr '[:upper:]' '[:lower:]')" = "confirm" ] || (echo "❌ Aborted. Confirmation failed." && exit 1)
endif

# All-in-one: Build, Push, and Deploy
deploy: confirm docker-build docker-push helm-upgrade

# Local Development
all: venv install-dev format lint test

venv:
	rm -rf $(VENV)
	$(PY) -m venv $(VENV) || { echo "Failed to create venv"; exit 1; }
	$(VENV)/bin/python -m pip install --upgrade pip || { echo "Failed to upgrade pip"; exit 1; }
	$(VENV)/bin/python -m pip install -r requirements.txt || { echo "Failed to install requirements"; exit 1; }

install-dev:
	$(VENV)/bin/python -m pip install black pytest pytest-cov flake8 pytest-asyncio

run:
	$(MAKE) kill
	PYTHONPATH=.. $(VENV)/bin/python -m uvicorn lineage_manager.main:app --reload --host 0.0.0.0 --port $(PORT)

kill:
	@echo "Killing process on port $(PORT)..."
	-fuser -k -9 $(PORT)/tcp || true
	@sleep 1

test:
	PYTHONPATH=..:$(PYTHONPATH) $(VENV)/bin/python -m pytest $(TESTS_DIR)/ -v

lint:
	PYTHONPATH=.. $(VENV)/bin/python -m flake8 lineage_manager/ $(TESTS_DIR)/

format:
	PYTHONPATH=.. $(VENV)/bin/python -m black lineage_manager/ $(TESTS_DIR)/

clean:
	rm -rf $(VENV) __pycache__ .pytest_cache
	find . -type d -name __pycache__ -exec rm -r {} +
	find . \( -name "*.pyc" -o -name "*.pyo" -o -name "*.pyd" \) -delete
	find . -type f -name ".coverage" -delete

requirements:
	$(VENV)/bin/python -m pip freeze > requirements.txt

# Database migrations
db-revision:
	PYTHONPATH=.. $(VENV)/bin/python -m alembic revision --autogenerate -m "$(name)"

db-upgrade:
	PYTHONPATH=.. $(VENV)/bin/python -m alembic upgrade head

db-downgrade:
	PYTHONPATH=.. $(VENV)/bin/python -m alembic downgrade -1

db-history:
	PYTHONPATH=.. $(VENV)/bin/python -m alembic history --verbose

db-current:
	PYTHONPATH=.. $(VENV)/bin/python -m alembic current

# Docker
docker-build:
	docker build -f deploy/docker/Dockerfile -t $(IMAGE_REPO):$(IMAGE_TAG) .

docker-push: confirm
	docker push $(IMAGE_REPO):$(IMAGE_TAG)

# Helm
helm-install: confirm
	helm install $(CHART_NAME) $(CHART_PATH) --namespace $(NAMESPACE)

helm-upgrade: confirm
	$(EXEC_ALWAYS)helm upgrade --install $(CHART_NAME) $(CHART_PATH) --namespace $(NAMESPACE) $(HELM_DRY_RUN_FLAGS)

helm-template:
	helm template $(CHART_NAME) $(CHART_PATH) --namespace $(NAMESPACE)

helm-uninstall: confirm
	helm uninstall $(CHART_NAME) --namespace $(NAMESPACE)

# Legacy Docker Compose (Optional)
docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f
