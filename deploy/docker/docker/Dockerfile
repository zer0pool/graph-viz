# syntax=docker/dockerfile:1.4
# FROM python:3.12-slim
FROM python:3.12

WORKDIR /app

# Install essential packages
RUN apt update && apt clean && apt-get install -y \
    --no-install-recommends \
    git openssh-client \
    && rm -rf /var/lib/apt/lists/*  # Remove temporary files

# Upgrade pip
RUN pip install --upgrade pip

# Copy requirements.txt and install dependencies directly
COPY ./requirements.txt ./requirements.txt
RUN pip install -r requirements.txt

# Copy application code
COPY . .

# Install the package in development mode
RUN pip install -e .

# Grant execution permissions
RUN chmod u+x ./deploy/docker/entrypoint.sh

# Set environment variables
ENV ENV_STATE local
ENV TMOUT=1800

# Expose port  
EXPOSE 5003

# Set entrypoint
ENTRYPOINT ["./deploy/docker/entrypoint.sh"]
CMD ["backend"]

# To print configuration, run:
# docker run --rm lineage-manager print-config
