from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import pandas as pd
import time
import io
import sys

def scrape_kind_universal(keyword="보호예수"):
    print(f"[*] Starting Selenium Scraper for Keyword: {keyword}...")
    
    # Setup Chrome Options
    chrome_options = Options()
    chrome_options.add_argument("--headless") # Run headless
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
    
    # Initialize Driver
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    
    try:
        # Navigate to Main Page first
        url = "https://kind.krx.co.kr/main.do?method=loadInitPage&scrnmode=1"
        print(f"    -> Navigating to Main Page: {url}")
        driver.get(url)
        time.sleep(3)
        
        # Handle Alerts
        try:
            from selenium.common.exceptions import UnexpectedAlertPresentException, NoAlertPresentException
            alert = driver.switch_to.alert
            print(f"    -> Alert accepted: {alert.text}")
            alert.accept()
            time.sleep(2)
        except: pass
            
        print(f"    -> Page Title: {driver.title}")
        
        # Open Sitemap First
        try:
            print("    -> Opening Sitemap...")
            sitemap_btn = driver.find_element(By.CSS_SELECTOR, ".btn.sitemap.open")
            sitemap_btn.click()
            time.sleep(2)
        except Exception as e:
            print(f"    -> Failed to click Sitemap button: {e}")
            # Try JS
            print("    -> Trying JS to show sitemap...")
            driver.execute_script("$('.sitemap').show();")
            time.sleep(2)

        # Click "상세검색" (Detailed Search)
        try:
            print("    -> Clicking '상세검색' link via XPath...")
            # Try XPath by href content
            link = driver.find_element(By.XPATH, "//a[contains(@href, 'searchDetailsMain')]")
            
            # Ensure it's visible (if inside sitemap)
            if not link.is_displayed():
                print("    -> Link found but not visible. Trying JS click...")
                driver.execute_script("arguments[0].click();", link)
            else:
                link.click()
                
            time.sleep(5)
            print(f"    -> Page Title after click: {driver.title}")
            print(f"    -> Current URL: {driver.current_url}")
        except Exception as e:
            print(f"    -> Failed to click '상세검색' via XPath: {e}")
            # Fallback: check if we are already there?
        
        # Save Page Source
        with open("debug_kind_source.html", "w", encoding="utf-8") as f:
            f.write(driver.page_source)

        # Find Report Name Input (reportNm)
        target_input = None
        
        # Method 1: Heuristic Visible Input Search
        print("    -> Checking all visible text inputs...")
        all_inputs = driver.find_elements(By.TAG_NAME, "input")
        for inp in all_inputs:
            try:
                if inp.is_displayed() and inp.get_attribute("type") == "text":
                        i_name = inp.get_attribute('name')
                        i_id = inp.get_attribute('id')
                        # Heuristic: if ID contains 'report' or 'Name'
                        if i_name and ('report' in str(i_name).lower() or 'corpname' in str(i_name).lower()): # reportNm is standard
                            target_input = inp
                            print(f"    -> Selected input by name: {i_name}")
                            break
                        if i_id and ('report' in str(i_id).lower()):
                            target_input = inp
                            print(f"    -> Selected input by ID: {i_id}")
                            break
            except: pass
        
        if not target_input:
             print("    -> Could not find input by heuristic. Trying 'reportNm' explicitly...")
             try:
                 target_input = driver.find_element(By.NAME, "reportNm")
             except: pass

        if target_input:
            try:
                print(f"    -> Target Input Selected: ID={target_input.get_attribute('id')}")
                target_input.clear()
                target_input.send_keys(keyword)
            except Exception as e:
                print(f"    -> Input Interaction Failed: {e}")
            
            # Submit Search
            try:
                print("    -> Trying fnSearch() via JS...")
                driver.execute_script("fnSearch();")
                time.sleep(5)
            except Exception as e:
                print(f"    -> fnSearch failed: {e}")
                
                try:
                    print("    -> Trying searchForm submit...")
                    driver.execute_script("document.forms[0].submit();")
                    time.sleep(5)
                except Exception as e2:
                    print(f"    -> Form submit failed: {e2}")

            # Check for results (regardless of method)
            print(f"    -> Current URL: {driver.current_url}")
            html = driver.page_source
            
            try:
                dfs = pd.read_html(io.StringIO(html))
                print(f"    -> Found {len(dfs)} tables.")
                found_data = False
                for i, df in enumerate(dfs):
                    cols = str(list(df.columns))
                    if '보고서명' in cols or '공시제목' in cols:
                        print(f"    -> [SUCCESS] Found Disclosure Table (Index {i}):")
                        # Save to CSV to check encoding/content
                        df.to_csv("debug_kind_results.csv", index=False, encoding="utf-8-sig")
                        print("    -> Saved debug_kind_results.csv")
                        
                        # Print first few rows to console (might be garbled)
                        print(df.iloc[:, :5].head()) 
                        found_data = True
                        return
                    elif len(df) > 0:
                         pass
                
                if not found_data:
                    print("    -> No Data Table found.")

            except Exception as e:
                print(f"    -> Pandas Error: {e}")
                
        else:
            print("    -> Cannot proceed without visible input.")

    except Exception as e:
        print(f"    -> Selenium Error: {e}")
    finally:
        driver.quit()

if __name__ == "__main__":
    scrape_kind_universal()
