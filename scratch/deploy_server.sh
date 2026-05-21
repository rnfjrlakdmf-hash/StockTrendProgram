#!/bin/bash
set -e

echo "=== [1/5] Git Pull ==="
cd /home/ubuntu/StockTrendProgram
git fetch --all
git reset --hard origin/main

echo "=== [2/5] Frontend Dependencies ==="
cd frontend
npm install

echo "=== [3/5] Frontend Build ==="
npm run build

echo "=== [4/5] Restarting Frontend (PM2) ==="
pm2 restart stocktrend-frontend || pm2 start npm --name "stocktrend-frontend" -- run start -- -p 3000

echo "=== [5/5] Restarting Backend (systemd) ==="
cd ../backend
./venv/bin/pip install -r requirements.txt
sudo systemctl restart stocktrend-backend

echo "=== Deploy Completed Successfully! ==="
