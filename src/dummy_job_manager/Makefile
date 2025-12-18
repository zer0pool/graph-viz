# Path to project root venv
VENV_ACTIVATE=../../.venv/bin/activate

UVICORN=uvicorn
APP=dummy_job_manager:app
HOST=0.0.0.0
PORT=9000
PID_FILE=.dummy_pid

run:
	@echo "Activating virtualenv and starting Dummy Job Manager..."
	@bash -c "source $(VENV_ACTIVATE) && $(UVICORN) $(APP) --host $(HOST) --port $(PORT) --reload & echo $$! > $(PID_FILE)"
	@echo "Started with PID: $$(cat $(PID_FILE))"

 
kill:
	@echo "Killing process on port $(PORT)..."
	-fuser -k -9 $(PORT)/tcp || true
	@sleep 1

restart: kill run

status:
	@if [ -f $(PID_FILE) ]; then \
		echo "Dummy Job Manager is running with PID: $$(cat $(PID_FILE))"; \
	else \
		echo "Dummy Job Manager is NOT running."; \
	fi
