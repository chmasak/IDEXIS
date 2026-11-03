from io import BytesIO
import traceback

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError

from analysis import analyze_image


app = FastAPI(
    title="IDEXIS API",
    description="Identity Document Examination & Inspection System",
    version="1.0.0",
)

# Allow requests from the deployed frontend and local development environments.
ALLOWED_ORIGINS = [
    "https://idexis-frontend.onrender.com",
    "http://127.0.0.1:5500",
    "http://localhost:5500",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB

ALLOWED_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/bmp",
    "image/tiff",
}


def validate_image(contents: bytes, content_type: str):
    """Validate an uploaded image and return its metadata."""

    if content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Unsupported image format. Upload JPEG, PNG, WEBP, BMP, or TIFF.",
        )

    if not contents:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty.",
        )

    if len(contents) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Image exceeds the 10 MB upload limit.",
        )

    try:
        with Image.open(BytesIO(contents)) as image:
            image.verify()

        with Image.open(BytesIO(contents)) as image:
            width, height = image.size
            image_format = image.format

    except (
        UnidentifiedImageError,
        OSError,
        ValueError,
    ):
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is not a valid image.",
        )

    return width, height, image_format


@app.get("/")
def root():
    return {
        "system": "IDEXIS",
        "message": "IDEXIS backend is running",
        "status": "online",
    }


@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "service": "IDEXIS Analysis API",
    }


@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    contents = await file.read()

    width, height, image_format = validate_image(
        contents,
        file.content_type or "",
    )

    return {
        "status": "uploaded",
        "filename": file.filename,
        "format": image_format,
        "width": width,
        "height": height,
        "size_bytes": len(contents),
        "message": "Image received and validated successfully.",
    }


@app.post("/api/analyze")
async def analyze_uploaded_image(file: UploadFile = File(...)):
    contents = await file.read()

    validate_image(
        contents,
        file.content_type or "",
    )

    try:
        result = analyze_image(contents)
        return result

    except HTTPException:
        raise

    except Exception as exc:
        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=f"{type(exc).__name__}: {exc}",
        ) from exc