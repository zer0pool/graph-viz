# Environment Configuration (Default: dev)
ENV ?= dev

# Namespace mapping
ifeq ($(ENV),prd)
  NAMESPACE := self-scheduling
else
  NAMESPACE := self-scheduling
endif

CHART_NAME := redis
CHART_PATH := ./deploy/helm

# Detect if make is running with --dry-run or -n
IS_DRY_RUN := $(findstring n,$(MAKEFLAGS))
HELM_DRY_RUN_FLAGS := $(if $(IS_DRY_RUN),--dry-run=client --debug)
EXEC_ALWAYS := $(if $(IS_DRY_RUN),+)

.PHONY: helm-install helm-upgrade helm-template helm-uninstall confirm

# Safety Confirmation for Production
confirm:
ifeq ($(ENV),prd)
	@echo "⚠️  [WARNING] You are targeting the PRODUCTION environment!"
	@echo "Environment: $(ENV)"
	@echo "Namespace:   $(NAMESPACE)"
	@echo "--------------------------------------------------------"
	@echo "Type 'confirm' to proceed (case-insensitive):"
	@read -p "> " CONFIRM && [ "$$(echo $$CONFIRM | tr '[:upper:]' '[:lower:]')" = "confirm" ] || (echo "❌ Aborted. Confirmation failed." && exit 1)
endif

# Helm targets
helm-install: confirm
	helm install $(CHART_NAME) $(CHART_PATH) --namespace $(NAMESPACE)

helm-upgrade: confirm
	$(EXEC_ALWAYS)helm upgrade --install $(CHART_NAME) $(CHART_PATH) --namespace $(NAMESPACE) $(HELM_DRY_RUN_FLAGS)

helm-template:
	helm template $(CHART_NAME) $(CHART_PATH) --namespace $(NAMESPACE)

helm-uninstall: confirm
	helm uninstall $(CHART_NAME) --namespace $(NAMESPACE)
