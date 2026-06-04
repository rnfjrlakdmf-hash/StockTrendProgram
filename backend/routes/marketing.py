from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json
import asyncio
import aiohttp
import os

# 기존 AI 인프라 재사용 (gemini api key 설정 및 재시도 로직)
from ai_analysis import generate_with_retry, get_json_model

router = APIRouter()

class MarketingRequest(BaseModel):
    keyword: str
    tone: str = "aggressive" # aggressive, professional, emotional

@router.get("/auto-keyword")
async def get_auto_keyword():
    prompt = """
    당신은 한국 주식 시장 트렌드 분석가입니다.
    현재 시점에서 주식 시장(한국 및 미국)에서 가장 뜨거운 트렌드, 급등 테마, 또는 핵심 이슈 1개를 선정하여 바이럴 마케팅 키워드(주제) 형태로 작성해주세요.
    길이는 10자~35자 사이로, 검색어 최적화 및 사람들의 호기심을 유발할 수 있게 작성해주세요.
    예시: "엔비디아 역대급 실적, HBM 수혜주 폭등", "트럼프 당선 수혜주 총정리", "원전 르네상스 대장주 총정리"
    
    오직 키워드 문장 한 줄만 응답하세요. 다른 부연 설명이나 따옴표는 넣지 마세요.
    """
    try:
        response = await asyncio.to_thread(generate_with_retry, prompt, False, 15, 0.9) # temperature 조금 높게 주어 매번 다양한 주제 추출
        keyword = response.text.strip().replace('"', '').replace("'", "")
        return {"keyword": keyword}
    except Exception as e:
        print(f"[Marketing Bot] Auto keyword error: {e}")
        return {"keyword": "삼성전자 AI 칩 수혜주, 시장 주도주 분석"}


@router.post("/generate")
async def generate_marketing_content(request: MarketingRequest):
    prompt = f"""
    당신은 주식 시장 최고의 1타 바이럴 마케터입니다.
    다음 키워드 혹은 주제를 바탕으로 4가지 다른 채널에 올릴 홍보글을 작성해주세요.
    우리의 목적은 '이 글을 본 사람들이 무조건 우리 사이트(AI 주식 비서, stock-trend-program.co.kr)로 와서 검색해보게 만드는 것'입니다.

    키워드/주제: {request.keyword}
    타겟 분위기: {request.tone}

    채널 1. 네이버 블로그 (Blog)
    - 정보성 글처럼 시작하지만 끝에는 'AI 주식 비서'를 써보니 정확해서 놀랐다는 식으로 유도.
    - 적절한 이모지와 가독성 높은 줄바꿈 포함.

    채널 2. 주식 커뮤니티 (디시인사이드 주식갤러리, 네이버 종토방) (Community)
    - 어그로성 강한 제목 (예: "와 ㅅㅂ 000 물린 흑우들 있냐? ㅋㅋㅋ", "형이 진짜 마지막으로 꿀통 푼다")
    - 짧고 굵게, 은어를 섞어서 극강의 바이럴 유도.
    - "AI 주식 비서에서 차트 돌려보니까 팩폭 꽂히더라" 같은 내용 포함.

    채널 3. 유튜브 쇼츠 / 틱톡 대본 (Shorts)
    - 첫 3초 시선을 끄는 강력한 훅(Hook).
    - 60초 이내에 읽을 수 있는 짧은 대본.
    - "링크는 프로필에 있습니다" 유도.

    채널 4. 인스타그램 피드/쓰레즈 (Instagram)
    - 시각적인 이모지를 다수 사용하고, 줄바꿈을 깔끔하게 하여 모바일 가독성을 극대화.
    - 감성적이거나 트렌디한 문구 사용.
    - 하단에 검색 유입을 위한 주식 관련 해시태그 10개 이상 꽉꽉 채워넣음 (#주식스타그램 #주린이 #AI주식비서 등).
    - "프로필 링크 클릭" 유도.

    반드시 아래 JSON 형식으로만 응답해주세요. (다른 텍스트 추가 금지)
    {{
        "blog": {{
            "title": "블로그용 제목",
            "content": "블로그 본문 (마크다운 지원)"
        }},
        "community": {{
            "title": "어그로성 제목",
            "content": "커뮤니티 본문"
        }},
        "shorts": {{
            "title": "숏츠용 훅 제목",
            "script": "쇼츠 대본"
        }},
        "instagram": {{
            "title": "인스타그램 제목/첫줄",
            "content": "인스타그램 본문 및 해시태그"
        }}
    }}
    """

    try:
        # ai_analysis.py 의 기존 인프라 사용
        response = await asyncio.to_thread(generate_with_retry, prompt, True, 60, 0.7)
        return json.loads(response.text)
    except Exception as e:
        print(f"[Marketing Bot] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class PublishRequest(BaseModel):
    channel: str # "tistory"
    title: str
    content: str
    blog_name: str = None # 티스토리용 블로그 이름 (선택적)

@router.post("/publish")
async def publish_marketing_content(request: PublishRequest):
    if request.channel == "tistory":
        access_token = os.getenv("TISTORY_ACCESS_TOKEN")
        blog_name = request.blog_name or os.getenv("TISTORY_BLOG_NAME")
        
        if not access_token or not blog_name:
            raise HTTPException(
                status_code=400, 
                detail="서버에 티스토리 API 토큰(TISTORY_ACCESS_TOKEN) 또는 블로그 이름(TISTORY_BLOG_NAME)이 설정되지 않았습니다."
            )
            
        url = "https://www.tistory.com/apis/post/write"
        data = {
            "access_token": access_token,
            "output": "json",
            "blogName": blog_name,
            "title": request.title,
            "content": request.content,
            "visibility": "3", # 0: 비공개, 3: 공개발행
            "category": "0"
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, data=data) as resp:
                    # 티스토리 API는 HTML을 포함할 수 있으므로 에러 핸들링 유의
                    try:
                        result = await resp.json()
                    except:
                        text = await resp.text()
                        raise HTTPException(status_code=500, detail=f"티스토리 응답 파싱 실패: {text}")

                    if resp.status == 200 and result.get("tistory", {}).get("status") == "200":
                        return {"status": "success", "url": result["tistory"].get("url", "")}
                    else:
                        raise HTTPException(status_code=500, detail=f"티스토리 발행 실패: {result}")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"티스토리 서버 통신 오류: {e}")
            
    else:
        raise HTTPException(status_code=400, detail="지원하지 않는 채널입니다.")
