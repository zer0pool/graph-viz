# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
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
