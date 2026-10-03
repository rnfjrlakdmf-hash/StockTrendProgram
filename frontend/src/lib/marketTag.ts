/**
 * 국내 및 해외 주식 시장(거래소) 식별 및 전용 뱃지 유틸리티
 * 
 * - 국내: 코스피 (KOSPI), 코스닥 (KOSDAQ), 코넥스 (KONEX)
 * - 해외(미국): 나스닥 (NASDAQ), 뉴욕증권거래소 (NYSE), 아멕스 (AMEX), S&P 500
 */

export interface MarketInfo {
    market: 'KOSPI' | 'KOSDAQ' | 'KONEX' | 'NASDAQ' | 'NYSE' | 'AMEX' | 'S&P500';
    label: string;
    style: string;
    flag: string;
    isUS: boolean;
}

// 1. 국내 주요 코스닥 종목 사전 (빠른 0ms 즉시 판별)
const KOSDAQ_SYMBOLS = new Set([
    '196170', // 알테오젠
    '247540', // 에코프로비엠
    '086520', // 에코프로
    '277810', // 레인보우로보틱스
    '028300', // HLB
    '263750', // 펄어비스
    '214150', // 클래시스
    '293490', // 카카오게임즈
    '058470', // 리노공업
    '035900', // JYP Ent.
    '091990', // 셀트리온제약
    '041510', // 에스엠
    '036570', // 엔씨소프트
    '066970', // 엘앤에프
    '145020', // 휴젤
    '328130', // 루닛
    '259960', // 크래프톤 (코스피이지만 유의)
]);

// 2. 미국 NYSE 상장 주요 종목
const NYSE_SYMBOLS = new Set([
    'OKLO', 'IONQ', 'JOBY', 'ACHR', 'BBAI', 'RDW', 'PL', 'AI', 'SMR', 'F', 'BA', 'GM',
    'IBM', 'CAT', 'JPM', 'V', 'UNH', 'MA', 'WMT', 'JNJ', 'PG', 'HD', 'ORCL', 'BAC',
    'CVX', 'ABBV', 'KO', 'MRK', 'CRM', 'XOM', 'DIS', 'ACN', 'TMO', 'MCD', 'ABT',
    'LIN', 'WFC', 'GE', 'PM', 'VZ', 'NOW', 'DHR', 'NEE', 'RTX', 'UNP', 'LOW', 'PFE',
    'SPGI', 'MS', 'GS', 'ELV', 'BLK', 'SYK', 'T', 'DE', 'LMT', 'SCHW', 'MDT', 'TJX',
    'AXP', 'CB', 'BMY', 'CI', 'C', 'MMC', 'VLO', 'EOG', 'OXY', 'SLB', 'NIO', 'BABA', 'TSM', 'SPOT'
]);

// 3. 미국 AMEX (주요 ETF 등)
const AMEX_SYMBOLS = new Set([
    'SOXL', 'SPY', 'IVV', 'VOO', 'DIA', 'IWM', 'XLE', 'XLF', 'XLK', 'GDX', 'HYG', 'EEM'
]);

// 4. 미국 나스닥 상장 주요 종목
const NASDAQ_SYMBOLS = new Set([
    'AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'GOOG', 'META', 'TSLA', 'AVGO', 'COST',
    'PEP', 'CSCO', 'NFLX', 'ADBE', 'TMUS', 'AMD', 'QCOM', 'TXN', 'AMGN', 'INTC',
    'INTU', 'HON', 'AMAT', 'BKNG', 'ISRG', 'SBUX', 'MDLZ', 'GILD', 'LRCX', 'ADI',
    'ADP', 'REGN', 'PANW', 'VRTX', 'KLAC', 'SNPS', 'CDNS', 'ASML', 'ARM', 'CRWD',
    'MELI', 'PYPL', 'ABNB', 'MRVL', 'ORLY', 'CTAS', 'NXPI', 'DXCM', 'FTNT', 'WDAY',
    'PLTR', 'SMCI', 'COIN', 'MSTR', 'ROKU', 'SOFI', 'HOOD', 'RIVN', 'LCID',
    'RGTI', 'RKLB', 'SOUN', 'ASTS', 'SERV', 'LUNR', 'MARA', 'NVDL', 'TQQQ'
]);

