# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build-time environment variables (for consistency)
ARG LINEAGE_MFE_URL
ARG CATALOG_MFE_URL
ENV LINEAGE_MFE_URL=$LINEAGE_MFE_URL
ENV CATALOG_MFE_URL=$CATALOG_MFE_URL

# Set DEPLOY flag for webpack to use correct publicPath in production
ENV DEPLOY=true

RUN npm run build

# Stage 2: Serve
FROM nginx:alpine

RUN apk add --no-cache bash

WORKDIR /usr/share/nginx/html

COPY --from=builder /app/dist .
RUN cp index.html index.html.template

# Copy entrypoint and nginx config template
COPY deploy/docker/entrypoint.sh /entrypoint.sh
COPY deploy/docker/nginx.conf.template /etc/nginx/nginx.conf.template
RUN chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
