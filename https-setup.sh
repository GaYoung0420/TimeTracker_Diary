#!/bin/bash

# HTTPS Setup Script for timetrackerdiary.duckdns.org
# This script sets up Nginx + Let's Encrypt SSL

set -e

echo "======================================"
echo "HTTPS Setup for timetrackerdiary.duckdns.org"
echo "======================================"
echo ""

DOMAIN="timetrackerdiary.duckdns.org"
BACKEND_PORT="5000"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root (use sudo)${NC}"
   exit 1
fi

# Step 1: Update system
echo -e "${YELLOW}Step 1: Updating system packages...${NC}"
apt update
apt upgrade -y
echo -e "${GREEN}✓ System updated${NC}"
echo ""

# Step 2: Install Nginx
echo -e "${YELLOW}Step 2: Installing Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    apt install nginx -y
    echo -e "${GREEN}✓ Nginx installed${NC}"
else
    echo -e "${GREEN}✓ Nginx already installed${NC}"
fi
echo ""

# Step 3: Install Certbot
echo -e "${YELLOW}Step 3: Installing Certbot (Let's Encrypt)...${NC}"
apt install certbot python3-certbot-nginx -y
echo -e "${GREEN}✓ Certbot installed${NC}"
echo ""

# Step 4: Create Nginx configuration
echo -e "${YELLOW}Step 4: Creating Nginx configuration...${NC}"

# Stop Nginx temporarily
systemctl stop nginx

# Remove default config
rm -f /etc/nginx/sites-enabled/default

# Create new config
cat > /etc/nginx/sites-available/timetracker << 'EOF'
server {
    listen 80;
    server_name timetrackerdiary.duckdns.org;

    # Allow Certbot to verify domain
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name timetrackerdiary.duckdns.org;

    # SSL certificates (will be added by Certbot)
    ssl_certificate /etc/letsencrypt/live/timetrackerdiary.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/timetrackerdiary.duckdns.org/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Frontend (static files)
    location / {
        root /home/ubuntu/TimeTracker_Diary/frontend/dist;
        try_files $uri $uri/ /index.html;

        # Cache static assets
        location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Auth routes
    location /auth {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/timetracker /etc/nginx/sites-enabled/

# Test Nginx configuration
nginx -t

echo -e "${GREEN}✓ Nginx configuration created${NC}"
echo ""

# Step 5: Start Nginx
echo -e "${YELLOW}Step 5: Starting Nginx...${NC}"
systemctl start nginx
systemctl enable nginx
echo -e "${GREEN}✓ Nginx started and enabled${NC}"
echo ""

# Step 6: Obtain SSL certificate
echo -e "${YELLOW}Step 6: Obtaining SSL certificate from Let's Encrypt...${NC}"
echo "This may take a minute..."
echo ""

# Check if certificate already exists
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    certbot certonly --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --no-eff-email

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ SSL certificate obtained successfully!${NC}"
    else
        echo -e "${RED}✗ Failed to obtain SSL certificate${NC}"
        echo "Please check:"
        echo "1. Domain $DOMAIN points to this server's IP"
        echo "2. Port 80 and 443 are open in firewall"
        exit 1
    fi
else
    echo -e "${GREEN}✓ SSL certificate already exists${NC}"
fi
echo ""

# Step 7: Reload Nginx with SSL
echo -e "${YELLOW}Step 7: Reloading Nginx with SSL...${NC}"
systemctl reload nginx
echo -e "${GREEN}✓ Nginx reloaded${NC}"
echo ""

# Step 8: Setup auto-renewal
echo -e "${YELLOW}Step 8: Setting up automatic SSL renewal...${NC}"

# Test renewal
certbot renew --dry-run

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Auto-renewal configured (certificates will renew automatically)${NC}"
else
    echo -e "${YELLOW}! Auto-renewal test had issues, but setup continues${NC}"
fi
echo ""

# Step 9: Configure firewall
echo -e "${YELLOW}Step 9: Configuring firewall...${NC}"
if command -v ufw &> /dev/null; then
    ufw allow 'Nginx Full'
    ufw delete allow 'Nginx HTTP'
    echo -e "${GREEN}✓ Firewall configured${NC}"
else
    echo -e "${YELLOW}! UFW not found, please ensure ports 80 and 443 are open${NC}"
fi
echo ""

# Step 10: Final checks
echo -e "${YELLOW}Step 10: Running final checks...${NC}"

# Check Nginx status
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✓ Nginx is running${NC}"
else
    echo -e "${RED}✗ Nginx is not running${NC}"
fi

# Check if backend is running
if curl -s http://localhost:$BACKEND_PORT/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is running on port $BACKEND_PORT${NC}"
else
    echo -e "${YELLOW}! Backend is not running. Please start it:${NC}"
    echo "  cd /home/ubuntu/TimeTracker_Diary/backend"
    echo "  npm start"
fi

echo ""
echo "======================================"
echo -e "${GREEN}HTTPS Setup Complete!${NC}"
echo "======================================"
echo ""
echo "Your website is now available at:"
echo -e "${GREEN}https://timetrackerdiary.duckdns.org${NC}"
echo ""
echo "SSL certificate will auto-renew before expiration."
echo ""
echo "Next steps:"
echo "1. Make sure your backend is running"
echo "2. Visit https://timetrackerdiary.duckdns.org"
echo "3. Check that everything works"
echo ""
echo "To check SSL certificate status:"
echo "  sudo certbot certificates"
echo ""
echo "To manually renew certificate:"
echo "  sudo certbot renew"
echo ""
