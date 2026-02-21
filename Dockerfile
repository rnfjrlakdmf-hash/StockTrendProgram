# Python 3.11 Base Image
FROM python:3.11-slim

# Copy requirements (assuming context is backend root)
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy all files (assuming context is backend root)
COPY . .

# Set WORKDIR to /app (files are already here)
WORKDIR /app

# Create persistent data directory (mount as Railway Volume)
RUN mkdir -p /data

# Set DB path to persistent volume
ENV DB_PATH=/data/stock_app.db

# Expose port (Railway sets PORT env var dynamically)
EXPOSE 8000

# Command to run the application
CMD sh -c "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"
