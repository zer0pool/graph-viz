PY=python3.12
APP_NAME=Lineage-Manager
APP_NAME_LOWER= $(shell echo $(APP_NAME) | tr A-Z a-z)
APP=lineage_manager.main:app
PORT=5003
DOCKER_IMAGE=graph-viz
DOCKER_TAG=latest
GAR_REGISTRY=asia-northeast3-docker.pkg.dev/gizmopool/test_server

.PHONY: venv run clean test lint format install-dev all docker-build docker-run docker-stop build-sec push-sec restart-sec

export PYTHONPATH=$(shell pwd)/src

all: venv install-dev format lint test

venv:
	$(PY) -m venv .venv --without-pip || { echo "Failed to create venv"; exit 1; }
	. .venv/bin/activate || { echo "Failed to activate venv"; exit 1; }
	pip install --upgrade pip || { echo "Failed to upgrade pip"; exit 1; }
	pip install -r requirements.txt || { echo "Failed to install requirements"; exit 1; }

activate:
	@bash -c 'source .venv/bin/activate'

install-dev:
	. .venv/bin/activate && pip install black pytest pytest-cov flake8

run:
	. .venv/bin/activate && PYTHONPATH=$(PYTHONPATH) uvicorn $(APP) --reload --host 0.0.0.0 --port $(PORT)

run-prod:
	. .venv/bin/activate && uvicorn $(APP) --host 0.0.0.0 --port $(PORT) --workers 4

test:
	. .venv/bin/activate && pytest tests/ -v --cov=app

lint:
	. .venv/bin/activate && flake8 app/ tests/

format:
	. .venv/bin/activate && black app/ tests/

 
clean:
	rm -rf .venv __pycache__ .pytest_cache
	find . -type d -name __pycache__ -exec rm -r {} +
	find . \( -name "*.pyc" -o -name "*.pyo" -o -name "*.pyd" \) -delete
	find . -type f -name ".coverage" -delete
	find . \( -name "*.egg-info" -o -name "*.egg" \) -exec rm -r {} +


requirements:
	. .venv/bin/activate && pip freeze > requirements.txt

# Database migrations
db-revision:
	. .venv/bin/activate && alembic revision --autogenerate -m "$(name)"

db-upgrade:
	. .venv/bin/activate && alembic upgrade head

db-downgrade:
	. .venv/bin/activate && alembic downgrade -1

db-history:
	. .venv/bin/activate && alembic history --verbose

db-current:
	. .venv/bin/activate && alembic current
 
# Docker commands
docker-build:
	docker build -t $(DOCKER_IMAGE):$(DOCKER_TAG) -f deploy/docker/Dockerfile .

docker-run:
	docker run -d --name $(DOCKER_IMAGE) -p $(PORT):8000 $(DOCKER_IMAGE):$(DOCKER_TAG)

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

# Include sec environment commands
# include deploy/sec.mk


