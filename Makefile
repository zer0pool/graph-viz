PY=python3
APP_NAME= graph_manager
APP=graph_manager.main:app
PORT=8000
DOCKER_IMAGE=graph-viz
DOCKER_TAG=latest
GAR_REGISTRY=asia-northeast3-docker.pkg.dev/gizmopool/test_server
 

.PHONY: venv run clean test lint format install-dev all docker-build docker-run docker-stop

export PYTHONPATH=$(shell pwd)/src

all: venv install-dev format lint test

venv:
	$(PY) -m venv .venv && . .venv/bin/activate && python -m pip install --upgrade pip && python -m pip install -r requirements.txt


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
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type f -name "*.pyd" -delete
	find . -type f -name ".coverage" -delete
	find . -type d -name "*.egg-info" -exec rm -r {} +
	find . -type d -name "*.egg" -exec rm -r {} +

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

# Database management
db-init:
	. .venv/bin/activate && python -m scripts.db.init_db

db-reset: db-downgrade db-upgrade

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

# Production Docker Compose
compose-prod-up:
	docker-compose -f docker-compose.prod.yml up -d

compose-prod-down:
	docker-compose -f docker-compose.prod.yml down
