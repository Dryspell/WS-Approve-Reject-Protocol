# Deployment Guide

## Cloud Deployment (SpacetimeDB Testnet)

### 1. Publish to SpacetimeDB Cloud
```bash
spacetime login
cd server
spacetime publish --project-path . socket-signals
```

### 2. Update Environment
Create `.env`:
```env
VITE_SPACETIME_HOST=wss://testnet.spacetimedb.com
VITE_SPACETIME_MODULE_NAME=socket-signals
```

### 3. Build & Deploy Frontend
```bash
pnpm build
```

Deploy the build output to your preferred hosting (Fly.io, Vercel, etc.).

---

## Docker Deployment

### Prerequisites
- Cloud server (AWS EC2, DigitalOcean, etc.) with Docker installed
- Domain name (optional, recommended for production)

### Step 1: Prepare Server
```bash
ssh user@your-server-ip
sudo apt update
sudo apt install -y docker.io docker-compose
```

### Step 2: Deploy Container
```bash
git clone https://github.com/yourusername/your-repo.git
cd your-repo
docker-compose up -d --build
```

### Step 3: Set Up Reverse Proxy (Nginx)
```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/spacetimedb
```

Add configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/spacetimedb /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 4: SSL/TLS (Recommended)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Fly.io Deployment

The project includes `fly.toml` for Fly.io deployment:

```bash
fly auth login
fly launch
fly deploy
```

---

## Monitoring

### View Logs
```bash
docker-compose logs spacetimedb
# or
pnpm logs:cloud
```

### Backups
```bash
./scripts/backup-spacetimedb.sh
```

---

## Security Considerations

- Configure firewall (allow ports 80, 443)
- Use SSH keys instead of passwords
- Regularly update server and Docker images
- Enable HTTPS for production
