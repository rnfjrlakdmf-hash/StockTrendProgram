from ai_analysis import analyze_theme
import json

def test_theme():
    print("Testing analyze_theme with keyword '비만치료제'...")
    try:
        result = analyze_theme("비만치료제")
        
        print("\n--- Leaders ---")
        for stock in result.get("leaders", []):
            print(f"- {stock['name']} ({stock['symbol']})")
            
        print("\n--- Followers ---")
        followers = result.get("followers", [])
        if not followers:
            print("[FAIL] No followers returned.")
        else:
            for stock in followers:
                print(f"- {stock['name']} ({stock['symbol']})")

        if followers:
            print("\n[SUCCESS] Followers returned successfully.")
        else:
            print("\n[FAIL] Followers list is empty.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_theme()
