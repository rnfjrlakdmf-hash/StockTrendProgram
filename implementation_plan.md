# 주식동향 프로그램 (AI Stock Analyst) - 개발 로드맵

## 1. 개요
이 프로젝트는# [국내 종목] 투자자별 동향 및 거래원 정보 상시 노출 기능 구현

종목 발굴창 검색 시 국내 종목에 한해 상위 5대 매수/매도 거래원(증권사) 정보와 외국인/기관/개인의 기간별(1, 5, 20, 60일) 수급 추이를 시각화합니다.

## 제약 사항
- **국외 종목 제외**: 네이버 금융 등 공개 API의 한계로 인해 해외 주식의 실시간/상세 거래원 데이터는 제공하지 않으며, 국내 종목에 집중합니다.

## Proposed Changes

### [Backend] 수급 데이터 엔진 고도화
#### [MODIFY] [korea_data.py](file:///C:/Users/rnfjr/StockTrendProgram/backend/korea_data.py)
- `get_naver_investor_data(code, trader_day)`: 거래원 테이블과 수급 추이 테이블을 병렬로 스크래핑하는 통합 함수 구현.
- 인코딩 문제에 강한 '컬럼 개수 기반 테이블 식별 로직' 적용.
- 상위 5대 매도/매수 거래원 및 외국계 합계, 일별 순매매량 데이터 추출.

#### [MODIFY] [main.py](file:///C:/Users/rnfjr/StockTrendProgram/backend/main.py)
- `/api/stock/{symbol}/investor`: `period` 파라미터를 지원하는 신규 엔드포인트 개설.

### [Frontend] 실시간 수급 대시보드 구현
#### [MODIFY] [InvestorTrendTab.tsx](file:///C:/Users/rnfjr/StockTrendProgram/frontend/src/components/InvestorTrendTab.tsx)
- 기간 선택 필터 추가 (1, 5, 20, 60일).
- 상위 5대 매수/매도 거래원 리스트 UI 추가.
- 기간별 순매매 동향 Bar 차트 및 상세 테이블 연동.
- 외국계 추정합(실시간) 정보를 상단에 강조 노출.

#### [MODIFY] [page.tsx](file:///C:/Users/rnfjr/StockTrendProgram/frontend/src/app/discovery/page.tsx)
- '관련 종목' 섹션 등락률 표시 아이콘(▲/▼) 및 색상(Red/Blue) 통일.

## Verification Plan
### Automated Tests
- `test_api_logic.py`: 삼성전자(005930) 등 주요 종목에 대해 거래원 및 수급 데이터가 정상 응답되는지 검증 완료.

### Manual Verification
- 브라우저를 통해 '삼성전자' 검색 후 '투자자 동향' 탭 클릭.
- 1일/5일/20일/60일 버튼 클릭 시 데이터 및 차트가 즉각 갱신되는지 확인.
- 해외 종목(예: AAPL) 검색 시 투자자 데이터 미지원 메시지가 정상 노출되는지 확인.

### Phase 3: 데이터 파이프라인 및 감성 분석
- [완료] 뉴스 크롤링 심화 (Google News 연동)
- [완료] 감성 분석 로직 고도화 (Tech Indicators + AI Hybrid)
- [보류] 군중 심리 분석 (뉴스/기술적 지표로 대체)

### Phase 4: 고급 전략 및 자동화 (Profit & Guardrail)
- **내부자 추적**: 
    - ✅ **[완료]** 내부자 거래 추적 (yfinance API 연동)
    - ✅ **[완료]** 프론트엔드 내부자 거래 테이블 구현
- **백테스팅**: ✅ **[완료]** 이동평균 교차 전략 시뮬레이션 및 차트 시각화
- **포트폴리오 최적화**: ✅ **[완료]** 샤프 지수 최대화 자산 배분 비중 계산
- **위험 조기 경보**: ✅ **[완료]** 가격 알림 서비스 (설정 및 체크 로직) 구현

