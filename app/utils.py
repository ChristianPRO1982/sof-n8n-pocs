from __future__ import annotations

"""
Utility functions for PDF conversion using wkhtmltopdf.
"""

import subprocess
import os
import re
import tempfile
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

import httpx
from docling.document_converter import DocumentConverter


def convert_html_to_pdf(html: str) -> bytes:
    """
    Convert HTML content to PDF bytes using the wkhtmltopdf CLI.
    """
    process = subprocess.run(
        ["wkhtmltopdf", "-", "-"],
        input=html.encode("utf-8"),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )

    if process.returncode != 0:
        error_message = process.stderr.decode("utf-8", errors="ignore")
        raise RuntimeError(
            f"wkhtmltopdf failed with code {process.returncode}: {error_message}"
        )

    return process.stdout

#############################################
#############################################
#############################################

def _guess_suffix_from_url(url: str) -> str:
    """Guess a file suffix from URL path."""
    path = urlparse(url).path.lower()
    if path.endswith(".pdf"):
        return ".pdf"
    if path.endswith(".html") or path.endswith(".htm"):
        return ".html"
    return ""


def _guess_suffix_from_headers(content_type: str) -> str:
    """Guess a file suffix from Content-Type header."""
    ct = (content_type or "").lower()
    if "application/pdf" in ct:
        return ".pdf"
    if "text/html" in ct:
        return ".html"
    return ""


def _download_to_tmp(url: str, max_bytes: int, timeout_s: int) -> Path:
    """Download a URL to a temp file using streaming, enforcing a size limit."""
    timeout = httpx.Timeout(timeout_s, connect=10.0)
    headers = {"User-Agent": "Docling-Converter/1.0"}

    with httpx.Client(follow_redirects=True, timeout=timeout, headers=headers) as client:
        with client.stream("GET", url) as resp:
            resp.raise_for_status()

            content_type = resp.headers.get("content-type", "")
            suffix = _guess_suffix_from_headers(content_type) or _guess_suffix_from_url(
                url
            )

            fd, tmp_path = tempfile.mkstemp(prefix="docling_", suffix=suffix or ".bin")
            os.close(fd)
            tmp_file = Path(tmp_path)

            total = 0
            with tmp_file.open("wb") as f:
                for chunk in resp.iter_bytes(chunk_size=1024 * 256):
                    if not chunk:
                        continue
                    total += len(chunk)
                    if total > max_bytes:
                        raise RuntimeError(f"File too large (> {max_bytes} bytes).")
                    f.write(chunk)

            return tmp_file


def _convert_path_to_markdown(path: Path) -> str:
    """Convert a local file path using Docling and return Markdown."""
    converter = DocumentConverter()
    doc = converter.convert(str(path)).document
    return doc.export_to_markdown()


def convert_url_to_markdown(url: str, max_mb: int = 25, timeout_s: int = 40) -> str:
    """Download a URL to temp file, convert with Docling, and return cleaned Markdown."""
    max_bytes = max_mb * 1024 * 1024
    tmp_path: Optional[Path] = None

    try:
        tmp_path = _download_to_tmp(url=url, max_bytes=max_bytes, timeout_s=timeout_s)
        markdown = _convert_path_to_markdown(tmp_path)
        markdown = re.sub(r"\n{3,}", "\n\n", markdown).strip()
        return markdown
    except httpx.HTTPError as exc:
        raise RuntimeError(f"Download failed: {exc}") from exc
    except Exception as exc:
        raise RuntimeError(f"Docling conversion failed: {exc}") from exc
    finally:
        if tmp_path is not None and tmp_path.exists():
            tmp_path.unlink(missing_ok=True)
