
import os
import google.generativeai as genai
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=env_path)

API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    print("No API Key found")
    exit(1)

genai.configure(api_key=API_KEY)

model_name = 'gemini-2.0-flash'
print(f"Testing model: {model_name}")

try:
    model = genai.GenerativeModel(model_name)
    response = model.generate_content("Say Hello")
    print("Success!")
    print(response.text)
except Exception as e:
    print(f"Error with {model_name}: {e}")
    
    print("Trying fallback to gemini-1.5-flash...")
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content("Say Hello")
        print("Success with gemini-1.5-flash!")
        print(response.text)
    except Exception as e2:
        print(f"Error with gemini-1.5-flash: {e2}")
        
    print("Trying fallback to gemini-pro...")
    try:
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content("Say Hello")
        print("Success with gemini-pro!")
        print(response.text)
    except Exception as e3:
        print(f"Error with gemini-pro: {e3}")
