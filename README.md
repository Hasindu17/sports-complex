# 🏟️ Apex Sports Complex — DevOps Project

A full sports complex website with a complete DevOps pipeline.
Built using: HTML/CSS/JS · Docker · Nginx · GitHub Actions · DigitalOcean

---

## 📁 Project Structure

```
sports-complex/
├── index.html              ← Main website
├── css/style.css           ← All styles
├── js/main.js              ← JavaScript
├── Dockerfile              ← How to build the Docker image
├── nginx.conf              ← Nginx web server config
├── docker-compose.yml      ← Run locally with one command
├── .gitignore              ← Files Git should ignore
└── .github/
    └── workflows/
        └── deploy.yml      ← CI/CD pipeline (GitHub Actions)
```

---

## 🚀 Step-by-Step: Run Locally

### Prerequisites
Install these tools on your laptop:
- [Git](https://git-scm.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### 1. Clone the repo
```bash
git clone https://github.com/YOUR-USERNAME/sports-complex.git
cd sports-complex
```

### 2. Run with Docker Compose
```bash
docker-compose up --build
```

### 3. Open in browser
Visit: **http://localhost:8080**

### 4. Stop the container
```bash
docker-compose down
```

---

## ☁️ Step-by-Step: Deploy to DigitalOcean

### Prerequisites
- DigitalOcean account (use your $200 Student credit)
- A domain name (use your free .me domain from Namecheap)

### Step A — Create a Droplet
1. Log into DigitalOcean → Create → Droplets
2. Choose: **Ubuntu 22.04**, **Basic plan ($6/mo)**
3. Authentication: **SSH Key** (add your public key)
4. Click **Create Droplet**

### Step B — Set up the Droplet
SSH into it:
```bash
ssh root@YOUR_DROPLET_IP
```
Install Docker:
```bash
apt update && apt install -y docker.io
systemctl enable docker
systemctl start docker
```

### Step C — Create Container Registry
1. DigitalOcean → Container Registry → Create Registry
2. Name it something like `apex-registry`
3. Note your registry name

### Step D — Add GitHub Secrets
In your GitHub repo → Settings → Secrets → Actions, add:

| Secret Name | Value |
|---|---|
| `DO_REGISTRY_TOKEN` | Your DO API token |
| `DO_REGISTRY_NAME` | Your registry name |
| `DROPLET_IP` | Your Droplet's IP address |
| `SSH_PRIVATE_KEY` | Your private SSH key content |

### Step E — Push to GitHub
```bash
git add .
git commit -m "feat: initial sports complex site"
git push origin main
```

GitHub Actions will automatically build, test, and deploy! 🎉

### Step F — Set up SSL (HTTPS)
On your Droplet:
```bash
apt install -y certbot
# Stop the container first
docker stop apex-sports-complex
# Get SSL certificate
certbot certonly --standalone -d yourdomain.me
# Restart container
docker start apex-sports-complex
```

---

## 💰 Credit Usage (Approximate)
| Resource | Monthly Cost | From Credit |
|---|---|---|
| Basic Droplet ($6/mo) | $6 | Yes |
| Container Registry | $0 (free tier) | — |
| Domain (.me) | Free (Student Pack) | — |
| GitHub Actions | Free (public repo) | — |
| **Total** | **~$6/month** | ✅ |

Your $200 credit = ~33 months of hosting this project!

---

## 🛠️ DevOps Concepts You Practiced
- ✅ Containerization with Docker
- ✅ Reverse proxy with Nginx
- ✅ CI/CD pipelines with GitHub Actions
- ✅ Container registry
- ✅ Cloud deployment on DigitalOcean
- ✅ SSH-based deployment
- ✅ Security headers & firewall basics
- ✅ Infrastructure as configuration (Dockerfile, nginx.conf)
