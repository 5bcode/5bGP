# Use official lightweight Python image
FROM python:3.10-slim

# Allow statements and log messages to immediately appear in the Knative logs
ENV PYTHONUNBUFFERED True

# Set the working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY cloud-run/api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend code
COPY cloud-run/api/ .

# Copy the frontend code into a 'static' folder for serving
COPY molten-rosette/ ./static/

# Run the web service on container startup
# Cloud Run automatically sets the PORT environment variable (default 8080)
CMD exec uvicorn main:app --host 0.0.0.0 --port $PORT
