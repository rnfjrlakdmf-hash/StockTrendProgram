# 주식동향 프로그램 (AI Stock Analyst) - 개발 로드맵

## 1. 개요
이 프로젝트는 개인 투자자를 위한 올인원 AI 주식 분석 플랫폼입니다. 복잡한 데이터를 직관적인 시각화와 친절한 AI 브리핑으로 변환하고, 감성 분석 및 자동 매매 기능을 통해 성공적인 투자를 지원합니다.

## 2. 기술 스택 (제안)
- **Frontend**: Next.js (React) - 직관적이고 아름다운 대시보드 UI 구현
- **Backend**: Python (FastAPI) - 강력한 데이터 분석, AI 모델 연동, 증권사 API 제어
- **Database**: SQLite or PostgreSQL - 사용자 데이터 및 분석 기록 저장
- **AI Engine**: OpenAI GPT-4o or similar (분석/요약용)

## 3. 기능 구현 단계

### Phase 1: 기본 인프라 및 UI 프레임워크 (현재 단계)
- 프로젝트 폴더 구조 생성 (Frontend/Backend 분리)
- 메인 대시보드 레이아웃 구현 (Glassmorphism 디자인 적용)
- 기본적인 네비게이션 (브리핑, 차트, 위험관리, 설정) 구현

### Phase 2: 핵심 분석 및 시각화 (Expert & Assistant)
- **종목 건강검진표**: ✅ UI 구현 및 주식 데이터/AI 점수 백엔드 연동 완료
- **AI 투자 브리핑**: ✅ 시장 지수/뉴스 실시간 연동 및 AI 요약 생성 완료
- **용어 콕콕 가이드**: ✅ 브리핑 페이지 내 AI 용어 설명 통합 완료
- **위험 관리**: Risk Page UI 구현 (현재 Mock Data, 실시간 모니터링 로직 구현 예정)
- **설정**: API Key 입력 UI 구현 

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
