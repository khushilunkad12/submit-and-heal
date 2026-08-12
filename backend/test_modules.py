import sys

print("Importing dotenv...")
import dotenv
dotenv.load_dotenv()
print("Loaded dotenv")

print("Importing pipeline...")
from graph.pipeline import healing_graph
print("Pipeline imported")

print("All done")
