PY=python3.12
APP_NAME=Lineage-Manager-v2
PORT=5003

VENV=.venv
.PHONY: run dev worker test lint format db-revision db-upgrade


venv:
	rm -rf $(VENV)
	$(PY) -m venv $(VENV) || { echo "Failed to create venv"; exit 1; }
	$(VENV)/bin/python -m pip install --upgrade pip || { echo "Failed to upgrade pip"; exit 1; }
	$(VENV)/bin/python -m pip install -r requirements.txt || { echo "Failed to install requirements"; exit 1; }

# Run the app in development mode
dev:
	$(MAKE) kill
	PYTHONPATH=. $(VENV)/bin/uvicorn app.main:app --reload --port $(PORT)

# Run the app in production mode
run:
	$(MAKE) kill
	PYTHONPATH=. $(VENV)/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port $(PORT)

kill:
	@echo "Killing process on port $(PORT)..."
	-fuser -k -9 $(PORT)/tcp || true
	@sleep 1

# Run celery worker
worker:
	PYTHONPATH=. .venv/bin/python -m celery -A app.core.celery_app worker --loglevel=info --pool=solo

# Run tests
test:
	PYTHONPATH=. pytest tests

# Create a new migration revision (auto-generated)
db-revision:
	alembic revision --autogenerate -m "$(msg)"

# Upgrade database to head
db-upgrade:
	alembic upgrade head

# Lint and format code
format:
	black app tests
	isort app tests

lint:
	mypy app

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