
import requests
from bs4 import BeautifulSoup

def analyze_main():
    url = "https://finance.naver.com/marketindex/"
    print(f"Fetching {url}...")
    res = requests.get(url)
    soup = BeautifulSoup(res.content, 'html.parser', from_encoding='cp949')
    
    # 1. Look for iframes
    print("\n--- IFRAMES ---")
    for iframe in soup.select("iframe"):
        print(f"Iframe ID: {iframe.get('id')}, Src: {iframe.get('src')}")
        
    # 2. Look for Scripts with "interest"
    print("\n--- SCRIPTS ---")
    for script in soup.select("script"):
        if script.get('src'):
            if "interest" in script['src']: print(f"Script Src: {script['src']}")
        elif script.string and "interest" in script.string:
            print(f"Found 'interest' in inline script: {script.string[:100]}...")

if __name__ == "__main__":
    analyze_main()
