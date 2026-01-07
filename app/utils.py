"""Docling conversion utilities (POC-grade, production-friendly structure)."""

from __future__ import annotations

import json
import os
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Literal, Optional

from docling.document_converter import DocumentConverter


ExportFormat = Literal["markdown", "text", "html", "json"]


@dataclass(frozen=True)
class ConversionConfig:
    """Configuration for Docling conversions."""

    max_file_size_bytes: int = 50 * 1024 * 1024
    max_num_pages: int = 10_000


class DoclingService:
    """Thin service layer around Docling's DocumentConverter."""

    def __init__(self, config: Optional[ConversionConfig] = None) -> None:
        self._config = config or ConversionConfig()
        self._converter = DocumentConverter()

    def convert_file(self, file_path: Path, output_format: ExportFormat) -> str:
        """Convert a file to the requested output format using Docling."""
        result = self._converter.convert(
            source=file_path,
            raises_on_error=True,
            max_file_size=self._config.max_file_size_bytes,
            max_num_pages=self._config.max_num_pages,
        )

        doc = result.document

        if output_format == "markdown":
            return doc.export_to_markdown()
        if output_format == "text":
            return doc.export_to_text()
        if output_format == "html":
            return doc.export_to_html()
        if output_format == "json":
            return json.dumps(doc.export_to_dict(), ensure_ascii=False)

        raise ValueError(f"Unsupported output_format: {output_format}")

    def save_upload_to_tempfile(self, filename: str, content: bytes) -> Path:
        """Persist an uploaded file to a temp path and return the path."""
        safe_name = Path(filename).name or "upload.bin"
        suffix = Path(safe_name).suffix

        tmp_dir = Path(os.getenv("DOCLING_TMP_DIR", tempfile.gettempdir()))
        tmp_dir.mkdir(parents=True, exist_ok=True)

        fd, tmp_path = tempfile.mkstemp(prefix="docling_", suffix=suffix, dir=str(tmp_dir))
        os.close(fd)

        path = Path(tmp_path)
        path.write_bytes(content)
        return path
