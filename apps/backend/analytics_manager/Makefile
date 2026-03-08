PY=python3.12
APP_NAME=Analytics-Manager
PORT=5004

VENV=.venv
.PHONY: run dev worker test lint format db-revision db-upgrade


# Environment Configuration (Default: dev)
# Usage: make <target> ENV=prd
ENV ?= dev

# Namespace and Image Repo mapping
ifeq ($(ENV),prd)
  NAMESPACE := self-scheduling-prd
  IMAGE_REPO := asia-northeast3-docker.pkg.dev/sec-bdp-user-prd/self-scheduling/analytics-manager
else
  # Default development environment
  NAMESPACE := self-scheduling
  IMAGE_REPO := asia-northeast3-docker.pkg.dev/sec-bdp-user-dev/self-scheduling/analytics-manager
endif

CHART_NAME := analytics-manager
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







venv:
	rm -rf $(VENV)
	$(PY) -m venv $(VENV) || { echo "Failed to create venv"; exit 1; }
	$(VENV)/bin/python -m pip install --upgrade pip || { echo "Failed to upgrade pip"; exit 1; }
	$(VENV)/bin/python -m pip install -r requirements.txt || { echo "Failed to install requirements"; exit 1; }

# Run the app in development mode
dev:
	PYTHONPATH=. $(VENV)/bin/uvicorn app.main:app --reload --port $(PORT)

# Run the app in production mode
run:
	$(MAKE) kill
	PYTHONPATH=. $(VENV)/bin/uvicorn app.main:app --host 0.0.0.0 --port $(PORT)

kill:
	@echo "Killing process on port $(PORT)..."
	-fuser -k -9 $(PORT)/tcp || true
	@sleep 1

# Run celery worker
worker:
	@echo "Celery is not configured for Analytics Manager yet."
	# PYTHONPATH=. .venv/bin/python -m celery -A app.core.celery_app worker --loglevel=info --pool=solo

# Run tests
test:
	PYTHONPATH=. $(VENV)/bin/pytest tests

	@echo "Alembic is not configured for Analytics Manager yet."
	# alembic revision --autogenerate -m "$(msg)"

# Upgrade database to head
db-upgrade:
	@echo "Alembic is not configured for Analytics Manager yet."
	# alembic upgrade head

# Lint and format code
format:
	PYTHONPATH=. $(VENV)/bin/black app
	PYTHONPATH=. $(VENV)/bin/isort app

lint:
	PYTHONPATH=. $(VENV)/bin/mypy app

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