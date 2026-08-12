import os
import dotenv

print("Loading dotenv...")
dotenv.load_dotenv()
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

print("Importing supabase...")
from supabase import create_client

print(f"Calling create_client for {supabase_url}...")
try:
    client = create_client(supabase_url, supabase_key)
    print("create_client finished successfully!")
except Exception as e:
    print("Exception:", e)
