import sys
import dotenv
dotenv.load_dotenv()
print("Importing supabase...")
from supabase import create_client
print("Importing sentence_transformers...")
from sentence_transformers import SentenceTransformer
print("Done!")
