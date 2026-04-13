# Use an official lightweight Python image
FROM python:3.10-slim

# Install system dependencies (FFmpeg is crucial for your project)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY . .

# Render uses a dynamic port, so we use the $PORT variable
# Use gunicorn with uvicorn workers for better stability in production
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port $PORT"]