
import os
import sys
from ai_analysis import analyze_theme
import json

# Adjust path to import modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_theme_analysis():
    keyword = "우주항공" # The theme from the screenshot
    print(f"Analyzing theme: {keyword}...")
    
    result = analyze_theme(keyword)
    
    print("--- Analysis Result ---")
    print(json.dumps(result, indent=2, ensure_ascii=False))
    
    if not result.get("followers"):
        print("\n[ISSUE] 'followers' list is empty or missing!")
    else:
        print(f"\n[SUCCESS] Found {len(result['followers'])} followers.")

if __name__ == "__main__":
    test_theme_analysis()
