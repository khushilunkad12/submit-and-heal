import numpy as np

model = None

def get_model():
    global model
    if model is None:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer('all-MiniLM-L6-v2')
    return model

def generate_embedding(text: str) -> list[float]:
    embedding = get_model().encode(text, normalize_embeddings=True)
    return embedding.tolist()

def create_incident_text(error_description: str, 
                          root_cause: str, 
                          detected_stack: str) -> str:
    return f"Stack: {detected_stack}. Error: {error_description}. Root cause: {root_cause}"
