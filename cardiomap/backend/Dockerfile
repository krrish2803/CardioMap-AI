# Production Dockerfile for CardioMap API
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend app, artifacts, and configs
COPY backend /app/cardiomap/backend
COPY ml /app/cardiomap/ml
COPY reports /app/cardiomap/reports

ENV PYTHONPATH=/app

EXPOSE 8000

# Run uvicorn on $PORT with worker count tuned for CPU
CMD ["sh", "-c", "uvicorn cardiomap.backend.app.main:app --host 0.0.0.0 --port ${PORT}"]
