# Python 3.11 Base Image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy backend requirements explicitly from backend folder
COPY backend/requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code to /app (flattening the structure)
COPY backend/ .

# Expose port (Railway sets PORT env var dynamically)
EXPOSE 8000

# Command to run the application
CMD sh -c "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"
