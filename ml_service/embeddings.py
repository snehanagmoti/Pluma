import os
import logging

try:
    from google import genai
except ImportError:
    genai = None

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if genai and GEMINI_API_KEY and GEMINI_API_KEY != "your_gemini_api_key_here":
    client = genai.Client(api_key=GEMINI_API_KEY)
    has_api_key = True
else:
    has_api_key = False
    logger.warning("No Gemini API Key found. Semantic embeddings disabled.")

def get_embedding(text: str) -> list[float]:
    """Get 768-dimensional embedding from Gemini."""
    if not has_api_key or not text.strip():
        return [0.0] * 768  # Return zero vector if no key or empty text
    
    try:
        result = client.models.embed_content(
            model="gemini-embedding-001",
            contents=text,
            config={"output_dimensionality": 768}
        )
        return list(result.embeddings[0].values)
    except Exception as e:
        logger.error(f"Embedding error: {e}")
        return [0.0] * 768
