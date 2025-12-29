"""Check if API key is loaded"""
from dotenv import load_dotenv
import os

load_dotenv()
key = os.getenv('OPENROUTER_API_KEY')

if key:
    print(f"[OK] API Key is loaded")
    print(f"     Length: {len(key)}")
    print(f"     Starts with: {key[:15]}...")
else:
    print("[FAIL] API Key is NOT loaded")

