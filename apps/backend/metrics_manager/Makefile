PY=python3.12
APP_NAME=Metrics-Manager
PORT=5004

# Paths relative to this Makefile
TESTS_DIR=tests
VENV=.venv
PYTHONPATH=$(shell pwd)

.PHONY: venv run clean test lint format install-dev all kill docker-build docker-push deploy confirm

# Environment Configuration (Default: dev)
ENV ?= dev

# Namespace and Image Repo mapping
ifeq ($(ENV),prd)
  NAMESPACE := self-scheduling-prd
  IMAGE_REPO := asia-northeast3-docker.pkg.dev/sec-bdp-user-prd/self-scheduling-prd/metrics-manager
else
  NAMESPACE := self-scheduling-dev1
  IMAGE_REPO := asia-northeast3-docker.pkg.dev/sec-bdp-user-dev/self-scheduling-dev1/metrics-manager
endif

CHART_NAME := metrics-manager
CHART_PATH := ./deploy/helm
IMAGE_TAG := latest

# Local Development
all: venv install-dev format lint test

venv:
	rm -rf $(VENV)
	$(PY) -m venv $(VENV) || { echo "Failed to create venv"; exit 1; }
	$(VENV)/bin/python -m pip install --upgrade pip || { echo "Failed to upgrade pip"; exit 1; }
	$(VENV)/bin/python -m pip install -e . || { echo "Failed to install package"; exit 1; }

install-dev:
	$(VENV)/bin/python -m pip install black pytest pytest-cov flake8 pytest-asyncio

run:
	$(MAKE) kill
	PYTHONPATH=. $(VENV)/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port $(PORT)

run-worker:
	PYTHONPATH=. $(VENV)/bin/python -m celery -A app.celery_app worker --loglevel=info

kill:
	@echo "Killing process on port $(PORT)..."
	-fuser -k -9 $(PORT)/tcp || true
	@sleep 1

test:
	PYTHONPATH=. $(VENV)/bin/python -m pytest $(TESTS_DIR)/ -v

lint:
	PYTHONPATH=. $(VENV)/bin/python -m flake8 app/ $(TESTS_DIR)/

format:
	PYTHONPATH=. $(VENV)/bin/python -m black app/ $(TESTS_DIR)/

# Docker
docker-build:
	docker build -f deploy/docker/Dockerfile -t $(IMAGE_REPO):$(IMAGE_TAG) .

clean:
	rm -rf $(VENV) __pycache__ .pytest_cache
	find . -type d -name __pycache__ -exec rm -r {} +
	find . \( -name "*.pyc" -o -name "*.pyo" -o -name "*.pyd" \) -delete
	find . -type f -name ".coverage" -delete
