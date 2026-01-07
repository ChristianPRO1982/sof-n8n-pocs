"""FastAPI entrypoint exposing Docling conversion endpoints."""

from __future__ import annotations

from pathlib import Path
from typing import Literal

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import PlainTextResponse
from starlette.status import HTTP_400_BAD_REQUEST, HTTP_413_REQUEST_ENTITY_TOO_LARGE

from app.utils import DoclingService, ExportFormat


app = FastAPI(title="Docling FastAPI (POC)", version="0.1.0")
docling_service = DoclingService()

MaxBytes = 50 * 1024 * 1024
AllowedFormats = Literal["markdown", "text", "html", "json"]


@app.get("/health", response_class=PlainTextResponse)
def health() -> str:
    """Simple healthcheck endpoint."""
    return "ok"


@app.post("/convert", response_class=PlainTextResponse)
async def convert(
    file: UploadFile = File(...),
    output_format: AllowedFormats = "markdown",
) -> str:
    """Convert an uploaded document to the requested format using Docling."""
    if not file.filename:
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail="Missing filename")

    content = await file.read()
    if len(content) > MaxBytes:
        raise HTTPException(
            status_code=HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large (max {MaxBytes} bytes)",
        )

    tmp_path: Path | None = None
    try:
        tmp_path = docling_service.save_upload_to_tempfile(file.filename, content)
        return docling_service.convert_file(tmp_path, output_format=output_format)  # type: ignore[arg-type]
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    finally:
        if tmp_path and tmp_path.exists():
            tmp_path.unlink(missing_ok=True)
