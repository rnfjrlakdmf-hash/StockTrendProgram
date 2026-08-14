import glob

for filepath in glob.glob('c:/Users/rnfjr/StockTrendProgram/frontend/src/**/*.tsx', recursive=True):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'post.content.replace' in content:
        content = content.replace('post.content.replace', "(post?.content || '').replace")
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
