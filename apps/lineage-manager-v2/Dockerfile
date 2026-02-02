FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libmysqlclient-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
# Generate requirements.txt from pyproject.toml if needed, or assume it exists
# For now, we install directly or use a builder pattern. 
# Simplest: Copy pyproject.toml and use pip install .
COPY pyproject.toml .
RUN pip install --no-cache-dir .

# Copy app code
COPY . .

# Command
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "5004"]
