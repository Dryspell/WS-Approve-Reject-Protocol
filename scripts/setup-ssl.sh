#!/bin/bash

# Check if domain is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <domain>"
    exit 1
fi

DOMAIN=$1

# Install certbot if not installed
if ! command -v certbot &> /dev/null; then
    echo "Installing certbot..."
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
fi

# Stop Nginx
systemctl stop nginx

# Obtain certificate
certbot certonly --standalone \
    --preferred-challenges http \
    --agree-tos \
    --email admin@$DOMAIN \
    -d $DOMAIN

# Create directory for certificates if it doesn't exist
mkdir -p /etc/letsencrypt/live/$DOMAIN

# Create symbolic links
ln -sf /etc/letsencrypt/live/$DOMAIN/fullchain.pem /etc/nginx/ssl/$DOMAIN.crt
ln -sf /etc/letsencrypt/live/$DOMAIN/privkey.pem /etc/nginx/ssl/$DOMAIN.key

# Start Nginx
systemctl start nginx

# Set up auto-renewal
echo "0 0 * * * root certbot renew --quiet --post-hook 'systemctl reload nginx'" > /etc/cron.d/certbot-renew

echo "SSL setup completed for $DOMAIN" 