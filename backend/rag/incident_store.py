import os
import json
import numpy as np
from supabase import create_client
from .embeddings import generate_embedding, create_incident_text
from dotenv import load_dotenv

load_dotenv()

supabase = None

def get_supabase():
    global supabase

    if supabase is not None:
        return supabase

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")

    if not url or not key:
        return None

    supabase = create_client(url, key)
    return supabase

async def store_incident(state: dict) -> bool:
    try:
        client = get_supabase()
        if not client:
            print("RAG memory skipped: Supabase env vars missing")
            return False

        embedding = [float(x) for x in generate_embedding(
            create_incident_text(
                state["error_description"],
                state["root_cause"],
                state["detected_stack"]
            )
        )]
        
        client.table("incidents").insert({
            "repo_url": state.get("repo_url", ""),
            "error_description": state.get("error_description", ""),
            "detected_stack": state.get("detected_stack", ""),
            "error_category": state.get("error_category", ""),
            "root_cause": state.get("root_cause", ""),
            "why_it_happened": state.get("why_it_happened", ""),
            "fix_summary": state.get("patch_summary", ""),
            "affected_files": state.get("affected_files", []),
            "confidence_percentage": state.get("confidence_percentage", 0),
            "verified": state.get("verified", False),
            "embedding": embedding
        }).execute()
        
        print(f"RAG: Stored incident - {state.get('error_category')} in {state.get('detected_stack')}")
        return True
        
    except Exception as e:
        print(f"Failed to store incident: {e}")
        return False

async def retrieve_similar_incidents(
    error_description: str,
    root_cause: str,
    detected_stack: str,
    limit: int = 3
) -> list[dict]:
    try:
        client = get_supabase()
        if not client:
            print("RAG memory skipped: Supabase env vars missing")
            return []

        text = create_incident_text(error_description, root_cause, detected_stack)
        query_embedding = np.array([float(x) for x in generate_embedding(text)])
        
        print(f"RAG: Fetching incidents from Supabase...")
        
        result = client.table("incidents").select(
            "id, error_description, detected_stack, error_category, "
            "root_cause, why_it_happened, fix_summary, "
            "affected_files, confidence_percentage, verified, embedding"
        ).execute()
        
        if not result.data:
            print(f"RAG: No incidents in database")
            return []
        
        print(f"RAG: Computing similarity against {len(result.data)} incidents...")
        
        scored = []
        for incident in result.data:
            emb = incident.get("embedding")
            if not emb:
                continue
            
            if isinstance(emb, str):
                emb = json.loads(emb)
            
            inc_array = np.array([float(x) for x in emb])
            
            dot = np.dot(query_embedding, inc_array)
            norm_q = np.linalg.norm(query_embedding)
            norm_i = np.linalg.norm(inc_array)
            
            similarity = float(dot / (norm_q * norm_i)) if norm_q and norm_i else 0.0
            
            incident_copy = {k: v for k, v in incident.items() if k != "embedding"}
            incident_copy["similarity"] = similarity
            scored.append(incident_copy)
            print(f"RAG: similarity={similarity:.3f} category={incident.get('error_category')}")
        
        scored.sort(key=lambda x: x["similarity"], reverse=True)
        filtered = [s for s in scored if s["similarity"] >= 0.3]
        
        print(f"RAG: Found {len(filtered)} incidents above threshold 0.3")
        return filtered[:limit]
        
    except Exception as e:
        print(f"Failed to retrieve incidents: {e}")
        import traceback
        traceback.print_exc()
        return []
