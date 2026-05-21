
import requests
from bs4 import BeautifulSoup

def check_code(code, type_url="worldDaily"):
    base = f"https://finance.naver.com/marketindex/{type_url}.naver?marketindexCd={code}"
    print(f"\nChecking {code} at {base}")
    try:
        res = requests.get(base)
        soup = BeautifulSoup(res.content, 'html.parser')
        
        # Check title
        h2 = soup.select_one("h2.h_marketindex")
        if not h2: 
            # Try h_sub for interest
            h2 = soup.select_one("h2.h_sub")
            
        name = h2.text.strip() if h2 else "Unknown"
        
        # Check value
        # <div class="today"> <p class="no_today">
        val_tag = soup.select_one(".no_today .blind")
        val = val_tag.text.strip() if val_tag else "NoVal"
        
        print(f"Found: {name} = {val}")
        return val != "NoVal"
    except Exception as e:
        print(e)
        return False

if __name__ == "__main__":
    # Interest
    check_code("IRr_CD91", "interestDetail")
    check_code("IRr_GOVT03Y", "interestDetail")
    
    # Material (WorldDaily)
    check_code("LME_OP_CU", "materialDetail") # Copper?
    check_code("CMDT_C", "materialDetail") # Corn?
    
    # Try different URL for material
    check_code("LME_OP_CU", "worldDaily")
    check_code("CMDT_C", "worldDaily")
