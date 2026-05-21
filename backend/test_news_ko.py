from GoogleNews import GoogleNews
import sys
import io

# Set encoding for Windows console
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def test_news(query):
    print(f"Testing query: {query}")
    try:
        googlenews = GoogleNews(lang='ko', region='KR', period='1d')
        # Try search instead of get_news
        googlenews.search(query)
        results = googlenews.results()
        print(f"Found {len(results)} results.")
        for res in results[:2]:
            print(f"Title: {res.get('title')}")
            print(f"Link: {res.get('link')}")
    except Exception as e:
        print(f"Error: {e}")

test_news("애플")
test_news("삼성전자")
