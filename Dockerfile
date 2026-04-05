# Python 3.11 Base Image
FROM python:3.11-slim

# Install system dependencies for Selenium and Scipy
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-driver \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libasound2 \
    libfontconfig1 \
    libxrender1 \
    libxtst6 \
    libxi6 \
    libglib2.0-0 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set WORKDIR to /app
WORKDIR /app

# Copy requirements from backend subfolder (Railway context is root)
COPY backend/requirements.txt .

# Install dependencies (Firebase Admin SDK, Scipy, Selenium included)
RUN pip install --no-cache-dir -r requirements.txt

# Copy all files (including backend and frontend)
COPY . .

# [Fix] Set WORKDIR to backend where main.py exists
WORKDIR /app/backend

# Create persistent data directory (mount as Railway Volume)
RUN mkdir -p /data

# Set DB path to persistent volume
ENV DB_PATH=/data/stock_app.db

# Expose port (Railway sets PORT env var dynamically)
EXPOSE 8000

# Force Reload Trigger: v2.6.8-Hotfix-Manifest
# Command to run the application
CMD sh -c "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"
