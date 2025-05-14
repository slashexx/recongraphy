FROM python:3.13.1-slim

WORKDIR /app

COPY requirements.txt /app/

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir -r requirements.txt

COPY src/ /app/src/

EXPOSE 8000

CMD ["python", "src/main.py"]