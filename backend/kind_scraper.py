import logging
import time
import io
import pandas as pd
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import WebDriverException, NoSuchElementException, TimeoutException
from webdriver_manager.chrome import ChromeDriverManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class KindScraper:
    def __init__(self, headless=True):
        self.headless = headless
        self.driver = None

    def _setup_driver(self):
        """Initializes the Chrome WebDriver with optimal options for scraping."""
        chrome_options = Options()
        if self.headless:
            chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
        
        # Suppress logging
        chrome_options.add_argument("--log-level=3")

        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=chrome_options)

    def _close_driver(self):
        """Safely closes the WebDriver."""
        if self.driver:
            try:
                self.driver.quit()
            except Exception as e:
                logger.error(f"Error closing driver: {e}")
            self.driver = None

    def scrape_latest_disclosures(self, keyword="보호예수", max_retries=3):
        """
        Scrapes the latest disclosures from KIND matching the keyword.
        Returns a list of dictionaries with disclosure details.
        """
        results = []
        for attempt in range(max_retries):
            try:
                if not self.driver:
                    self._setup_driver()

                # 1. Navigate to Main Page
                url = "https://kind.krx.co.kr/main.do?method=loadInitPage&scrnmode=1"
                logger.info(f"Navigating to {url}...")
                self.driver.get(url)
                time.sleep(3)

                # Handle potential alerts
                try:
                    alert = self.driver.switch_to.alert
                    logger.info(f"Alert accepted: {alert.text}")
                    alert.accept()
                    time.sleep(1)
                except:
                    pass

                # 2. Open Sitemap
                try:
                    logger.info("Opening Sitemap...")
                    sitemap_btn = self.driver.find_element(By.CSS_SELECTOR, ".btn.sitemap.open")
                    sitemap_btn.click()
                    time.sleep(2)
                except Exception as e:
                    logger.warning(f"Failed to click Sitemap button: {e}. Trying JS fallback...")
                    self.driver.execute_script("$('.sitemap').show();")
                    time.sleep(2)

                # 3. Click "Detailed Search" (상세검색)
                try:
                    logger.info("Clicking 'Detailed Search'...")
                    link = self.driver.find_element(By.XPATH, "//a[contains(@href, 'searchDetailsMain')]")
                    if not link.is_displayed():
                        self.driver.execute_script("arguments[0].click();", link)
                    else:
                        link.click()
                    time.sleep(5)
                except Exception as e:
                    logger.error(f"Failed to navigate to detailed search: {e}")
                    raise

                # 4. Find Input and Search
                target_input = None
                # Heuristic: Find visible text input for Report Name.
                # 'AKCKwdTop' is Company Name search (Header). We want 'reportNm' or 'reportNmTemp'.
                all_inputs = self.driver.find_elements(By.TAG_NAME, "input")
                for inp in all_inputs:
                    try:
                        if inp.is_displayed() and inp.get_attribute("type") == "text":
                            i_name = inp.get_attribute('name')
                            i_id = inp.get_attribute('id')
                            
                            # Prioritize Report Name
                            if i_id == "reportNmTemp":
                                target_input = inp
                                break
                            if i_name == "reportNm":
                                target_input = inp
                                break
                            
                            # Fallback checks (less specific)
                            if i_name and 'report' in str(i_name).lower():
                                target_input = inp
                                break
                            if i_id and 'report' in str(i_id).lower():
                                target_input = inp
                                break
                    except:
                        pass
                
                if target_input:
                    logger.info(f"Found search input: {target_input.get_attribute('id')}")
                    target_input.clear()
                    target_input.send_keys(keyword)
                    
                    # Execute Search via JS
                    logger.info("Executing search...")
                    self.driver.execute_script("fnSearch();")
                    time.sleep(5)
                    
                    # 5. Parse Results
                    html = self.driver.page_source
                    dfs = pd.read_html(io.StringIO(html))
                    
                    found_data = False
                    for df in dfs:
                        cols = str(list(df.columns))
                        if '보고서명' in cols or '공시제목' in cols:
                            logger.info("Found disclosure table.")
                            # Clean and convert to list of dicts
                            # Expected cols: 번호, 시간, 회사명, 공시제목, 제출인, 차트/주가
                            
                            # Rename columns to English to avoid encoding issues
                            new_cols = ['no', 'time', 'corp_name', 'title', 'submitter', 'chart']
                            if len(df.columns) == len(new_cols):
                                df.columns = new_cols
                            else:
                                # Fallback: rename first 5 at least
                                df.rename(columns={df.columns[0]: 'no', df.columns[1]: 'time', 
                                                 df.columns[2]: 'corp_name', df.columns[3]: 'title'}, inplace=True)

                            # Simple cleanup
                            df = df.fillna("")
                            records = df.to_dict('records')
                            results = records
                            found_data = True
                            break
                    
                    if not found_data:
                        logger.warning("No disclosure table found in results.")
                    
                    return results

                else:
                    raise NoSuchElementException("Could not find search input field.")

            except Exception as e:
                logger.error(f"Attempt {attempt + 1} failed: {e}")
                self._close_driver() # Close and retry
                time.sleep(2)
            
            finally:
                if attempt == max_retries - 1:
                    self._close_driver()

        return results

if __name__ == "__main__":
    # Test execution
    scraper = KindScraper(headless=True)
    try:
        data = scraper.scrape_latest_disclosures("보호예수")
        print("Scraped Data:")
        for row in data[:5]:
            print(row)
    finally:
        scraper._close_driver()
