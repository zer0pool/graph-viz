# --- Stage 1: Build ---
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files and install dependencies
# We use --frozen-lockfile if possible, but for simplicity:
COPY package.json package-lock.json ./
RUN npm install

# Copy source and build
# Build-time environment variables for Module Federation Remotes
ARG LINEAGE_MFE_URL
ARG CATALOG_MFE_URL

# Make them available to the build process
ENV LINEAGE_MFE_URL=$LINEAGE_MFE_URL
ENV CATALOG_MFE_URL=$CATALOG_MFE_URL

COPY . .
RUN npm run build
RUN ls -la dist/  # Verify build output

# --- Stage 2: Production ---
# Use slim alpine for the smallest possible footprint
FROM nginx:stable-alpine-slim

# Install bash (required by our entrypoint)
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
COPY deploy/docker/nginx.conf.template /etc/nginx/nginx.conf.template
RUN chmod +x /entrypoint.sh

EXPOSE 80

# Use entrypoint.sh as requested
ENTRYPOINT ["/entrypoint.sh"]
