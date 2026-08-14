import requests, json
res = requests.get('https://stock-trend-program.co.kr/api/blog/posts?page=1&limit=10')
data = res.json()
with open('blog_titles.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join([p['title'] for p in data.get('posts', [])]))
