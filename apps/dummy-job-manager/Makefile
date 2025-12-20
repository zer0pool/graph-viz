PY=python3.12
APP_NAME=Dummy-Job-Manager
PORT=9000
VENV=.venv
PYTHONPATH=$(shell pwd)
# The file moved from src/dummy_job_manager/dummy_job_manager.py to root/dummy_job_manager.py
# So the app path for uvicorn is dummy_job_manager:app
APP=dummy_job_manager:app
PID_FILE=.dummy_pid

.PHONY: venv run kill restart status clean docker-build docker-run

venv:
	$(PY) -m venv $(VENV) || { echo "Failed to create venv"; exit 1; }
	$(VENV)/bin/pip install --upgrade pip || { echo "Failed to upgrade pip"; exit 1; }
	$(VENV)/bin/pip install -r requirements.txt

run:
	@echo "Starting Dummy Job Manager..."
	$(MAKE) kill
	. $(VENV)/bin/activate && PYTHONPATH=$(PYTHONPATH) uvicorn $(APP) --host 0.0.0.0 --port $(PORT) --reload & echo $$! > $(PID_FILE)
	@echo "Started with PID: $$(cat $(PID_FILE))"

kill:
	@echo "Killing process on port $(PORT)..."
	-fuser -k -9 $(PORT)/tcp || true
	-rm $(PID_FILE) || true
	@sleep 1

restart: kill run

status:
	@if [ -f $(PID_FILE) ]; then \
		echo "Dummy Job Manager is running with PID: $$(cat $(PID_FILE))"; \
	else \
		echo "Dummy Job Manager is NOT running."; \
	fi

clean:
	rm -rf $(VENV) __pycache__ $(PID_FILE)
	find . -type d -name __pycache__ -exec rm -r {} +

# Docker targets updated to use app root context
docker-build:
	docker build -t dummy-job-manager:latest .

docker-run:
	docker run -d --name dummy-job-manager -p $(PORT):$(PORT) dummy-job-manager:latest
