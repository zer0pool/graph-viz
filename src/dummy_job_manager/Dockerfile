FROM python:3.11-slim

WORKDIR /app

# Install dependencies
RUN pip install fastapi uvicorn

# Copy dummy server code
COPY dummy_job_manager.py /app/dummy_job_manager.py

# Expose port
EXPOSE 9000

# Run server
CMD ["uvicorn", "dummy_job_manager:app", "--host", "0.0.0.0", "--port", "9000"]
