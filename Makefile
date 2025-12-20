PY=python3.12
APP_NAME=Lineage-Manager
APP_NAME_LOWER= $(shell echo $(APP_NAME) | tr A-Z a-z)

# App specific paths
LM_DIR=apps/lineage-manager
APP=$(LM_DIR)/src/lineage_manager/main:app
PYTHONPATH=$(shell pwd)/$(LM_DIR)/src

PORT=5003
DOCKER_IMAGE=graph-viz
DOCKER_TAG=latest
GAR_REGISTRY=asia-northeast3-docker.pkg.dev/gizmopool/test_server

.PHONY: venv run clean test lint format install-dev all docker-build docker-run docker-stop build-sec push-sec restart-sec kill

all: venv install-dev format lint test

venv:
	$(PY) -m venv .venv || { echo "Failed to create venv"; exit 1; }
	.venv/bin/pip install --upgrade pip || { echo "Failed to upgrade pip"; exit 1; }
	.venv/bin/pip install -r $(LM_DIR)/requirements.txt || { echo "Failed to install requirements"; exit 1; }

activate:
	@bash -c 'source .venv/bin/activate'

install-dev:
	. .venv/bin/activate && pip install black pytest pytest-cov flake8 pytest-asyncio

run:
	$(MAKE) kill
	. .venv/bin/activate && PYTHONPATH=$(PYTHONPATH) uvicorn lineage_manager.main:app --reload --host 0.0.0.0 --port $(PORT) --app-dir $(LM_DIR)/src

kill:
	@echo "Killing process on port $(PORT)..."
	-fuser -k -9 $(PORT)/tcp || true
	@sleep 1

run-prod:
	. .venv/bin/activate && PYTHONPATH=$(PYTHONPATH) uvicorn lineage_manager.main:app --host 0.0.0.0 --port $(PORT) --workers 4 --app-dir $(LM_DIR)/src

test:
	. .venv/bin/activate && PYTHONPATH=$(PYTHONPATH) pytest $(LM_DIR)/tests/ -v

lint:
	. .venv/bin/activate && flake8 $(LM_DIR)/src/ $(LM_DIR)/tests/

format:
	. .venv/bin/activate && black $(LM_DIR)/src/ $(LM_DIR)/tests/

 
clean:
	rm -rf .venv __pycache__ .pytest_cache
	find . -type d -name __pycache__ -exec rm -r {} +
	find . \( -name "*.pyc" -o -name "*.pyo" -o -name "*.pyd" \) -delete
	find . -type f -name ".coverage" -delete
	find . \( -name "*.egg-info" -o -name "*.egg" \) -exec rm -r {} +


requirements:
	. .venv/bin/activate && pip freeze > $(LM_DIR)/requirements.txt

# Database migrations
db-revision:
	. .venv/bin/activate && cd $(LM_DIR) && alembic revision --autogenerate -m "$(name)"

db-upgrade:
	. .venv/bin/activate && cd $(LM_DIR) && alembic upgrade head

db-downgrade:
	. .venv/bin/activate && cd $(LM_DIR) && alembic downgrade -1

db-history:
	. .venv/bin/activate && cd $(LM_DIR) && alembic history --verbose

db-current:
	. .venv/bin/activate && cd $(LM_DIR) && alembic current
 
# Docker commands
docker-build:
	docker build -t $(DOCKER_IMAGE):$(DOCKER_TAG) -f deploy/docker/Dockerfile .

docker-run:
	docker run -d --name $(DOCKER_IMAGE) -p $(PORT):5003 $(DOCKER_IMAGE):$(DOCKER_TAG)

docker-stop:
	docker stop $(DOCKER_IMAGE) || true
	docker rm $(DOCKER_IMAGE) || true

docker-push-gar:
	docker tag $(DOCKER_IMAGE):$(DOCKER_TAG) $(GAR_REGISTRY)/$(GAR_IMAGE_NAME):$(DOCKER_TAG)
	docker push $(GAR_REGISTRY)/$(GAR_IMAGE_NAME):$(DOCKER_TAG)

docker-push:
	docker push $(DOCKER_IMAGE):$(DOCKER_TAG)

# Docker Compose commands
compose-up:
	docker-compose up -d

compose-down:
	docker-compose down

compose-logs:
	docker-compose logs -f
