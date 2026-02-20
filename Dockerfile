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

# Expose port (Railway sets PORT env var dynamically)
EXPOSE 8000

# Command to run the application
CMD sh -c "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"
