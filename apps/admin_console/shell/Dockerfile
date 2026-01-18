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
RUN ls -la dist/  # Verify build output

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
RUN cp index.html index.html.template
RUN chmod -R 755 /usr/share/nginx/html

# Copy entrypoint, variable manifest, and nginx config template
COPY deploy/docker/entrypoint.sh /entrypoint.sh
COPY deploy/docker/vars.sh /vars.sh
COPY deploy/docker/nginx.conf.template /etc/nginx/templates/default.conf.template
RUN chmod +x /entrypoint.sh

EXPOSE 80

# Use entrypoint.sh as requested
ENTRYPOINT ["/entrypoint.sh"]
