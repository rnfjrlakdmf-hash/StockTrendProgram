import os
import json
import urllib.request
from datetime import datetime
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET")
NAVER_BLOG_ID = os.getenv("NAVER_BLOG_ID") # 네이버 아이디

def get_market_summary():
    """
    이곳에 실제 시황 데이터를 DB나 API에서 가져와서 요약본을 생성하는 로직을 넣습니다.
    (예: KOSPI/KOSDAQ 지수, 오늘의 특징주, 주요 테마 등)
    """
    today_str = datetime.now().strftime("%Y년 %m월 %d일")
    title = f"[AI 증시 시황] {today_str} 오늘의 주도 테마와 특징주 요약"
    
    # HTML 형식으로 작성 (네이버 블로그는 HTML 포맷 지원)
    content = f"""
    <h1>{today_str} 증시 마감 요약</h1>
    <p>안녕하세요! AI 주식 분석기 <strong>StockTrendProgram</strong>입니다.</p>
    <h2>오늘의 특징주 및 테마</h2>
    <ul>
        <li><strong>비만치료제 테마:</strong> 강세 (관련주 1, 2)</li>
        <li><strong>온디바이스 AI:</strong> 조정 (관련주 3, 4)</li>
    </ul>
    <p>더 상세한 종목별 AI 분석 리포트와 매수/매도 타이밍이 궁금하시다면?</p>
    <p>👉 <a href="https://stock-trend-program.co.kr">무료 AI 종목 분석 바로가기</a></p>
    <br>
    <p><em>이 포스팅은 AI 알고리즘에 의해 자동 작성되었습니다. 투자의 책임은 본인에게 있습니다.</em></p>
    """
    return title, content

def post_to_naver_blog(title, content):
    if not NAVER_CLIENT_ID or not NAVER_CLIENT_SECRET or not NAVER_BLOG_ID:
        print("네이버 블로그 API 연동 정보가 설정되지 않았습니다 (.env 확인 필요)")
        return False
        
    url = f"https://openapi.naver.com/v1/api/blog/post/{NAVER_BLOG_ID}.json"
    
    # 네이버 블로그 API는 폼 데이터 전송을 요구함
    boundary = "---WebKitFormBoundary7MA4YWxkTrZu0gW"
    
    data = f"--{boundary}\r\n"
    data += f"Content-Disposition: form-data; name=\"title\"\r\n\r\n{title}\r\n"
    data += f"--{boundary}\r\n"
    data += f"Content-Disposition: form-data; name=\"contents\"\r\n\r\n{content}\r\n"
    data += f"--{boundary}--\r\n"
    
    req = urllib.request.Request(url, data=data.encode("utf-8"))
    req.add_header("X-Naver-Client-Id", NAVER_CLIENT_ID)
    req.add_header("X-Naver-Client-Secret", NAVER_CLIENT_SECRET)
    req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
    
    try:
        response = urllib.request.urlopen(req)
        rescode = response.getcode()
        if rescode == 200:
            print("네이버 블로그 포스팅 성공!")
            return True
        else:
            print("Error Code:", rescode)
            return False
    except Exception as e:
        print("포스팅 중 에러 발생:", e)
        return False

if __name__ == "__main__":
    print("AI 네이버 블로그 포스팅 봇 시작...")
    title, content = get_market_summary()
    post_to_naver_blog(title, content)
