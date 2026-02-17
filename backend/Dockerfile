# Python 3.11 - scipy binary wheels available
FROM python:3.11-slim

WORKDIR /app

# Copy and install requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all backend code
COPY . .

# Railway sets PORT dynamically
CMD sh -c "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"
