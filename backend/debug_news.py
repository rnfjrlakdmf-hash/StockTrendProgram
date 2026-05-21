
from GoogleNews import GoogleNews
import json

def debug_news(query):
    print(f"Searching for: {query}")
    googlenews = GoogleNews(lang='ko', region='KR', period='1d')
    googlenews.search(query)
    results = googlenews.results()
    
    print(f"Found {len(results)} results.")
    
    if len(results) > 0:
        print("First valid result sample:")
        print(json.dumps(results[0], indent=2, ensure_ascii=False))
        
    for i, res in enumerate(results[:5]):
        print(f"[{i}] Link: {res.get('link')}")

if __name__ == "__main__":
    debug_news("삼성전자")
