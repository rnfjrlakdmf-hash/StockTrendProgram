# Python 3.11 Base Image (More stable wheel support)
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
# (Skipping gcc as most packages have binary wheels for Python 3.11)
# RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

# Copy backend requirements to temp location
COPY backend/requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code to /app
# This puts main.py directly in /app
COPY backend/ .

# Expose port
EXPOSE 8000

# Command to run the application
# Since main.py is in /app, we run "main:app"
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
