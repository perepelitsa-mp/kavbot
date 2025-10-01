from sentence_transformers import SentenceTransformer
import numpy as np


class Embedder:
    def __init__(self, model_name: str = "intfloat/multilingual-e5-base"):
        """Initialize embedding model"""
        self.model = SentenceTransformer(model_name)
        self.dimension = 768

    def encode(self, text: str) -> np.ndarray:
        """Generate embedding for text"""
        # Add prefix for E5 models
        text = f"passage: {text}"
        embedding = self.model.encode(text, normalize_embeddings=True)
        return embedding