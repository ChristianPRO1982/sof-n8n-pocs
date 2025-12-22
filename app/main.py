"""
FastAPI entrypoint exposing a healthcheck and an endpoint
to convert HTML content into a PDF file using wkhtmltopdf.
"""

from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel, HttpUrl, Field

from .utils import convert_html_to_pdf, convert_url_to_markdown


class HtmlPayload(BaseModel):
    """
    Request body model for HTML to PDF conversion.
    """

    html: str


app = FastAPI()


@app.get("/health")
def healthcheck():
    return {"status": "ok"}


@app.post("/html-to-pdf")
def html_to_pdf(payload: HtmlPayload) -> Response:
    """
    Convert provided HTML content to a PDF binary response.
    """
    try:
        pdf_bytes = convert_html_to_pdf(payload.html)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename=\"document.pdf\"'},
    )

@app.post("/docling/url-to-markdown")
def docling_url_to_markdown(payload: DoclingUrlPayload) -> dict:
    """
    Convert a remote URL (PDF/HTML) into Markdown using Docling.
    """
    try:
        markdown = convert_url_to_markdown(
            url=str(payload.url),
            max_mb=payload.max_mb,
            timeout_s=payload.timeout_s,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {"url": str(payload.url), "markdown": markdown}