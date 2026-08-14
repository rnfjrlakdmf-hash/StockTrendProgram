import os

files = ['mass_seo_bot.py', 'seo_blog_bot.py', 'theme_seo_bot.py']

for file in files:
    if os.path.exists(file):
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Update collection
        content = content.replace('db.collection("blog_posts")', 'db.collection("theory_posts")')
        
        # Update URL
        content = content.replace('stock-trend-program.co.kr/blog/', 'stock-trend-program.co.kr/theory/')
        
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {file}")
