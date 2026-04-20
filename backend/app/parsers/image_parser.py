"""Flattened image parser — multimodal LLM (Gemini) entry point.

Two modes:
  * With GOOGLE_API_KEY set → real call to Gemini via the SOURCE_ASSET_PARSE
    prompt-assembly use case; returns structured text / visual LU candidates.
  * Without the key → structural metadata + a warning so the downstream pipeline
    still succeeds end-to-end.
"""

from __future__ import annotations

import asyncio
import io
import json
import time

from app.config import get_settings
from app.logging import get_logger
from app.models.enums import LUType, SemanticRole
from app.parsers.base import (
    LUCandidate,
    ParsedResult,
    ParserError,
    SourceLocation,
)
from app.prompt_assembly import PromptContext, UseCase, assemble

log = get_logger(__name__)

_ROLE_FROM_STRING = {role.value: role for role in SemanticRole}


def parse_flattened_image(data: bytes, *, mime_type: str | None = None) -> ParsedResult:
    try:
        from PIL import Image
    except ImportError as e:
        raise ParserError(
            "Pillow is not installed. Run `pip install -e .[parsing]`."
        ) from e

    start = time.monotonic()
    try:
        with Image.open(io.BytesIO(data)) as img:
            width, height = img.size
            fmt = img.format or "unknown"
    except Exception as e:  # noqa: BLE001
        raise ParserError(f"failed to open image: {e}") from e

    settings = get_settings()
    if not settings.google_api_key:
        duration_ms = int((time.monotonic() - start) * 1000)
        return ParsedResult(
            parse_method="multimodal_llm",
            parse_model_used="gemini (not configured)",
            parse_confidence=None,
            parse_warnings=[
                "GOOGLE_API_KEY not set — structural metadata only. "
                "Set the key to enable text / visual LU extraction."
            ],
            structural_metadata={
                "dimensions": {"width": width, "height": height},
                "format": fmt,
                "mime": mime_type,
            },
            lus=[],
            parse_duration_ms=duration_ms,
        )

    # Real path: assemble a SOURCE_ASSET_PARSE prompt and call Gemini inline.
    ctx = PromptContext(
        use_case=UseCase.SOURCE_ASSET_PARSE,
        market="*",
        source_content={
            "mime_type": mime_type,
            "dimensions": {"width": width, "height": height},
        },
    )
    prompt, trace = assemble(ctx)

    raw_json: str | None
    try:
        raw_json = _call_gemini_sync(prompt, data)
    except Exception as e:  # noqa: BLE001
        log.warning("image_parser.gemini_failed", error=str(e))
        raw_json = None

    warnings: list[str] = []
    lus: list[LUCandidate] = []

    if raw_json is None:
        warnings.append("Gemini call failed or returned no JSON; empty LU set.")
    else:
        try:
            payload = json.loads(raw_json)
        except json.JSONDecodeError:
            warnings.append("Gemini JSON could not be parsed; empty LU set.")
            payload = {}
        for tu in payload.get("text_units", []) or []:
            bbox = _coerce_bbox((tu.get("location") or {}).get("bbox"))
            lus.append(
                LUCandidate(
                    lu_type=LUType.text,
                    source_content={
                        "text": tu.get("content") or "",
                        "language": tu.get("language") or "en",
                        "font_info": tu.get("font_info"),
                    },
                    source_location=SourceLocation(
                        type="image_region",
                        bbox=bbox,
                        font_info=tu.get("font_info"),
                    ),
                    semantic_role=_ROLE_FROM_STRING.get(tu.get("role")),
                    parser_confidence=float(tu.get("confidence", 0.8)),
                    detection_metadata={"source": "gemini"},
                )
            )
        for vu in payload.get("visual_units", []) or []:
            bbox = _coerce_bbox((vu.get("location") or {}).get("bbox"))
            lus.append(
                LUCandidate(
                    lu_type=LUType.visual,
                    source_content={
                        "description": vu.get("description") or "",
                        "element_type": vu.get("element_type") or "prop",
                        "detected_attributes": vu.get("detected_attributes") or {},
                    },
                    source_location=SourceLocation(type="image_region", bbox=bbox),
                    semantic_role=_ROLE_FROM_STRING.get(vu.get("element_type")),
                    parser_confidence=float(vu.get("confidence", 0.8)),
                    detection_metadata={"source": "gemini"},
                )
            )
        for w in payload.get("parse_warnings", []) or []:
            warnings.append(str(w))

    duration_ms = int((time.monotonic() - start) * 1000)
    return ParsedResult(
        parse_method="multimodal_llm",
        parse_model_used="gemini-2.5-pro",
        parse_confidence=0.85 if lus else None,
        parse_warnings=warnings,
        structural_metadata={
            "dimensions": {"width": width, "height": height},
            "format": fmt,
            "mime": mime_type,
            "assembly_trace_token_estimate": trace.token_estimate,
        },
        lus=lus,
        parse_duration_ms=duration_ms,
    )


def _coerce_bbox(value) -> tuple[int, int, int, int] | None:
    if not value:
        return None
    try:
        x, y, w, h = [int(round(float(v))) for v in value[:4]]
        return (x, y, w, h)
    except (TypeError, ValueError):
        return None


def _call_gemini_sync(prompt, data: bytes) -> str | None:
    from google import genai  # type: ignore
    from google.genai.types import GenerateContentConfig, Part  # type: ignore

    settings = get_settings()
    client = genai.Client(api_key=settings.google_api_key)
    resp = client.models.generate_content(
        model="gemini-2.5-pro",
        contents=[
            prompt.user_prompt,
            Part.from_bytes(data=data, mime_type="image/png"),
        ],
        config=GenerateContentConfig(
            temperature=0.0,
            system_instruction=prompt.system_prompt,
            response_mime_type="application/json",
        ),
    )
    return resp.text or None
