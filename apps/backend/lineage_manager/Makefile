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
	rm -rf $(VENV)
	$(PY) -m venv $(VENV) || { echo "Failed to create venv"; exit 1; }
	$(VENV)/bin/python -m pip install --upgrade pip || { echo "Failed to upgrade pip"; exit 1; }
	$(VENV)/bin/python -m pip install -r requirements.txt || { echo "Failed to install requirements"; exit 1; }

install-dev:
	$(VENV)/bin/python -m pip install black pytest pytest-cov flake8 pytest-asyncio

run:
	$(MAKE) kill
	PYTHONPATH=.. $(VENV)/bin/python -m uvicorn lineage_manager.main:app --reload --host 0.0.0.0 --port $(PORT)

kill:
	@echo "Killing process on port $(PORT)..."
	-fuser -k -9 $(PORT)/tcp || true
	@sleep 1

test:
	PYTHONPATH=..:$(PYTHONPATH) $(VENV)/bin/python -m pytest $(TESTS_DIR)/ -v

lint:
	PYTHONPATH=.. $(VENV)/bin/python -m flake8 lineage_manager/ $(TESTS_DIR)/

format:
	PYTHONPATH=.. $(VENV)/bin/python -m black lineage_manager/ $(TESTS_DIR)/

clean:
	rm -rf $(VENV) __pycache__ .pytest_cache
	find . -type d -name __pycache__ -exec rm -r {} +
	find . \( -name "*.pyc" -o -name "*.pyo" -o -name "*.pyd" \) -delete
	find . -type f -name ".coverage" -delete

requirements:
	$(VENV)/bin/python -m pip freeze > requirements.txt

# Database migrations
db-revision:
	PYTHONPATH=.. $(VENV)/bin/python -m alembic revision --autogenerate -m "$(name)"

db-upgrade:
	PYTHONPATH=.. $(VENV)/bin/python -m alembic upgrade head

db-downgrade:
	PYTHONPATH=.. $(VENV)/bin/python -m alembic downgrade -1

db-history:
	PYTHONPATH=.. $(VENV)/bin/python -m alembic history --verbose

db-current:
	PYTHONPATH=.. $(VENV)/bin/python -m alembic current

# Docker commands
docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f
