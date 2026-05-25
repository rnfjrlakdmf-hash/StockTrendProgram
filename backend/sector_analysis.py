# -*- coding: utf-8 -*-
import requests
import logging

# [Commercial Protection] WiseReport(나이스평가정보) 업종분석 크롤링 전면 차단.
# 상업적 운영에 따른 유료 B2B 재무 데이터 저작권 침해 방지를 위해 비활성화.
# 향후 합법적 대안: 금융위원회 금융데이터거래소(https://www.findatamall.or.kr) API 사용 권장.

def decode_safe(res: requests.Response) -> str:
    content = res.content
    try:
        return content.decode('utf-8')
    except UnicodeDecodeError:
        try:
            return content.decode('cp949')
        except UnicodeDecodeError:
            return content.decode('utf-8', 'replace')


def get_sector_analysis_data(symbol, sector_id=None):
    """
    [Commercial Protection] WiseReport(navercomp.wisereport.co.kr) 업종 분석 크롤링 차단.
    나이스평가정보의 유료 B2B 금융 데이터를 무단 수집하는 행위는 저작권법 위반.
    상업적 운영 안전을 위해 빈 데이터를 반환합니다.
    """
    logging.warning(f"[Commercial Protection] Sector analysis for {symbol} blocked (WiseReport crawling disabled).")
    return {
        "status": "disabled",
        "message": "업종 비교 분석 기능은 현재 서비스 준비 중입니다.",
        "data": {
            "symbol": symbol,
            "summary_table": [],
            "charts": {},
            "compare_sectors": [],
            "active_sector_id": "",
            "version": "commercial_safe"
        }
    }
