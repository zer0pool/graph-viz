PY=python3.12
APP_NAME=Lineage-Manager-v2
PORT=5004

VENV=.venv
.PHONY: run dev worker test lint format db-revision db-upgrade


venv:
	rm -rf $(VENV)
	$(PY) -m venv $(VENV) || { echo "Failed to create venv"; exit 1; }
	$(VENV)/bin/python -m pip install --upgrade pip || { echo "Failed to upgrade pip"; exit 1; }
	$(VENV)/bin/python -m pip install -r requirements.txt || { echo "Failed to install requirements"; exit 1; }

# Run the app in development mode
dev:
	PYTHONPATH=. uvicorn app.main:app --reload --port $(PORT)

# Run the app in production mode
run:
	PYTHONPATH=. uvicorn app.main:app --host 0.0.0.0 --port $(PORT)

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
