import urllib.request
import json

req = urllib.request.Request(
    'http://13.209.99.170.nip.io/api/system/analytics/stats', 
    headers={'X-Admin-Key': 'StockTrendSecretAdmin2026!'}
)
try:
    res = urllib.request.urlopen(req)
    print(json.loads(res.read().decode()))
except Exception as e:
    print(e)
