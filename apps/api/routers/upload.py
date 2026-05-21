"""
Upload router for DXF and image file processing.

Exposes endpoints to upload DXF files or images and extract geometric shapes
using the DataProcessor from processor.py.
"""
import os
import sys
import tempfile
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
from dependencies.auth import get_current_user_clerk_id

# Ensure processor is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic models
# ─────────────────────────────────────────────────────────────────────────────

class ExtractedPart(BaseModel):
    """Represents an extracted geometric shape from a file."""
    min_x: float
    min_y: float
    max_x: float
    max_y: float
    width: float
    height: float
    area: float
    label: str = ""
    description: str = ""


class DXFUploadResponse(BaseModel):
    """Response from DXF upload endpoint."""
    success: bool
    message: str
    parts_count: int
    parts: List[ExtractedPart] = []
    unit: str = "unknown"


class ImageUploadResponse(BaseModel):
    """Response from image upload endpoint."""
    success: bool
    message: str
    part: Optional[ExtractedPart] = None


# ─────────────────────────────────────────────────────────────────────────────
# POST /upload/dxf — DXF file upload and processing
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/upload/dxf",
    response_model=DXFUploadResponse,
    summary="Upload and process a DXF file",
    description="Accept a DXF file, extract closed geometries (polygons, circles) and return their bounding boxes and areas.",
)
async def upload_dxf(
    file: UploadFile = File(...),
    clerk_id: str = Depends(get_current_user_clerk_id),
) -> DXFUploadResponse:
    """
    Upload a DXF file and extract cuttable geometries (closed polylines, circles).

    Returns:
        DXFUploadResponse with extracted parts, each including dimensions and area.

    Raises:
        HTTPException 400: Invalid file format or parsing error
        HTTPException 401: Unauthorized (missing/invalid token)
        HTTPException 500: Server error
    """
    # Validate file type
    if not file.filename or not file.filename.lower().endswith('.dxf'):
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. Please upload a DXF file (.dxf).",
        )

    try:
        # Save uploaded file to temp location
        with tempfile.NamedTemporaryFile(suffix=".dxf", delete=False) as tmp:
            contents = await file.read()
            tmp.write(contents)
            tmp_path = tmp.name

        try:
            # Import and use processor
            from processor import DataProcessor

            # Parse DXF file — returns list of (Polygon, label) tuples
            polygons_with_labels = DataProcessor.parse_dxf(tmp_path)

            # Detect unit from DXF header
            unit = DataProcessor.get_dxf_unit(tmp_path)

            if not polygons_with_labels:
                return DXFUploadResponse(
                    success=False,
                    message="No cuttable geometries found in DXF file.",
                    parts_count=0,
                    parts=[],
                    unit=unit,
                )

            # Extract bounding box and area for each polygon
            parts = []
            for poly, label in polygons_with_labels:
                bounds = poly.bounds  # (minx, miny, maxx, maxy)
                width = bounds[2] - bounds[0]
                height = bounds[3] - bounds[1]
                area = poly.area

                parts.append(
                    ExtractedPart(
                        min_x=float(bounds[0]),
                        min_y=float(bounds[1]),
                        max_x=float(bounds[2]),
                        max_y=float(bounds[3]),
                        width=float(width),
                        height=float(height),
                        area=float(area),
                        label=label,
                        description=f"Layer: {label or '0'} — {area:.1f} mm²",
                    )
                )

            return DXFUploadResponse(
                success=True,
                message=f"Successfully extracted {len(parts)} geometries from DXF file.",
                parts_count=len(parts),
                parts=parts,
                unit=unit,
            )

        finally:
            # Clean up temp file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    except ImportError as e:
        raise HTTPException(
            status_code=500,
            detail=f"DXF processing library not available: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to process DXF file: {str(e)}",
        )


# ─────────────────────────────────────────────────────────────────────────────
# POST /upload/image — Image file upload and contour extraction
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/upload/image",
    response_model=ImageUploadResponse,
    summary="Upload and process an image file",
    description="Accept an image file (PNG, JPG, etc.), extract the main contour, and return its dimensions.",
)
async def upload_image(
    file: UploadFile = File(...),
    calibration_mm: float = 100.0,
    clerk_id: str = Depends(get_current_user_clerk_id),
) -> ImageUploadResponse:
    """
    Upload an image file and extract the main contour/shape.

    The image is processed using edge detection and contour extraction.
    The largest contour is scaled based on the calibration_mm parameter
    (default 100mm = the width of the detected shape).

    Args:
        file: Image file (PNG, JPG, BMP, etc.)
        calibration_mm: Width in mm that the detected shape represents (for scaling)

    Returns:
        ImageUploadResponse with extracted part dimensions and area.

    Raises:
        HTTPException 400: Invalid file format or no contour detected
        HTTPException 401: Unauthorized (missing/invalid token)
        HTTPException 500: Server error
    """
    # Validate file type
    allowed_extensions = {'.png', '.jpg', '.jpeg', '.bmp', '.gif', '.tiff'}
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="File name is missing.",
        )

    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image format. Allowed formats: {', '.join(allowed_extensions)}.",
        )

    try:
        # Save uploaded file to temp location
        with tempfile.NamedTemporaryFile(suffix=file_ext, delete=False) as tmp:
            contents = await file.read()
            tmp.write(contents)
            tmp_path = tmp.name

        try:
            # Import and use processor
            from processor import DataProcessor

            # Parse image and extract contour
            polygon = DataProcessor.parse_image(tmp_path, calibration_mm=calibration_mm)

            if polygon is None:
                raise HTTPException(
                    status_code=400,
                    detail="No valid contour detected in image. Please ensure the image shows a clear shape.",
                )

            # Extract bounding box and area
            bounds = polygon.bounds  # (minx, miny, maxx, maxy)
            width = bounds[2] - bounds[0]
            height = bounds[3] - bounds[1]
            area = polygon.area

            part = ExtractedPart(
                min_x=float(bounds[0]),
                min_y=float(bounds[1]),
                max_x=float(bounds[2]),
                max_y=float(bounds[3]),
                width=float(width),
                height=float(height),
                area=float(area),
                description=f"Contour extracted from image with area {area:.2f} mm²",
            )

            return ImageUploadResponse(
                success=True,
                message="Successfully extracted contour from image.",
                part=part,
            )

        finally:
            # Clean up temp file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    except ImportError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Image processing library not available: {str(e)}",
        )
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to process image file: {str(e)}",
        )