/**
 * 종목 코드/티커 및 텍스트 힌트를 기반으로 시장 정보(라벨, 스타일, 국가 플래그)를 반환합니다.
 */
export function getMarketInfo(symbol?: string, hintText?: string): MarketInfo {
    const rawSym = (symbol || '').toUpperCase().trim();
    const cleanSym = rawSym.includes('.') ? rawSym.split('.')[0] : rawSym;
    const text = `${hintText || ''} ${rawSym}`.toUpperCase();

    // 1. 텍스트 힌트에 명시된 경우 우선 처리
    if (text.includes('[코스피]') || text.includes('KOSPI') || rawSym.endsWith('.KS')) {
        return {
            market: 'KOSPI',
            label: '코스피',
            style: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
            flag: '🇰🇷',
            isUS: false,
        };
    }
    if (text.includes('[코스닥]') || text.includes('KOSDAQ') || rawSym.endsWith('.KQ')) {
        return {
            market: 'KOSDAQ',
            label: '코스닥',
            style: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
            flag: '🇰🇷',
            isUS: false,
        };
    }
    if (text.includes('[코넥스]') || text.includes('KONEX')) {
        return {
            market: 'KONEX',
            label: '코넥스',
            style: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
            flag: '🇰🇷',
            isUS: false,
        };
    }

    if (text.includes('[NYSE]') || text.includes('뉴욕증시')) {
        return {
            market: 'NYSE',
            label: 'NYSE',
            style: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
            flag: '🇺🇸',
            isUS: true,
        };
    }
    if (text.includes('[AMEX]') || text.includes('아멕스')) {
        return {
            market: 'AMEX',
            label: 'AMEX',
            style: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
            flag: '🇺🇸',
            isUS: true,
        };
    }
    if (text.includes('[나스닥]') || text.includes('NASDAQ')) {
        return {
            market: 'NASDAQ',
            label: '나스닥',
            style: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
            flag: '🇺🇸',
            isUS: true,
        };
    }
    if (text.includes('[S&P500]') || text.includes('S&P 500')) {
        return {
            market: 'S&P500',
            label: 'S&P 500',
            style: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
            flag: '🇺🇸',
            isUS: true,
        };
    }

    // 2. 국내 6자리 숫자 코드 검사
    if (/^\d{6}$/.test(cleanSym)) {
        if (KOSDAQ_SYMBOLS.has(cleanSym)) {
            return {
                market: 'KOSDAQ',
                label: '코스닥',
                style: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
                flag: '🇰🇷',
                isUS: false,
            };
        }
        return {
            market: 'KOSPI',
            label: '코스피',
            style: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
            flag: '🇰🇷',
            isUS: false,
        };
    }

    // 3. 해외/미국 주식 티커 판별
    if (NYSE_SYMBOLS.has(cleanSym)) {
        return {
            market: 'NYSE',
            label: 'NYSE',
            style: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
            flag: '🇺🇸',
            isUS: true,
        };
    }
    if (AMEX_SYMBOLS.has(cleanSym)) {
        return {
            market: 'AMEX',
            label: 'AMEX',
            style: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
            flag: '🇺🇸',
            isUS: true,
        };
    }
    if (NASDAQ_SYMBOLS.has(cleanSym)) {
        return {
            market: 'NASDAQ',
            label: '나스닥',
            style: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
            flag: '🇺🇸',
            isUS: true,
        };
    }

    // 4. 알파벳 기반 티커 휴리스틱 (1~3자리: NYSE 전통 대형주, 4자리 이상: 나스닥)
    if (/^[A-Z]+$/.test(cleanSym)) {
        if (cleanSym.length <= 3) {
            return {
                market: 'NYSE',
                label: 'NYSE',
                style: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
                flag: '🇺🇸',
                isUS: true,
            };
        }
        return {
            market: 'NASDAQ',
            label: '나스닥',
            style: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
            flag: '🇺🇸',
            isUS: true,
        };
    }

    // 5. 기본값: 국내 코스피
    return {
        market: 'KOSPI',
        label: '코스피',
        style: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
        flag: '🇰🇷',
        isUS: false,
    };
}
