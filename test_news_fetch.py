import sys
import os
import io

# Set stdout/stderr to utf-8 for Windows console
sys.stdout = io.TextIOWrapper(sys.stdout.detach(), encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.detach(), encoding='utf-8')

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from korea_data import get_naver_news

def test_news():
    print("Testing News Fetch for Samsung Electronics (005930)...")
    try:
        news = get_naver_news("005930.KS", "삼성전자")
        for i, n in enumerate(news):
            print(f"[{i+1}] {n['title']} ({n['date']})")
            # print(f"    Link: {n['link']}")
            print(f"    Desc: {n.get('description', '')[:100]}...")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_news()
