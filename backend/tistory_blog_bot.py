import os
import json
import urllib.request
import urllib.parse
from datetime import datetime
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

# 티스토리 API 정보
TISTORY_ACCESS_TOKEN = os.getenv("TISTORY_ACCESS_TOKEN")
TISTORY_BLOG_NAME = os.getenv("TISTORY_BLOG_NAME") # 예: 'my-stock-blog' (my-stock-blog.tistory.com의 앞부분)

def get_market_summary():
    """
    이곳에 실제 시황 데이터를 DB나 API에서 가져와서 요약본을 생성하는 로직을 넣습니다.
    (예: KOSPI/KOSDAQ 지수, 오늘의 특징주, 주요 테마 등)
    """
    today_str = datetime.now().strftime("%Y년 %m월 %d일")
    title = f"[AI 증시 시황] {today_str} 오늘의 주도 테마와 특징주 요약"
    
    # HTML 형식으로 작성 (티스토리는 HTML 포맷을 완벽하게 지원합니다)
    content = f"""
    <div style="font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">{today_str} 증시 마감 요약</h2>
        <p>안녕하세요! AI 주식 분석기 <strong>StockTrendProgram</strong>입니다.</p>
        
        <h3 style="color: #ea580c; margin-top: 20px;">🔥 오늘의 특징주 및 테마</h3>
        <ul style="background: #f8fafc; padding: 20px; border-radius: 10px; border: 1px solid #e2e8f0;">
            <li style="margin-bottom: 10px;"><strong>비만치료제 테마:</strong> 강세 (관련주 A, B) - 시장의 주도 테마로 부상</li>
            <li style="margin-bottom: 10px;"><strong>온디바이스 AI:</strong> 숨고르기 (관련주 C, D) - 전일 급등에 따른 차익 실현</li>
        </ul>
        
        <div style="background: #eff6ff; padding: 20px; border-radius: 10px; text-align: center; margin-top: 30px;">
            <p style="font-size: 1.1em; font-weight: bold; margin-bottom: 15px;">더 상세한 종목별 AI 분석 리포트와 매수/매도 타이밍이 궁금하시다면?</p>
            <a href="https://stock-trend-program.co.kr" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">무료 AI 종목 분석 바로가기 🚀</a>
        </div>
        
        <br>
        <p style="color: #94a3b8; font-size: 0.9em; text-align: center;"><em>이 포스팅은 AI 알고리즘에 의해 자동 작성되었습니다. 투자의 책임은 본인에게 있습니다.</em></p>
    </div>
    """
    return title, content

def post_to_tistory(title, content):
    if not TISTORY_ACCESS_TOKEN or not TISTORY_BLOG_NAME:
        print("티스토리 API 연동 정보가 설정되지 않았습니다 (.env 확인 필요)")
        return False
        
    url = "https://www.tistory.com/apis/post/write"
    
    # POST 데이터 준비
    data = urllib.parse.urlencode({
        "access_token": TISTORY_ACCESS_TOKEN,
        "output": "json",
        "blogName": TISTORY_BLOG_NAME,
        "title": title,
        "content": content,
        "visibility": "3", # 0: 비공개, 1: 보호, 3: 발행(공개)
        "category": "0", # 0: 기본 카테고리
        "tag": "주식,증시,시황,AI종목분석,테마주,특징주"
    }).encode("utf-8")
    
    req = urllib.request.Request(url, data=data)
    
    try:
        response = urllib.request.urlopen(req)
        rescode = response.getcode()
        if rescode == 200:
            res_body = response.read().decode('utf-8')
            print("티스토리 블로그 포스팅 성공!")
            print("응답:", res_body)
            return True
        else:
            print("Error Code:", rescode)
            return False
    except Exception as e:
        print("포스팅 중 에러 발생:", e)
        return False

if __name__ == "__main__":
    print("AI 티스토리 블로그 포스팅 봇 시작...")
    title, content = get_market_summary()
    post_to_tistory(title, content)
