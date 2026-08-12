import asyncio
from dotenv import load_dotenv
load_dotenv()
from rag.incident_store import retrieve_similar_incidents

async def test():
    results = await retrieve_similar_incidents('error', '', 'Unknown')
    print('Final results:', len(results))
    for r in results:
        print(f"similarity={r.get('similarity'):.3f} category={r.get('error_category')}")

asyncio.run(test())