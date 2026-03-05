FROM python:3.11-slim

<<<<<<< HEAD
ENV DOCLING_DISABLE_OCR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    wkhtmltopdf \
    && rm -rf /var/lib/apt/lists/*
=======
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy
>>>>>>> 7b8fdfdf5a540861ae869c4f233f62419b01a49a

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv (official install script)
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:${PATH}"

# Copy dependency manifests first (better Docker cache)
COPY pyproject.toml uv.lock* /app/

# Install dependencies into a local virtual env in the image
RUN uv sync --frozen --no-dev

# Copy application code
COPY app /app/app

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
