"""FastAPI entrypoint exposing Docling conversion endpoints with JWT auth."""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Literal, Optional

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.responses import PlainTextResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from starlette.status import (
    HTTP_400_BAD_REQUEST,
    HTTP_401_UNAUTHORIZED,
    HTTP_413_REQUEST_ENTITY_TOO_LARGE,
)
from dotenv import load_dotenv

from app.utils import DoclingService

load_dotenv()

app = FastAPI(title="Docling FastAPI (POC)", version="0.2.0")
docling_service = DoclingService()

MaxBytes = 50 * 1024 * 1024
AllowedFormats = Literal["markdown", "text", "html", "json"]

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _env(name: str, default: Optional[str] = None) -> str:
    """Read required environment variable, optionally with default."""
    value = os.getenv(name, default)
    if value is None or value == "":
        raise RuntimeError(f"Missing environment variable: {name}")
    return value


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return pwd_context.verify(plain_password, password_hash)


def create_access_token(subject: str) -> str:
    """Create a signed JWT access token."""
    secret = _env("API_JWT_SECRET")
    algorithm = _env("API_JWT_ALGORITHM", "HS256")
    expire_minutes = int(_env("API_JWT_EXPIRE_MINUTES", "60"))

    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=expire_minutes)).timestamp()),
    }
    return jwt.encode(payload, secret, algorithm=algorithm)


def authenticate_user(username: str, password: str) -> bool:
    """Validate provided credentials against env-stored values."""
    expected_user = _env("API_AUTH_USERNAME")
    expected_hash = _env("API_AUTH_PASSWORD_HASH")
    if username != expected_user:
        return False
    return verify_password(password, expected_hash)


def get_current_user(token: str = Depends(oauth2_scheme)) -> str:
    """Decode JWT and return the subject (username)."""
    secret = _env("API_JWT_SECRET")
    algorithm = _env("API_JWT_ALGORITHM", "HS256")

    try:
        payload = jwt.decode(token, secret, algorithms=[algorithm])
        subject = payload.get("sub")
        if not subject:
            raise HTTPException(
                status_code=HTTP_401_UNAUTHORIZED,
                detail="Invalid token (missing subject)",
            )
        return str(subject)
    except JWTError as exc:
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc


@app.get("/health", response_class=PlainTextResponse)
def health() -> str:
    """Simple healthcheck endpoint."""
    return "ok"


@app.post("/auth/token")
def login(form_data: OAuth2PasswordRequestForm = Depends()) -> dict:
    """Exchange username/password for a JWT access token."""
    if not authenticate_user(form_data.username, form_data.password):
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    token = create_access_token(subject=form_data.username)
    return {"access_token": token, "token_type": "bearer"}


@app.post("/convert", response_class=PlainTextResponse)
async def convert(
    file: UploadFile = File(...),
    output_format: AllowedFormats = "markdown",
    _: str = Depends(get_current_user),
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
