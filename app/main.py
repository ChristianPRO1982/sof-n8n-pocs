from pathlib import Path

from fastapi import FastAPI, HTTPException

app = FastAPI(title="SOF POC API", version="0.1.0")

BASE_DIR = Path(__file__).resolve().parent.parent
PDF_DIRECTORIES = (
    BASE_DIR / "n8n_files" / "poc2" / "pdf",
    BASE_DIR / "n8n_files" / "pocs2" / "pdf",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/pdf/exists/{filename}")
def pdf_exists(filename: str) -> dict[str, str | bool]:
    safe_filename = Path(filename).name
    if safe_filename != filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    if Path(safe_filename).suffix.lower() != ".pdf":
        raise HTTPException(status_code=400, detail="Only .pdf files are allowed")

    for directory in PDF_DIRECTORIES:
        file_path = directory / safe_filename
        if file_path.is_file():
            return {
                "filename": safe_filename,
                "exists": True,
                "path": str(file_path.relative_to(BASE_DIR)),
            }

    return {"filename": safe_filename, "exists": False}
