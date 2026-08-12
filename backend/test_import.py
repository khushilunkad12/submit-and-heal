print("Importing supabase...")
from supabase import create_client
print("Supabase imported!")

print("Importing sentence-transformers...")
from sentence_transformers import SentenceTransformer
print("SentenceTransformer imported!")

print("Initializing model...")
model = SentenceTransformer('all-MiniLM-L6-v2')
print("Model initialized!")
