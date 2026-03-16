FROM python:3.11-slim-bookworm

ENV DOCLING_DISABLE_OCR=1
ENV UV_PROJECT_ENVIRONMENT=/usr/local

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    wkhtmltopdf \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv

WORKDIR /app

COPY pyproject.toml uv.lock ./

RUN uv sync --frozen --no-dev --no-install-project

RUN pip uninstall -y rapidocr rapidocr-onnxruntime rapidocr-paddle torch torchvision torchaudio || true

COPY ./app ./app

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
