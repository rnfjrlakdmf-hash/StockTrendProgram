import requests
import json
import time

# NH Investment & Securities (Namu) API Base URL
# [Critical] Verify this URL. Usually https://openapi.nhqv.com
BASE_URL = "https://openapi.nhqv.com"

class NhApi:
    def __init__(self, app_key, app_secret, account):
        self.app_key = app_key
        self.app_secret = app_secret
        self.account = account
        self.access_token = None
        self.token_expired_at = 0

    def get_access_token(self):
        """
        Fetch or return valid access token from NH.
        """
        now = time.time()
        if self.access_token and now < self.token_expired_at:
            return self.access_token

        url = f"{BASE_URL}/oauth2/tokenP"
        headers = {"content-type": "application/json"}
        body = {
            "grant_type": "client_credentials",
            "appkey": self.app_key,
            "appsecret": self.app_secret,
            "scope": "oob" # NH sometimes requires scope
        }

        try:
            res = requests.post(url, headers=headers, data=json.dumps(body))
            data = res.json()
            if "access_token" in data:
                self.access_token = data["access_token"]
                self.token_expired_at = now + int(data.get("expires_in", 3600)) - 60
                print(f"[NH] Token Refreshed. Expires in {data.get('expires_in')}s")
                return self.access_token
            else:
                print(f"[NH] Token Error: {data}")
                return None
        except Exception as e:
            print(f"[NH] Token Exception: {e}")
            return None

    def get_current_price(self, symbol: str):
        """
        Fetch current price using NH REST API.
        """
        token = self.get_access_token()
        if not token:
            return None

        url = f"{BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price"
        headers = {
            "content-type": "application/json; charset=utf-8",
            "authorization": f"Bearer {token}",
            "appkey": self.app_key,
            "appsecret": self.app_secret,
            "tr_id": "FHKST01010100" # Trans ID might be same or different
        }
        params = {
            "fid_cond_mrkt_div_code": "J",
            "fid_input_iscd": symbol
        }

        try:
            res = requests.get(url, headers=headers, params=params)
            data = res.json()
            
            if data.get('rt_cd') == '0': # Success
                output = data['output']
                return {
                    "symbol": symbol,
                    "price": output['stck_prpr'],
                    "change": f"{float(output['prdy_ctrt']):.2f}%", 
                    "name": symbol
                }
            else:
                print(f"[NH] Price Error {symbol}: {data.get('msg1')}")
                return None
        except Exception as e:
            print(f"[NH] Price Exception: {e}")
            return None
