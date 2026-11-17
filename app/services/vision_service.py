import base64, json
from pathlib import Path
from fastapi import HTTPException
from openai import OpenAI

from app.core.config import settings

PROMPT = """
Return a JSON object describing ONLY visible jewellery attributes: main_stone_shape, prong_count, band_style, setting_style, side_stones, description, uncertain_fields. Use null for unknown values. 
Do not infer diamond authenticity, carat, metal purity, price, or material from photos. 
uncertain_fields is an array of uncertain field names. 
This is a suggestion for human review, not a verified specification.
"""

def analyze(
    path
):
    if not settings.openai_api_key:
        raise HTTPException(
            503,
            "OPENAI_API_KEY not configured"
        )

    f = Path(path)

    mime = {
        ".jpg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp"
    }[f.suffix]

    url = f"data:{mime};base64,{base64.b64encode(f.read_bytes()).decode()}"

    client = OpenAI(api_key=settings.openai_api_key, timeout=45)

    try:
        response = client.chat.completions.create(
            model=settings.vision_model,
            response_format={
                "type": "json_object"
            },
            messages=[
                {
                    "role": "system", 
                    "content": PROMPT
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Describe visible product details"
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": url
                            }
                        }
                    ]
                }
            ]
        )

        return json.loads(response.choices[0].message.content or "{}")
    
    except Exception as e: 
        raise HTTPException(
            502,
            "Image analysis failed"
        ) from e
