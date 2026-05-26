#!/bin/bash
# ====================================================================
# StockTrend AWS EC2 Auto Setup Script (Fixed Redirection)
# ====================================================================
set -e

echo "=== [1/6] Swap Memory (4GB) Setup ==="
if [ ! -f /swapfile ]; then
    sudo fallocate -l 4G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "Swap memory created successfully."
else
    echo "Swap memory already exists."
fi

echo "=== [2/6] System Update & Dependencies ==="
sudo apt-get update
sudo apt-get install -y git curl nginx python3-pip python3-venv python3-dev build-essential

# Node.js 20.x Setup
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

echo "=== [3/6] Repository Clone ==="
cd /home/ubuntu
if [ ! -d "StockTrendProgram" ]; then
    git clone https://github.com/rnfjrlakdmf-hash/StockTrendProgram.git
fi
cd StockTrendProgram

# Create backend .env
cat << 'EOF' > backend/.env
NAVER_CLIENT_ID=X1lSLnU6VrVTHrZJ5iTE
NAVER_CLIENT_SECRET=DsyNTK2e8d
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
TWELVEDATA_API_KEY=6410453ce89f42678bb4334a13b44d14
SEIBRO_API_KEY=83d27e7fb5e03e3354322c46946e7040d81701a4629df8d5f35402dc034bad22
DART_API_KEY=f4ec215eba3e7ef30b5102e2bc3f30616ab9a858
EOF
echo ".env configuration complete."

echo "=== [4/6] Backend (FastAPI) Setup ==="
cd /home/ubuntu/StockTrendProgram/backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt

# Create systemd service for Backend (Fixed: Used 'sudo tee')
sudo tee /etc/systemd/system/stocktrend-backend.service << 'EOF'
[Unit]
Description=StockTrend FastAPI Backend Service
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/StockTrendProgram/backend
ExecStart=/home/ubuntu/StockTrendProgram/backend/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=stocktrend-backend

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable stocktrend-backend
sudo systemctl restart stocktrend-backend

echo "=== [5/6] Frontend (Next.js) Setup ==="
cd /home/ubuntu/StockTrendProgram/frontend
npm install
npm run build

# Start with PM2 (Production Start)
pm2 delete stocktrend-frontend || true
pm2 start npm --name "stocktrend-frontend" -- run start -- -p 3000
pm2 save

# Setup PM2 Startup script
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu || true

echo "=== [6/6] Nginx Reverse Proxy Config (Fixed: Used 'sudo tee') ==="
sudo tee /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80;
    server_name _;

    # Backend APIs
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Frontend pages
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo systemctl restart nginx
echo "=== Setup Completed Successfully! ==="
