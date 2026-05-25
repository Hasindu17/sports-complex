# ── Stage 1: Use official Nginx image to serve static files ──
# We use the lightweight 'alpine' version to keep image size small
FROM nginx:alpine

# Copy our website files into the Nginx default web root
COPY . /usr/share/nginx/html

# Copy our custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Tell Docker this container listens on port 80
EXPOSE 80

# Nginx starts automatically — no CMD needed (inherited from base image)
