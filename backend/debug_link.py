
import urllib.parse

def clean_link(link):
    print(f"Original: {link}")
    # Remove google tracking params
    if '&ved=' in link:
        link = link.split('&ved=')[0]
    
    # Decode URL (fix %3F -> ?)
    decoded = urllib.parse.unquote(link)
    print(f"Cleaned:  {decoded}")
    return decoded

links = [
    "https://zdnet.co.kr/view/%3Fno%3D20260105195401&ved=2ahUKEwiIgOvE7_iRAxUska8BHfj2OrEQxfQBegQIBBAC&usg=AOvVaw1aLJGk2DrXtb7b6goYWAfo",
    "https://news.samsung.com/kr/%25EC%2582%25BC%25EC%2584%25B1%25EC%25A0%2584%25EC%259E%2590-%25EA%25B0%25A4%25EB%259F%25AD%25EC%258B%259C-%25EB%25B6%25816-%25EC%258B%259C%25EB%25A6%25AC%25EC%25A6%2588-%25EA%25B3%25B5%25EA%25B0%259C&ved=..."
]

for l in links:
    clean_link(l)
