import asyncio
import sys
import traceback
sys.path.append('c:\\Users\\rnfjr\\StockTrendProgram\\backend')
from korea_data import get_integrated_stock_news

async def main():
    try:
        news = await get_integrated_stock_news('005930.KS', '삼성전자', 30)
        print(f"News count: {len(news)}")
    except Exception as e:
        print("ERROR:")
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(main())
