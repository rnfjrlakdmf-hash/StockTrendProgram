
import os
import google.generativeai as genai
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=env_path)

API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=API_KEY)

model_name = 'gemini-2.0-flash-lite'
print(f"Testing model: {model_name}")

try:
    model = genai.GenerativeModel(model_name)
    response = model.generate_content("Say Hello")
    print("Success!")
    print(response.text)
except Exception as e:
    print(f"Error with {model_name}: {e}")
