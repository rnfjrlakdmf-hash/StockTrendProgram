# Python 3.11 - scipy binary wheels available
FROM python:3.11-slim

# Install system dependencies for Selenium and Scipy
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-driver \
    libnss3 \
    libgconf-2-4 \
    libfontconfig1 \
    libxrender1 \
    libxtst6 \
    libxi6 \
    libglib2.0-0 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all backend code
COPY . .

# Railway sets PORT dynamically
CMD sh -c "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"
