from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pdftools.pdftools import pdf_copy
from PyPDF2 import PdfFileReader

app = FastAPI(title="SOF POC API", version="0.1.0")

BASE_DIR = Path(__file__).resolve().parent.parent
PDF_DIRECTORIES = (
    BASE_DIR / "n8n_files" / "poc2" / "pdf",
    BASE_DIR / "n8n_files" / "pocs2" / "pdf",
)


def _safe_pdf_name(filename: str) -> str:
    safe_filename = Path(filename).name
    if safe_filename != filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    if Path(safe_filename).suffix.lower() != ".pdf":
        raise HTTPException(status_code=400, detail="Only .pdf files are allowed")
    return safe_filename


def _find_pdf_path(filename: str) -> Path:
    safe_filename = _safe_pdf_name(filename)
    for directory in PDF_DIRECTORIES:
        file_path = directory / safe_filename
        if file_path.is_file():
            return file_path

    raise HTTPException(status_code=404, detail="PDF file not found")


def _extract_pdf_range(source_path: Path, start_page: int, end_page: int) -> Path:
    if start_page < 1 or end_page < 1:
        raise HTTPException(status_code=400, detail="Pages must be >= 1")
    if start_page > end_page:
        raise HTTPException(status_code=400, detail="startPage must be <= endPage")

    with source_path.open("rb") as source_file:
        reader = PdfFileReader(source_file)
        page_count = len(reader.pages)

    if end_page > page_count:
        raise HTTPException(
            status_code=400,
            detail=f"endPage exceeds PDF page count ({page_count})",
        )

    output_path = source_path.with_name(f"{source_path.stem}_p{start_page}-{end_page}.pdf")

    try:
        pdf_copy(
            input=str(source_path),
            output=str(output_path),
            pages=[f"{start_page}-{end_page}"],
            yes_to_all=True,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail="Failed to extract PDF pages") from exc

    if not output_path.is_file():
        raise HTTPException(status_code=500, detail="Extracted PDF was not created")

    return output_path


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/pdf/exists/{filename}")
def pdf_exists(filename: str) -> dict[str, str | bool]:
    safe_filename = _safe_pdf_name(filename)

    try:
        file_path = _find_pdf_path(safe_filename)
    except HTTPException as exc:
        if exc.status_code == 404:
            return {"filename": safe_filename, "exists": False}
        raise

    return {
        "filename": safe_filename,
        "exists": True,
        "path": str(file_path.relative_to(BASE_DIR)),
    }


@app.get("/pdf/extract/{filename}/{startPage}/{endPage}")
def pdf_extract(
    filename: str,
    startPage: int,
    endPage: int,
) -> FileResponse:
    source_path = _find_pdf_path(filename)
    output_path = _extract_pdf_range(source_path, startPage, endPage)

    return FileResponse(
        path=output_path,
        media_type="application/pdf",
        filename=f"{source_path.stem}_p{startPage}-{endPage}.pdf",
    )
