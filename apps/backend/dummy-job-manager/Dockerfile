FROM python:3.11-slim

WORKDIR /app

# Install dependencies
RUN pip install fastapi uvicorn

# Copy dummy server code
COPY app /app/app
COPY dummy_lineage.json /app/dummy_lineage.json

# Expose port
EXPOSE 9000

# Run server
# PYTHONPATH implicitly includes /app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "9000"]
