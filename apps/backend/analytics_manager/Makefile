PY=python3.12
APP_NAME=Analytics-Manager
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
	PYTHONPATH=. $(VENV)/bin/uvicorn app.main:app --reload --port $(PORT)

# Run the app in production mode
run:
	$(MAKE) kill
	PYTHONPATH=. $(VENV)/bin/uvicorn app.main:app --host 0.0.0.0 --port $(PORT)

kill:
	@echo "Killing process on port $(PORT)..."
	-fuser -k -9 $(PORT)/tcp || true
	@sleep 1

# Run celery worker
worker:
	@echo "Celery is not configured for Analytics Manager yet."
	# PYTHONPATH=. .venv/bin/python -m celery -A app.core.celery_app worker --loglevel=info --pool=solo

# Run tests
test:
	PYTHONPATH=. $(VENV)/bin/pytest tests

	@echo "Alembic is not configured for Analytics Manager yet."
	# alembic revision --autogenerate -m "$(msg)"

# Upgrade database to head
db-upgrade:
	@echo "Alembic is not configured for Analytics Manager yet."
	# alembic upgrade head

# Lint and format code
format:
	PYTHONPATH=. $(VENV)/bin/black app
	PYTHONPATH=. $(VENV)/bin/isort app

lint:
	PYTHONPATH=. $(VENV)/bin/mypy app
