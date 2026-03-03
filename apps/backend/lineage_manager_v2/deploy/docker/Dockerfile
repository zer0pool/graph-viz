# Build stage
FROM python:3.11-slim as builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc python3-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
COPY pyproject.toml .

# Generate wheels for dependencies
RUN pip wheel --no-cache-dir --wheel-dir /app/wheels -r requirements.txt
# Also install current project in editable mode if necessary or just dependencies
# In this case, we'll just use requirements.txt wheels.

# Final stage
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# Copy wheels from builder and install
COPY --from=builder /app/wheels /wheels
RUN pip install --no-index --find-links=/wheels /wheels/*

# Copy app code
COPY . .

# Environment variables
ENV PYTHONPATH=/app
ENV PORT=5003

# Entrypoint
COPY deploy/docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["backend"]
