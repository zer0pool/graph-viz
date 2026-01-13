PY=python3.12
APP_NAME=Lineage-Manager
PORT=5003

# Paths relative to this Makefile
TESTS_DIR=tests
VENV=.venv
PYTHONPATH=$(shell pwd)

.PHONY: venv run clean test lint format install-dev all kill db-revision db-upgrade db-downgrade db-history db-current docker-up docker-down docker-logs

all: venv install-dev format lint test

venv:
	$(PY) -m venv $(VENV) || { echo "Failed to create venv"; exit 1; }
	$(VENV)/bin/pip install --upgrade pip || { echo "Failed to upgrade pip"; exit 1; }
	$(VENV)/bin/pip install -r requirements.txt || { echo "Failed to install requirements"; exit 1; }

install-dev:
	. $(VENV)/bin/activate && pip install black pytest pytest-cov flake8 pytest-asyncio

run:
	$(MAKE) kill
	. $(VENV)/bin/activate && PYTHONPATH=.. uvicorn lineage_manager.main:app --reload --host 0.0.0.0 --port $(PORT)

kill:
	@echo "Killing process on port $(PORT)..."
	-fuser -k -9 $(PORT)/tcp || true
	@sleep 1

test:
	. $(VENV)/bin/activate && PYTHONPATH=$(PYTHONPATH) pytest $(TESTS_DIR)/ -v

lint:
	. $(VENV)/bin/activate && flake8 lineage_manager/ $(TESTS_DIR)/

format:
	. $(VENV)/bin/activate && black lineage_manager/ $(TESTS_DIR)/

clean:
	rm -rf $(VENV) __pycache__ .pytest_cache
	find . -type d -name __pycache__ -exec rm -r {} +
	find . \( -name "*.pyc" -o -name "*.pyo" -o -name "*.pyd" \) -delete
	find . -type f -name ".coverage" -delete

requirements:
	. $(VENV)/bin/activate && pip freeze > requirements.txt

# Database migrations
db-revision:
	. $(VENV)/bin/activate && alembic revision --autogenerate -m "$(name)"

db-upgrade:
	. $(VENV)/bin/activate && alembic upgrade head

db-downgrade:
	. $(VENV)/bin/activate && alembic downgrade -1

db-history:
	. $(VENV)/bin/activate && alembic history --verbose

db-current:
	. $(VENV)/bin/activate && alembic current

# Docker commands
docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f
