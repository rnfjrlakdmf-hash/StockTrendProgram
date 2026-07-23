import bs4

def parse_tables(filename):
    with open(filename, 'r', encoding='euc-kr', errors='ignore') as f:
        soup = bs4.BeautifulSoup(f.read(), 'html.parser')
    
    for table in soup.find_all('table'):
        text = table.text.replace('\n', '')
        if '청약기일' in text or '청약일' in text or '희망공모가' in text:
            print("--- FOUND TABLE ---")
            for row in table.find_all('tr'):
                print("ROW:", [col.text.strip() for col in row.find_all(['td', 'th'])])

parse_tables('full_dart_doc.xml')
