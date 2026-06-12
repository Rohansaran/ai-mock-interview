from dotenv import load_dotenv
import os

loaded = load_dotenv()

print("Loaded:", loaded)
print("Key:", os.getenv("OPENROUTER_API_KEY"))