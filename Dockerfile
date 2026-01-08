FROM python:3.12-slim-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    wkhtmltopdf \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY pyproject.toml ./

RUN python - <<'PY'
import subprocess
import tomllib

with open("pyproject.toml", "rb") as f:
    data = tomllib.load(f)

deps = data.get("project", {}).get("dependencies", [])
if not deps:
    raise SystemExit("No dependencies found in pyproject.toml")

subprocess.check_call(["pip", "install", "--no-cache-dir", "--upgrade", "pip"])
subprocess.check_call(["pip", "install", "--no-cache-dir", *deps])
PY

COPY ./app ./app

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
