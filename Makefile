PY=python3
APP=app.main:app
venv:
	$(PY) -m venv .venv && . .venv/bin/activate && pip install --upgrade pip && pip install -r requirements.txt
run:
	. .venv/bin/activate && uvicorn $(APP) --reload --host 0.0.0.0 --port 8000
clean:
	rm -rf .venv __pycache__ .pytest_cache
