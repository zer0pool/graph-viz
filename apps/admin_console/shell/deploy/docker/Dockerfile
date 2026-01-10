# --- Stage 1: Build ---
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files and install dependencies
# We use --frozen-lockfile if possible, but for simplicity:
COPY package.json package-lock.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# --- Stage 2: Production ---
# Use alpine for the smallest possible footprint
FROM nginx:alpine

# Install envsubst or other tools if needed
RUN apk add --no-cache bash

WORKDIR /usr/share/nginx/html

# Remove default nginx static assets
RUN rm -rf ./*

# Copy built assets from builder stage
COPY --from=builder /app/dist .

# Copy entrypoint and nginx config
COPY deploy/docker/entrypoint.sh /entrypoint.sh
COPY deploy/docker/nginx.conf /etc/nginx/conf.d/default.conf
RUN chmod +x /entrypoint.sh

EXPOSE 80

# Use entrypoint.sh as requested
ENTRYPOINT ["/entrypoint.sh"]
