
import os
import sys
from dotenv import load_dotenv

# Ensure backend directory is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load env manually to be sure
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
load_dotenv(env_path)

api_key = os.getenv("GEMINI_API_KEY")
print(f"Loaded Key: {api_key[:5]}... (Length: {len(api_key) if api_key else 0})")

if not api_key:
    print("FATAL: No API Key found in .env")
    sys.exit(1)

# Import function
try:
    from ai_analysis import generate_market_briefing
except ImportError as e:
    print(f"Import Error: {e}")
    sys.exit(1)

# Dummy Data
mock_market = {
    "indices": [
        {"label": "S&P500", "change": "+1.2%"},
        {"label": "KOSPI", "change": "-0.5%"}
    ]
}
mock_news = [
    {"source": "Test", "title": "AI Market is booming", "publisher": "CNBC", "published": "10:00"}
]
tech_score = 75

print("\n--- Attempting to Generate Briefing ---")
try:
    result = generate_market_briefing(mock_market, mock_news, tech_score)
    print("Result Title:", result.get("title"))
    print("Result Summary:", result.get("summary")[:50] + "...")
    
    if "API 연결 대기중" in result.get("title", ""):
        print("\n[FAILURE] Function returned Mock Data (API Key not recognized or Error occurred)")
    else:
        print("\n[SUCCESS] Real AI Briefing Generated!")
except Exception as e:
    print(f"\n[ERROR] Function crashed: {e}")
