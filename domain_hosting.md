# Production Guide: Custom Domain & Portable Hosting

This guide explains how to migrate, deploy, and host the **Apex Sports Complex** web application on **any standard server** (DigitalOcean, AWS, Hetzner, Linode, etc.) using a custom domain and SSL (HTTPS) certificates. 

The architecture is designed to be **highly portable** and self-contained within Docker containers.

---

## 🏗️ Portable Infrastructure Overview

The application is structured into three containers managed via **Docker Compose**:
1. **`db` (PostgreSQL)**: Database engine.
2. **`api` (FastAPI)**: Backend application layer.
3. **`web` (Nginx + Frontend)**: Serves static files and reverse-proxies `/api` routes to the backend container under the same origin (preventing CORS issues).

Because the frontend API path is configured dynamically in Javascript (`const API_URL = '';`), the frontend automatically calls the server it is loaded from, meaning **no code changes are needed** when moving to a new domain or server.

---

## 🚀 Step-by-Step Deployment on a New Server

If the customer decides to tear down Azure and host normally on another provider:

### 1. Point the Domain Name to the Server
Before deploying, log into your DNS registrar (e.g., GoDaddy, Namecheap, Route53) and create an **A Record**:
* **Host**: `@` (or `www`)
* **Value**: Your new server's Public IP Address (e.g., `203.0.113.10`)
* **TTL**: `300` (5 minutes)

---

### 2. Prepare the Server
Connect to your server via SSH:
```bash
ssh root@YOUR_SERVER_IP
```
Install Docker and Docker Compose (example for Ubuntu):
```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose
sudo systemctl enable --now docker
```

---

### 3. Deploy the Containers (Using Prebuilt Images)
Create an application directory and write the `docker-compose.yml` file:
```bash
mkdir -p /opt/sports-complex
cd /opt/sports-complex
```

Create a production `docker-compose.yml` file:
```yaml
version: '3.8'

services:
  db:
    image: postgres:17
    container_name: sports-complex-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: sports_complex
      POSTGRES_USER: sports_user
      POSTGRES_PASSWORD: sports_pass_change_me_in_production # Use a secure password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sports_user -d sports_complex"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    image: your-dockerhub-username/sports-complex-api:latest
    container_name: sports-complex-api
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://sports_user:sports_pass_change_me_in_production@db:5432/sports_complex
    depends_on:
      db:
        condition: service_healthy

  web:
    image: your-dockerhub-username/sports-complex:latest
    container_name: apex-sports-complex
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"  # Open port 443 for HTTPS SSL traffic
    volumes:
      - /etc/letsencrypt:/etc/letsencrypt:ro  # Mount SSL certs from host certbot
    depends_on:
      - api
      
volumes:
  postgres_data:
    driver: local
```

---

### 4. Enable SSL (HTTPS) using Certbot

To secure the domain with a free, automatic SSL certificate from Let's Encrypt:

1. **Install Certbot** on the host machine:
   ```bash
   sudo apt-get install -y certbot
   ```
2. **Temporarily stop the Docker web container** to release port 80:
   ```bash
   docker-compose stop web
   ```
3. **Request the certificate**:
   ```bash
   sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
   ```
   *Replace `yourdomain.com` with the customer's actual registered domain.*
4. **Update the Nginx Config** in the frontend container to listen on `443` and map the certificate paths (see sample below).
5. **Restart the containers**:
   ```bash
   docker-compose start web
   ```

---

### 🔒 Sample Secure Nginx Config (`nginx.conf` with SSL)

When deploying with SSL, update the `nginx.conf` in your frontend build (or mount it from the host) to include:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect all HTTP traffic to HTTPS automatically
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Certificates (Created by Certbot)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Optimal SSL Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers HIGH:!aNULL:!MD5;

    root /usr/share/nginx/html;
    index index.html;

    # Backend API routing
    location /api/ {
        proxy_pass http://api:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend Single Page App routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```
