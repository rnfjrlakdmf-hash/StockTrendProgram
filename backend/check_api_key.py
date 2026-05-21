
import os
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), '.env')
print(f"Checking .env at: {env_path}")
if os.path.exists(env_path):
    print(".env file exists.")
else:
    print(".env file DOES NOT exist.")

load_dotenv(dotenv_path=env_path)
api_key = os.getenv("GEMINI_API_KEY")

if api_key:
    print("GEMINI_API_KEY is found.")
    print(f"Key length: {len(api_key)}")
    if api_key.startswith("AI"):
        print("Key format looks correct (starts with AI).")
        print(f"Key Preview: {api_key[:4]}...{api_key[-4:]}")
    else:
        print("Key format might be incorrect.")
else:
    print("GEMINI_API_KEY is NOT found.")