### Phase 5: 시스템 안정화 및 배포 (Final Polish)
- ✅ **[완료]** 원클릭 실행 스크립트 (start_app.ps1) 작성
- ✅ **[완료]** 모바일 앱 패키징 (Capacitor + Android)
- ✅ **[완료]** API URL 설정 분리 (`config.ts`)
- ✅ **[완료]** AI 주식 상담 챗봇 구현 (Context Injection)
- ✅ **[완료]** 한국 주식 전자공시(DART) 크롤링 연동
- ✅ **[완료]** AI 브리핑 음성 재생 (TTS) 기능 추가
- ✅ **[완료]** AI 점수 히스토리 트래킹 및 차트 시각화
- ✅ **[완료]** 관심 종목(Watchlist) 기능 및 대시보드 위젯
- ✅ **[완료]** 거시 경제 캘린더 (Macro Calendar) 기능
- ✅ **[완료]** 종목 비교 분석 (Stock Comparison) 기능
- ✅ **[완료]** 포트폴리오 AI 진단 (Portfolio AI Doctor) 기능
- ✅ **[완료]** 이슈 테마 분석기 (Theme Analyzer) 기능
- ✅ **[완료]** 앱 아이콘 및 스플래시 스크린 적용 (UI Polish)
- ✅ **[완료]** 개미 vs AI (Sentiment Battle) 기능
- ✅ **[완료]** All-Asset View (주식 + 코인 + 환율 통합) 기능
- ✅ **[완료]** AI 뉴스 숏폼 (Financial TikTok) 기능
- ✅ **[완료]** 개미 vs AI (Sentiment Battle) 기능
- ✅ **[완료]** All-Asset View (주식 + 코인 + 환율 통합) 기능
- ✅ **[완료]** AI 뉴스 숏폼 (Financial TikTok) 기능
- ✅ **[완료]** 개미 vs AI (Sentiment Battle) 기능
- ✅ **[완료]** All-Asset View (주식 + 코인 + 환율 통합) 기능
- ✅ **[완료]** AI 뉴스 숏폼 (Financial TikTok) 기능
- ✅ **[완료]** 어닝 서프라이즈 알리미 (Earnings Whisper) 기능
- ✅ **[완료]** 글로벌 가치사슬 지도 (Supply Chain Map) 기능
- ✅ **[완료]** AI 차트 패턴 탐지기 (Chart Pattern Hunter) 기능
### [NEW] [ETF 서버 사이드 카테고리 필터링 도입]
- **백엔드 (`rank_data.py`)**: `get_etf_ranking`에 `category` 파라미터 추가. `items[:20]` 제한을 해제하고 전체 목록에서 키워드 필터링 수행.
- **API (`main.py`)**: `/api/rank/etf` 엔드포인트에 `category: str = None` 쿼리 파라미터 추가.
- **프론트엔드 (`page.tsx`)**: 유형별 버튼 클릭 시 `fetchEtfRankings(market, category)`를 호출하여 데이터 즉시 갱신.
- **기능**: 상위 20위 내에 없더라도 인버스, 지수추종 종목을 검색하여 노출.
- ✅ **[완료]** 개미 vs AI (Sentiment Battle) 기능
- ✅ **[완료]** All-Asset View (주식 + 코인 + 환율 통합) 기능
- ✅ **[완료]** AI 뉴스 숏폼 (Financial TikTok) 기능
- ✅ **[완료]** 어닝 서프라이즈 알리미 (Earnings Whisper) 기능
- ✅ **[완료]** 글로벌 가치사슬 지도 (Supply Chain Map) 기능
- ✅ **[완료]** AI 차트 패턴 탐지기 (Chart Pattern Hunter) 기능
- ✅ **[완료]** AI 매매 코치 (Trading Coach) 기능
- ✅ **[완료]** 스마트 포착 알림 (Sniper Alert) 기능
- ✅ **[완료]** 개미 vs AI (Sentiment Battle) 기능
- ✅ **[완료]** All-Asset View (주식 + 코인 + 환율 통합) 기능
- ✅ **[완료]** AI 뉴스 숏폼 (Financial TikTok) 기능
- ✅ **[완료]** 어닝 서프라이즈 알리미 (Earnings Whisper) 기능
- ✅ **[완료]** 글로벌 가치사슬 지도 (Supply Chain Map) 기능
- ✅ **[완료]** AI 차트 패턴 탐지기 (Chart Pattern Hunter) 기능
- ✅ **[완료]** AI 매매 코치 (Trading Coach) 기능
- ✅ **[완료]** 스마트 포착 알림 (Sniper Alert) 기능
- ✅ **[완료]** 내부자 추적기 (Insider Hunter) 기능
- ✅ **[완료]** 개미 vs AI (Sentiment Battle) 기능
- ✅ **[완료]** All-Asset View (주식 + 코인 + 환율 통합) 기능
- ✅ **[완료]** AI 뉴스 숏폼 (Financial TikTok) 기능
- ✅ **[완료]** 어닝 서프라이즈 알리미 (Earnings Whisper) 기능
- ✅ **[완료]** 글로벌 가치사슬 지도 (Supply Chain Map) 기능
- ✅ **[완료]** AI 차트 패턴 탐지기 (Chart Pattern Hunter) 기능
- ✅ **[완료]** AI 매매 코치 (Trading Coach) 기능
- ✅ **[완료]** 스마트 포착 알림 (Sniper Alert) 기능
- ✅ **[완료]** 내부자 추적기 (Insider Hunter) 기능
- ✅ **[완료]** 주식 날씨 예보 (Market Weather Station) 기능
- ✅ **[완료]** 상장폐지 계산기 (Delisting Risk Checker) 기능

## 4. 내부자 추적 및 자동 매매 구현 가능성
**가능 여부:** ✅ **가능합니다.**
- **데이터 소스:** 금융감독원 OpenDART API를 통해 기업 공시(임원 주요주주 특정증권등 소유상황보고서)를 실시간으로 모니터링할 수 있습니다.
- **매매 실행:** 한국투자증권(KIS) Open API 등을 활용하여, 특정 조건(예: 대표이사가 장내매수 10억 이상 시) 충족 시 자동으로 매수 주문을 전송하는 로직을 Python으로 구현할 수 있습니다.
- **주의사항:** API 호출 횟수 제한 및 24시간 감시를 위한 서버 환경 구축이 필요합니다.

---
**작성일:** 2025-12-30
