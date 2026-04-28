import os
import google.generativeai as genai
from dotenv import load_dotenv

# Path to .env in backend directory
backend_dir = os.path.join(os.getcwd(), 'backend')
env_path = os.path.join(backend_dir, '.env')
load_dotenv(dotenv_path=env_path)

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    print(f"API KEY NOT FOUND in {env_path}")
else:
    genai.configure(api_key=API_KEY)
    print("Listing Gemini models (1.5, 2.0, 2.1):")
    try:
        for m in genai.list_models():
            name = m.name.lower()
            if 'gemini' in name and ('1.5' in name or '2.0' in name or '2.1' in name):
                if 'generateContent' in m.supported_generation_methods:
                    print(f"Model: {m.name}, Display Name: {m.display_name}")
    except Exception as e:
        print(f"Error: {e}")
