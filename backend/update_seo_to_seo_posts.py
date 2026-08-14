import os

files = ['mass_seo_bot.py', 'seo_blog_bot.py', 'theme_seo_bot.py', 'qa_seo_bot.py']

for file in files:
    if os.path.exists(file):
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Update collection
        content = content.replace('db.collection("theory_posts")', 'db.collection("seo_posts")')
        
        # Update URL
        content = content.replace('stock-trend-program.co.kr/theory/', 'stock-trend-program.co.kr/post/')
        content = content.replace('stock-trend-program.co.kr/blog/', 'stock-trend-program.co.kr/post/')
        
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {file}")
