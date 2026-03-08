.PHONY: build-all docker-build-all docker-push-all deploy-all

APPS := container mfe-lineage mfe-catalog
ENV ?= dev

# Define Image Repos (These defaults match the individual Makefiles/Values)
REPO_PREFIX_DEV := asia-northeast3-docker.pkg.dev/sec-bdp-user-dev/self-scheduling
REPO_PREFIX_PRD := asia-northeast3-docker.pkg.dev/sec-bdp-user-prd/self-scheduling-prd

ifeq ($(ENV),prd)
	REPO_PREFIX := $(REPO_PREFIX_PRD)
else
	REPO_PREFIX := $(REPO_PREFIX_DEV)
endif

# Confirm target for production
confirm:
ifeq ($(ENV),prd)
	@echo "⚠️  [WARNING] You are targeting the PRODUCTION environment!"
	@echo "Type 'confirm' to proceed:"
	@read -p "> " CONFIRM && [ "$$(echo $$CONFIRM | tr '[:upper:]' '[:lower:]')" = "confirm" ] || (echo "❌ Aborted." && exit 1)
endif

build-all:
	@for app in $(APPS); do \
		echo "Building $$app..."; \
		(cd $$app && npm install && npm run build) || exit 1; \
	done

docker-build-all:
	@for app in $(APPS); do \
		echo "Docker building $$app..."; \
		docker build -f $$app/deploy/docker/Dockerfile -t $(REPO_PREFIX)/admin-$$app:latest ./$$app || exit 1; \
	done

docker-push-all: confirm
	@for app in $(APPS); do \
		echo "Pushing $$app..."; \
		docker push $(REPO_PREFIX)/admin-$$app:latest || exit 1; \
	done

deploy-all: confirm
	@for app in $(APPS); do \
		echo "Deploying $$app..."; \
		helm upgrade --install $$app ./$$app/deploy/helm --namespace self-scheduling-$(ENV)1 || exit 1; \
	done
