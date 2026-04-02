# Python 3.11 Base Image
FROM python:3.11-slim

# Set WORKDIR to /app
WORKDIR /app

# [Fix] Copy requirements from backend subfolder (Railway context is root)
COPY backend/requirements.txt .

# Install dependencies
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

# Command to run the application (Ensure main.py is in the current WORKDIR)
CMD sh -c "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"
