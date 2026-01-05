# AI Stock Analyst (주식동향 프로그램)

AI 기반의 주식 분석 및 포트폴리오 관리 플랫폼입니다.

## 🚀 시작하기 (Quick Start)

**원클릭 실행:**
프로젝트 루트 폴더에서 `start_app.ps1` 파일을 우클릭 후 "PowerShell에서 실행"을 선택하거나, 터미널에서 아래 명령어를 입력하세요.

```powershell
.\start_app.ps1
```

이 스크립트는 자동으로 다음 서비스들을 실행합니다:
- **Backend**: FastAPI Server (http://localhost:8000)
- **Frontend**: Next.js Client (http://localhost:3000)

## ✨ 주요 기능 (Features)

1.  **🔍 종목 발굴 & 건강검진 (Discovery)**:
    - AI가 분석한 기업의 재무/수급/뉴스 심리 점수 확인
    - 내부자 거래(Insider Trading) 내역 조회
    - 과거 데이터 기반 투자 전략 백테스팅 (Backtesting)
2.  **📰 AI 마켓 브리핑**:
    - 매일 변하는 시장의 핵심 뉴스와 지수 요약
3.  **⚖️ 포트폴리오 최적화**:
    - 관심 종목들을 입력하면 위험 대비 수익률(Sharpe Ratio)을 최대화하는 황금 비율 제안
4.  **🔔 가격 알림 (Alerts)**:
    - 목표 가격 도달 시 즉각적인 알림 제공

## 🛠️ 기술 스택 (Tech Stack)

- **Frontend**: Next.js 14, React, TailwindCSS, Lucide Icons, Recharts
- **Backend**: Python 3.12+, FastAPI, Yfinance, Scipy, Pandas, OpenAI API

## 📋 설치 방법 (Installation)

만약 처음 실행한다면 각 폴더에서 의존성을 설치해야 합니다.

**Backend:**
```bash
cd backend
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install
```

## 📝 라이선스
MIT License
