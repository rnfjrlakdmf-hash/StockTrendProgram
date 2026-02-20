import requests
import json
import time

# KIS REST API Base URL (Real)
# For Mock: https://openapivts.koreainvestment.com:29443
BASE_URL = "https://openapi.koreainvestment.com:9443"

class KisApi:
    # Class-level cache for Access Token (Shared across all instances)
    _access_token = None
    _token_expired_at = 0

    def __init__(self, app_key, app_secret, account, allow_mock=False):
        self.app_key = app_key
        self.app_secret = app_secret
        self.account = account
        self.allow_mock = allow_mock

    def get_balance(self):
        """
        Fetch Account Balance & Holdings.
        API: /uapi/domestic-stock/v1/trading/inquire-balance
        TR_ID: TTTC8434R (Real) / VTTC8434R (Virtual)
        """
        token = self.get_access_token()
        if not token:
            return None
            
        # Determine Base URL & TR_ID based on mock/real
        # But for now, let's assume Real for user keys, or handle Virtual if app_key starts with "M"?
        # Actually KIS uses different domains. Our BASE_URL is set to Real in this file.
        # If user provides Virtual keys, they might fail on Real URL. 
        # For this MVP, let's support Real.
        
        url = f"{BASE_URL}/uapi/domestic-stock/v1/trading/inquire-balance"
        
        tr_id = "TTTC8434R" # Real
        # Simple heuristic: Virtual accounts usually 8 digits but App Key differs.
        # Let's trust the BASE_URL constant for now. 
        
        headers = {
            "content-type": "application/json; charset=utf-8",
            "authorization": f"Bearer {token}",
            "appkey": self.app_key,
            "appsecret": self.app_secret,
            "tr_id": tr_id
        }
        
        params = {
            "CANO": self.account[:8], # Account Number (8 digits)
            "ACNT_PRDT_CD": "01", # Product Code (usually 01)
            "AFHR_FLPR_YN": "N",
            "OFL_YN": "N",
            "INQR_DVSN": "02",
            "UNPR_DVSN": "01",
            "FUND_STTL_ICLD_YN": "N",
            "FNCG_AMT_AUTO_RDPT_YN": "N",
            "PRCS_DVSN": "00",
            "CTX_AREA_FK100": "",
            "CTX_AREA_NK100": ""
        }
        
        try:
            res = requests.get(url, headers=headers, params=params)
            data = res.json()
            
            if data['rt_cd'] == '0':
                output1 = data['output1'] # Holdings
                output2 = data['output2'] # Summary
                
                holdings = []
                for item in output1:
                    qty = int(item['hldg_qty'])
                    if qty > 0:
                        holdings.append({
                            "symbol": item['pdno'], # Code
                            "name": item['prdt_name'],
                            "quantity": qty,
                            "price": float(item['prpr']), # Current Price
                            "avg_price": float(item['pchs_avg_pric']), # Avg Price
                            "profit_rate": float(item['evlu_pfls_rt']), # Profit %
                            "total_amount": int(item['evlu_amt']) # Total Eval Amount
                        })
                        
                return {
                    "holdings": holdings,
                    "summary": {
                        "total_asset": int(output2[0]['tot_evlu_amt']),
                        "total_profit": int(output2[0]['evlu_pfls_smtl_amt']),
                        # "profit_rate": float(output2[0]['evlu_pfls_rt']) # Sometimes missing or formatted weirdly
                    }
                }
            else:
                print(f"[KIS] Balance Error: {data['msg1']}")
                return None
        except Exception as e:
            print(f"[KIS] Balance Exception: {e}")
            return None
        """
        Fetch Approval Key for WebSocket.
        This is different from Access Token.
        """
        url = f"{BASE_URL}/oauth2/Approval"
        headers = {"content-type": "application/json; utf-8"}
        body = {
            "grant_type": "client_credentials",
            "appkey": self.app_key,
            "secretkey": self.app_secret
        }
        
        try:
            res = requests.post(url, headers=headers, data=json.dumps(body))
            data = res.json()
            if "approval_key" in data:
                return data["approval_key"]
            else:
                print(f"[KIS] Approval Key Error: {data}")
                return None
        except Exception as e:
            print(f"[KIS] Approval Key Exception: {e}")
            return None

    def get_access_token(self):
        """
        Fetch or return valid access token.
        Tokens last 24h. We cache it in memory using class variables.
        """
        now = time.time()
        
        # Check Class-level Cache
        if KisApi._access_token and now < KisApi._token_expired_at:
            return KisApi._access_token

        # Fallback to Instance (if needed, but we use class level mostly)
        # Verify if same app_key? Assuming single KIS account for system primarily.
        
        url = f"{BASE_URL}/oauth2/tokenP"
        headers = {"content-type": "application/json"}
        body = {
            "grant_type": "client_credentials",
            "appkey": self.app_key,
            "appsecret": self.app_secret
        }

        try:
            res = requests.post(url, headers=headers, data=json.dumps(body))
            data = res.json()
            if "access_token" in data:
                KisApi._access_token = data["access_token"]
                KisApi._token_expired_at = now + data["expires_in"] - 60 # Buffer
                print(f"[KIS] Token Refreshed. Expires in {data['expires_in']}s")
                return KisApi._access_token
            else:
                print(f"[KIS] Token Error: {data}")
                return None
        except Exception as e:
            print(f"[KIS] Token Exception: {e}")
            return None

    def get_current_price(self, symbol: str):
        """
        Fetch current price using REST API.
        Symbol: e.g. "005930"
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
            "tr_id": "FHKST01010100" # Current Price Trans ID
        }
        params = {
            "fid_cond_mrkt_div_code": "J", # J: Stock, W: Warrant...
            "fid_input_iscd": symbol
        }

        try:
            res = requests.get(url, headers=headers, params=params)
            data = res.json()
            
            if data['rt_cd'] == '0': # Success
                output = data['output']
                # Parse fields
                # stck_prpr: Current Price
                # prdy_vrss: Change Amount
                # prdy_ctrt: Change Rate
                return {
                    "symbol": symbol,
                    "price": output['stck_prpr'],
                    "change": f"{float(output['prdy_ctrt']):.2f}%", 
                    "name": symbol # KIS API doesn't return name here easily, fallback to input
                }
            else:
                print(f"[KIS] Price Error {symbol}: {data['msg1']}")
                return None
        except Exception as e:
            print(f"[KIS] Price Exception {symbol}: {e}")
            return None
    
    def get_fluctuation_rank(self, sort_type="0"):
        """
        Fetch Fluctuation Ranking (Rise/Fall).
        sort_type: "0" (Rise/Gainer), "1" (Fall/Loser)
        API: /uapi/domestic-stock/v1/ranking/fluctuation
        TR_ID: FHPST01700000
        """
        token = self.get_access_token()
        if not token:
            return []

        url = f"{BASE_URL}/uapi/domestic-stock/v1/ranking/fluctuation"
        headers = {
            "content-type": "application/json; charset=utf-8",
            "authorization": f"Bearer {token}",
            "appkey": self.app_key,
            "appsecret": self.app_secret,
            "tr_id": "FHPST01700000",
            "custtype": "P"
        }
        
        # 0: Rise, 1: Fall
        # We want top 5. API returns up to 100.
        params = {
            "fid_cond_mrkt_div_code": "J", # J: Stock
            "fid_cond_scr_div_code": "20170",
            "fid_input_iscd": "0000", # All
            "fid_rank_sort_cls_code": sort_type, # 0: Rise, 1: Fall
            "fid_input_cnt_1": "0", # 0: Excluding items? No, "0" usually means input count? KIS docs say input_cnt_1 is usually "?" check docs. 
            # Actually KIS docs: fid_input_cnt_1 is "Money Flow Check?" No.
            # Let's use standard params found in open source references for FHPST01700000
            "fid_prc_cls_code": "0", # 0: Price (Current)
            "fid_input_price_1": "",
            "fid_input_price_2": "",
            "fid_vol_cls_code": "",
            "fid_trgt_cls_code": "0", # 0: All
            "fid_trgt_exls_cls_code": "0", # 0: None
            "fid_div_cls_code": "0",
            "fid_rsfl_rate1": "",
            "fid_rsfl_rate2": ""
        }

        try:
            res = requests.get(url, headers=headers, params=params)
            data = res.json()
            
            if data['rt_cd'] == '0':
                output = data['output']
                parsed_list = []
                for item in output[:5]: # Top 5 only
                    # item structure: stck_shrn_iscd (Code), hts_kor_isnm (Name), stck_prpr (Price), prdy_ctrt (Change Rate)
                    change_rate = float(item['prdy_ctrt'])
                    
                    parsed_list.append({
                        "rank": item['data_rank'],
                        "symbol": item['stck_shrn_iscd'],
                        "name": item['hts_kor_isnm'],
                        "price": int(item['stck_prpr']), # KRW is always int
                        "change": f"{change_rate:.2f}%", 
                        "change_rate": change_rate
                    })
                return parsed_list
            else:
                # print(f"[KIS] Ranking Error: {data['msg1']}")
                return []
        except Exception as e:
            # print(f"[KIS] Ranking Exception: {e}")
            return []
    def place_order(self, symbol: str, order_type: str, price: int, qty: int):
        """
        Place Order (Buy/Sell).
        order_type: "BUY" or "SELL"
        price: 0 for Market Order (if supported), or specific price.
        qty: Quantity
        
        API: /uapi/domestic-stock/v1/trading/order-cash
        TR_ID:
            TTTC0802U (Buy)
            TTTC0801U (Sell)
        """
        token = self.get_access_token()
        if not token:
            return {"rt_cd": "1", "msg1": "Token Error"}

        url = f"{BASE_URL}/uapi/domestic-stock/v1/trading/order-cash"
        
        # Select TR_ID
        tr_id = "TTTC0802U" if order_type.upper() == "BUY" else "TTTC0801U"
        
        headers = {
            "content-type": "application/json; charset=utf-8",
            "authorization": f"Bearer {token}",
            "appkey": self.app_key,
            "appsecret": self.app_secret,
            "tr_id": tr_id,
        }
        
        # Order Class Code (00: Limit, 01: Market)
        ord_dv_sn = "00" if price > 0 else "01"
        ord_p = str(price) if price > 0 else "0"
        
        body = {
            "CANO": self.account[:8],
            "ACNT_PRDT_CD": "01",
            "PDNO": symbol,
            "ORD_DVSN": ord_dv_sn,
            "ORD_QTY": str(qty),
            "ORD_UNPR": ord_p
        }
        
        try:
            res = requests.post(url, headers=headers, data=json.dumps(body))
            data = res.json()
            
            if data['rt_cd'] == '0':
                return {
                    "status": "success",
                    "msg": data['msg1'],
                    "order_no": data['output']['ODNO'] # Order Number
                }
            else:
                return {
                    "status": "error",
                    "msg": f"KIS Order Error: {data['msg1']}",
                    "code": data['rt_cd']
                }
        except Exception as e:
            return {
                "status": "error", 
                "msg": f"Order Exception: {str(e)}"
            }
