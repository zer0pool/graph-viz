.PHONY: dev build helm-install helm-upgrade helm-template helm-uninstall docker-build docker-push deploy confirm

# Environment Configuration (Default: dev)
# Usage: make <target> ENV_NAME=prd
ENV_NAME ?= dev

# Namespace and Image Repo mapping
ifeq ($(ENV_NAME),prd)
  NAMESPACE := self-scheduling-prd
  # Note: Adjust image repo for production if it's different
  IMAGE_REPO := asia-northeast3-docker.pkg.dev/sec-bdp-user-prd/self-scheduling-prd/admin-shell
else ifeq ($(ENV_NAME),dev-1)
  NAMESPACE := self-scheduling-dev-1
  IMAGE_REPO := asia-northeast3-docker.pkg.dev/sec-bdp-user-dev/self-scheduling-dev1/admin-shell
else
  # Default development environment
  NAMESPACE := self-scheduling
  IMAGE_REPO := asia-northeast3-docker.pkg.dev/sec-bdp-user-dev/self-scheduling/admin-shell
endif

CHART_NAME := admin-shell
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
ifeq ($(ENV_NAME),prd)
	@echo "⚠️  [WARNING] You are targeting the PRODUCTION environment!"
	@echo "Environment: $(ENV_NAME)"
	@echo "Namespace:   $(NAMESPACE)"
	@echo "Image Repo:  $(IMAGE_REPO)"
	@echo "--------------------------------------------------------"
	@echo "Type 'confirm' to proceed with production deployment (case-insensitive):"
	@read -p "> " CONFIRM && [ "$$(echo $$CONFIRM | tr '[:upper:]' '[:lower:]')" = "confirm" ] || (echo "❌ Aborted. Confirmation failed." && exit 1)
endif

# All-in-one: Build, Push, and Deploy
deploy: confirm docker-build docker-push helm-upgrade

# Local Development
dev:
	npm run dev

build:
	npm run build

format:
	npm run format

# Docker
docker-build:
	docker build -f deploy/docker/Dockerfile -t $(IMAGE_REPO):$(IMAGE_TAG) .

docker-push: confirm
	docker push $(IMAGE_REPO):$(IMAGE_TAG)

# Helm
helm-install: confirm
	helm install $(CHART_NAME) $(CHART_PATH) --namespace $(NAMESPACE)

helm-upgrade: confirm
	$(EXEC_ALWAYS)helm upgrade --install $(CHART_NAME) $(CHART_PATH) --namespace $(NAMESPACE) -f $(CHART_PATH)/values.yaml -f $(CHART_PATH)/values-$(ENV_NAME).yaml $(HELM_DRY_RUN_FLAGS)

helm-template:
	helm template $(CHART_NAME) $(CHART_PATH) --namespace $(NAMESPACE) -f $(CHART_PATH)/values.yaml -f $(CHART_PATH)/values-$(ENV_NAME).yaml

helm-uninstall: confirm
	helm uninstall $(CHART_NAME) --namespace $(NAMESPACE)
