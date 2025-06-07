# Public Hosting Guide for SpacetimeDB Docker Container

This guide explains how to deploy your SpacetimeDB Docker container to a public server so it can be accessed from the internet.

## Prerequisites

- A cloud server (e.g., AWS EC2, DigitalOcean Droplet, Google Cloud VM) with Docker and Docker Compose installed.
- Basic knowledge of SSH, Linux commands, and Docker.
- A domain name (optional, but recommended for production).

## Step 1: Prepare Your Server

1. **Launch a VM** on your chosen cloud provider (e.g., Ubuntu 22.04 LTS).
2. **SSH into your server**:
   ```sh
   ssh user@your-server-ip
   ```
3. **Install Docker and Docker Compose** (if not already installed):
   ```sh
   sudo apt update
   sudo apt install -y docker.io docker-compose
   sudo usermod -aG docker $USER
   ```
   Log out and log back in for the group changes to take effect.

## Step 2: Transfer Your Project

1. **Clone your repository** on the server:
   ```sh
   git clone https://github.com/yourusername/your-repo.git
   cd your-repo
   ```
   Alternatively, use `scp` or `rsync` to transfer your project files.

## Step 3: Configure Your Environment

1. **Update your `docker-compose.yml`** to ensure it binds to all interfaces:
   ```yaml
   services:
     spacetimedb:
       build:
         context: ./server
         dockerfile: Dockerfile
       ports:
         - "0.0.0.0:3000:3000"  # Bind to all interfaces
       environment:
         - RUST_LOG=info
       volumes:
         - spacetimedb_data:/stdb
       healthcheck:
         test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
         interval: 10s
         timeout: 5s
         retries: 3
         start_period: 30s
       restart: unless-stopped

   volumes:
     spacetimedb_data:
   ```

2. **Set up a reverse proxy** (recommended for production):
   - Install Nginx:
     ```sh
     sudo apt install -y nginx
     ```
   - Create a new Nginx configuration file:
     ```sh
     sudo nano /etc/nginx/sites-available/spacetimedb
     ```
   - Add the following configuration:
     ```nginx
     server {
         listen 80;
         server_name your-domain.com;  # Replace with your domain

         location / {
             proxy_pass http://localhost:3000;
             proxy_set_header Host $host;
             proxy_set_header X-Real-IP $remote_addr;
             proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
             proxy_set_header X-Forwarded-Proto $scheme;
         }
     }
     ```
   - Enable the site and restart Nginx:
     ```sh
     sudo ln -s /etc/nginx/sites-available/spacetimedb /etc/nginx/sites-enabled/
     sudo nginx -t
     sudo systemctl restart nginx
     ```

3. **Set up SSL/TLS** (recommended for production):
   - Install Certbot:
     ```sh
     sudo apt install -y certbot python3-certbot-nginx
     ```
   - Obtain an SSL certificate:
     ```sh
     sudo certbot --nginx -d your-domain.com
     ```

## Step 4: Deploy Your Container

1. **Build and start your container**:
   ```sh
   docker-compose up -d --build
   ```

2. **Verify the container is running**:
   ```sh
   docker ps
   ```

3. **Check the logs**:
   ```sh
   docker-compose logs spacetimedb
   ```

## Step 5: Access Your Service

- **Via domain**: If you set up a domain and SSL, visit `https://your-domain.com`.
- **Via IP**: If you didn't set up a domain, visit `http://your-server-ip:3000`.

## Step 6: Monitor and Maintain

1. **Set up monitoring** (optional):
   - Use tools like Prometheus, Grafana, or a cloud provider's monitoring service.
2. **Regular backups**:
   - Use the backup script provided in your project:
     ```sh
     ./scripts/backup-spacetimedb.sh
     ```
3. **Update your container**:
   - Pull the latest changes and rebuild:
     ```sh
     git pull
     docker-compose up -d --build
     ```

## Troubleshooting

- **Container not starting**: Check logs with `docker-compose logs spacetimedb`.
- **Nginx issues**: Check Nginx logs with `sudo tail -f /var/log/nginx/error.log`.
- **Firewall issues**: Ensure ports 80 and 443 are open:
  ```sh
  sudo ufw allow 80
  sudo ufw allow 443
  ```

## Security Considerations

- **Firewall**: Configure your cloud provider's firewall to allow only necessary ports (80, 443).
- **SSH**: Use SSH keys instead of passwords.
- **Updates**: Regularly update your server and Docker images.

## Conclusion

Your SpacetimeDB Docker container is now publicly hosted and accessible via your domain or server IP. Follow the monitoring and maintenance steps to ensure it runs smoothly.

For further assistance, refer to the [SpacetimeDB documentation](https://docs.spacetimedb.com) or your cloud provider's documentation. 