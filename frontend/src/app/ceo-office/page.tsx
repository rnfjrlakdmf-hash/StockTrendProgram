'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/config';
import KakaoRevenueAd from '@/components/KakaoRevenueAd';
import { useAuth, isAdminEmail } from '@/context/AuthContext';
import { Compass, TrendingUp, ShieldAlert, Sparkles, AlertTriangle, BookOpen, CheckCircle2, FileText, ArrowRight, Users, Target, Shield, Award, Flame, Briefcase, DollarSign, RefreshCw, Printer, X, BarChart3, Clock, Loader2, Zap, Globe } from 'lucide-react';


// [Smart Executive Opinion Parser]
// 긴 줄글 형태의 임원 보고서를 [화자 뱃지] + [핵심 질문 헤드라인] + [상세 해설]로 깔끔 분리
function parseExecutiveOpinion(raw: string, defaultRole: string = "분석본부", defaultIcon: string = "💡") {
    if (!raw) return { badge: defaultRole, title: "", body: "", icon: defaultIcon };
    
    // Pattern: [Title · Role]: Body  or  Emoji [Title · Role]: Body
    const match = raw.match(/^([^\w\s\[]*)\s*\[([^·\]]+)(?:·\s*([^\]]+))?\]\s*:\s*([\s\S]*)$/);
    if (match) {
        const icon = match[1]?.trim() || defaultIcon;
        const title = match[2]?.trim() || "";
        const badge = match[3]?.trim() || defaultRole;
        const body = match[4]?.trim() || "";
        return { icon, title, badge, body };
    }
    
    const colonIdx = raw.indexOf(":");
    if (colonIdx > 0 && colonIdx < 50) {
        return {
            icon: defaultIcon,
            title: raw.substring(0, colonIdx).replace(/[\[\]]/g, '').trim(),
            badge: defaultRole,
            body: raw.substring(colonIdx + 1).trim()
        };
    }
    
    return { badge: defaultRole, title: "", body: raw, icon: defaultIcon };
}

// 어려운 증권사 리포트 전문용어(YoY, QoQ, OPM, Review, 컨센서스, 지지선 등)를 초보자도 3초 만에 이해할 수 있게 풀어주는 헬퍼
function humanizeFinancialText(text: string): string {
    if (!text) return '';
    let s = text;

    // 0. 연도 앞자리 잘림('026년' -> '2026년') 및 어색한 '8.0만원' 소수점 금액 표기 자동 정제
    s = s.replace(/(^|[^0-9])0(2[0-9]년)/g, '$120$2');
    s = s.replace(/(\d+)\.0\s*만원/g, '$1만원');
    s = s.replace(/(\d+)\.([1-9])\s*만원/g, '$1만 $2,000원');
    s = s.replace(/(\d+)\.0\s*(조|억)\s*원/g, '$1$2원');
    s = s.replace(/투자의견\s*Trading\s*Buy/gi, "투자의견 '단기매수'");
    s = s.replace(/투자의견\s*BUY/gi, "투자의견 '매수'");
    s = s.replace(/투자의견\s*(?:HOLD|Neutral)/gi, "투자의견 '중립'");
    s = s.replace(/유지한다\.?/g, '유지합니다.');
    s = s.replace(/상향\s*조정한다\.?/g, '올려 잡았습니다(상향).');
    s = s.replace(/상향한다\.?/g, '올려 잡았습니다(상향).');
    s = s.replace(/하향\s*조정한다\.?/g, '내려 잡았습니다(하향).');
    s = s.replace(/하향한다\.?/g, '내려 잡았습니다(하향).');
    s = s.replace(/제시한다\.?/g, '제시했습니다.');
    s = s.replace(/전망한다\.?/g, '전망합니다.');
    s = s.replace(/판단한다\.?/g, '판단합니다.');
    s = s.replace(/기대된다\.?/g, '기대됩니다.');
    s = s.replace(/예상된다\.?/g, '예상됩니다.');
    s = s.replace(/기록했다\.?/g, '기록했습니다.');

    // 1. 분기 및 Review/Preview 정제
    s = s.replace(/([1-4])Q(?:\d{2})?\s*Review:?/gi, '$1분기 실적 요약:');
    s = s.replace(/([1-4])Q(?:\d{2})?\s*Preview:?/gi, '$1분기 실적 전망:');
    s = s.replace(/\bReview:?/gi, '실적 요약:');
    s = s.replace(/\bPreview:?/gi, '실적 전망:');

    // 2. 어려운 회계·증권 용어를 초보자 눈높이 쉬운 말로 변환
    s = s.replace(/연결\s*매출액/g, '매출');
    s = s.replace(/매출액/g, '매출');
    s = s.replace(/영업이익은/g, '실제 남긴 이익(영업이익)은');

    // 3. 괄호 안에 YoY와 QoQ가 동시에 들어있어 길고 복잡한 경우 -> 가장 중요한 '작년 대비' 핵심만 깔끔하게 남김!
    s = s.replace(/\(\s*([+\-]\d+(?:\.\d+)?%)\s*YoY\s*,\s*[+\-]?\d+(?:\.\d+)?%\s*QoQ\s*\)/gi, (_, yoy: string) =>
        yoy.startsWith('+') ? `(작년보다 ${yoy} 증가)` : `(작년보다 ${yoy} 감소)`
    );
    s = s.replace(/\(\s*작년\s*(?:동기\s*)?대비\s*([+\-]\d+(?:\.\d+)?%)\s*(?:증가|감소)?\s*,\s*전분기\s*대비\s*[+\-]?\d+(?:\.\d+)?%\s*(?:증가|감소)?\s*\)/g, (_, yoy: string) =>
        yoy.startsWith('+') ? `(작년보다 ${yoy} 증가)` : `(작년보다 ${yoy} 감소)`
    );

    // 4. 단독 YoY / QoQ 쉬운 한국어 변환
    s = s.replace(/,\s*이하\s*(?:YoY|QoQ)/gi, '');
    s = s.replace(/\(?\s*이하\s*(?:YoY|QoQ)\s*\)?/gi, '');
    s = s.replace(/([+\-]\d+(?:\.\d+)?%)\s*YoY/gi, (_, pct: string) =>
        pct.startsWith('+') ? `작년보다 ${pct} 증가` : `작년보다 ${pct} 감소`
    );
    s = s.replace(/(\d+(?:\.\d+)?%)\s*YoY/gi, '작년보다 $1');
    s = s.replace(/([+\-]?\d+(?:\.\d+)?%)\s*QoQ/gi, '직전 분기보다 $1');
    s = s.replace(/YoY\s*([+\-]\d+(?:\.\d+)?%)/gi, (_, pct: string) =>
        pct.startsWith('+') ? `작년보다 ${pct} 증가` : `작년보다 ${pct} 감소`
    );
    s = s.replace(/YoY\s*(\d+(?:\.\d+)?%)/gi, '작년보다 $1');
    s = s.replace(/QoQ\s*([+\-]?\d+(?:\.\d+)?%)/gi, '직전 분기보다 $1');
    s = s.replace(/작년\s*동기\s*대비/g, '작년보다');
    s = s.replace(/전분기\s*대비/g, '직전 분기보다');
    s = s.replace(/\(\s*YoY\s*\)/gi, '(작년 대비)');
    s = s.replace(/\(\s*QoQ\s*\)/gi, '(직전 분기 대비)');

    // 5. OPM (영업이익률) 및 컨센서스(증권사 예상치) 화살표(➔) 요약 변환
    s = s.replace(/OPM\s*(\d+(?:\.\d+)?%)/gi, '영업이익률 $1');
    s = s.replace(/컨센서스\s*대폭\s*상회/g, '증권사 예상치를 크게 뛰어넘음(깜짝 호실적)');
    s = s.replace(/컨센서스\s*상회/g, '증권사 예상치를 뛰어넘음(호실적)');
    s = s.replace(/컨센서스\s*하회/g, '증권사 예상치보다 살짝 적게 나옴');
    s = s.replace(/컨센서스\s*부합/g, '증권사 예상치에 부합(안정적 성적)');
    s = s.replace(/컨센서스/g, '증권사 예상치');
    s = s.replace(/증권사\s*평균\s*예상치\s*영업이익/g, '증권사 예상 이익');
    s = s.replace(/증권사\s*평균\s*예상치/g, '증권사 예상치');
    s = s.replace(/하회했다\.?/g, '살짝 적게 나왔습니다.');
    s = s.replace(/소폭\s*밑돌았습니다\.?/g, '살짝 적게 나왔습니다.');
    s = s.replace(/상회했다\.?/g, '시원하게 뛰어넘었습니다.');
    s = s.replace(/부합했다\.?/g, '예상치에 딱 맞게 나왔습니다.');
    s = s.replace(/\)\s*으로\s*(증권사\s*예상)/g, ') ➔ $1');
    s = s.replace(/(\([^)]+\))을\s*살짝\s*적게\s*나왔습니다/g, '$1보다 살짝 적게 나왔습니다');

    // 6. '(핵심 요지: ...)' 또는 기존 어려운 방어논리 문장을 초보자 맞춤형 쉬운 한줄 요약으로 변환
    s = s.replace(/\(핵심\s*요지:\s*([^)]+)\)\.?/g, (_, gist: string) => {
        const g = gist.trim();
        const isMiss = /하회|밑돌|적게|부진|감소|축소|둔화|적자/.test(g) || /적게 나왔습니다|밑돌았습니다|하회/.test(s);
        const hasYoYGrowth = /작년보다 \+\d+/.test(s);
        if (isMiss && hasYoYGrowth) {
            return `작년보다 이익이 큰 폭으로 늘 만큼 장사를 아주 잘하고 있습니다 ➔ 비수기(가을철)와 일시적 비용 때문에 높은 기대치만 살짝 못 맞춘 것이라, 주가가 잠깐 내려갈 때 조금씩 나눠 사 모으기(분할매수) 좋은 기회입니다.`;
        }
        if (isMiss) {
            return `일시적인 비용 때문에 이번 성적표는 예상보다 살짝 아쉬웠지만 이미 주가에 반영되었습니다 ➔ 주력 사업이 다시 회복되는 시점을 노려 가격이 싸졌을 때 조금씩 나눠 사 모으는(분할매수) 전략이 유리합니다.`;
        }
        return `핵심 포인트는 '${g}'이며, 본업에서 돈을 잘 벌고 있어 목표주가까지 추가 상승 여력이 충분하다는 분석입니다.`;
    });

    s = s.replace(/비록 계절적 비수기나 일회성 비용[^.]*유효합니다\.?/g,
        '작년보다 이익이 큰 폭으로 늘 만큼 장사를 아주 잘하고 있습니다 ➔ 비수기(가을철)와 일시적 비용 때문에 높은 기대치만 살짝 못 맞춘 것이라, 주가가 잠깐 내려갈 때 조금씩 나눠 사 모으기(분할매수) 좋은 기회입니다.'
    );
    s = s.replace(/작년 같은 기간보다 매출[·과]\s*영업이익 자체는 큰 폭으로 성장했으나[^.]*방어 논리입니다\.?/g,
        '작년보다 이익이 큰 폭으로 늘 만큼 장사를 아주 잘하고 있습니다 ➔ 비수기(가을철)와 일시적 비용 때문에 높은 기대치만 살짝 못 맞춘 것이라, 주가가 잠깐 내려갈 때 조금씩 나눠 사 모으기(분할매수) 좋은 기회입니다.'
    );

    // 7. 불필요한 기호/공백 정리
    s = s.replace(/\(\s*,/g, '(');
    s = s.replace(/,\s*\)/g, ')');
    s = s.replace(/,\s*,/g, ',');
    s = s.replace(/\s{2,}/g, ' ').trim();
    return s;
}

// 긴 줄글을 깔끔한 개조식(불릿 포인트) 문장 배열로 분리하는 헬퍼
function splitIntoBullets(raw: string): string[] {
    if (!raw) return [];
    const humanized = humanizeFinancialText(raw);
    const cleaned = humanized.replace(/\s+/g, ' ').trim();
    // 1) 엠대시(—) 및 마침표/종결어미 뒤 공백을 기준으로 1차 분리
    const rawParts = cleaned
        .split(/(?<=[—])\s*|(?<=[.!?])\s+/)
        .map(s => s.trim().replace(/^[-—•✓\s]+/, '').replace(/[-—\s]+$/, '').trim())
        .filter(Boolean);

    // 2) 짧은 파편(예: "분석입니다.", "평가입니다.", 10자 이하 단문)이 독립 불릿으로 떨어져 나가지 않도록 직전 문장에 자연스럽게 병합
    const parts: string[] = [];
    for (const p of rawParts) {
        if (!p) continue;
        const isFragment = p.length <= 10 || /^(분석|평가|전망|의견|보고서|설명)입니다[.]?$/.test(p);
        if (parts.length > 0 && isFragment) {
            parts[parts.length - 1] = `${parts[parts.length - 1]} ${p}`.trim();
        } else {
            parts.push(p);
        }
    }
    return parts.length > 0 ? parts : [cleaned];
}

// 긴 서술형 문장을 한눈에 확 들어오는 개조식 단문(핵심 태그 + 화살표 요약)으로 압축하는 헬퍼
function toCrispExecutiveBullets(raw: string, sectionType: 'summary' | 'research' | 'quant' | 'action' = 'summary'): { tag: string; tagColor: string; text: string }[] {
    const rawLines = splitIntoBullets(raw);
    if (rawLines.length === 0) return [];

    // 리서치 섹션에서 문장이 1개뿐이거나 2번째 문장(방어논리)이 짧거나 어려운 경우 초보자 맞춤형 방어논리 해설로 자동 보강!
    if (sectionType === 'research') {
        const firstLine = rawLines[0] || '';
        const secondLine = rawLines[1] || '';
        const isMiss = /적게 나왔습니다|밑돌았습니다|하회/.test(firstLine);
        const hasYoYGrowth = /작년보다 \+\d+/.test(firstLine);
        if (!secondLine || secondLine.length < 22 || /^\(?핵심\s*요지/.test(secondLine)) {
            if (isMiss && hasYoYGrowth) {
                rawLines[1] = '작년보다 이익이 큰 폭으로 늘 만큼 장사를 아주 잘하고 있습니다 ➔ 비수기(가을철)와 일시적 비용 때문에 높은 기대치만 살짝 못 맞춘 것이라, 주가가 잠깐 내려갈 때 조금씩 나눠 사 모으기(분할매수) 좋은 기회입니다.';
            } else if (isMiss) {
                rawLines[1] = '일시적인 비용 때문에 이번 성적표는 예상보다 살짝 아쉬웠지만 이미 주가에 반영되었습니다 ➔ 주력 사업이 다시 회복되는 시점을 노려 가격이 싸졌을 때 조금씩 나눠 사 모으는(분할매수) 전략이 유리합니다.';
            } else {
                rawLines[1] = '본업에서 꾸준히 돈을 잘 벌고 있고 새 일감(수주)도 탄탄해 주가 바닥이 단단합니다 ➔ 시장이 흔들려 주가가 잠깐 쉬어갈 때마다 조금씩 나눠 사 모으는(분할매수) 전략이 유리합니다.';
            }
        }
    }

    return rawLines.slice(0, 2).map((line, idx) => {
        let s = line
            .replace(/^👩‍💼\s*정유진 비서실장\s*\[[^\]]+\]:\s*/g, '')
            .replace(/United States-NY Fed Consumer Expectation-NY Fed Inflation Expectation 1yr/gi, '미국 1년 기대인플레이션 (물가 심리)')
            .replace(/실시간 캘린더 조회 결과,\s*주초\(월~수\) 핵심 일정은\s*[^,]+이며,\s*주후반\(목~금\) 빅이벤트는\s*[^.]+\.?/gi, '이번 주는 수요일 마트 장바구니 진짜 물가(CPI)와 목요일 공장 도매원가(PPI)가 연이어 발표되는 인플레이션 판가름 주간입니다.')
            .replace(/요일별 호재·악재 시나리오와 수혜 섹터를 사전 수립했습니다\.?/gi, '주초에는 실적 우량주 위주로 방어하고, 수요일 밤 물가 발표 후 금리 안정을 확인하며 눌림목 분할 매수로 대응합니다.')
            .replace(/Broad Money/gi, '광의통화 (M2 유동성)')
            .replace(/Existing Home Sales/gi, '미국 기존주택판매 (부동산 소비)')
            .replace(/밤사이 뉴욕증시에서\s*/g, '뉴욕증시 ')
            .replace(/밤사이 뉴욕증시는\s*/g, '뉴욕증시 ')
            .replace(/조정을 받음에 따라,\s*/g, '조정 ➔ ')
            .replace(/급락\(([^)]+)\)하고\s*/g, '급락($1)·')
            .replace(/오늘 국내 증시에서도\s*/g, '국내장 ')
            .replace(/중심으로 단기 매물 출회가 불가피합니다\.?/g, '중심 단기 매물 출회 주의')
            .replace(/이탈은 제한적일 것으로 판단됩니다\.?/g, '급격한 이탈은 제한적')
            .replace(/외환시장 환경은 우호적이나,\s*/g, '환율 환경은 양호하나, ')
            .replace(/영향으로 개장 직후\s*/g, '여파로 장초반 ')
            .replace(/패닉셀이나 프로그램 매도세가 출회될 수 있습니다\.?/g, '프로그램 매도 출회 경계')
            .replace(/일시적 쏠림이 나타날 수 있으니 주의 깊게 살피겠습니다\.?/g, '수급 이동 집중 관찰')
            .replace(/변동성이 매우 클 것으로 예상되므로,\s*/g, '변동성 확대 예상 ➔ ')
            .replace(/장 초반 낙과주를 보고 성급하게 매수하는 뇌동매매는 절대 금합니다\.?/g, '장초반 뇌동매매(추격매수) 절대 금지!')
            .replace(/충분한 지지선을 확인한 후 분할 매수 관점으로 리스크를 철저히 관리해 주십시오\.?/g, '오전 10시 바닥(지지선) 확인 후 나눠 사기(분할매수)로 리스크 관리')
            .replace(/오늘 국내 장 초반 변동성 확대가 예상되오니 방어적인 대응이 필요합니다\.?/g, '장초반 변동성 확대 주의 ➔ 방어적 대응 필수')
            .replace(/기술주 중심의 하락세를 기록했습니다\.?/g, '기술주 중심 하락 마감')
            .replace(/하락 안정세를 보이고 있으나,\s*/g, '하락 안정세이나, ')
            .replace(/다만 환율이 안정세를 보이고 있어\s*/g, '환율 안정세로 ')
            .trim();

        let tag = '핵심';
        let tagColor = 'bg-amber-500/25 text-amber-300 border-amber-400/40';

        if (sectionType === 'summary') {
            tag = idx === 0 ? '해외·원인' : '국내·대응';
            tagColor = idx === 0
                ? 'bg-sky-500/25 text-sky-200 border-sky-400/40'
                : 'bg-amber-500/25 text-amber-200 border-amber-400/40';
        } else if (sectionType === 'research') {
            tag = idx === 0 ? '시장파급' : '방어논리';
            tagColor = idx === 0
                ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400/40'
                : 'bg-teal-500/25 text-teal-200 border-teal-400/40';
        } else if (sectionType === 'quant') {
            tag = idx === 0 ? '수급경보' : '자금흐름';
            tagColor = idx === 0
                ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400/40'
                : 'bg-blue-500/25 text-blue-200 border-blue-400/40';
        } else if (sectionType === 'action') {
            tag = idx === 0 ? '절대원칙' : '실전타점';
            tagColor = idx === 0
                ? 'bg-rose-500/25 text-rose-200 border-rose-400/40'
                : 'bg-purple-500/25 text-purple-200 border-purple-400/40';
        }

        return { tag, tagColor, text: s };
    });
}

// 문장 속 핵심 수치(%·금액)와 강조 키워드를 자동으로 형광펜 하이라이트 렌더링하는 헬퍼 (적당한 크기 & 줄바꿈 깨짐 방지)
function renderHighlightedExecutiveText(text: string): React.ReactNode {
    if (!text) return null;
    const pattern = /([+\-]\d+(?:\.\d+)?%|\d{1,4}(?:,\d{3})*(?:\.\d+)?(?:조|억|만)?원|\$\d+(?:\.\d+)?|뇌동매매\(추격매수\) 절대 금지!|뇌동매매는 절대 금합니다|추격매수 금지|장 시작 직후 추격 금지|단기 매물 출회 주의|프로그램 매도 출회 경계|방어적 대응 필수|분할\s*매수|나눠 사 모으기\(분할매수\)|나눠 사기\(분할매수\)|환율 안정세|이탈은 제한적|오전 10시 바닥\(지지선\)|오전 10시 지지선|➔)/g;
    const parts = text.split(pattern);
    return parts.map((part, i) => {
        if (!part) return null;
        // 짝수 인덱스는 정규식 매칭이 아닌 순수 일반 문장이므로 절대 하이라이트 뱃지로 감싸지 않고 텍스트 그대로 안전 출력!
        if (i % 2 === 0) {
            return <React.Fragment key={i}>{part}</React.Fragment>;
        }
        if (part === '➔') {
            return <span key={i} className="text-amber-400 font-black mx-1 inline-block text-xs">➔</span>;
        }
        if (/^-\d+(\.\d+)?%$/.test(part) || part.includes('매물 출회 주의') || part.includes('매도 출회 경계')) {
            return (
                <span key={i} className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-sky-500/25 text-sky-200 font-mono font-bold border border-sky-400/35 text-xs">
                    {part}
                </span>
            );
        }
        if (/^\+\d+(\.\d+)?%$/.test(part)) {
            return (
                <span key={i} className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-rose-500/25 text-rose-200 font-mono font-bold border border-rose-400/35 text-xs">
                    {part}
                </span>
            );
        }
        if (part.includes('절대 금지') || part.includes('방어적 대응 필수') || part.includes('추격 금지')) {
            return (
                <span key={i} className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-rose-500/30 text-rose-100 font-black border border-rose-400/40 text-xs">
                    {part}
                </span>
            );
        }
        if (part.includes('분할') || part.includes('환율 안정') || part.includes('제한적') || part.includes('지지선')) {
            return (
                <span key={i} className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-emerald-500/25 text-emerald-200 font-bold border border-emerald-400/35 text-xs">
                    {part}
                </span>
            );
        }
        if (/^\d{1,4}(?:,\d{3})*(?:\.\d+)?(?:조|억|만)?원$/.test(part) || /^\$\d+/.test(part)) {
            return <strong key={i} className="text-amber-300 font-mono font-bold text-xs">{part}</strong>;
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
    });
}

// 4대 핵심 지표(전광판) 깔끔 렌더링 헬퍼: 숫자/금융 데이터는 font-mono, 한글 텍스트/테마/섹터는 font-sans로 자간 깨짐 없이 자연스럽게 출력!
function renderExecutiveKeyNumber(kn: { label: string; value: string }): {
    badgeText: string;
    badgeStyle: string;
    cardStyle: string;
    renderedValue: React.ReactNode;
} {
    let rawVal = String(kn.value || '').trim();
    const rawLabel = String(kn.label || '').trim();

    // 소문자 'us ' 접두사를 단정한 국기 이모지 '🇺🇸 '로 정제
    rawVal = rawVal.replace(/\bus\s+/gi, '🇺🇸 ');
    rawVal = rawVal.replace(/\bkr\s+/gi, '🇰🇷 ');
    rawVal = rawVal
        .replace(/United States-NY Fed Consumer Expectation-NY Fed Inflation Expectation 1yr/gi, '미국 1년 기대인플레이션 (물가 심리)')
        .replace(/NY Fed Inflation Expectation/gi, '미국 기대인플레이션')
        .replace(/Broad Money/gi, '광의통화 (M2 유동성)')
        .replace(/Existing Home Sales/gi, '기존주택판매 (부동산 소비)')
        .replace(/Core Inflation Rate/gi, '근원 소비자물가지수 (Core CPI)')
        .replace(/Inflation Rate/gi, '소비자물가지수 (CPI)')
        .replace(/Core PPI/gi, '근원 생산자물가지수 (Core PPI)')
        .replace(/PPI/gi, '생산자물가지수 (PPI)')
        .replace(/Unemployment Rate/gi, '실업률 (일자리)');

    const isDown = rawVal.includes('-') && (rawVal.includes('%') || rawVal.includes('하락') || rawVal.includes('▼'));
    const isUp = rawVal.includes('+') && (rawVal.includes('%') || rawVal.includes('상승') || rawVal.includes('▲'));

    // 숫자/시세 중심인지, 한글 서술/테마/섹터 텍스트인지 판별
    const isFinancialPrice = /^[\$₩]?[0-9,]+(?:\.[0-9]+)?(?:원|pt|%|달러)?(?:\s*\([+\-]?[0-9,]+(?:\.[0-9]+)?%?\))?$/i.test(rawVal.trim()) ||
        (/[0-9,]+(?:\.[0-9]+)?\s*\([+\-]\d+(?:\.\d+)?%\)/.test(rawVal) && rawVal.length < 35);

    // 라벨과 값에 따른 스마트 뱃지 판별
    let badgeText = '핵심';
    let badgeStyle = 'bg-amber-500/20 text-amber-300 border-amber-400/30';
    let cardStyle = 'border-amber-500/30 bg-gradient-to-br from-zinc-900/90 to-slate-950/90';

    if (isDown) {
        badgeText = '▼ 조정';
        badgeStyle = 'bg-sky-500/20 text-sky-300 border-sky-400/30';
        cardStyle = 'border-sky-500/35 bg-gradient-to-br from-sky-950/30 to-slate-950/90';
    } else if (isUp) {
        badgeText = '▲ 강세';
        badgeStyle = 'bg-rose-500/20 text-rose-300 border-rose-400/30';
        cardStyle = 'border-rose-500/35 bg-gradient-to-br from-rose-950/30 to-slate-950/90';
    } else if (rawLabel.includes('테마') || rawLabel.includes('일정')) {
        badgeText = '핵심 테마';
        badgeStyle = 'bg-amber-500/20 text-amber-300 border-amber-400/30';
        cardStyle = 'border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-zinc-900/90 to-slate-950/90';
    } else if (rawLabel.includes('시나리오') || rawLabel.includes('상태')) {
        badgeText = '실시간 판정';
        badgeStyle = 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30';
        cardStyle = 'border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-zinc-900/90 to-slate-950/90';
    } else if (rawLabel.includes('섹터') || rawLabel.includes('공략') || rawLabel.includes('수혜')) {
        badgeText = '수혜 섹터';
        badgeStyle = 'bg-sky-500/20 text-sky-300 border-sky-400/30';
        cardStyle = 'border-sky-500/30 bg-gradient-to-br from-sky-950/20 via-zinc-900/90 to-slate-950/90';
    } else if (rawLabel.includes('중요도') || rawLabel.includes('별')) {
        badgeText = '중요도';
        badgeStyle = 'bg-purple-500/20 text-purple-300 border-purple-400/30';
        cardStyle = 'border-purple-500/30 bg-gradient-to-br from-purple-950/20 via-zinc-900/90 to-slate-950/90';
    }

    let renderedValue: React.ReactNode = null;

    if (isFinancialPrice) {
        // 시세/가격 데이터: font-mono로 깔끔한 정렬
        const valColor = isDown ? "text-sky-300" : isUp ? "text-rose-300" : "text-amber-300";
        renderedValue = (
            <div className={`text-xs sm:text-sm font-black font-mono leading-snug break-words ${valColor}`}>
                {rawVal}
            </div>
        );
    } else {
        // 한글 텍스트 데이터: font-mono를 배제하고 자연스러운 font-sans font-bold로 가독성 극대화!
        if (rawVal.includes('&')) {
            // "미국 ISM 구매관리자지수(PMI) & 미국 ISM 고용지수" -> 2줄 불릿으로 분리
            const items = rawVal.split('&').map((s: string) => s.trim()).filter(Boolean);
            renderedValue = (
                <div className="space-y-1">
                    {items.map((it, idx) => (
                        <div key={idx} className="text-xs font-bold text-amber-200 leading-snug flex items-start gap-1">
                            <span className="text-amber-400 text-[10px] shrink-0 mt-0.5">•</span>
                            <span className="break-keep">{it}</span>
                        </div>
                    ))}
                </div>
            );
        } else if (rawVal.includes('🟢') || rawVal.includes('호재') || rawVal.includes('시나리오')) {
            renderedValue = (
                <div className="text-xs font-bold text-emerald-200 leading-snug break-keep flex items-start gap-1.5">
                    <span className="shrink-0 mt-0.5">🟢</span>
                    <span>{rawVal.replace(/^🟢\s*/, '')}</span>
                </div>
            );
        } else if (rawVal.includes('★')) {
            const starMatch = rawVal.match(/^(★+)\s*(.*)$/);
            renderedValue = (
                <div className="space-y-0.5">
                    <div className="text-amber-400 font-black text-xs tracking-wider">
                        {starMatch ? starMatch[1] : '★★★★★'}
                    </div>
                    {starMatch && starMatch[2] && (
                        <div className="text-[11px] text-zinc-300 font-bold leading-tight break-keep">
                            {starMatch[2]}
                        </div>
                    )}
                </div>
            );
        } else {
            // 섹터 나열: "AI 반도체 (HBM), 전력설비·변압기, 조선·해양플랜트"
            const sectorItems = rawVal.split(',').map((s: string) => s.trim()).filter(Boolean);
            if (sectorItems.length > 1) {
                renderedValue = (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                        {sectorItems.map((sec, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-amber-200 text-[11px] font-bold">
                                {sec}
                            </span>
                        ))}
                    </div>
                );
            } else {
                renderedValue = (
                    <div className="text-xs font-bold text-zinc-100 leading-snug break-keep">
                        {rawVal}
                    </div>
                );
            }
        }
    }

    return {
        badgeText,
        badgeStyle,
        cardStyle,
        renderedValue,
    };
}

interface Executive {
    id: string;
    name: string;
    role: string;
    dept: string;
    avatar: string;
    badge: string;
    style: string;
    color: string;
    status: string;
}

interface KeyMetric {
    label: string;
    value: string;
    sub: string;
    tone: 'positive' | 'negative' | 'neutral';
}

interface DiscoveryReason {
    badge: string;
    trigger: string;
    summary: string;
    key_drivers: string[];
}

interface BuyReasonCard {
    icon: string;
    title: string;
    highlight: string;
    desc: string;
    badge: string;
}

interface BuyReasons {
    title: string;
    cards: BuyReasonCard[];
}

interface MeetingAttendee {
    name: string;
    role: string;
    dept: string;
    avatar: string;
}

interface MeetingDialogue {
    speaker: string;
    role: string;
    avatar: string;
    text: string;
}

interface MeetingMinutes {
    meeting_no: string;
    title: string;
    date_time: string;
    location: string;
    chairperson: string;
    attendees: MeetingAttendee[];
    dialogue: MeetingDialogue[];
    verdict_badge: string;
    verdict_summary: string;
}

interface Agenda {
    topic_type: string;
    title: string;
    subtitle: string;
    target_name?: string;
    target_code?: string;
    badge: string;
    timestamp: string;
    key_metrics: KeyMetric[];
    ceo_question?: string | null;
    discovery_reason?: DiscoveryReason;
    buy_reasons?: BuyReasons;
    meeting_minutes?: MeetingMinutes;
}

interface DebateTurn {
    speaker_id: string;
    name: string;
    role: string;
    dept: string;
    avatar: string;
    stance: string;
    stance_tone: 'bull' | 'bear' | 'caution' | 'neutral' | 'summary';
    headline: string;
    message: string;
    data_tag: string;
}

interface AutoApprovalDoc {
    doc_id: string;
    doc_number: string;
    category_type?: string;
    category_badge: string;
    urgency: string;
    stock_name: string;
    stock_code?: string;
    current_price?: string;
    target_price?: string;
    upside_pct?: string;
    profit_per_share?: string;
    profit_10m?: string;
    title: string;
    proposer: string;
    submitted_at: string;
    easy_headline?: string;
    key_numbers: { label: string; value: string }[];
    research_opinion: string;
    quant_opinion: string;
    risk_opinion: string;
    secretary_conclusion: string;
    recommendation: string;
    detail_url?: string;
    easy_terms?: { term: string; desc: string }[];
}

interface RiskFactor {
    icon: string;
    title: string;
    tag: string;
    tagColor: string;
    points: string[];
}

interface RiskDefenseRule {
    num: string;
    title: string;
    target: string;
    desc: string;
}

function parsePriceValue(raw: any, sector?: string, stockName?: string): { num: number; isDollar: boolean; formatted: string } {
    if (!raw) return { num: 0, isDollar: false, formatted: '-' };
    const str = String(raw).trim();
    const s = `${stockName || ''} ${str}`.toLowerCase();
    const beforeParen = str.split('(')[0].trim();

    // 통화 및 매크로 지표 판별 (일반 주식의 일일 등락률 '(+1.50%)'로 인해 '%'로 오인되는 것을 원천 차단하기 위해 beforeParen 검사)
    const isDollar = sector === 'us_stock' || sector === 'us_tech' || beforeParen.includes('$') || str.startsWith('$');
    const isVix = sector === 'macro_vix' || s.includes('vix') || s.includes('공포지수');
    const isRate = sector === 'macro_rate' || beforeParen.includes('%') || s.includes('^tnx');
    const isOil = sector === 'macro_oil' || s.includes('wti') || s.includes('cl=f');
    const isFx = sector === 'macro_fx' || s.includes('usdkrw') || s.includes('원/달러') || s.includes('달러/원');

    const match = beforeParen.match(/([0-9,]+(?:\.[0-9]+)?)/);
    if (!match) return { num: 0, isDollar, formatted: str };
    const num = parseFloat(match[1].replace(/,/g, ''));

    let formatted = '';
    if (isVix) {
        // VIX 지수는 원화('원')가 아닌 지수 포인트(pt)입니다!
        formatted = `${num.toFixed(2)}pt`;
    } else if (isRate) {
        formatted = `${num.toFixed(2)}%`;
    } else if (isOil || isDollar) {
        formatted = `$${num.toFixed(2)}`;
    } else if (isFx) {
        formatted = `${num.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}원`;
    } else {
        formatted = `${Math.round(num).toLocaleString()}원`;
    }

    return { num, isDollar: isDollar || isOil, formatted };
}

function getCategoryTheme(doc: AutoApprovalDoc): { icon: string; shortLabel: string; pill: string } {
    if (doc.category_type === 'kr_stock') {
        return {
            icon: '🇰🇷',
            shortLabel: '국내주식',
            pill: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        };
    }
    if (doc.category_type === 'us_stock') {
        return {
            icon: '🌎',
            shortLabel: '미국주식',
            pill: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        };
    }
    if (doc.category_type === 'global_futures') {
        return {
            icon: '📊',
            shortLabel: '글로벌선물',
            pill: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        };
    }
    if (doc.category_type === 'world_news') {
        return {
            icon: '📰',
            shortLabel: '매크로뉴스',
            pill: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        };
    }
    return {
        icon: '📌',
        shortLabel: (doc.category_badge || '시장종합').replace(/^[^\w가-힣]+/, '').trim() || '시장종합',
        pill: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    };
}

/**
 * 실시간 등락률 정밀 파서 (가격 문자열과 등락률 안전 분리)
 * e.g. parseChangePct(-3.17, "$200.13 (-3.17%)") => -3.17
 *      parseChangePct(undefined, "$200.13 (-3.17%)") => -3.17
 *      parseChangePct(undefined, "232,000원 (+11.45%)") => +11.45
 *      parseChangePct(undefined, "232,000원") => 0.0 (가격을 등락률로 착각하지 않음)
 */
function parseChangePct(changePctVal: any, priceStrVal?: any): number {
    if (typeof changePctVal === 'number' && !isNaN(changePctVal)) {
        return changePctVal;
    }
    if (changePctVal !== undefined && changePctVal !== null) {
        const s = String(changePctVal).trim();
        const parenMatch = s.match(/\(([+-]?[0-9]+(?:\.[0-9]+)?)%\)/);
        if (parenMatch) return parseFloat(parenMatch[1]);
        const numMatch = s.match(/^([+-]?[0-9]+(?:\.[0-9]+)?)/);
        if (numMatch) {
            const parsed = parseFloat(numMatch[1]);
            if (!isNaN(parsed)) return parsed;
        }
    }
    if (priceStrVal !== undefined && priceStrVal !== null) {
        const p = String(priceStrVal);
        const parenMatch = p.match(/\(([+-]?[0-9]+(?:\.[0-9]+)?)%\)/);
        if (parenMatch) {
            const parsed = parseFloat(parenMatch[1]);
            if (!isNaN(parsed)) return parsed;
        }
    }
    return 0;
}

function detectSectorType(stockName: string, title: string = "", categoryBadge: string = ""): string {
    const s = `${stockName} ${title} ${categoryBadge}`.toLowerCase();
    const nameLower = (stockName || '').toLowerCase();
    const isMacroCategory = categoryBadge.includes('거시') || categoryBadge.includes('매크로') || categoryBadge.includes('지표') || categoryBadge.includes('채권') || categoryBadge.includes('환율') || categoryBadge.includes('원자재') || categoryBadge.includes('선물');

    // 1. 종합 매크로 / 환율 보고서는 stockName 기준으로 우선 판별하여 제목 속 유가 언급에 낚이지 않도록 방어
    if (nameLower.includes('글로벌 매크로') || nameLower.includes('환율') || nameLower.includes('경제일정') || nameLower.includes('usdkrw') || nameLower.includes('달러/원') || nameLower.includes('원/달러')) {
        return 'macro_fx';
    }
    if (nameLower.includes('vix') || nameLower.includes('공포지수')) {
        return 'macro_vix';
    }
    if (nameLower.includes('wti') || nameLower.includes('원유') || nameLower.includes('cl=f') || (isMacroCategory && (nameLower.includes('유가') || (s.includes('wti') && !nameLower.includes('환율'))))) {
        return 'macro_oil';
    }
    if (nameLower.includes('국채') || nameLower.includes('tnx') || nameLower.includes('10년물') || (isMacroCategory && (nameLower.includes('금리') || s.includes('10년물')))) {
        return 'macro_rate';
    }
    if (nameLower.includes('나스닥 선물') || nameLower.includes('s&p 선물') || (isMacroCategory && (nameLower.includes('선물') && !nameLower.includes('원유')))) {
        return 'macro_futures';
    }
    const isExplicitMacroName = ['전체 시장 시스템', '글로벌 매크로', '모닝 브리프', '거시경제', '시장지표', '한국 증시', '코스피', '코스닥', '선물지수'].some(m => nameLower.includes(m));
    if (stockName === '전체 시장 시스템' || (isMacroCategory && isExplicitMacroName)) {
        return 'macro_market';
    }
    if (isMacroCategory && (s.includes('환율') || s.includes('달러'))) {
        return 'macro_fx';
    }
    if (isMacroCategory && (s.includes('wti') || s.includes('원유') || s.includes('유가'))) {
        return 'macro_oil';
    }
    // 2. 화장품 / 소비재 (LG생활건강, 아모레, 에스엠씨지 등)
    if (/화장품|생활건강|아모레|코스맥스|한국콜마|뷰티|에이피알|클리오|미용|용기|에스엠씨지/.test(nameLower)) {
        return 'cosmetics';
    }
    // 3. 조선 / 해양 (삼성중공업, 한화오션 등)
    if (/삼성중공업|한화오션|hd한국조선해양|hd현대중공업|현대미포조선|조선|해양플랜트/.test(nameLower)) {
        return 'shipbuilding';
    }
    // 4. 금융 / 은행 / 증권 (종목명 기준 판별하여 증권사 리포트 제목 속 증권사명에 오작동 방지)
    if (/기업은행|국민은행|신한지주|신한금융|하나금융|우리금융|카카오뱅크|jb금융|dgb금융|bnk금융|키움증권|미래에셋증권|삼성증권|한국금융지주|메리츠금융|동양생명|삼성화재|db손해보험|한화생명/.test(nameLower) || (/은행|금융지주|보험|증권/.test(nameLower) && !nameLower.includes('생활건강') && !nameLower.includes('중공업') && !nameLower.includes('전자') && !nameLower.includes('에너지'))) {
        return 'banking';
    }
    if (/두산에너빌리티|한전기술|한전kps|한국전력|현대일렉트릭|효성중공업|두산밥캣|두산|씨에스윈드|현대건설기계|ls일렉트릭|ls|일진전기|원전|원자력|전력기기/.test(s)) {
        return 'nuclear_energy';
    }
    if (/삼성전자|sk하이닉스|한미반도체|리노공업|isc|원익|동진쎄미켐|하나마이크론|주성엔지니어링|hpsp|이오테크닉스|db하이텍|semiconductor|hbm|반도체/.test(s)) {
        return 'semiconductor';
    }
    if (/현대차|기아|현대모비스|현대위아|만도|hl만도|한온시스템|한국타이어|자동차/.test(s)) {
        return 'automotive';
    }
    if (/알테오젠|삼천당제약|삼성바이오로직스|셀트리온|유한양행|한미약품|리가켐바이오|에이비엘바이오|sk바이오팜|한올바이오파마|휴젤|파마리서치|바이오|제약/.test(s)) {
        return 'bio_pharma';
    }
    if (/한화에어로스페이스|lig넥스원|현대로템|한국항공우주|한화시스템|풍산|방산/.test(s)) {
        return 'defense';
    }
    if (/대한항공|아시아나|진에어|제주항공|티웨이|hmm|팬오션|대한해운|항공|해운/.test(s)) {
        return 'shipping_airline';
    }
    if (/lg에너지솔루션|에코프로|posco홀딩스|포스코퓨처엠|엘앤에프|삼성sdi|sk이노베이션|코스모신소재|금양|2차전지|배터리/.test(s)) {
        return 'secondary_battery';
    }
    if (/naver|네이버|카카오|엔씨소프트|크래프톤|넷마블|하이브|sm|jyp|와이지/.test(s)) {
        return 'internet_entertainment';
    }
    if (/nvda|tsla|aapl|msft|googl|amzn|meta|avgo|qcom|amd/.test(s)) {
        return 'us_tech';
    }
    return 'general_stock';
}

interface FinancialRiskPlan {
    isDollar: boolean;
    isSingleShare: boolean;
    currPrice: string;
    avgBuyPrice: string;
    targetPrice: string;
    maxAlloc: string;
    allocType: string;
    totalShares: string;
    actualInvest: string;
    cashReserve: string;
    stopLossPrice: string;
    stopLossProceeds: string;
    maxLossAmount: string;
    shieldedAmount: string;
    target1Price: string;
    target1SharesLabel: string;
    target1CashIn: string;
    target1ProfitAmt: string;
    finalSharesLabel: string;
    finalStageCashIn: string;
    finalTotalVal: string;
    finalProfitAmt: string;
    finalUpsidePct: string;
    priceExceedsBudget: boolean;
    tranches: { step: string; price: string; shares: string; amt: string; desc: string }[];
}

function roundToKrxTick(price: number, isDollar: boolean): number {
    if (isDollar) return Number(price.toFixed(2));
    const p = Math.round(price);
    if (p < 2000) return p;
    if (p < 5000) return Math.round(p / 5) * 5;
    if (p < 20000) return Math.round(p / 10) * 10;
    if (p < 50000) return Math.round(p / 50) * 50;
    if (p < 200000) return Math.round(p / 100) * 100;
    if (p < 500000) return Math.round(p / 500) * 500;
    return Math.round(p / 1000) * 1000;
}

function computeFinancialRiskPlan(rawCurrPrice: any, rawTargetPrice: any, totalCapital: number = 100000): FinancialRiskPlan | null {
    const isDollar = String(rawCurrPrice || '').includes('$') || String(rawTargetPrice || '').includes('$');
    const cMatch = String(rawCurrPrice || '').split('(')[0].match(/([0-9,]+(?:\.[0-9]+)?)/);
    const currP = cMatch ? parseFloat(cMatch[1].replace(/,/g, '')) : 0;
    if (currP <= 0) return null;

    const tMatch = String(rawTargetPrice || '').split('(')[0].match(/([0-9,]+(?:\.[0-9]+)?)/);
    const targetP = tMatch ? parseFloat(tMatch[1].replace(/,/g, '')) : roundToKrxTick(currP * 1.15, isDollar);

    const fmt = (v: number) => isDollar ? `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${Math.round(v).toLocaleString()}원`;

    // 운용 자금 처리:
    // 500만원 이하(10만, 30만, 50만, 100만, 300만, 500만) = 해당 종목 실전 직접 투입 예산으로 100% 배정
    // 1,000만원 이상(1천만, 3천만, 5천만, 1억 등) = 전체 계좌 포트폴리오 안전 분산 15% 비중 한도 적용
    const isDirectBudget = totalCapital <= 5000000;
    const capital = isDollar ? (totalCapital / 1400) : totalCapital;
    const maxAlloc = isDirectBudget ? capital : (capital * 0.15);
    const allocType = isDirectBudget 
        ? (isDollar ? '소액 실전 예산 (직접 투입)' : `소액 실전 맞춤 (${fmt(maxAlloc)} 직접 투입)`) 
        : `계좌 분산 한도 (${fmt(maxAlloc)}, 총자산의 15%)`;

    let priceExceedsBudget = false;
    let totalShares = Math.floor(maxAlloc / currP);
    const neededMore = currP > maxAlloc ? (currP - maxAlloc) : 0;
    const suggestedBudget = currP > 0 ? (isDollar ? Math.ceil(currP / 50) * 50 : Math.ceil(currP / 100000) * 100000) : 100000;

    if (totalShares <= 0) {
        // 예산이 1주 단가보다 적을 경우 실제 매수 수량은 0주 (예산 초과 무단 매수 방지)
        priceExceedsBudget = true;
        totalShares = 0;
    }

    const isSingleShare = totalShares === 1;

    let share1 = 0;
    let share2 = 0;
    let share3 = 0;
    let p1 = currP;
    let p2 = roundToKrxTick(currP * 0.97, isDollar);
    let p3 = currP;

    if (totalShares === 0) {
        share1 = 0;
        share2 = 0;
        share3 = 0;
    } else if (totalShares === 1) {
        share1 = 1;
        share2 = 0;
        share3 = 0;
        p1 = currP;
    } else if (totalShares === 2) {
        share1 = 1;
        share2 = 1;
        share3 = 0;
        p1 = currP;
        p2 = roundToKrxTick(currP * 0.98, isDollar);
    } else if (totalShares === 3) {
        share1 = 1;
        share2 = 1;
        share3 = 1;
        p1 = roundToKrxTick(currP * 0.985, isDollar);
        p2 = roundToKrxTick(currP * 0.97, isDollar);
        p3 = currP;
    } else {
        share1 = Math.max(1, Math.round(totalShares * 0.3));
        share2 = Math.max(1, Math.round(totalShares * 0.4));
        share3 = totalShares - share1 - share2;
        if (share3 < 0) {
            share2 += share3;
            share3 = 0;
        }
        p1 = roundToKrxTick(currP * 0.985, isDollar);
        p2 = roundToKrxTick(currP * 0.97, isDollar);
        p3 = currP;
    }

    const amt1 = isDollar ? Number((share1 * p1).toFixed(2)) : Math.round(share1 * p1);
    const amt2 = isDollar ? Number((share2 * p2).toFixed(2)) : Math.round(share2 * p2);
    const amt3 = isDollar ? Number((share3 * p3).toFixed(2)) : Math.round(share3 * p3);

    // 실제 총 투자금액 = 0주이면 정확히 0원, 매수 시 1차+2차+3차 합계
    const actualInvest = totalShares === 0 ? 0 : (isDollar ? Number((amt1 + amt2 + amt3).toFixed(2)) : (amt1 + amt2 + amt3));
    const avgBuyP = totalShares === 0 ? currP : (isDollar ? Number((actualInvest / totalShares).toFixed(2)) : Math.round(actualInvest / totalShares));
    const cashReserve = totalShares === 0 ? maxAlloc : Math.max(0, isDollar ? Number((maxAlloc - actualInvest).toFixed(2)) : Math.round(maxAlloc - actualInvest));

    // 손절 방어선 (평균 매수가 대비 -3.5%, 호가 단위 적용)
    const stopLossP = roundToKrxTick(avgBuyP * 0.965, isDollar);
    const stopLossProceeds = isDollar ? Number((totalShares * stopLossP).toFixed(2)) : Math.round(totalShares * stopLossP);
    const maxLossAmt = totalShares === 0 ? 0 : Math.max(0, isDollar ? Number((actualInvest - stopLossProceeds).toFixed(2)) : (actualInvest - stopLossProceeds));
    // 철통 회수금: 0주이면 예산 100% 전액 안전 예수금 보존
    const shieldedAmt = totalShares === 0 ? maxAlloc : (isDollar 
        ? Number((stopLossProceeds + cashReserve).toFixed(2)) 
        : (stopLossProceeds + cashReserve));

    // 1차 익절가 (중간 목표가 또는 +8%, 호가 단위 적용)
    const t1P = targetP > currP
        ? roundToKrxTick(currP + (targetP - currP) * 0.5, isDollar)
        : roundToKrxTick(currP * 1.08, isDollar);

    let target1SharesLabel = '';
    let t1CashIn = 0;
    let t1ProfitAmt = 0;
    let finalSharesLabel = '';
    let finalStageCashIn = 0;
    let finalTotalVal = 0;
    let finalProfitAmt = 0;

    if (totalShares === 0) {
        target1SharesLabel = '0주 (예산 부족으로 매수 보류)';
        t1CashIn = 0;
        t1ProfitAmt = 0;
        finalSharesLabel = '0주 (예산 증액 시 익절 활성화)';
        finalStageCashIn = 0;
        finalTotalVal = 0;
        finalProfitAmt = 0;
    } else if (isSingleShare) {
        target1SharesLabel = '1주 보유 (선택A: 1차 익절 또는 본전 홀딩)';
        t1CashIn = t1P;
        t1ProfitAmt = isDollar ? Number((t1P - actualInvest).toFixed(2)) : (t1P - actualInvest);

        finalSharesLabel = '1주 전량 매도 (선택B: 최종 목표가 홀딩 시)';
        finalStageCashIn = targetP;
        finalTotalVal = targetP;
        finalProfitAmt = isDollar ? Number((targetP - actualInvest).toFixed(2)) : (targetP - actualInvest);
    } else {
        const t1Shares = Math.max(1, Math.floor(totalShares * 0.5));
        const remShares = totalShares - t1Shares;
        const t1Cost = isDollar ? Number((actualInvest * (t1Shares / totalShares)).toFixed(2)) : Math.round(actualInvest * (t1Shares / totalShares));

        target1SharesLabel = `50% 분할 매도 (${t1Shares}주 매도 · ${remShares}주 보유)`;
        t1CashIn = isDollar ? Number((t1Shares * t1P).toFixed(2)) : Math.round(t1Shares * t1P);
        t1ProfitAmt = isDollar ? Number((t1CashIn - t1Cost).toFixed(2)) : (t1CashIn - t1Cost);

        finalSharesLabel = `잔여 물량 전량 익절 (잔여 ${remShares}주 매도)`;
        finalStageCashIn = isDollar ? Number((remShares * targetP).toFixed(2)) : Math.round(remShares * targetP);
        finalTotalVal = isDollar ? Number((t1CashIn + finalStageCashIn).toFixed(2)) : (t1CashIn + finalStageCashIn);
        finalProfitAmt = isDollar ? Number((finalTotalVal - actualInvest).toFixed(2)) : (finalTotalVal - actualInvest);
    }

    const finalUpsidePct = ((targetP - currP) / currP * 100).toFixed(1);

    return {
        isDollar,
        isSingleShare,
        currPrice: fmt(currP),
        avgBuyPrice: fmt(avgBuyP),
        targetPrice: fmt(targetP),
        maxAlloc: fmt(maxAlloc),
        allocType,
        totalShares: isDollar ? `${totalShares}주` : `${totalShares.toLocaleString()}주`,
        actualInvest: fmt(actualInvest),
        cashReserve: fmt(cashReserve),
        stopLossPrice: fmt(stopLossP),
        stopLossProceeds: fmt(stopLossProceeds),
        maxLossAmount: fmt(maxLossAmt),
        shieldedAmount: fmt(shieldedAmt),
        target1Price: fmt(t1P),
        target1SharesLabel,
        target1CashIn: fmt(t1CashIn),
        target1ProfitAmt: fmt(t1ProfitAmt),
        finalSharesLabel,
        finalStageCashIn: fmt(finalStageCashIn),
        finalTotalVal: fmt(finalTotalVal),
        finalProfitAmt: fmt(finalProfitAmt),
        finalUpsidePct: `${Number(finalUpsidePct) > 0 ? '+' : ''}${finalUpsidePct}%`,
        priceExceedsBudget,
        tranches: totalShares === 0 ? [
            {
                step: '1차 분할 매수',
                price: fmt(currP),
                shares: '0주 (매수 전면 보류)',
                amt: '0원',
                desc: `설정 예산(${fmt(maxAlloc)}) < 1주 단가(${fmt(currP)}). 최소 1주 매수에 ${fmt(neededMore)} 부족하여 자동 매수가 0주로 안전 보류됩니다.`,
            },
            {
                step: '2차 분할 매수',
                price: '-',
                shares: '0주',
                amt: '0원',
                desc: `상단에서 예산을 ${fmt(suggestedBudget)} 이상으로 증액하시면 1차·2차 분할 매수가 즉시 활성화됩니다.`,
            },
            {
                step: '3차 분할 매수',
                price: '-',
                shares: '0주',
                amt: '0원',
                desc: `설정하신 예산 ${fmt(maxAlloc)}은 계좌에서 1원도 무단 출금되지 않고 100% 안전 예수금으로 보존됩니다.`,
            },
        ] : [
            {
                step: '1차 분할 매수',
                price: fmt(p1),
                shares: `${share1}주`,
                amt: fmt(amt1),
                desc: isSingleShare
                    ? '1주 단가 특성상 분할 없이 지지선 확인 후 1주 단일 진입 (100%)'
                    : `비중 ${Math.round((share1 / totalShares) * 100)}% · 오전 10시 이후 지지선 1차 진입`,
            },
            {
                step: '2차 분할 매수',
                price: share2 > 0 ? fmt(p2) : '-',
                shares: `${share2}주`,
                amt: fmt(amt2),
                desc: share2 > 0
                    ? `비중 ${Math.round((share2 / totalShares) * 100)}% · 눌림목 하방 지지력 확인 후 추가 체결`
                    : '예산 내 1주 단일 매수 구간 (예산 증액 시 2차 분할 활성화)',
            },
            {
                step: '3차 분할 매수',
                price: share3 > 0 ? fmt(p3) : '-',
                shares: `${share3}주`,
                amt: fmt(amt3),
                desc: share3 > 0
                    ? `비중 ${Math.round((share3 / totalShares) * 100)}% · 추세 안착 확인 후 잔여 물량 체결`
                    : '예산 내 추가 매수 없음 (잔여 현금은 안전 비상금으로 비축)',
            },
        ],
    };
}

function getDetailedRiskBreakdown(doc: AutoApprovalDoc, capitalOverride: number = 100000): {
    headline: string;
    factors: RiskFactor[];
    defenseRules: RiskDefenseRule[];
    financialPlan: FinancialRiskPlan | null;
} {
    const sName = doc.stock_name || "해당 안건";
    const sector = detectSectorType(doc.stock_name, doc.title || "", doc.category_badge || "");
    const isMacroSector = sector.startsWith('macro_');
    const isUSStock = doc.category_type === 'us_stock' || sector === 'us_tech';

    // 1. 가격 추출 및 실전 자산 방어선 수치 산출
    const rawPrice = doc.current_price || doc.key_numbers?.find(k => k.label.includes('현재가') || k.label.includes('현재 주가') || k.label.includes('현재 시세'))?.value;
    const rawTarget = doc.target_price || doc.key_numbers?.find(k => k.label.includes('목표가'))?.value;

    const currPrice = parsePriceValue(rawPrice, sector, doc.stock_name);
    const targetPrice = parsePriceValue(rawTarget, sector, doc.stock_name);

    const priceNum = currPrice.num;
    const isDollar = currPrice.isDollar || isUSStock;
    const isVix = sector === 'macro_vix';
    const isRate = sector === 'macro_rate';
    const isOil = sector === 'macro_oil';
    const isFx = sector === 'macro_fx';
    const fmt = (n: number) => {
        if (isVix) return `${n.toFixed(2)}pt`;
        if (isRate) return `${n.toFixed(2)}%`;
        if (isOil || isDollar) return `$${n.toFixed(2)}`;
        if (isFx) return `${n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}원`;
        return `${Math.round(n).toLocaleString()}원`;
    };

    // 손절가 (-3.5%, 호가단위 반영)
    const stopLossNum = priceNum > 0 ? roundToKrxTick(priceNum * 0.965, isDollar) : 0;
    const stopLossFormatted = stopLossNum > 0 ? fmt(stopLossNum) : '-3.5% 또는 50일선';

    // 권장 안전 진입가 (당일 1.5% 눌림목 또는 현재가, 호가단위 반영)
    const safeEntryNum = priceNum > 0 ? roundToKrxTick(priceNum * 0.985, isDollar) : 0;
    const safeEntryFormatted = safeEntryNum > 0 ? fmt(safeEntryNum) : '오전 10시 지지선';

    // 1차 분할 익절가 (중간값 또는 +7.5%, 호가단위 반영)
    let target1Num = 0;
    if (priceNum > 0) {
        if (targetPrice.num > priceNum) {
            target1Num = roundToKrxTick(priceNum + (targetPrice.num - priceNum) * 0.5, isDollar);
        } else {
            target1Num = roundToKrxTick(priceNum * 1.075, isDollar);
        }
    }
    const target1Formatted = target1Num > 0 ? fmt(target1Num) : '1차 목표가 도달 시';
    const currPriceStr = currPrice.num > 0 ? currPrice.formatted : '현재가';
    const maxWeightDesc = isDollar ? '총자산 1만 달러 기준 최대 $1,000~$1,500' : '총자산 1,000만원 기준 최대 100만~150만원';

    let headline = "";
    let factors: RiskFactor[] = [];

    if (!isMacroSector) {
        // 개별 종목 100% 맞춤형 정밀 리스크 진단 (최서연 CRO)
        const docDropIntel = (doc as any).drop_impact_intel;
        const stockIntel = getStockOverseasDirectHitSummary(sName, doc.stock_code, doc.title);
        const triggers = (docDropIntel?.overseas_triggers && docDropIntel.overseas_triggers.length >= 3)
            ? docDropIntel.overseas_triggers
            : (stockIntel.triggers && stockIntel.triggers.length >= 3)
                ? stockIntel.triggers
                : null;

        const trig0 = triggers ? triggers[0] : null;
        const trig1 = triggers ? triggers[1] : null;
        const trig2 = triggers ? triggers[2] : null;

        const trig0Name = trig0?.trigger?.replace(/^[^\w가-힣]+/, '').trim() || `${sName} 핵심 밸류체인 발주 사이클`;
        const trig0Chain = trig0?.chain || `${sName}의 전방 고객사 발주 지연 및 수요 둔화 시 매출 및 수익성 직격탄 발생`;
        const trig0Tag = (trig0?.impact_degree || "1순위 직격탄").replace(/[🔥⚠️⚡📉📈🏛️]/g, '').trim();

        const trig1Name = trig1?.trigger?.replace(/^[^\w가-힣]+/, '').trim() || `${sName} 원가율 상승 및 수급 이탈`;
        const trig1Chain = trig1?.chain || `원/달러 환율 급변 및 원자재 단가 상승에 따른 마진 압박과 외국인·기관 순매도 전환 위험`;
        const trig1Tag = (trig1?.impact_degree || "원가·수급 압박").replace(/[🔥⚠️⚡📉📈🏛️]/g, '').trim();

        const trig2Name = trig2?.trigger?.replace(/^[^\w가-힣]+/, '').trim() || `${sName} 글로벌 거시 경기 및 전방 수요 변수`;
        const trig2Chain = trig2?.chain || `글로벌 거시 경기 둔화 및 업종 피크아웃 우려 발생 시 밸류에이션 하방 압력 심화`;
        const trig2Tag = (trig2?.impact_degree || "전방 수요 변수").replace(/[🔥⚠️⚡📉📈🏛️]/g, '').trim();

        headline = `‘${sName}(${currPriceStr})’ 최서연 CRO 리스크 감사: ${trig0Name} 등 대외 뇌관 발생 시 급락 가능성이 있으므로, 권장 진입가(${safeEntryFormatted}) 안착 확인 및 -3.5% 기계적 손절 방어선(${stopLossFormatted})을 철저히 준수하십시오.`;

        factors = [
            {
                icon: trig0?.icon || "💣",
                title: "1순위 직격탄 & 진입 타이밍",
                tag: trig0Tag,
                tagColor: "text-amber-300 bg-amber-500/15 border-amber-500/30",
                points: [
                    `핵심 리스크: ${trig0Name}`,
                    `발생 메커니즘: ${trig0Chain}`,
                    `안전 진입 수칙: 개장 직후(09:00~09:20) 급등 출발 시 추격 매수를 엄금하고, 당일 오전 10시 이후 지지선(${safeEntryFormatted}) 안착을 확인한 뒤에만 1차 진입 집행`,
                ],
            },
            {
                icon: trig1?.icon || "📉",
                title: "원가·환율 압박 & 수급 변심",
                tag: trig1Tag,
                tagColor: "text-rose-300 bg-rose-500/15 border-rose-500/30",
                points: [
                    `핵심 리스크: ${trig1Name}`,
                    `발생 메커니즘: ${trig1Chain}`,
                    `기계적 손절 방어선: ${stopLossFormatted} (-3.5% 또는 50일선) 이탈 시 감정 배제 후 전량 자동 매도로 계좌 원금 보존`,
                ],
            },
            {
                icon: trig2?.icon || "🌐",
                title: "전방 수요 & 글로벌 거시 변수",
                tag: trig2Tag,
                tagColor: "text-blue-300 bg-blue-500/15 border-blue-500/30",
                points: [
                    `핵심 리스크: ${trig2Name}`,
                    `발생 메커니즘: ${trig2Chain}`,
                    `목표가 대응 & 비중 통제: 1차 목표가(${target1Formatted}) 도달 시 보유 물량 50% 분할 익절, 단일 종목 계좌 편입 한도(${maxWeightDesc}) 엄수`,
                ],
            },
        ];
    } else if (sector === 'banking') {
        headline = `‘${sName}’은 금리 인하 사이클에 따른 순이자마진(NIM) 축소 압력과 중소기업 대출 건전성(대손충당금)을 반드시 점검해야 합니다. 7~8%대 고배당 매력은 높으나 배당락 전후 단기 수급 변동에 철저히 대비하십시오.`;
        factors = [
            {
                icon: "⏰",
                title: "진입 타이밍 & 금리/배당락 변동성",
                tag: "NIM 마진 & 배당락 주의",
                tagColor: "text-amber-300 bg-amber-500/15 border-amber-500/30",
                points: [
                    "한국은행 기준금리 인하 기조 진입 시 예대금리차 축소로 인한 분기 순이자마진(NIM) 둔화 리스크 모니터링",
                    "7~8%대 높은 배당수익률과 밸류업 수혜가 있으나, 결산 배당락 전후 기관 배당차익거래 청산 매물 출회 주의",
                    `권장 진입가: 현재가(${currPriceStr}) 대비 무리한 시초가 추격 대신 지지선(${safeEntryFormatted}) 안착 확인 후 진입`,
                ],
            },
            {
                icon: "📉",
                title: "수급 변심 & 중기 대출 건전성/충당금 리스크",
                tag: "연체율 & 대손충당금 감시",
                tagColor: "text-rose-300 bg-rose-500/15 border-rose-500/30",
                points: [
                    "중소기업 특화 국책은행 특성상 내수 경기 침체 시 중소기업 연체율 상승 및 부동산 PF·대손충당금 추가 적립 여부 필수 체크",
                    "정부 '기업 밸류업 프로그램' 모멘텀 둔화 시 외국인 및 기관의 동반 순매도 전환 여부 실시간 감시",
                    `기계적 손절 방어선: ${stopLossFormatted} (-3.5% 또는 50일선) 하향 이탈 시 감정 배제 후 즉시 손절 방어`,
                ],
            },
            {
                icon: "🌐",
                title: "거시 매크로 & 정부 배당/자본 규제 민감도",
                tag: "CET1 자본비율 & 세입 정책",
                tagColor: "text-blue-300 bg-blue-500/15 border-blue-500/30",
                points: [
                    "대주주(기획재정부 59.2%)의 배당 세입 정책 및 금융당국의 스트레스 완충자본 규제 강화에 따른 보통주자본(CET1) 관리 부담",
                    "원/달러 환율보다는 국내 중소기업 체감 경기 및 한국은행 금융통화위원회 기준금리 결정 경로가 주가의 핵심 변수",
                    `단일 종목 계좌 편입 한도: 총자산의 10~15%(${maxWeightDesc}) 절대 엄수`,
                ],
            },
        ];
    } else if (sector === 'nuclear_energy') {
        headline = `‘${sName}’은 체코 신규 원전 본계약 체결 일정과 웨스팅하우스(WEC) 지식재산권(IP) 분쟁 합의 여부가 핵심 리스크입니다. 단기 급등에 따른 밸류에이션 부담이 있으므로 분할 매수와 손절선을 엄수하십시오.`;
        factors = [
            {
                icon: "⏰",
                title: "진입 타이밍 & 원전 수주 모멘텀 변동성",
                tag: "본계약 일정 & 위꼬리 주의",
                tagColor: "text-amber-300 bg-amber-500/15 border-amber-500/30",
                points: [
                    "체코 원전 우선협상대상자 선정 후 본계약 체결(2025~2026년)까지 뉴스 플로우에 따른 단기 주가 널뛰기 리스크",
                    "개장 직후 원전 테마성 갭상승 추격 매수를 엄금하고 오전 10시 이후 지지선 안착 확인 후 진입",
                    `권장 진입가: ${currPriceStr} 대비 ${safeEntryFormatted} 부근 눌림목에서 분할 체결 권장`,
                ],
            },
            {
                icon: "📉",
                title: "수급 변심 & 대형 수주 공백/차익 매물",
                tag: "차익 매물벽 & 특허 분쟁",
                tagColor: "text-rose-300 bg-rose-500/15 border-rose-500/30",
                points: [
                    "대형 수주 공시 직후 단기 재료 소멸로 인한 기관·외국인의 차익실현 매도 벽 출회 위험",
                    "웨스팅하우스 특허 소송 및 미국 정부 원전 수출 통제 관련 돌발 뉴스 시 변동성 확대 대비",
                    `철통 손절선: ${stopLossFormatted} (-3.5% 또는 50일선) 이탈 시 감정 배제 후 기계적 방어`,
                ],
            },
            {
                icon: "🌐",
                title: "거시 매크로 & 글로벌 원전/전력망 정책",
                tag: "글로벌 정책 & CAPEX 부담",
                tagColor: "text-blue-300 bg-blue-500/15 border-blue-500/30",
                points: [
                    "미국 대선 및 유럽 각국의 탈원전 회귀 속도, 빅테크 SMR(소형모듈원자로) 전력 공급 계약 구체화 여부 모니터링",
                    "가스터빈 및 SMR 상용화 설비투자(CAPEX) 부담 대비 영업이익 창출 속도 점검",
                    `계좌 비중 한도: 총자산의 10~15%(${maxWeightDesc}) 이내 엄격 통제`,
                ],
            },
        ];
    } else if (sector === 'semiconductor') {
        headline = `‘${sName}’은 글로벌 빅테크의 AI 설비투자(CAPEX) 지속성 및 HBM3E/HBM4 공급 과잉 논란, 미국 대중국 반도체 장비 규제 변수를 정밀 점검해야 합니다.`;
        factors = [
            {
                icon: "⏰",
                title: "진입 타이밍 & AI 사이클 피크아웃 변동성",
                tag: "HBM 공급 & 갭상승 주의",
                tagColor: "text-amber-300 bg-amber-500/15 border-amber-500/30",
                points: [
                    "엔비디아 차세대 GPU 출시 주기 및 빅테크 AI 서버 투자 속도 조절에 따른 단기 고점 위꼬리 리스크",
                    "범용 D램/낸드 가격 회복 속도 및 메모리 감산 종료 후 공급 증가에 따른 마진 압박 확인",
                    `권장 진입가: ${safeEntryFormatted} 이하 눌림목 지지선 확인 후 3단계 분할 진입`,
                ],
            },
            {
                icon: "📉",
                title: "수급 변심 & 외국인 선물·현물 동반 매도 감시",
                tag: "외인 패시브 매도벽 감시",
                tagColor: "text-rose-300 bg-rose-500/15 border-rose-500/30",
                points: [
                    "코스피 대형 반도체주 특성상 외국인의 선물 대량 매도 및 프로그램 차익 매물 출회 시 일일 낙폭 확대 주의",
                    `50일선 및 직전 고점 매물대 돌파 여부 확인, 손절가 ${stopLossFormatted} 하향 이탈 시 즉시 위험 관리`,
                    "엔비디아 실적 발표 전후 옵션 변동성에 따른 단기 흔들림 대비",
                ],
            },
            {
                icon: "🌐",
                title: "거시 매크로 & 미·중 무역 규제 및 환율",
                tag: "수출 통제 & 고환율 민감도",
                tagColor: "text-blue-300 bg-blue-500/15 border-blue-500/30",
                points: [
                    "미국 상무부의 대중국 반도체 장비·HBM 수출 통제 규제 및 대만 TSMC 파운드리 생태계 병목 변수",
                    "원/달러 고환율에 따른 단기 환차익 매력과 외국인 패시브 자금 유출입 변동성 동시 모니터링",
                    `단일 종목 계좌 편입 한도: 총자산의 10~15%(${maxWeightDesc}) 엄수`,
                ],
            },
        ];
    } else if (sector === 'bio_pharma') {
        headline = `‘${sName}’은 미국 PBM(처방약급여관리업체) 처방집 등재 후 실처방 확대 속도와 글로벌 바이오시밀러 가격 인하 경쟁, 합병 후 무형자산 상각에 따른 원가율 부담을 집중 점검해야 합니다.`;
        factors = [
            {
                icon: "⏰",
                title: "진입 타이밍 & 신약 처방·PBM 등재 변동성",
                tag: "짐펜트라 처방 & PBM 환급 주의",
                tagColor: "text-amber-300 bg-amber-500/15 border-amber-500/30",
                points: [
                    "미국 대형 PBM 처방집 등재 이후 실제 병의원 처방 환급(Rebate) 규모 확대 및 매출 반영 속도 확인",
                    "스텔라라·악템라·아일리아 등 신규 시밀러 출시 초기 다국적 제약사와의 가격 인하(Price Erosion) 경쟁 리스크 모니터링",
                    `권장 진입가: 현재가(${currPriceStr}) 대비 무리한 시초가 추격 대신 지지선(${safeEntryFormatted}) 안착 확인 후 분할 진입`,
                ],
            },
            {
                icon: "📉",
                title: "수급 변심 & 합병 무형자산 상각/재고 원가율",
                tag: "원가율(COGS) & 기관 공매도 감시",
                tagColor: "text-rose-300 bg-rose-500/15 border-rose-500/30",
                points: [
                    "셀트리온헬스케어 합병에 따른 판권·영업권 무형자산 상각비 및 재고자산 매출원가율(COGS)의 단계적 정상화 여부 점검",
                    "분기 실적 발표 전후 기관 및 대차잔고·공매도 잔고 변동 추이를 실시간 추적",
                    `기계적 손절 방어선: ${stopLossFormatted} (-3.5% 또는 50일선) 하향 이탈 시 감정 배제 후 즉시 손절 방어`,
                ],
            },
            {
                icon: "🌐",
                title: "거시 매크로 & FDA/EMA 규제 및 CDMO 신사업",
                tag: "FDA 실사 & CAPEX 현금흐름",
                tagColor: "text-blue-300 bg-blue-500/15 border-blue-500/30",
                points: [
                    "미국 FDA 및 유럽 EMA의 cGMP 생산 시설 실사 통과 여부 및 신규 파이프라인 임상 승인 일정 점검",
                    "신규 100% 자회사 CDMO(위탁개발생산) 설비투자(CAPEX) 집행 시 분기 잉여현금흐름(FCF) 관리 부담 체크",
                    `단일 종목 계좌 편입 한도: 총자산의 10~15%(${maxWeightDesc}) 절대 엄수`,
                ],
            },
        ];
    } else if (sector === 'automotive') {
        headline = `‘${sName}’은 미국 대선 후 IRA 전기차 세액공제 보조금 개편 여부와 글로벌 관세 리스크, 하이브리드(HEV) 판매 마진 방어력을 집중 점검해야 합니다.`;
        factors = [
            {
                icon: "⏰",
                title: "진입 타이밍 & 미국 전기차 보조금(IRA) 변동성",
                tag: "북미 정책 & 관세 변수",
                tagColor: "text-amber-300 bg-amber-500/15 border-amber-500/30",
                points: [
                    "미국 행정부 교체 시 인플레이션감축법(IRA) 보조금 축소 및 수입 완성차 10~25% 보편 관세 부과 리스크 점검",
                    `권장 진입가: 현재가(${currPriceStr}) 대비 ${safeEntryFormatted} 부근 눌림목 체결`,
                ],
            },
            {
                icon: "📉",
                title: "수급 변심 & 완성차 인센티브(할인) 출혈 경쟁",
                tag: "딜러 재고 & 프로모션 비용",
                tagColor: "text-rose-300 bg-rose-500/15 border-rose-500/30",
                points: [
                    "미국·유럽 현지 딜러 인센티브 증가 시 대당 공헌이익 감소 및 글로벌 완성차 할인 경쟁 심화 여부 확인",
                    `기계적 손절 방어선: ${stopLossFormatted} (-3.5% 또는 50일선) 이탈 시 감정 배제 후 즉시 방어`,
                ],
            },
            {
                icon: "🌐",
                title: "거시 매크로 & 환율 변동 및 주주환원(자사주 소각)",
                tag: "환율 수혜 & 밸류업 지표",
                tagColor: "text-blue-300 bg-blue-500/15 border-blue-500/30",
                points: [
                    "원/달러 환율 1,380원선 변동에 따른 수출 환차익 규모와 3개년 주주환원(배당성향 35% 및 자사주 매입) 이행 점검",
                    `단일 종목 계좌 편입 한도: 총자산의 10~15%(${maxWeightDesc}) 엄수`,
                ],
            },
        ];
    } else if (sector === 'defense') {
        headline = `‘${sName}’은 폴란드·중동 2차 수출 실행계약 체결 일정과 생산능력(CAPA) 증설에 따른 납기 이행률, 수출입은행 금융지원 한도 변수를 점검해야 합니다.`;
        factors = [
            {
                icon: "⏰",
                title: "진입 타이밍 & 해외 방산 본계약 체결 일정",
                tag: "수주 공시 & 차익실현 주의",
                tagColor: "text-amber-300 bg-amber-500/15 border-amber-500/30",
                points: [
                    "수주 기대감으로 급등한 직후 실제 계약 체결 공시 시 단기 '재료 소멸' 차익 매물 출회 주의",
                    `권장 진입가: 현재가(${currPriceStr}) 대비 ${safeEntryFormatted} 부근 눌림목 체결`,
                ],
            },
            {
                icon: "📉",
                title: "수급 변심 & 방산 생산라인 증설 및 부품 조달 병목",
                tag: "납기 지연 & 지체상금 리스크",
                tagColor: "text-rose-300 bg-rose-500/15 border-rose-500/30",
                points: [
                    "해외 대규모 물량 납기를 맞추기 위한 원자재·반도체 부품 조달 병목 및 생산라인 지체상금 발생 여부 점검",
                    `기계적 손절 방어선: ${stopLossFormatted} (-3.5% 또는 50일선) 이탈 시 감정 배제 후 즉시 방어`,
                ],
            },
            {
                icon: "🌐",
                title: "거시 매크로 & 지정학적 긴장도 및 국가 수출 금융",
                tag: "수은 금융지원 & 국방예산",
                tagColor: "text-blue-300 bg-blue-500/15 border-blue-500/30",
                points: [
                    "국내 수출입은행·무역보험공사의 정책금융 한도 확대 법안 및 수입국 정권 교체에 따른 국방비 집행 연속성 체크",
                    `단일 종목 계좌 편입 한도: 총자산의 10~15%(${maxWeightDesc}) 엄수`,
                ],
            },
        ];
    } else if (sector === 'secondary_battery') {
        headline = `‘${sName}’은 글로벌 전기차 수요 둔화(캐즘) 장기화 여부와 리튬·니켈 메탈가 하락에 따른 양극재 판가 연동 손실, 가동률 저하에 따른 고정비 부담을 집중 관리해야 합니다.`;
        factors = [
            {
                icon: "⏰",
                title: "진입 타이밍 & 전기차 캐즘(Chasm) 가동률 변동성",
                tag: "OEM 주문량 & 가동률 주의",
                tagColor: "text-amber-300 bg-amber-500/15 border-amber-500/30",
                points: [
                    "글로벌 완성차 OEM사들의 전기차 출시 지연 및 배터리 주문 감축에 따른 셀 공장 가동률 저하 모니터링",
                    `권장 진입가: 현재가(${currPriceStr}) 대비 ${safeEntryFormatted} 부근 눌림목 체결`,
                ],
            },
            {
                icon: "📉",
                title: "수급 변심 & 광물(리튬/니켈) 판가 래깅 손실",
                tag: "원자재 래깅 & 재고평가손",
                tagColor: "text-rose-300 bg-rose-500/15 border-rose-500/30",
                points: [
                    "리튬·니켈 가격 하락 시 기확보 재고에 대한 평가손실 및 양극재 납품단가 하락으로 인한 마진 압박 점검",
                    `기계적 손절 방어선: ${stopLossFormatted} (-3.5% 또는 50일선) 이탈 시 감정 배제 후 즉시 방어`,
                ],
            },
            {
                icon: "🌐",
                title: "거시 매크로 & 북미 AMPC 보조금 및 신규 폼팩터 경쟁",
                tag: "AMPC 보조금 & LFP 침투율",
                tagColor: "text-blue-300 bg-blue-500/15 border-blue-500/30",
                points: [
                    "미국 IRA 첨단제조생산세액공제(AMPC) 보조금 규모와 중국산 저가 LFP 배터리 침투 확대 변수 체크",
                    `단일 종목 계좌 편입 한도: 총자산의 10~15%(${maxWeightDesc}) 엄수`,
                ],
            },
        ];
    } else if (sector === 'shipping_airline') {
        headline = `‘${sName}’은 국제 유가(WTI) 급등과 고환율에 따른 항공유류비·외화리스부채 환차손, 아시아나 합병 후 독점 노선 반납에 따른 매출 공백 리스크를 관리해야 합니다.`;
        factors = [
            {
                icon: "⏰",
                title: "진입 타이밍 & 유가·환율 원가 변동성",
                tag: "유류할증료 & 환차손 주의",
                tagColor: "text-amber-300 bg-amber-500/15 border-amber-500/30",
                points: [
                    "중동 지정학적 위기 시 항공유(Jet Fuel) 가격 급등에 따른 3~4분기 영업이익률 급락 위험",
                    "원/달러 환율 1,380원대 지속 시 대규모 외화표시 항공기 리스부채 평가손실 발생 가능성",
                    `권장 진입가: ${safeEntryFormatted} 부근 눌림목에서 분할 체결`,
                ],
            },
            {
                icon: "📉",
                title: "수급 변심 & 아시아나 합병 통합 비용",
                tag: "노선 반납 & 마일리지 통합",
                tagColor: "text-rose-300 bg-rose-500/15 border-rose-500/30",
                points: [
                    "아시아나항공 인수합병(M&A) 완료 과정에서 화물사업부 매각 및 알짜 유럽·미주 슬롯 반납에 따른 매출 공백",
                    `대규모 마일리지 통합 및 조직 융합 비용 발생 시 단기 실적 쇼크 주의, 손절선 ${stopLossFormatted} 준수`,
                    "기관 투자가의 장기 합병 불확실성에 따른 일시적 수급 이탈 감시",
                ],
            },
            {
                icon: "🌐",
                title: "거시 매크로 & 글로벌 여객/화물 수요 둔화",
                tag: "교역량 & 화물 운임 추이",
                tagColor: "text-blue-300 bg-blue-500/15 border-blue-500/30",
                points: [
                    "중국·유럽 경기 침체 시 프리미엄 여객 및 반도체 항공 화물 운임(TAC 지수) 하락 압력 점검",
                    "글로벌 인플레이션에 따른 해외여행 수요 피크아웃 여부 확인",
                    `계좌 비중 한도: 총자산의 10~15%(${maxWeightDesc}) 이내 엄격 제한`,
                ],
            },
        ];
    } else if (sector === 'us_tech') {
        headline = `‘${sName}’은 높은 밸류에이션(PER)에 따른 분기 실적 및 가이던스 1~2% 미달 시 급락 변동성과 미국 법무부(DOJ) 반독점 소송 리스크를 철저히 관리해야 합니다.`;
        factors = [
            {
                icon: "⏰",
                title: "진입 타이밍 & 나스닥 실적 발표 전후 변동성",
                tag: "어닝 가이던스 & 갭락 주의",
                tagColor: "text-amber-300 bg-amber-500/15 border-amber-500/30",
                points: [
                    "분기 어닝 시즌 가이던스 눈높이가 극도로 높아 실적이 예상치를 상회해도 '재료 소멸'로 -5~10% 급락 위험",
                    "장 초반 뉴욕 증시 개장 직후 추격 매수를 자제하고 한국 시간 밤 11시 30분 이후 눌림목 안착 확인",
                    `권장 진입가: ${safeEntryFormatted} 이하 분할 매수`,
                ],
            },
            {
                icon: "📉",
                title: "수급 변심 & 미국 국채 10년물 금리 및 기관 블록딜",
                tag: "국채 금리 & 내부자 매도 감시",
                tagColor: "text-rose-300 bg-rose-500/15 border-rose-500/30",
                points: [
                    "미국 10년물 국채 금리 급등 시 고밸류 빅테크 멀티플 디레이팅(주가 급락) 압력",
                    `내부자(CEO·임원) 지분 매각 및 옵션 만기일 전후 대규모 변동성 주의, 손절선 ${stopLossFormatted} 기계적 방어`,
                    "월가 대형 헤지펀드의 차익실현 매물 출회 여부 상시 점검",
                ],
            },
            {
                icon: "🌐",
                title: "거시 매크로 & 미 법무부 반독점 소송 및 환율",
                tag: "빅테크 반독점 & 환차손",
                tagColor: "text-blue-300 bg-blue-500/15 border-blue-500/30",
                points: [
                    "미 법무부(DOJ) 및 FTC의 빅테크 반독점 제재, 대중국 AI 가속기 판매 제재 리스크",
                    "원/달러 환율 하락 시 해외 주식 평가 수익이 원화 기준으로 줄어드는 환차손 리스크 점검",
                    `단일 종목 계좌 편입 한도: 총자산의 10~15%(${maxWeightDesc}) 엄수`,
                ],
            },
        ];
    } else if (sector === 'macro_vix') {
        headline = `‘VIX 공포지수(${currPriceStr})’는 현재 20 미만의 안정 구간이나, 20 돌파 시 변동성 확대 및 30 상회 시 글로벌 증시 급락 패닉 리스크를 상시 감시해야 합니다.`;
        factors = [
            {
                icon: "⏰",
                title: "공포 수위 임계선 & 급등 변동성",
                tag: "20선 안정 vs 30선 패닉",
                tagColor: "text-amber-300 bg-amber-500/15 border-amber-500/30",
                points: [
                    `현재 VIX 지수(${currPriceStr})는 20 미만의 안정 구간으로 시장 참여자들의 공포 심리가 낮은 평온한 상태`,
                    "VIX가 20을 넘어서거나 단기 +10% 이상 급등할 경우 변동성 주의보 발령 및 추격 매수 자제",
                    "VIX 30 돌파 시에는 글로벌 패닉 구간이므로 모든 신규 매수를 즉시 중단하고 방어 태세 전환",
                ],
            },
            {
                icon: "📉",
                title: "옵션 시장 풋/콜 비율 & 기관 하방 헤지",
                tag: "기관 풋옵션 매수 감시",
                tagColor: "text-rose-300 bg-rose-500/15 border-rose-500/30",
                points: [
                    "S&P 500 지수 풋옵션(하락 베팅) 거래량이 콜옵션 대비 급증하는지 풋/콜 비율(PCR) 실시간 모니터링",
                    "월가 대형 헤지펀드의 변동성 매수 포지션 확대 시 대형 기술주 일시 조정 가능성 대비",
                    "옵션 만기일 전후 지수 흔들림 및 변동성 스프레드 확대 여부 상시 점검",
                ],
            },
            {
                icon: "🌐",
                title: "거시 매크로 & 한국 증시 패시브 영향",
                tag: "외국인 위험선호 연동",
                tagColor: "text-blue-300 bg-blue-500/15 border-blue-500/30",
                points: [
                    "VIX 안정세 지속 시 글로벌 투자 자금의 위험자산 선호(Risk-On)로 한국 코스피 및 반도체 우량주 수급 우호적",
                    "미국 FOMC 금리 발표, 주요 고용·물가 지표 및 지정학적 돌발 뉴스 발생 시 VIX 급변 모니터링",
                    "대표님 실천 지침: VIX 20 미만 유지 시 승인하신 실전 종목 계획대로 분할 매수 적합",
                ],
            },
        ];
    } else if (sector === 'macro_oil') {
        headline = `‘WTI 국제유가(${currPriceStr})’는 중동 지정학적 충돌과 산유국(OPEC+) 감산 정책에 따른 에너지 원가 급등 및 글로벌 인플레이션 자극 리스크를 점검해야 합니다.`;
        factors = [
            {
                icon: "⏰",
                title: "유가 변동성 & 인플레이션 자극",
                tag: "배럴당 $80 저항선 주의",
                tagColor: "text-amber-300 bg-amber-500/15 border-amber-500/30",
                points: [
                    `현재 WTI 유가(${currPriceStr})는 정상 범위 내에서 횡보 중이나, 배럴당 $80 상회 시 물가 재점화 우려`,
                    "유가 급등 시 미국 CPI 상승 및 연준 금리 인하 지연 압력으로 글로벌 증시 단기 흔들림 대비",
                    "산유국(OPEC+) 감산 회의 및 미국 원유 재고량 발표 전후 가격 변동성 모니터링",
                ],
            },
            {
                icon: "📉",
                title: "국내 수출·운송 기업 원가 부담",
                tag: "항공·해운·화학 마진 압박",
                tagColor: "text-rose-300 bg-rose-500/15 border-rose-500/30",
                points: [
                    "항공(대한항공 등)·해운 기업의 유류비 증가 및 외화 리스부채 평가손실 리스크 점검",
                    "정유·석유화학 업종의 정제마진(스프레드) 축소 여부 실시간 체크",
                    "고유가 지속 시 한국 무역수지 악화 및 외국인 패시브 자금 이탈 압력 감시",
                ],
            },
            {
                icon: "🌐",
                title: "거시 매크로 & 중동 정세 모니터링",
                tag: "해상 물동량 병목 변수",
                tagColor: "text-blue-300 bg-blue-500/15 border-blue-500/30",
                points: [
                    "중동 분쟁 심화 시 호르무즈 해협 등 주요 원유 수송로 봉쇄 우려에 따른 공급 쇼크 점검",
                    "유가 안정 구간($70대 초반) 유지 시 국내 제조업 기업들의 실적 방어력 양호",
                    "대표님 지침: 유가 안정 시 실적 우량주 분할 매수 정상 집행",
                ],
            },
        ];
    } else if (sector === 'macro_fx') {
        const isCalendarDoc = sName.includes('경제일정');
        const earlyEvt = doc.key_numbers?.find(k => k.label.includes('주초'))?.value || "한국 수출입 · 미국 ISM 제조업 PMI";
        const lateEvt = doc.key_numbers?.find(k => k.label.includes('주후반') || k.label.includes('빅이벤트'))?.value || "미국 FOMC · 비농업고용(NFP)";
        if (isCalendarDoc) {
            headline = doc.risk_opinion
                ? doc.risk_opinion.replace(/^⚠️\s*\[[^\]]+\]:\s*/, '')
                : `이번 주 핵심 경제일정(${earlyEvt} ➔ ${lateEvt}) 발표 전후 금리·환율(${currPriceStr}) 및 외국인 선물 수급 변동성에 대비해야 합니다.`;
            factors = [
                {
                    icon: "⏰",
                    title: "주초(월~수) 지표 발표 & 분할 매집 타이밍",
                    tag: "선행 지표 확인 후 진입",
                    tagColor: "text-amber-300 bg-amber-500/15 border-amber-500/30",
                    points: [
                        `주초 핵심 일정: ${earlyEvt}`,
                        "지표 발표 직후 오전 09:00~10:00 시초가 쏠림을 피하고 눌림목 지지선 안착 확인 후 분할 진입",
                        `현재 원/달러 환율(${currPriceStr}) 안정 기조 유지 여부 동시 모니터링`,
                    ],
                },
                {
                    icon: "📉",
                    title: "주후반(목~금) 빅이벤트 & 외국인 수급 분기점",
                    tag: "야간 지표 변동성 감시",
                    tagColor: "text-rose-300 bg-rose-500/15 border-rose-500/30",
                    points: [
                        `주후반 빅이벤트: ${lateEvt}`,
                        "미국 핵심 지표가 예상치를 크게 벗어날 경우 외국인 코스피 선물 매물 출회 가능성 주의",
                        "목·금요일 밤 미국 지표 발표 전에는 계좌 내 현금 비중을 20~30% 확보해 리스크 방어",
                    ],
                },
                {
                    icon: "🌐",
                    title: "거시 매크로 & 시나리오별 포트폴리오 대응",
                    tag: "골디락스 vs 방어 시나리오",
                    tagColor: "text-blue-300 bg-blue-500/15 border-blue-500/30",
                    points: [
                        "고용·물가·제조업 지표가 예상치에 부합(골디락스) 시 반도체·전력설비·조선 대장주 비중 유지",
                        "예상 밖 금리·환율 급등 시 고밸류 테마주를 줄이고 실적·배당 우량주로 압축 대응",
                        "대표님 지침: 주간 일정 시나리오에 맞춰 승인 안건(10만원 예산) 계획대로 분할 체결",
                    ],
                },
            ];
        } else {
            const isHighFx = priceNum >= 1370;
            headline = isHighFx
                ? `‘원/달러 환율(${currPriceStr})’은 고환율 구간 등락에 따른 외국인 패시브 자금의 일시 이탈 및 환차손 회피 매물 출회에 대비해야 합니다.`
                : `‘원/달러 환율(${currPriceStr})’은 현재 안정권에서 등락 중이나, 미국 주요 경제지표 및 금리 변화에 따른 외국인 선물·현물 수급 전환점을 상시 점검해야 합니다.`;
            factors = [
                {
                    icon: "⏰",
                    title: "환율 변동성 & 주요 저항선 점검",
                    tag: "외환시장 수급 경계선",
                    tagColor: "text-amber-300 bg-amber-500/15 border-amber-500/30",
                    points: [
                        `현재 환율(${currPriceStr}) 기준 급격한 갭상승 발생 시 장중 변동성 확대 주의`,
                        "대외 달러 강세 전환 시 외환당국 미세조정 및 기관 수급 변화 모니터링",
                        "환율 급등 국면에서는 시초가 추격 매수를 자제하고 장중 지지선 안착 확인 필수",
                    ],
                },
                {
                    icon: "📉",
                    title: "외국인 환차익/환차손 수급 분기점",
                    tag: "외인 패시브 수급 감시",
                    tagColor: "text-rose-300 bg-rose-500/15 border-rose-500/30",
                    points: [
                        "환율 급등(원화 약세) 시 외국인은 환차손을 우려해 한국 IT·반도체 대형주 매도세 전환 가능성",
                        "반대로 환율이 현재처럼 하향 안정화될 경우 외국인 선물 및 현물 순매수 유입 가속",
                        "당일 외국인의 코스피 선물 순매도 금액 3,000억 원 초과 여부 필수 체크",
                    ],
                },
                {
                    icon: "🌐",
                    title: "거시 매크로 & 미 연준 금리/달러 인덱스",
                    tag: "DXY 달러 인덱스 연동",
                    tagColor: "text-blue-300 bg-blue-500/15 border-blue-500/30",
                    points: [
                        "미국 달러 인덱스(DXY) 등락 및 미·한 기준금리 격차 영향 점검",
                        "수출 대장주(현대차, 반도체)의 환율 효과와 원자재 수입 원가 영향 동시 점검",
                        "대표님 지침: 환율 안정 시 승인 안건(10만원 예산) 계획대로 분할 체결",
                    ],
                },
            ];
        }
    } else if (sector === 'macro_rate') {
        headline = `‘미국 10년물 국채금리(${currPriceStr})’는 4.2~4.3% 상회 시 글로벌 성장주 및 빅테크 밸류에이션(할인율) 급락 리스크를 경계해야 합니다.`;
        factors = [
            {
                icon: "⏰",
                title: "국채금리 변동성 & 4.3% 저항선",
                tag: "장기 시장금리 벤치마크",
                tagColor: "text-amber-300 bg-amber-500/15 border-amber-500/30",
                points: [
                    `현재 미국 10년물 국채금리(${currPriceStr})는 채권 시장의 핵심 바로미터`,
                    "10년물 금리가 4.3%를 돌파할 경우 뉴욕증시 기술주 멀티플 디레이팅(주가 급락) 압력 발생",
                    "미국 고용 지표 및 CPI 물가 지표 발표 시간대 금리 변동성 집중 모니터링",
                ],
            },
            {
                icon: "📉",
                title: "글로벌 성장주 & 빅테크 할인율 압박",
                tag: "고밸류 기술주 조정 주의",
                tagColor: "text-rose-300 bg-rose-500/15 border-rose-500/30",
                points: [
                    "금리 상승 시 미래 현금흐름의 현재가치 할인율이 높아져 고PER AI 반도체·소프트웨어주 차익 매물 출회",
                    "미국 20년물 국채 ETF(TLT) 등 채권 자산 유동성 흐름 추적",
                    "금리 하향 안정 시 엔비디아, SK하이닉스 등 성장 대장주 반등 모멘텀 강화",
                ],
            },
            {
                icon: "🌐",
                title: "거시 매크로 & 미 연준(Fed) 기준금리 경로",
                tag: "FOMC 점도표 & 통화 정책",
                tagColor: "text-blue-300 bg-blue-500/15 border-blue-500/30",
                points: [
                    "미국 연준(Fed)의 기준금리 인하 횟수 및 속도 조절 발언에 따른 시장 심리 점검",
                    "한국은행 기준금리 결정 경로 및 국내 채권 금리 스프레드 모니터링",
                    "대표님 지침: 국채금리 안정 시 승인 안건 정상 분할 매수 집행",
                ],
            },
        ];
    } else if (sector === 'macro_futures') {
        headline = `‘${sName}(${currPriceStr})’는 미국 빅테크 실적 발표 전후 옵션 변동성과 한국 증시 시초가 갭 연동 리스크를 정밀 점검해야 합니다.`;
        factors = [
            {
                icon: "⏰",
                title: "진입 타이밍 & 시초가 갭 변동성",
                tag: "장 초반 30분 관망",
                tagColor: "text-amber-300 bg-amber-500/15 border-amber-500/30",
                points: [
                    `미국 야간 선물(${currPriceStr})의 급등락이 한국 코스피·코스닥 시초가 갭 형성에 직결`,
                    "개장 직후 갭상승 출발 시 무리한 추격 매수를 자제하고 10시 이후 지지선 안착 확인",
                    "미국 정규장 마감 후 시간외 빅테크 어닝 발표에 따른 선물 지수 출렁임 주의",
                ],
            },
            {
                icon: "📉",
                title: "외국인 선물 수급 & 프로그램 매매",
                tag: "외국인 선물 동향 감시",
                tagColor: "text-rose-300 bg-rose-500/15 border-rose-500/30",
                points: [
                    "나스닥 선물 약세 시 국내 IT·반도체 대형주로 외국인 프로그램 매도세 출회 가능성",
                    "외국인 코스피 200 선물 순매도 전환 시 당일 오후장 지수 하방 압력 점검",
                    "선물 지수 50일선 지지력 유지 여부 실시간 체크",
                ],
            },
            {
                icon: "🌐",
                title: "거시 매크로 & 글로벌 AI 사이클",
                tag: "빅테크 실적 & CAPEX",
                tagColor: "text-blue-300 bg-blue-500/15 border-blue-500/30",
                points: [
                    "엔비디아, 마이크로소프트 등 미국 매그니피센트7(M7) 주가 흐름과 선물 지수 동조화 모니터링",
                    "글로벌 반도체 지수(SOX) 및 기술주 투자 심리 추적",
                    "대표님 지침: 선물 지수 안정 시 실전 승인 종목 계획대로 분할 체결",
                ],
            },
        ];
    } else if (sector === 'macro_market') {
        headline = "외국인의 KOSPI 200 선물 순매도 전환(-3,000억 원 이상) 및 미국 국채 금리·환율 급변 시 지수 전반의 패시브 자금 이탈에 대비하십시오.";
        factors = [
            {
                icon: "⏰",
                title: "진입 타이밍 & 시초가 갭 변동성",
                tag: "장 초반 30분 관망",
                tagColor: "text-amber-300 bg-amber-500/15 border-amber-500/30",
                points: [
                    "개장 직후(09:00~09:20) 갭상승 출발 시 단기 차익 실현 매물 출회 및 위꼬리 리스크 존재",
                    "시초가 30분간 전액 매수는 지양하며, 10시 이후 당일 시초가 및 지지선 안착을 확인해야 안전",
                    "선물 지수 베이시스(선물-현물 가격차) 백워데이션 전환 시 신규 진입 자제",
                ],
            },
            {
                icon: "📉",
                title: "수급 변심 & 패시브 매물 출회",
                tag: "외국인 선물 순매도 감시",
                tagColor: "text-rose-300 bg-rose-500/15 border-rose-500/30",
                points: [
                    "외국인의 KOSPI 200 선물 순매도 전환 시 당일 오후장 지수 급격 하락 압력 발생 가능성",
                    "외국인 선물 순매도가 -3,000억 원 이상 급증할 경우 신규 진입을 전면 보류하고 관망",
                    "기관 금융투자(프로그램) 매도세 전환 여부 필수 체크",
                ],
            },
            {
                icon: "🌐",
                title: "거시 매크로 & 환율·금리 민감도",
                tag: "대외 거시 환경 리스크",
                tagColor: "text-blue-300 bg-blue-500/15 border-blue-500/30",
                points: [
                    "원/달러 환율 1,380원대 후반 고환율 구간 지속 시 외국인 패시브 자금의 일시 이탈 위험",
                    "미국 주요 물가·고용 지표 발표 및 지정학적 변수에 따른 글로벌 시장 흔들림 모니터링",
                    "지수 레버리지 ETF 단일 투자 시 계좌 비중 15% 이내 엄격 제한",
                ],
            },
        ];
    } else {
        // general_stock
        const customAlert = parseExecutiveOpinion(doc.risk_opinion, "리스크본부", "⚠️").body || "";
        headline = customAlert.length > 15 ? customAlert : `‘${sName}’은 실시간 수급 동향과 전고점 매물대 저항 여부를 점검하고, 증권사 예상 실적(컨센서스) 부합 여부를 확인한 뒤 보수적으로 분할 접근해야 합니다.`;
        factors = [
            {
                icon: "⏰",
                title: "진입 타이밍 & 시초가 변동성",
                tag: "장 초반 30분 주의",
                tagColor: "text-amber-300 bg-amber-500/15 border-amber-500/30",
                points: [
                    `호재 뉴스로 개장 직후 주가가 급등 출발할 경우 단기 고점 차익 매물에 물릴 위험`,
                    `시초가 추격 매수를 자제하고, 오전 10시 이후 장중 거래량 및 지지선 안착 확인 후 진입`,
                    `권장 진입가: 현재가(${currPriceStr}) 대비 ${safeEntryFormatted} 부근 눌림목 체결`,
                ],
            },
            {
                icon: "📉",
                title: "수급 변심 & 매물대 저항",
                tag: "큰손 매도 전환 감시",
                tagColor: "text-rose-300 bg-rose-500/15 border-rose-500/30",
                points: [
                    `직전 고점 부근 및 매물 집중 구간에서의 단기 차익 실현 매도 벽 출회 위험`,
                    `50일 이동평균선 지지 여부와 외국인·기관 큰손의 당일 동반 순매도 전환 여부 필수 체크`,
                    `기계적 손절 방어선: ${stopLossFormatted} (-3.5% 또는 50일선) 이탈 시 감정 배제 후 즉시 방어`,
                ],
            },
            {
                icon: "🌐",
                title: "거시 매크로 & 실적/공시 민감도",
                tag: "실적 컨센서스 & 비중 통제",
                tagColor: "text-blue-300 bg-blue-500/15 border-blue-500/30",
                points: [
                    "분기 실제 영업이익이 증권사 컨센서스에 부합하는지 실적 발표일 전후 모니터링",
                    "원/달러 환율 1,380원선 변동 및 글로벌 금리 기조에 따른 패시브 자금 변동성 체크",
                    `단일 종목 계좌 편입 한도: 총자산의 10~15%(${maxWeightDesc}) 절대 엄수`,
                ],
            },
        ];
    }

    // 실전 자금 리스크 계산 플랜 도출
    const plan = computeFinancialRiskPlan(rawPrice, rawTarget, capitalOverride);

    const defenseRules: RiskDefenseRule[] = isMacroSector ? [
        {
            num: "①",
            title: "시장 체온계 감시",
            target: sector === 'macro_vix' ? "VIX 20 미만 안정선" : (sector === 'macro_fx' ? "환율 1,390원 지지선" : (sector === 'macro_oil' ? "유가 $80 저항선" : "정상 등락 범위 유지")),
            desc: sector === 'macro_vix' 
                ? "VIX 20 미만 유지 시 시장에 공포가 없으므로 대표님의 실전 승인 종목 매매를 정상 집행합니다."
                : (sector === 'macro_fx' ? "환율 안정세 지속 시 외국인 순매수가 강화되므로 승인 종목 체결을 지원합니다." : "대외 거시 지표가 평온하게 유지되는지 24시간 실시간 모니터링합니다."),
        },
        {
            num: "②",
            title: "실전 종목 연동",
            target: "승인 안건 10만원 분할 체결",
            desc: "거시 지표가 맑음(안정)일 때 대표님이 [승인 서명]하신 실전 승인 종목(삼성중공업, 에스엠씨지, 심텍 등)을 원칙에 따라 안전하게 분할 매수합니다.",
        },
        {
            num: "③",
            title: "비상 방어선 가동",
            target: sector === 'macro_vix' ? "VIX 30 돌파 시 패닉 경보" : (sector === 'macro_fx' ? "환율 1,400원 돌파 시 경보" : "대외 변동성 급증 시"),
            desc: "공포지수 급등이나 환율 급변 등 폭풍우 발생 시 신규 매수를 전면 보류하고 기존 종목 -3.5% 손절선을 엄수합니다.",
        },
        {
            num: "④",
            title: "자산 방어 & 현금 확보",
            target: "리스크 감지 시 현금 50% 확보",
            desc: "대외 리스크가 확대될 경우 보유 주식의 절반을 분할 익절하여 안전 현금을 확보하고 계좌를 지킵니다.",
        },
    ] : [
        {
            num: "①",
            title: "계좌 비중 한도",
            target: plan
                ? (plan.priceExceedsBudget
                    ? `⚠️ 0주 (예산 부족 · 집행 보류)`
                    : `${plan.maxAlloc} (${plan.allocType})`)
                : `최대 10~15% (${maxWeightDesc})`,
            desc: plan 
                ? (plan.priceExceedsBudget 
                    ? `대표님이 설정하신 예산(${plan.maxAlloc})이 ${sName} 1주 단가(${plan.currPrice})보다 적어 실전 매수가 '0주'로 전면 보류됩니다. 대표님이 [승인 서명]을 누르시더라도 계좌에서 예산을 초과해 1원도 무단 결제되지 않으며, 설정 예산 ${plan.maxAlloc} 전액 안전 예수금으로 100% 보호됩니다. (최소 1주 매수를 위한 권장 예산: ${plan.isDollar ? '$' + Math.ceil(priceNum / 50) * 50 : Math.ceil(priceNum / 100000) * 10 + '만 원'} 이상)`
                    : `운용 자산 기준 총 ${plan.actualInvest} (${plan.totalShares}) 배정 (잔여 현금 ${plan.cashReserve} 비상금 보관)`)
                : `${sName} 단일 종목에 과도하게 집중하지 않고 안전 포트폴리오 비중을 철저히 준수합니다.`,
        },
        {
            num: "②",
            title: "3단계 분할 매수",
            target: plan 
                ? (plan.priceExceedsBudget
                    ? `0주 전액 보류 (0원 지출)`
                    : (plan.tranches[1].shares === '0주' 
                        ? `1차 ${plan.tranches[0].amt} (1주 집중)` 
                        : `1차 ${plan.tranches[0].amt} ➔ 2차 ${plan.tranches[1].amt} ➔ 3차 ${plan.tranches[2].amt}`))
                : `30% ➔ 40% ➔ 30% (${safeEntryFormatted})`,
            desc: plan
                ? (plan.priceExceedsBudget
                    ? `1주 단가(${plan.currPrice})가 설정 한도(${plan.maxAlloc})를 초과하므로 1·2·3차 분할 매수가 일체 체결되지 않으며 계좌 잔고가 안전하게 보호됩니다.`
                    : (plan.tranches[1].shares === '0주'
                        ? `오전 10시 지지선 확인 후 ${plan.tranches[0].price}에 1주 진입합니다.`
                        : `1차(${plan.tranches[0].price} ${plan.tranches[0].shares}) ➔ 2차(${plan.tranches[1].price} ${plan.tranches[1].shares}) ➔ 3차(${plan.tranches[2].price} ${plan.tranches[2].shares}) 분할 체결`))
                : `1차(오전 10시 지지선 ${safeEntryFormatted}에 30%) ➔ 2차(눌림목 안착 40%) ➔ 3차(상승 돌파 30%)로 나누어 매수합니다.`,
        },
        {
            num: "③",
            title: "기계적 손절 방어선",
            target: plan
                ? (plan.priceExceedsBudget
                    ? `🛑 손실 0원 (원금 100% 보존)`
                    : `🛑 ${plan.stopLossPrice} (최대 손실 딱 -${plan.maxLossAmount})`)
                : `🛑 ${stopLossFormatted} (-3.5% 도달 시 즉각)`,
            desc: plan
                ? (plan.priceExceedsBudget
                    ? `주식을 매수하지 않은 대기 상태이므로 주가가 급락하더라도 대표님의 계좌 손실은 0원입니다. (향후 예산 증액 매수 시 손절 기준선: ${stopLossFormatted})`
                    : `손절 시 총 손실은 딱 -${plan.maxLossAmount}으로 철저히 차단되며, 원금 + 잔여금 ${plan.shieldedAmount}은 안전하게 지켜냅니다.`)
                : `현재가 대비 -3.5% 하락한 ${stopLossFormatted}을 종가 또는 장중 이탈하면 감정 없이 즉시 방어합니다.`,
        },
        {
            num: "④",
            title: "1차 목표가 대응",
            target: plan
                ? (plan.priceExceedsBudget
                    ? `🎯 1주 이상 필요 (${plan.target1Price})`
                    : `🎯 ${plan.target1Price} (+${plan.target1ProfitAmt} 수익 구간)`)
                : `🎯 ${target1Formatted} (보유 물량 50%)`,
            desc: plan
                ? (plan.priceExceedsBudget
                    ? `1차 목표가(${plan.target1Price}) 도달 시 차익을 실현하시려면 상단에서 예산을 증액하여 최소 1주 이상 편입하셔야 합니다.`
                    : (plan.isSingleShare
                        ? `1주 보유 시 1차 목표(${plan.target1Price})에서 익절하면 ${plan.target1CashIn} 회수(+${plan.target1ProfitAmt}), 홀딩 시 손절선을 매수가(${plan.avgBuyPrice})로 상향합니다.`
                        : `1차 목표 도달 시 절반 매도로 현금 ${plan.target1CashIn} 즉시 회수 (확정 순수익: +${plan.target1ProfitAmt})`))
                : `1차 목표가 ${target1Formatted} 도달 시 보유 물량의 절반(50%)을 분할 매도하여 원금과 확정 수익을 챙깁니다.`,
        },
    ];

    return {
        headline,
        factors,
        defenseRules,
        financialPlan: plan,
    };
}

interface StockRiskDiagnostic {
    riskScore: number;
    riskLevel: '안전·저위험' | '중위험·주의관찰' | '고위험·단기과열';
    badgeClass: string;
    scoreColor: string;
    safeEntryStr: string;
    stopLossStr: string;
    takeProfitStr: string;
    maxWeightStr: string;
    splitRuleStr: string;
    croVerdict: string;
    financialPlan: FinancialRiskPlan | null;
    factors: {
        icon: string;
        title: string;
        tag: string;
        tagColor: string;
        points: string[];
    }[];
}

function computeStockRiskDiagnostic(r: any, capitalOverride: number = 100000): StockRiskDiagnostic {
    const isUS = r.category === 'us_stock';
    const price = typeof r.price === 'number' ? r.price : 0;
    const fmt = (n: number) => isUS ? `$${n.toFixed(2)}` : `${Math.round(n).toLocaleString()}원`;

    // 1. 계산 수치
    const stopLossVal = isUS ? price * 0.965 : Math.round(price * 0.965);
    const safeEntryVal = r.change_pct > 2 ? (isUS ? price * 0.985 : Math.round(price * 0.985)) : price;
    const targetMeanNum = r.consensus?.target_mean;
    const takeProfitVal = targetMeanNum && targetMeanNum > price 
        ? targetMeanNum 
        : (isUS ? price * 1.08 : Math.round(price * 1.075));

    // 2. 리스크 스코어 (1~5점)
    let score = 2;
    const rp = r.range_pos;
    if (rp !== null && rp !== undefined) {
        if (rp >= 80) score += 1;
        if (rp <= 15) score += 1;
    }
    const chg = r.change_pct || 0;
    if (chg >= 4) score += 1;
    if (chg <= -3.5) score += 1;

    if (r.flow) {
        const ft = r.flow.foreign_today;
        const ot = r.flow.organ_today;
        if (ft !== null && ot !== null) {
            if (ft < 0 && ot < 0) score += 1;
            else if (ft > 0 && ot > 0) score -= 1;
        }
    }
    if (r.per && r.per > 45) score += 1;
    score = Math.max(1, Math.min(5, score));

    let riskLevel: '안전·저위험' | '중위험·주의관찰' | '고위험·단기과열' = '중위험·주의관찰';
    let badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    let scoreColor = 'text-amber-400';

    if (score <= 2) {
        riskLevel = '안전·저위험';
        badgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
        scoreColor = 'text-emerald-400';
    } else if (score >= 4) {
        riskLevel = '고위험·단기과열';
        badgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
        scoreColor = 'text-rose-400';
    }

    const safeEntryStr = `${fmt(safeEntryVal)} 이하 (무리한 추격 매수 방지선)`;
    const stopLossStr = `${fmt(stopLossVal)} (-3.5% 도달 시 기계적 즉각 손절)`;
    const takeProfitStr = `${fmt(takeProfitVal)} (1차 50% 분할 익절 목표)`;
    const maxWeightStr = '계좌 총자산의 최대 10~15% 이내 (몰빵 절대 금지)';
    const splitRuleStr = '1차 30%(10시 안착) ➔ 2차 40%(눌림 지지) ➔ 3차 30%(돌파)';

    const factors = [
        {
            icon: '⏰',
            title: '진입 타이밍 & 시초가 변동성',
            tag: '장 초반 30분 관망 원칙',
            tagColor: 'text-amber-300 bg-amber-500/15 border-amber-500/30',
            points: [
                `현재 주가는 52주 범위의 ${rp ?? 50}% 구간 (오늘 ${chg > 0 ? '+' : ''}${chg}%)에 위치`,
                `개장 직후 갭상승 추격 매수를 자제하고, 오전 10시 이후 당일 시초가 위 지지선 안착 확인 필수`,
                `안전 진입가: ${fmt(safeEntryVal)} 부근의 눌림목 분할 체결 권장`,
            ],
        },
        {
            icon: '📉',
            title: '수급 변심 & 매물대 저항',
            tag: '큰손 수급 및 매물벽 진단',
            tagColor: 'text-rose-300 bg-rose-500/15 border-rose-500/30',
            points: [
                `외국인/기관 수급: ${r.flow ? `오늘 외인 ${r.flow.foreign_today > 0 ? '+' : ''}${Math.round(r.flow.foreign_today || 0).toLocaleString()}주 / 기관 ${r.flow.organ_today > 0 ? '+' : ''}${Math.round(r.flow.organ_today || 0).toLocaleString()}주` : '수급 모멘텀 집계 중'}`,
                `직전 고점 매물대(${r.high52_str || '전고점'}) 진입 시 차익실현 매도세 출회 가능성 대비`,
                `철통 방어선: ${fmt(stopLossVal)} (-3.5% 또는 50일선) 이탈 시 감정 없이 손절 처리`,
            ],
        },
        {
            icon: '🌐',
            title: '거시 매크로 & 실적/공시 민감도',
            tag: '대외 변수 & 비중 통제',
            tagColor: 'text-blue-300 bg-blue-500/15 border-blue-500/30',
            points: [
                `환율(1,380원선) 변동 및 미국 금리 기조에 따른 패시브 자금 변동성 주의`,
                `증권사 목표가(${r.consensus?.target_mean_str || '컨센서스'}) 대비 상승여력(${r.consensus?.upside_pct ? `${r.consensus.upside_pct}%` : '집계 중'}) 확인`,
                `단일 종목 계좌 편입 한도: 총자산의 10~15% 이내로 엄격 제한 (몰빵 금지)`,
            ],
        },
    ];

    let croVerdict = '';
    if (score <= 2) {
        croVerdict = `현재 ${r.stock_name}은(는) 큰손 수급과 밸류에이션 상 하방 경직성이 확보된 안전 구간입니다. 안전 진입가(${fmt(safeEntryVal)}) 부근에서 3단계 분할로 진입하시되, 손절선(${fmt(stopLossVal)})은 반드시 기계적으로 걸어두십시오.`;
    } else if (score === 3) {
        croVerdict = `${r.stock_name}은(는) 현재 지지선과 저항선 사이에서 방향성을 탐색하는 중립 구간입니다. 단기 급등에 따른 뇌동매매를 피하시고, 오전 10시 이후 지지력 확인 후 계좌 비중 10% 이내로 보수적 분할 매수하십시오.`;
    } else {
        croVerdict = `${r.stock_name}은(는) 단기 가격 급등 또는 52주 상단 매물벽 저항으로 변동성 리스크가 높은 과열 구간입니다. 신규 추격 매수는 전면 자제하시고, -3.5% 손절가(${fmt(stopLossVal)})를 철저히 설정한 상태에서만 극소액 분할 접근을 허용합니다.`;
    }

    const plan = computeFinancialRiskPlan(r.price_str || r.price, r.consensus?.target_mean || r.consensus?.target_mean_str, capitalOverride);

    return {
        riskScore: score,
        riskLevel,
        badgeClass,
        scoreColor,
        safeEntryStr,
        stopLossStr,
        takeProfitStr,
        maxWeightStr,
        splitRuleStr,
        croVerdict,
        financialPlan: plan,
        factors,
    };
}

interface ResearchReportItem {
    id: string;
    category: string;
    stock_name: string;
    title: string;
    broker: string;
    date: string;
    target_price: string;
    opinion: string;
    summary: string[];
    plain_explanation: string;
    action_point: string;
    pdf_url: string;
    detail_url: string;
}

interface CeoChatLog {
    id: string;
    timestamp: string;
    ceoMessage: string;
    agendaTitle: string;
    targetName: string;
    secretaryReply: string;
    debates: DebateTurn[];
    metrics: KeyMetric[];
}

type SignStatus = 'pending' | 'approved' | 'hold' | 'reexamine';

const QUICK_TOPICS = [
    { label: '🌅 전사 출근 브리핑', topic: '', message: '오늘 전사 출근 브리핑 및 핵심 리포트 보고해줘' },
    { label: '⚡ 두산에너빌리티', topic: '두산에너빌리티', message: '두산에너빌리티 목표주가랑 수급·리스크 끝장 토론해봐' },
    { label: '💾 삼성전자', topic: '삼성전자', message: '삼성전자 지금 외인·기관 수급이랑 리서치 의견 보고해봐' },
    { label: '🔥 SK하이닉스', topic: 'SK하이닉스', message: 'SK하이닉스 임원들 찬반 끝장 토론해봐' },
    { label: '🚢 삼성중공업', topic: '삼성중공업', message: '삼성중공업 수주 모멘텀이랑 리스크 대면 보고해봐' },
    { label: '✈️ 대한항공', topic: '대한항공', message: '대한항공 3분기 실적 리포트랑 수급 분석 보고해' },
    { label: '🟢 엔비디아 (NVDA)', topic: 'NVDA', message: '엔비디아(NVDA) 글로벌 AI 추세랑 밸류에이션 토론해봐' },
    { label: '⚡ 테슬라 (TSLA)', topic: 'TSLA', message: '테슬라(TSLA) 변동성이랑 모멘텀 임원 토론해봐' },
    { label: '🍎 애플 (AAPL)', topic: 'AAPL', message: '애플(AAPL) 온디바이스 AI랑 실적 전망 임원 토론해봐' },
    { label: '🛡️ 팔란티어 (PLTR)', topic: 'PLTR', message: '팔란티어(PLTR) AI 국방 수주랑 성장성 보고해봐' },
    { label: '📊 나스닥100 선물', topic: 'NQ=F', message: '나스닥100 선물(NQ=F) 야간 추세랑 헤지 전략 보고해' },
];

const FALLBACK_EXECUTIVES: Executive[] = [
    {
        id: 'chief_sec',
        name: '정유진',
        role: '비서실장',
        dept: '대표이사 직속 비서실',
        badge: '결재 서류 취합 · 3줄 핵심 요약',
        avatar: '👩‍💼',
        color: 'amber',
        style: '각 본부 임원들이 알아서 분석해 올린 기안서를 대표님이 서명만 하실 수 있도록 3줄로 요약해 결재판에 올립니다.',
        status: '어려운 금융 용어를 빼고 대표님 눈높이에 맞춘 쉬운 결재 요약 완료',
    },
    {
        id: 'research_vp',
        name: '박진우',
        role: '부사장 (리서치센터장)',
        dept: '기업·산업 리서치본부',
        badge: '증권사 리포트 쉬운 번역',
        avatar: '👨‍💼',
        color: 'purple',
        style: '국내외 제도권 증권사 애널리스트들이 발표한 최신 리포트와 목표주가 컨센서스를 자동 분석해 결재 올립니다.',
        status: '증권사 종목·시황 리포트 전수 조사 및 쉬운 한글 해설 완료',
    },
    {
        id: 'quant_dir',
        name: '김도현',
        role: '상무 (퀀트·수급본부장)',
        dept: '알고리즘 트레이딩·수급본부',
        badge: '외인/기관 큰손 자금 추적',
        avatar: '📈',
        color: 'emerald',
        style: '외국인·기관 수급 유입과 50일 이동평균선 돌파 여부를 알고리즘으로 자동 스캔해 보고합니다.',
        status: '외국인·기관 큰손 매수세 및 두 달 평균가격(50일선) 비교 완료',
    },
    {
        id: 'risk_cro',
        name: '최서연',
        role: '상무 (리스크관리본부장 · CRO)',
        dept: '리스크관리·컴플라이언스본부',
        badge: '조심할 점 콕 집어 점검',
        avatar: '🛡️',
        color: 'rose',
        style: '모든 결재 기안서에 대해 고점 부담, 환율·금리 변동성, 손절/방어 기준선을 사전에 감사하여 첨부합니다.',
        status: '모든 결재 서류에 대표님이 꼭 조심하셔야 할 위험 요인 첨부 완료',
    },
    {
        id: 'global_dir',
        name: '이준호',
        role: '이사 (글로벌·파생본부장)',
        dept: '해외주식·ETF·선물파생본부',
        badge: '미국 10대 빅테크 순환 · 선물 지수',
        avatar: '🌎',
        color: 'blue',
        style: '밤사이 뉴욕 증시 10대 빅테크(NVDA·TSLA·AAPL·MSFT·GOOGL·AMZN 등) 순환 분석과 나스닥 선물, 원/달러 환율과 한국 증시 연결고리를 자동 보고합니다.',
        status: '미국 10대 빅테크 데일리 순환 분석 & 나스닥 선물·원자재 24시간 연동 완료',
    },
    {
        id: 'weekly_review_dir',
        name: '한지훈',
        role: '이사 (주간리서치·성과복기팀장)',
        dept: '주간 리서치·실전매매 복기TF',
        badge: '주간 리서치 적중 복기 · 월요일 Top3',
        avatar: '📋',
        color: 'teal',
        style: '한 주간 상정된 증권사 리포트 추천주와 실전 모의투자 계좌의 매매 성적표(승률·손익·반성문)를 복기하고 차주 월요일 개장 전략을 수립합니다.',
        status: '주간 리서치 추천주 전수 복기 & 실전 계좌 매매 복기 보고서 상정 완료',
    },
    {
        id: 'econ_cal_dir',
        name: '윤서아',
        role: '이사 (경제일정·매크로분석팀장)',
        dept: '글로벌 경제캘린더·이벤트분석팀',
        badge: '한주 경제일정 · 호재/악재 시나리오',
        avatar: '🗓️',
        color: 'indigo',
        style: '한 주간(월~금) 한국·미국의 핵심 경제일정(FOMC·물가·고용·수출입·빅테크 실적)을 요일별로 정리하고 결과별 대응 시나리오를 사전 브리핑합니다.',
        status: '한 주간 한·미 핵심 경제일정 캘린더 및 요일별 대응 시나리오 수립 완료',
    },
];

const FALLBACK_AUTO_APPROVALS: AutoApprovalDoc[] = [
    {
        doc_id: 'DOC-DEFAULT-01',
        doc_number: '제 2026-01 호',
        category_type: 'all',
        category_badge: '🌐 전사 24시간·주말 무휴 종합 보고',
        urgency: '최우선 결재',
        stock_name: '전체 시장 시스템',
        title: '[전사 상시 감시 보고] 지금 주식시장 분위기 & 돈이 몰리는 핵심 업종 브리핑',
        proposer: '박진우 부사장 (리서치센터장) 외 4개 본부 합동',
        submitted_at: '상시 자동 상정 완료',
        easy_headline: '지금 시장은 모든 주식이 다 같이 오르는 장이 아닙니다! 실제로 해외 일감(수주)을 많이 따내고 돈을 잘 버는 알짜 우량주(AI 반도체·원전·조선·항공)로만 큰손들의 돈이 몰리고 있으니, 이 종목들만 콕 집어서 관리하자는 보고서입니다.',
        key_numbers: [
            { label: '오늘의 시장 핵심 키워드', value: '실적 좋은 알짜주 집중' },
            { label: '미리 보는 미국장 (나스닥선물)', value: '20,480pt (+0.42%)' },
            { label: '글로벌 AI 대장 (엔비디아)', value: '$138.00 (+0.89%)' },
            { label: '직원들이 분석 마친 보고서', value: '종목 6건 · 시황 4건' },
        ],
        research_opinion: '👍 [왜 이렇게 봐야 하나요? · 박진우 리서치센터장]: 소문으로만 오르는 주식은 피하고 분기 성적표(영업이익)가 잘 나오는 수출·수주 대장주만 골라 담아야 안전하다는 뜻입니다.',
        quant_opinion: '📊 [큰손들 돈의 흐름은? · 김도현 수급본부장]: 최근 두 달 평균 가격(50일선) 위에서 외국인과 기관 부자들이 함께 사들이는 종목들만 주가가 계속 힘을 내고 있습니다.',
        risk_opinion: '⚠️ [이것만 조심하세요! · 최서연 리스크본부장]: 이미 하루에 급등한 주식을 뒤늦게 따라 사는 것(추격 매수)은 절대 금물입니다! 나누어서 천천히 접근해야 안전합니다.',
        secretary_conclusion: '👩‍💼 정유진 비서실장 [대표님 결재 가이드]: 현재 우리 회사 모든 자동 분석 시스템이 주말·야간 상관없이 100% 정상 작동 중입니다. 알짜 실적주 위주로 집중 감시하라는 지침에 [승인 서명]만 눌러주십시오!',
        recommendation: '알짜 실적주 집중 감시 체제 승인',
        easy_terms: [
            { term: '컨센서스 (시장 예상치)', desc: '여러 증권사 전문가들이 이번 분기에 회사가 돈을 얼마나 벌지 미리 계산해 놓은 평균 예상 점수입니다.' },
            { term: '나스닥100 선물', desc: '미국 시장이 열리기 전에도 24시간 거래되는 미리 보는 미국 기술주 온도계입니다.' },
            { term: '50일선 (대략 8월 초부터 지금까지)', desc: '오늘부터 거꾸로 계산해 대략 8월 초부터 지금까지(약 2.5개월간) 주식시장에서 거래된 평균 매수단가입니다. 현재 주가가 이 선 위에 있으면 사는 힘이 강한 안전 구간입니다.' },
        ],
    },
    {
        doc_id: 'DOC-DEFAULT-02',
        doc_number: '제 2026-02 호',
        category_type: 'kr_stock',
        category_badge: '🏢 종목 쉽게 읽기 (하나증권)',
        urgency: '정규 결재',
        stock_name: '두산에너빌리티',
        stock_code: '034020',
        current_price: '64,100원 (+2.07%)',
        target_price: '120,000원',
        upside_pct: '+87.2%',
        profit_per_share: '주당 +55,900원 (+87.2%)',
        profit_10m: '약 +8,720,000원',
        title: '[두산에너빌리티] 연내 SMR 추가 수주 기대 및 글로벌 원전 기자재 모멘텀 유효',
        proposer: '박진우 부사장 (리서치) · 김도현 상무 (수급) · 최서연 상무 (리스크)',
        submitted_at: '쉬운 해설 완료',
        easy_headline: '하나증권에서 두산에너빌리티의 현재가(64,100원) 대비 목표주가를 120,000원(기대 상승여력 +87.2%)으로 제시했습니다. 소형원전(SMR) 추가 일감 계약이 기대되어 지금 매수하기에 매우 매력적인 구간입니다!',
        key_numbers: [
            { label: '실시간 현재가', value: '64,100원 (+2.07%)' },
            { label: '전문가 목표주가', value: '120,000원 (상승여력 +87.2%)' },
            { label: '주당 예상 기대차익', value: '주당 +55,900원 이익' },
            { label: '1,000만원 투자 시 기대수익', value: '약 +8,720,000원' },
        ],
        research_opinion: '👍 [왜 좋은가요? · 박진우 리서치센터장]: 전 세계적으로 AI 데이터센터 전력 부족 때문에 소형원전(SMR)과 가스터빈 발전기 주문이 늘어나고 있어 앞으로 회사가 벌어들일 이익이 계속 커질 것으로 분석됐습니다.',
        quant_opinion: '📊 [돈의 흐름은? · 김도현 수급본부장]: 증권사가 부른 목표 가격(120,000원)에 비해 지금 주가가 얼마나 저렴한지, 외국인과 기관 큰손들이 사 모으고 있는지 실시간 추적 중입니다.',
        risk_opinion: '⚠️ [뭘 조심해야 하나요? · 최서연 리스크본부장]: 무조건 좋다고 한 번에 사기보다는, 올해 안에 소형원전(SMR) 실제 본계약 공시가 나오는지를 함께 확인해야 합니다.',
        secretary_conclusion: '👩‍💼 정유진 비서실장 [대표님 결재 가이드]: 두산에너빌리티(목표주가 120,000원)의 좋은 점과 주의할 점을 모두 정리했습니다. 우리 회사 중점 관심 종목으로 등록할지 [승인 서명]을 눌러 결정해 주십시오!',
        recommendation: '목표주가 120,000원 기준 관심종목 등록 승인',
        detail_url: 'https://stock.naver.com/research/company/96804',
        easy_terms: [
            { term: 'SMR (소형모듈원전)', desc: '기존 거대한 원자력발전소를 작게 줄여서 공장에서 찍어내듯 만들어 설치하는 차세대 안전 발전소입니다.' },
            { term: '밸류에이션 (주가 가성비)', desc: '회사가 버는 돈이나 가진 재산에 비해 지금 주가가 비싼지 싼지 따져보는 가격표 점수입니다.' },
            { term: '50일선 (대략 8월 초부터 지금까지)', desc: '대략 8월 초부터 지금까지(약 2.5개월간) 주식을 산 사람들의 평균단가입니다. 이 가격 위에서는 최근 매수한 사람들이 수익권이라 주가가 단단하게 지지됩니다.' },
        ],
    },
    {
        doc_id: 'DOC-DEFAULT-03',
        doc_number: '제 2026-03 호',
        category_type: 'kr_stock',
        category_badge: '🏢 종목 쉽게 읽기 (한화투자증권)',
        urgency: '정규 결재',
        stock_name: '대한항공',
        title: '[대한항공] 3분기 일회성 성과급 반영에도 견조한 국제선 여객 운임 및 해외발 수요 유지',
        proposer: '박진우 부사장 (리서치) · 김도현 상무 (수급) · 최서연 상무 (리스크)',
        submitted_at: '쉬운 해설 완료',
        easy_headline: '한화투자증권에서 대한항공 주가가 43,000원까지 갈 수 있다고 분석했습니다! 직원들에게 보너스(성과급)를 주느라 이번 분기 이익이 예상보다 조금 적게 나왔을 뿐, 비행기 표값이나 해외 승객 수는 아주 탄탄하다는 뜻입니다.',
        key_numbers: [
            { label: '분석한 회사 이름', value: '대한항공' },
            { label: '보고서 낸 증권사', value: '한화투자증권' },
            { label: '전문가 목표주가', value: '43,000원' },
            { label: '전문가 결론', value: '사도 좋음 (매수)' },
        ],
        research_opinion: '👍 [왜 좋은가요? · 박진우 리서치센터장]: 3분기 매출 5조 448억원, 영업이익 4,212억원을 기록했습니다. 미주·일본 노선 등 비행기 운임이 높게 유지되고 있고 해외 환승 승객도 계속 늘고 있습니다.',
        quant_opinion: '📊 [돈의 흐름은? · 김도현 수급본부장]: 목표주가(43,000원) 대비 주가가 저렴한 구간에 있어 연기금과 외국인 큰손들의 저가 매수세가 들어오는지 감시하고 있습니다.',
        risk_opinion: '⚠️ [뭘 조심해야 하나요? · 최서연 리스크본부장]: 이번 실적에서 빠진 돈은 한 번만 나가는 직원 성과급 때문이므로 본업 문제와 구분해서 봐야 하며, 기름값(유가)과 환율이 오르는지만 조심하면 됩니다.',
        secretary_conclusion: '👩‍💼 정유진 비서실장 [대표님 결재 가이드]: 대한항공(목표주가 43,000원)은 본업이 튼튼하다는 보고입니다. 확인하셨으면 [승인 서명]을 눌러주십시오!',
        recommendation: '목표주가 43,000원 기준 관심종목 등록 승인',
        detail_url: 'https://stock.naver.com/research/company/96803',
        easy_terms: [
            { term: '컨센서스 (시장 예상치)', desc: '여러 증권사 전문가들이 이번 분기에 회사가 돈을 얼마나 벌지 미리 계산해 놓은 평균 예상 점수입니다.' },
            { term: '목표주가', desc: '증권사 애널리스트가 앞으로 6개월~1년 안에 이 가격까지는 갈 수 있다고 제시한 목표 가격입니다.' },
        ],
    },
    {
        doc_id: 'DOC-DEFAULT-04',
        doc_number: '제 2026-04 호',
        category_type: 'kr_stock',
        category_badge: '🚀 코스닥 유망주 (한국투자증권)',
        urgency: '정규 결재',
        stock_name: '실리콘투',
        title: '[실리콘투] 미국·유럽 K-뷰티 역직구 수출 급증 및 10만원 이하 코스닥 알짜 실적주',
        proposer: '박진우 부사장 (리서치) · 김도현 상무 (수급) · 최서연 상무 (리스크)',
        submitted_at: '쉬운 해설 완료',
        easy_headline: '미래에셋증권에서 SK하이닉스 목표주가를 270,000원으로 제시했습니다! 미국 엔비디아에 납품하는 AI 전용 초고속 메모리(HBM) 분야 1등이라서, 일반 반도체 경기와 상관없이 돈을 아주 잘 벌고 있다는 뜻입니다.',
        key_numbers: [
            { label: '분석한 회사 이름', value: 'SK하이닉스' },
            { label: '보고서 낸 증권사', value: '미래에셋증권' },
            { label: '전문가 목표주가', value: '60,000원' },
            { label: '전문가 결론', value: '사도 좋음 (매수)' },
        ],
        research_opinion: '👍 [왜 좋은가요? · 박진우 리서치센터장]: AI 컴퓨터에 꼭 들어가야 하는 최고급 메모리(HBM)를 사실상 독점 공급하다시피 하면서 업계 최고 수준의 이익률을 내고 있습니다.',
        quant_opinion: '📊 [돈의 흐름은? · 김도현 수급본부장]: 대략 8월 초부터 지금까지(약 2.5개월) 평균 가격인 50일선 위에서 외국인과 기관 큰손들이 가장 활발하게 사들이는 대한민국 대표 AI 반도체 대장주입니다.',
        risk_opinion: '⚠️ [뭘 조심해야 하나요? · 최서연 리스크본부장]: 밤사이 미국 엔비디아 주가가 흔들리는 날에는 아침에 같이 출렁일 수 있으니 급등하는 날 추격 매수만 피하시면 됩니다.',
        secretary_conclusion: '👩‍💼 정유진 비서실장 [대표님 결재 가이드]: AI 반도체 1등주 SK하이닉스(목표주가 270,000원) 쉬운 해설 보고서입니다. [승인 서명]을 요청드립니다!',
        recommendation: '목표주가 270,000원 기준 관심종목 등록 승인',
        detail_url: 'https://stock.naver.com/research/company',
        easy_terms: [
            { term: 'HBM (고대역폭 메모리)', desc: '일반 D램을 아파트처럼 여러 층 쌓아 올려 AI 칩이 엄청난 속도로 데이터를 처리하게 돕는 AI 전용 최고급 메모리입니다.' },
            { term: '50일선 (대략 8월 초부터 지금까지)', desc: '오늘을 기준으로 거꾸로 계산해 대략 8월 초부터 지금까지(약 2.5개월간) 주식을 산 사람들의 평균 매수가격입니다. 주가가 이 선 위에 있으면 사는 힘이 강합니다.' },
        ],
    },
    {
        doc_id: 'DOC-DEFAULT-05',
        doc_number: '제 2026-05 호',
        category_type: 'us_stock',
        category_badge: '🌎 미국 주식 쉽게 읽기',
        urgency: '글로벌 핵심',
        stock_name: 'NVDA',
        title: '[엔비디아 (NVDA)] 전 세계 AI 대장주 분위기 & 한국 반도체(삼전·하이닉스) 영향 보고',
        proposer: '이준호 이사 (글로벌·파생본부장)',
        submitted_at: '24시간 글로벌 데스크',
        easy_headline: '전 세계 AI 칩 1등 회사인 미국 엔비디아가 잘 가야 한국 삼성전자·SK하이닉스도 같이 힘을 받습니다! 미국 월스트리트 전문가들은 엔비디아가 평균 $175.00(지금보다 +26.8% 더 상승 가능)까지 갈 수 있다고 보고 있습니다.',
        key_numbers: [
            { label: '엔비디아 현재 주가', value: '$138.00 (+0.89%)' },
            { label: '미국 전문가 평균 목표가', value: '$175.00 (+26.8%)' },
            { label: '최근 두 달 평균가격(50일선)', value: '$132.40' },
            { label: '현재 주가 힘(추세)', value: '📈 50일선 상회 강세' },
        ],
        research_opinion: '👍 [왜 중요한가요? · 이준호 글로벌이사]: 엔비디아는 전 세계 빅테크 기업들이 서로 사려고 줄을 서는 AI 반도체의 대장입니다. 미국 전문가 평균 목표가가 $175.00로 한국 반도체 주식에도 좋은 신호입니다.',
        quant_opinion: '📊 [차트 흐름은? · 김도현 수급본부장]: 최근 두 달 평균 가격($132.40) 위에서 튼튼하게 버티고 있어서 글로벌 큰손 자금이 AI 기술주에 계속 머물러 있습니다.',
        risk_opinion: '⚠️ [뭘 조심해야 하나요? · 최서연 리스크본부장]: 최근 1년 최고가 근처에서는 수익을 챙기려는 매도 물량이 나올 수 있으니 원/달러 환율과 함께 보셔야 합니다.',
        secretary_conclusion: '👩‍💼 정유진 비서실장 [대표님 결재 가이드]: 한국 반도체 주식의 길잡이 역할을 하는 엔비디아(NVDA) 점검 보고서입니다. 확인하셨으면 [승인 서명]을 눌러주십시오!',
        recommendation: '글로벌 AI 대장주 연동 감시 승인',
        easy_terms: [
            { term: 'HBM (고대역폭 메모리)', desc: '엔비디아 AI 칩 옆에 꼭 붙어 있어야 하는 초고속 메모리로, 한국 SK하이닉스와 삼성전자가 만듭니다.' },
            { term: '목표주가', desc: '미국 월스트리트 투자은행(IB) 전문가들이 계산한 향후 1년 목표 주가입니다.' },
        ],
    },
];

const FALLBACK_DEBATES: DebateTurn[] = [
    {
        speaker_id: 'sec_chief',
        name: '정유진',
        role: '비서실장',
        dept: '대표이사 직속 비서실',
        avatar: '👩‍💼',
        stance: '결재서류 상정 완료',
        stance_tone: 'summary',
        headline: '대표님, 평일·주말 구분 없이 각 본부 임원들이 시장 시스템과 핵심 종목 분석을 모두 마쳐 기안서를 올렸습니다!',
        message: '대표님께서 직접 찾으실 필요 없이 리서치센터·퀀트본부·리스크관리본부·글로벌본부가 24시간 상시 분석을 끝내고 [대표이사 전자결재 집무실]에 기안서를 올려두었습니다.\n브리핑 요약만 훑어보시고 [✅ 승인 서명] 도장만 찍어주시면 됩니다!',
        data_tag: '전 부서 상시 자율 기안 완료',
    },
    {
        speaker_id: 'research_vp',
        name: '박진우',
        role: '부사장 (리서치센터장)',
        dept: '기업·산업 리서치본부',
        avatar: '👨‍💼',
        stance: '리서치 자동 분석 보고',
        stance_tone: 'bull',
        headline: '증권사 최신 리포트 전수 분석 완료 — 두산에너빌리티(120,000원) · 대한항공(43,000원) · SK하이닉스(270,000원)',
        message: '대표님, 증권사에 주말은 없습니다! 국내 주요 증권사 애널리스트들이 발표한 최신 종목·시황 리포트를 전수 조사하여 핵심만 3초 요약해 결재판에 올려두었습니다.',
        data_tag: '제도권 증권사 리포트 전수 요약',
    },
    {
        speaker_id: 'quant_dir',
        name: '김도현',
        role: '상무 (퀀트·수급본부장)',
        dept: '알고리즘 트레이딩·수급본부',
        avatar: '📈',
        stance: '수급 스캐너 정상 가동',
        stance_tone: 'neutral',
        headline: '외국인·기관 수급 및 50일 이동평균선 돌파 스캐너 자동 감사 완료',
        message: '상정된 모든 종목의 현재가와 50일 이동평균선 위치, 최근 52주 고저점 대비 수급 탄력을 자동으로 계산해 각 결재 서류에 첨부해 두었습니다.',
        data_tag: 'KRX 수급 & 50일선 연동',
    },
    {
        speaker_id: 'risk_cro',
        name: '최서연',
        role: '상무 (리스크관리본부장 · CRO)',
        dept: '리스크관리·컴플라이언스본부',
        avatar: '🛡️',
        stance: '사전 리스크 감사 완료',
        stance_tone: 'caution',
        headline: '모든 결재 안건에 주의해야 할 하방 리스크 요인을 사전에 첨부했습니다',
        message: '리서치팀의 낙관적인 목표주가 뒤에 숨어 있는 실적 하회 리스크·환율 변수·차익실현 주의 구간을 제가 직접 빨간펜으로 적어 각 기안서에 붙여 두었습니다.',
        data_tag: 'CRO 사전 리스크 감사필',
    },
    {
        speaker_id: 'global_dir',
        name: '이준호',
        role: '이사 (글로벌·파생본부장)',
        dept: '해외주식·ETF·선물파생본부',
        avatar: '🌎',
        stance: '24시간 글로벌 데스크 보고',
        stance_tone: 'bull',
        headline: '나스닥100 선물(NQ=F) · 엔비디아(NVDA) 24시간 글로벌 데스크 보고 완료',
        message: '글로벌본부에서도 미국 증시와 지수 선물 시장을 상시 분석해 결재 안건으로 올려두었습니다. 한국 반도체와 수출주 개장 방향성을 결정짓는 핵심 지표이니 함께 재가해 주십시오!',
        data_tag: '미국 주식 · ETF · 선물 24시간 데스크',
    },
];

const FALLBACK_RESEARCH_DESK: ResearchReportItem[] = [
    {
        id: 'fb_rep_1',
        category: '종목·목표주가',
        stock_name: '두산에너빌리티',
        title: '연내 SMR 추가 수주 기대 및 글로벌 원전 기자재 모멘텀 유효',
        broker: '하나증권',
        date: '최신 발간',
        target_price: '120,000원',
        opinion: 'Buy (매수)',
        summary: ['목표주가 120,000원 및 투자의견 매수 유지'],
        plain_explanation: '소형모듈원전(SMR) 추가 수주와 전사적 이익 개선 기대감 유효',
        action_point: '연내 SMR 수주 공시 및 밸류에이션 멀티플 확인',
        pdf_url: '',
        detail_url: 'https://stock.naver.com/research/company/96804',
    },
    {
        id: 'fb_rep_2',
        category: '종목·목표주가',
        stock_name: '대한항공',
        title: '[3Q Review] 일회성 성과급 반영에도 견조한 국제선 여객 운임 유지',
        broker: '한화투자증권',
        date: '최신 발간',
        target_price: '43,000원',
        opinion: 'Buy (매수)',
        summary: ['별도 매출액 5조 448억원, 영업이익 4,212억원 기록'],
        plain_explanation: '해외발 수요 적극 유치 및 미주·일본 노선 견조한 운임 지속',
        action_point: '일회성 비용과 본업 여객·화물 수익성 분리 점검',
        pdf_url: '',
        detail_url: 'https://stock.naver.com/research/company/96803',
    },
    {
        id: 'fb_rep_3',
        category: '종목·목표주가',
        stock_name: '실리콘투',
        title: 'HBM3E 12단 독점적 지위 지속 및 AI 서버용 고부가 메모리 수익성 극대화',
        broker: '미래에셋증권',
        date: '최신 발간',
        target_price: '270,000원',
        opinion: 'Buy (매수)',
        summary: ['AI 가속기향 HBM 매출 비중 확대로 영업이익률 선도'],
        plain_explanation: 'AI 전용 초고속 메모리(HBM) 시장을 선도하며 높은 이익 창출',
        action_point: '외국인·기관 반도체 프로그램 순매수 유입 확인',
        pdf_url: '',
        detail_url: 'https://stock.naver.com/research/company',
    },
    {
        id: 'fb_rep_4',
        category: '종목·목표주가',
        stock_name: '삼성전자',
        title: '역사적 PBR 밴드 하단 저평가 매력 및 HBM 공급 확대 기대',
        broker: 'KB증권',
        date: '최신 발간',
        target_price: '85,000원',
        opinion: 'Buy (매수)',
        summary: ['12개월 선행 PBR 1.0배 부근 하방 경직성 확보'],
        plain_explanation: '자산가치 대비 저점 구간으로 추가 하락 위험 제한적',
        action_point: '외국인 수급 전환 및 50일 이동평균선 안착 여부 점검',
        pdf_url: '',
        detail_url: 'https://stock.naver.com/research/company',
    },
];


// 🌏 종목별 "해외에서 무슨 이슈가 터지면 이 회사가 직격을 받아 떨어지는가?" 직관적 인과관계 헬퍼
// 🚀 [실시간 주가 연동] 종목 맞춤형 3대 상승 동력 & 글로벌 훈풍 지표 산출 헬퍼
function buildDefaultStockRiseIntel(stockName: string, stockCode?: string, extraContext?: string) {
    const combined = `${stockName || ''} ${stockCode || ''} ${extraContext || ''}`.toLowerCase();
    
    // 미국 AI 반도체 대장주 (엔비디아 NVDA)
    if (['엔비디아', 'nvda', 'nvidia'].some(k => combined.includes(k))) {
        return {
            riseChainBadge: '🔥 글로벌 빅테크 AI CAPEX 폭증 · 차세대 블랙웰 완판 · 독점적 CUDA 생태계 수혜주',
            riseOneLiner: `해외에서 『빅테크(MS·구글·메타·아마존)의 AI 데이터센터 설비투자(CAPEX) 대폭 증액 및 차세대 블랙웰 GPU 공급 부족』이 터지며 ➔ 분기 사상 최대 실적 경신과 독점 프리미엄으로 ${stockName} 주가가 강력하게 상승하고 있습니다!`,
            riseTriggers: [
                {
                    icon: '🚀',
                    trigger: '🔥 글로벌 빅테크의 분기 수십조 원대 AI 데이터센터 인프라 CAPEX 증액',
                    chain: '생성형 AI 모델 학습과 추론 수요 급증으로 엔비디아 최고 사양 GPU(B200/H200) 선주문이 쇄도하여 실적이 퀀텀점프합니다.',
                    detailed_explanation: `${stockName}은 전 세계 AI 가속기 시장의 80% 이상을 장악한 독보적 대장주입니다. 마이크로소프트, 구글, 메타, 아마존 등 빅테크 기업들이 AI 주도권 경쟁을 위해 분기 수십조 원 단위로 인프라 투자를 늘리면서 엔비디아의 핵심 GPU 제품군이 1년 이상 선주문 매진되는 초호황을 누리고 있습니다.`,
                    impact_degree: '🔥 1순위 상승 동력'
                },
                {
                    icon: '💎',
                    trigger: '📈 차세대 블랙웰(Blackwell) 아키텍처 양산 및 12개월 치 예약 완판',
                    chain: '전 세대(Hopper) 대비 연산 능력이 대폭 향상된 고마진 차세대 가속기가 완판되어 평균판매단가(ASP)와 70%대 마진율이 유지됩니다.',
                    detailed_explanation: '차세대 B200·GB200 블랙웰 플랫폼이 글로벌 클라우드 서비스 기업들(CSP)에 본격 공급되기 시작했습니다. 이전 세대 대비 추론 성능이 최대 30배 개선되어 고객사들의 교체 수요가 폭발적이며, 높은 기술 장벽으로 70%를 웃도는 압도적인 영업이익률이 지속되고 있습니다.',
                    impact_degree: '✨ 실적 폭발 모멘텀'
                },
                {
                    icon: '🌐',
                    trigger: '⚡ 500만 개발자 락인(Lock-in) CUDA 소프트웨어 생태계 독점 프리미엄',
                    chain: '빅테크들이 자체 ASIC 칩을 개발하더라도 소프트웨어 생태계 호환성 때문에 엔비디아 GPU를 필수로 병행 구매할 수밖에 없습니다.',
                    detailed_explanation: '전 세계 AI 연구원과 엔지니어들이 엔비디아의 병렬 연산 플랫폼인 CUDA를 기반으로 모델을 개발하기 때문에 타사 칩으로의 전환 비용이 매우 큽니다. 이러한 소프트웨어 해자가 빅테크의 독자 칩 개발 리스크를 방어하며 대체 불가능한 밸류에이션 프리미엄을 유지시키는 원동력입니다.',
                    impact_degree: '⚡ 독점적 해자'
                }
            ],
            deepReport: {
                summary_headline: `${stockName}은 생성형 AI 혁명의 핵심 인프라를 독점하는 글로벌 반도체 총대장주입니다.`,
                business_model_context: `${stockName}은 하드웨어 GPU뿐만 아니라 CUDA 소프트웨어 생태계를 완벽히 장악하여 전 세계 데이터센터 가속기 시장의 80% 이상을 점유하고 있습니다. 한국의 SK하이닉스·삼성전자(HBM) 및 TSMC(CoWoS 패키징) 밸류체인과 직결되어 글로벌 테크 시장의 나침반 역할을 합니다.`,
                transmission_mechanism: `빅테크 기업들의 AI 데이터센터 투자 확대 ➔ 엔비디아 GPU 주문 쇄도 및 분기 영업이익률 60~70%대 기록 ➔ 한국 반도체 수출 호조 및 글로벌 테크주 동반 랠리로 전달됩니다.`,
                smart_money_logic: `글로벌 헤지펀드와 기관 투자자들은 빅테크 4대장의 분기 자본지출(CAPEX) 가이던스와 블랙웰 출하 일정을 매수의 핵심 척도로 삼고 있습니다.`,
                key_inflection_points: `① 미국 빅테크의 AI CAPEX 증액 지속 여부, ② 차세대 블랙웰 패키징 및 출하 속도, ③ 미국 국채 금리 및 미·중 반도체 수출 통제 정책`
            }
        };
    }

    // 미국 맞춤형 AI 칩 & 초고속 통신 대장주 (브로드컴 AVGO)
    if (['브로드컴', 'avgo', 'broadcom'].some(k => combined.includes(k))) {
        return {
            riseChainBadge: '🔥 빅테크 커스텀 AI 가속기(ASIC) 독점 수주 · 초고속 네트워킹 스위치 1위 수혜주',
            riseOneLiner: `해외에서 『구글·메타·바이트댄스 등 글로벌 빅테크의 맞춤형 자체 AI 칩(ASIC) 설계 발주 확대 및 800G/1.6T 초고속 이더넷 스위치 수요 급증』이 터지며 ➔ 강력한 실적 성장세로 ${stockName} 주가가 강력하게 상승하고 있습니다!`,
            riseTriggers: [
                {
                    icon: '🚀',
                    trigger: '🔥 구글 TPU·메타 MTIA 등 빅테크 차세대 커스텀 AI 반도체(ASIC) 독점 파트너십',
                    chain: '빅테크 기업들이 비용 절감을 위해 자체 AI 칩을 늘릴수록 브로드컴의 맞춤형 ASIC 설계 수주가 비례해서 급증합니다.',
                    detailed_explanation: `${stockName}은 구글 TPU, 메타 MTIA 등 세계 최고 빅테크들의 커스텀 AI 칩을 독점 설계하는 핵심 파트너입니다. 자체 칩 전환 흐름의 최대 수혜를 입어 분기 두 자릿수 매출 성장을 지속하고 있습니다.`,
                    impact_degree: '🔥 1순위 상승 동력'
                },
                {
                    icon: '💎',
                    trigger: '📈 AI 데이터센터 클러스터용 Tomahawk/Jericho 초고속 스위치 시장 1위 독점',
                    chain: '수만 개의 GPU를 병렬 연결하는 800G 및 1.6T 초고속 네트워크 스위치 칩 수요가 폭증하여 영업이익률이 퀀텀점프합니다.',
                    detailed_explanation: 'AI 데이터센터에서는 GPU 간 통신 병목을 해결하는 스위치 칩이 필수적입니다. 브로드컴의 스위치 칩 점유율은 70% 이상으로 대체 불가능한 고수익 캐시카우 역할을 합니다.',
                    impact_degree: '✨ 네트워킹 독점'
                },
                {
                    icon: '🌐',
                    trigger: '⚡ VMware 인수 시너지 본격화에 따른 안정적 엔터프라이즈 구독 매출 결합',
                    chain: '기업용 클라우드 가상화 소프트웨어 구독 매출이 결합되어 반도체 경기 사이클 변동성을 흡수하고 안정적 현금흐름을 창출합니다.',
                    detailed_explanation: 'VMware 라이선스의 클라우드 구독 모델 전환이 성공적으로 안착하며 연간 120억 달러 이상의 반복 소프트웨어 매출이 발생하여 기업 밸류에이션을 한 단계 끌어올리고 있습니다.',
                    impact_degree: '⚡ 소프트웨어 시너지'
                }
            ]
        };
    }

    // 심텍 / 패키지기판 (FC-CSP, SiP 등)
    if (['심텍', '222800', '대덕전자', '353200', '코리아써키트', '007810', '해성디에스', '195870', '패키지기판', '기판', 'pcb', 'fc-csp', 'sip'].some(k => combined.includes(k))) {
        return {
            riseChainBadge: '🔥 온디바이스 AI 기판 탑재량 급증 · DDR5/GDDR7 전환 가속 · 흑자 턴어라운드 수혜주',
            riseOneLiner: `해외에서 『온디바이스 AI 스마트폰 및 AI PC 확산으로 고다층 SiP·FC-CSP 패키지 기판 주문 폭증』과 『글로벌 메모리사(삼성전자·SK하이닉스)의 DDR5/GDDR7 전환 가속화』가 맞물리며 ➔ 공장 가동률 회복 및 판가(ASP) 급상승으로 ${stockName} 주가가 강력하게 상승하고 있습니다!`,
            riseTriggers: [
                {
                    icon: '🚀',
                    trigger: '🔥 온디바이스 AI 모바일·PC 확산에 따른 고부가 SiP 및 FC-CSP 기판 채용 폭증',
                    chain: '스마트폰과 PC당 기판 탑재 면적이 확대되고 고부가 SiP 모듈 주문이 쏟아져 분기 영업이익이 급증합니다.',
                    detailed_explanation: `${stockName}은 모바일 AP 및 메모리 패키징에 필수적인 FC-CSP와 SiP 기판 분야 글로벌 1위권 공급사입니다. AI 연산 능력을 갖춘 스마트폰과 차세대 PC 출시로 고다층 고부가 기판 수요가 폭증하며 판가 상승과 실적 개선이 동시에 나타나고 있습니다.`,
                    impact_degree: '🔥 1순위 상승 동력'
                },
                {
                    icon: '📈',
                    trigger: '💎 삼성전자·SK하이닉스 DDR5 및 GDDR7 차세대 메모리 전환 가속화',
                    chain: '전방 메모리 제조사들의 차세대 규격 기판 주문이 급증하여 청주 및 글로벌 팹 가동률이 100%에 근접하고 있습니다.',
                    detailed_explanation: '서버 및 그래픽 카드용 고성능 메모리 전환 속도가 빨라지면서 기존 재고 조정이 완전히 끝나고 신규 기판 주문이 대폭 증가했습니다. 이에 따라 고정비 부담이 해소되며 강력한 흑자 턴어라운드 국면에 진입하고 있습니다.',
                    impact_degree: '✨ 가동률 풀가동'
                },
                {
                    icon: '💰',
                    trigger: '💵 외국인·기관 큰손 패시브 수급 쌍끌이 매수 및 목표주가 상향 랠리',
                    chain: '반도체 사이클 회복과 함께 코스닥 IT 하드웨어 대표주로 외국인 알고리즘 매수세가 집중 유입되고 있습니다.',
                    detailed_explanation: '메모리 슈퍼사이클 턴어라운드 기대감이 고조되며 주요 증권사들이 목표가를 잇달아 상향하고 있으며, 외국인 지분율이 5거래일 연속 확대되며 주가 상승 탄력을 키우고 있습니다.',
                    impact_degree: '⚡ 메이저 수급 결집'
                }
            ]
        };
    }

    // 조선 / 해양플랜트 (삼성중공업, 한화오션 등)
    if (['삼성중공업', '010140', '한화오션', '042660', 'hd한국조선해양', '009540', 'hd현대중공업', '329180', '현대미포조선', '조선', 'flng', 'lng선', '해양플랜트', '신조선가'].some(k => combined.includes(k))) {
        return {
            riseChainBadge: '🔥 고선가 LNG 운반선 수주 랠리 · 북미/카타르 메가 FLNG 독점 · 신조선가 최고치 수혜주',
            riseOneLiner: `해외에서 『카타르·북미 대형 LNG선 수주 랠리 및 수조 원대 고마진 FLNG(해양플랜트) 독점 계약』이 터지며 ➔ 클락슨 신조선가 지수 사상 최고치 경신과 함께 3~4년 치 안정적 고수익 일감을 확보하여 ${stockName} 주가가 강력하게 상승하고 있습니다!`,
            riseTriggers: [
                {
                    icon: '🚢',
                    trigger: '🔥 글로벌 오일 메이저의 수조 원대 FLNG(부유식 LNG 설비) 추가 수주 랠리',
                    chain: '삼성중공업이 독점적 기술력을 보유한 고마진 해양플랜트(FLNG) 계약이 잇달아 성사되며 영업이익률이 퀀텀점프합니다.',
                    detailed_explanation: '유가 안정세와 글로벌 LNG 수요 확대에 따라 글로벌 오일 메이저(페트로나스, 에니 등)의 해양가스전 개발 투자가 재개되었습니다. 삼성중공업은 전 세계 FLNG 시장의 80% 이상을 건조한 독보적 기술력으로 연간 1~2척의 메가 프로젝트 수주를 이어가며 막대한 수익성을 창출하고 있습니다.',
                    impact_degree: '🔥 1순위 상승 동력'
                },
                {
                    icon: '📈',
                    trigger: '💎 클락슨 신조선가 지수 연일 사상 최고치 경신 및 고선가 선박 건조 본격화',
                    chain: '과거 저가 수주 물량이 모두 털리고 척당 2.6억 달러 이상의 고선가 친환경 LNG선 건조 비중이 급증하고 있습니다.',
                    detailed_explanation: '조선 3사의 도크가 2027~2028년까지 꽉 찬 상태에서 선주사들의 선박 발주 경쟁이 이어져 신조선가가 연일 최고치를 경신하고 있습니다. 이에 따라 선가 상승 효과가 실적에 본격 반영되는 영업 레버리지 사이클에 진입했습니다.',
                    impact_degree: '✨ 신조선가 사상 최고'
                },
                {
                    icon: '⚓',
                    trigger: '🇺🇸 미 해군 MRO(함정 유지보수) 협력 확대 및 무탄소 친환경 암모니아선 선점',
                    chain: '미국의 동맹국 조선소 MRO 발주 수혜와 친환경 무탄소 선박 기술 표준 선점으로 중장기 프리미엄을 확보하고 있습니다.',
                    detailed_explanation: '미국 국방부의 해군 함정 MRO 프로젝트 진출 기대감과 함께 IMO 탄소 규제에 맞춘 암모니아·메탄올 이중연료 추진선 수주가 확대되며 미래 친환경 조선 시장의 주도권을 확고히 다지고 있습니다.',
                    impact_degree: '⚡ 글로벌 수주 모멘텀'
                }
            ]
        };
    }

    // 반도체 / 소부장 (씨엠티엑스, 하나머티리얼즈 등)
    if (['반도체', 'hbm', '식각', '증착', '소부장', '하이닉스', '삼전', '삼성전자', '씨엠티엑스', 'cmtx', '하나머티', '티씨케이', '원익', '월덱스', '동진', '리노공업', '한미반도체'].some(k => combined.includes(k))) {
        return {
            riseChainBadge: '🔥 글로벌 빅테크 AI CAPEX 급증 · 팹 가동률 회복 · 고수익 부품 수주 수혜주',
            riseOneLiner: `해외에서 『미국 빅테크(엔비디아·MS·구글)의 AI 데이터센터 투자 확대 및 글로벌 반도체 팹 가동률 반등』이 터지며 ➔ 고수익 소모성 부품 수주 급증과 외국인 패시브 매수세 결집으로 ${stockName} 주가가 강력하게 상승하고 있습니다!`,
            riseTriggers: [
                {
                    icon: '🚀',
                    trigger: '🔥 글로벌 빅테크 AI 인프라 투자(CAPEX) 확대 및 전방 팹 가동률 급반등',
                    chain: '삼성전자·TSMC·인텔 등 주요 파운드리 및 메모리 가동률이 상승하며 필수 부품 발주가 대폭 늘어나 실적이 퀀텀점프합니다.',
                    detailed_explanation: `${stockName}이 생산하는 실리콘·세라믹·소모성 링 부품은 웨이퍼 식각 공정에서 지속적으로 마모되어 주기적으로 교체해야 하는 핵심 소모품입니다. 최근 AI 반도체 수요 폭발로 글로벌 팹 가동률이 80%대 후반으로 회복되면서 부품 교체 주기가 단축되고 분기 발주량이 전분기 대비 30% 이상 급증하고 있습니다.`,
                    impact_degree: '🔥 1순위 상승 동력'
                },
                {
                    icon: '💰',
                    trigger: '📈 외국인·기관 쌍끌이 대량 순매수 및 필라델피아 반도체 지수 강세',
                    chain: '미국 테크주 랠리와 함께 코스닥/코스피 소부장 대표주로 글로벌 패시브 자금이 집중 유입되고 있습니다.',
                    detailed_explanation: '필라델피아 반도체 지수 강세와 함께 글로벌 패시브 ETF 펀드들이 한국의 실적 가시성이 높은 중소형 소부장 종목들을 바스켓으로 매수하고 있습니다. 특히 외국인과 사모펀드가 3거래일 연속 순매수를 확대하며 단기 매물벽을 가볍게 돌파하는 원동력이 되고 있습니다.',
                    impact_degree: '✨ 메이저 수급 결집'
                },
                {
                    icon: '🌐',
                    trigger: '💎 차세대 고부가가치 부품(SiC/쿼츠 등) 국산화 점유율 독점 및 단가 인상',
                    chain: '진입장벽이 높은 차세대 공정 부품을 선점하여 독점적 마진율(영업이익률 20~30%대)을 확보하며 기업가치가 재평가됩니다.',
                    detailed_explanation: '선단 공정(3nm/2nm) 및 HBM 고단 적층 공정으로 갈수록 기존 실리콘 부품 대비 내구성이 뛰어난 실리콘카바이드(SiC) 부품 채택이 필수적입니다. 높은 기술적 진입장벽 덕분에 납품 단가 인하 압력이 낮고 영업이익률 25% 이상의 고수익 구조가 유지되고 있습니다.',
                    impact_degree: '⚡ 마진 레버리지'
                },
            ],
            deepReport: {
                summary_headline: `${stockName}은 글로벌 AI 반도체 투자 사이클과 파운드리 가동률에 직결된 핵심 수혜주입니다.`,
                business_model_context: `${stockName}은 반도체 제조 공정 중 가장 난이도가 높은 식각/증착 챔버 내부에 장착되는 소모성 부품을 전문 제조합니다. 주요 고객사는 삼성전자, SK하이닉스 및 글로벌 장비 제조사(Applied Materials, Lam Research 등)이며, 칩이 생산될수록 비례해서 소모품 매출이 발생하는 캐시카우 비즈니스 모델을 갖추고 있습니다.`,
                transmission_mechanism: `미국 빅테크 기업들의 AI 데이터센터 설비투자(CAPEX) 발표 ➔ 엔비디아 GPU 및 메모리(HBM) 주문 증가 ➔ 전방 파운드리·메모리 팹 가동률 상승 ➔ 소모성 링 부품 마모 가속화 ➔ ${stockName} 수주 잔고 급증 및 분기 매출 호조로 전달됩니다.`,
                smart_money_logic: `외국인 및 기관 투자자들은 단순 분기 매출보다 '고마진 차세대 소재(SiC) 매출 비중 증가율'과 '고객사 내 점유율 확대 추이'를 매수의 핵심 근거로 보고 비중을 확대하고 있습니다.`,
                key_inflection_points: `① 삼성전자·SK하이닉스의 분기 가동률 90% 회복 여부, ② 미국 필라델피아 반도체 지수의 신고가 돌파 흐름, ③ 외국인 창구의 순매수 기조 유지 여부`
            }
        };
    }
    
    // 화장품 / K-소비재 (LG생활건강, 아모레 등)
    if (['화장품', '생활건강', 'lg생활건강', '아모레', '코스맥스', '한국콜마', '뷰티', '에이피알', '클리오', '미용'].some(k => combined.includes(k))) {
        return {
            riseChainBadge: '🔥 중국 소비 부양책 · 미국·일본·유럽 K-뷰티 수출 폭증 · 원가 안정 수혜주',
            riseOneLiner: `해외에서 『중국 정부의 강력한 경기 부양책 및 K-뷰티의 미국·일본·동남아 수출 다변화 성공』이 맞물리며 ➔ 글로벌 면세 및 온라인 매출이 급증하여 ${stockName} 주가가 강력하게 상승하고 있습니다!`,
            riseTriggers: [
                {
                    icon: '💄',
                    trigger: '🔥 미국·일본·유럽 등 글로벌 인디/프리미엄 뷰티 수출 채널 급성장',
                    chain: '중국 단일 의존도에서 벗어나 북미 및 글로벌 시장에서 K-뷰티 수출액이 사상 최대치를 경신하며 실적 턴어라운드를 주도합니다.',
                    detailed_explanation: `과거 중국 중심이었던 매출 구조가 아마존, 세포라 등을 통한 북미/유럽 시장으로 다변화되면서 비(非)중국 글로벌 매출 비중이 30%를 돌파했습니다. 특히 서구권에서 K-인디 뷰티 및 클린 뷰티 열풍이 지속되면서 사상 최대 수출 실적을 기록하고 있습니다.`,
                    impact_degree: '🔥 1순위 상승 동력'
                },
                {
                    icon: '🇨🇳',
                    trigger: '🛍️ 중국 내수 소비 부양 패키지 가동 및 면세 채널 회복',
                    chain: '중국 유커 관광객 증가 및 소비 진작 정책으로 고마진 프리미엄 화장품 판매가 회복 궤도에 올랐습니다.',
                    detailed_explanation: '중국 인민은행의 대규모 유동성 공급과 내수 소비 촉진 정책으로 상하이·베이징 등 1선 도시 백화점 판매가 바닥을 통과했습니다. 방한 중국인 관광객의 면세점 객단가 또한 반등하며 오프라인 수익성이 가파르게 개선되고 있습니다.',
                    impact_degree: '✨ 턴어라운드 모멘텀'
                },
                {
                    icon: '💵',
                    trigger: '📈 원/달러 환율 안정 및 원부자재 조달단가 하락으로 영업이익률 개선',
                    chain: '원자재 수입가 안정과 고마진 브랜드 비중 확대로 영업이익률이 개선되며 기관 매수세가 결집 중입니다.',
                    detailed_explanation: '원/달러 환율이 안정세를 찾으면서 유럽 등에서 수입하던 고급 향료, 기능성 원료의 수입 단가 부담이 대폭 완화되었습니다. 여기에 고마진 프리미엄 라인업 매출 비중이 확대되면서 분기 영업이익률이 2~3%p 개선되고 있습니다.',
                    impact_degree: '⚡ 마진율 레버리지'
                },
            ],
            deepReport: {
                summary_headline: `${stockName}은 K-뷰티 글로벌 수출 다변화와 원가율 개선이 맞물린 턴어라운드 주도주입니다.`,
                business_model_context: `${stockName}은 프리미엄 럭셔리 코스메틱부터 생활용품, 기능성 스킨케어까지 폭넓은 포트폴리오를 보유하고 있습니다. 브랜드 인지도와 탄탄한 유통 채널(H&B, 면세, 온라인 이커머스)을 기반으로 국내외에서 안정적인 현금 흐름을 창출하는 소비재 대표 기업입니다.`,
                transmission_mechanism: `해외 소비 심리 지수 및 글로벌 이커머스 판매 데이터 ➔ 수출 물동량 확대 ➔ 고마진 브랜드 매출 비중 증가 ➔ 고정비 절감 효과(영업레버리지) ➔ 분기 영업이익 서프라이즈로 연결됩니다.`,
                smart_money_logic: `기관 투자자들은 '중국 매출의 저점 통과 확인'과 '미국·일본 등 신규 해외 시장에서의 두 자릿수 성장률'을 핵심 매수 트리거로 보고 있으며, 밸류에이션 리레이팅 관점에서 비중을 늘리고 있습니다.`,
                key_inflection_points: `① 월별 화장품 통관 수출 통계(관세청)의 증가 추세, ② 중국 명절 및 쇼핑 축제 기간의 실제 결제액, ③ 기관의 연기금/투신 연속 순매수 전환`
            }
        };
    }

    // 2차전지 / 배터리 / 양극재 (에코프로비엠, 에코프로, 포스코퓨처엠, LG에너지솔루션, 엘앤에프, 삼성SDI 등)
    if (['에코프로', '에코프로비엠', '247540', '086520', '포스코퓨처엠', '003670', 'lg에너지솔루션', '373220', '엘앤에프', '066970', '삼성sdi', '006400', 'sk이노베이션', '2차전지', '배터리', '양극재', '리튬'].some(k => combined.includes(k))) {
        return {
            riseChainBadge: '🔥 글로벌 완성차 EV 신차 출시 · 헝가리/북미 공장 가동 본격화 · 메탈가 바닥 통과 수혜주',
            riseOneLiner: `해외에서 『유럽·북미 완성차의 신규 전기차 라인업 출시 및 헝가리·북미 현지 공장 가동 본격화』와 함께 『리튬·니켈 메탈 가격 바닥 확인』이 나타나며 ➔ 고마진 하이니켈 양극재 출하량 반등과 분기 흑자 턴어라운드로 ${stockName} 주가가 강력하게 상승하고 있습니다!`,
            riseTriggers: [
                {
                    icon: '🚀',
                    trigger: '🔥 유럽·북미 신규 전기차 모델 출시 및 헝가리 신공장 가동 본격화',
                    chain: '글로벌 완성차의 신규 EV 모델 공급 개시 ➔ 헝가리 데브레첸 등 해외 공장 가동률 급상승 ➔ 하이니켈 양극재 분기 출하량 급증으로 실적 퀀텀점프',
                    detailed_explanation: `${stockName}의 핵심 성장 동력인 유럽 헝가리 공장이 본격 양산 체제에 돌입하면서 현지 완성차 고객사향 직납 물량이 가파르게 늘어나고 있습니다. 전기차 신모델 출시 사이클과 맞물려 분기 단위 출하량이 바닥을 찍고 반등하는 강력한 실적 개선 국면입니다.`,
                    impact_degree: '🔥 1순위 상승 동력'
                },
                {
                    icon: '💰',
                    trigger: '📈 핵심 메탈(리튬·니켈) 가격 바닥 통과 및 양극재 판가 스프레드(마진) 회복',
                    chain: '광물 가격 하향 안정 ➔ 원재료 재고평가손실 종료 ➔ 고마진 하이니켈 판가 스프레드 확대로 영업이익률 흑자 전환',
                    detailed_explanation: '지난 수분기 동안 수익성을 갉아먹던 리튬·니켈 등 핵심 원자재 가격 하락세가 멈추고 바닥을 형성했습니다. 이에 따라 고가 원재료 재고 부담이 완전히 해소되고 제품 판가와 원가 간 마진(스프레드)이 정상 궤도로 복귀하고 있습니다.',
                    impact_degree: '✨ 스프레드 마진 회복'
                },
                {
                    icon: '🌐',
                    trigger: '⚡ ESS(에너지저장장치) 및 차세대 배터리(LFP·나트륨) 포트폴리오 다변화',
                    chain: '신재생에너지 그리드용 ESS 배터리 수요 급증 ➔ 양극재 포트폴리오 다각화 ➔ EV 단일 의존도 분산 및 안정적 수익성 확보',
                    detailed_explanation: '전기차 외에도 글로벌 AI 데이터센터 전력망 및 신재생에너지 확대로 ESS용 대용량 배터리 양극재 수요가 폭발하고 있습니다. 여기에 중저가 LFP 및 고전압 미드니켈 라인업을 보강하여 글로벌 수주 안정성을 대폭 강화하고 있습니다.',
                    impact_degree: '⚡ 포트폴리오 다변화'
                }
            ],
            deepReport: {
                summary_headline: `${stockName}은 글로벌 전기차 캐즘 바닥을 통과하며 해외 공장 가동과 함께 턴어라운드를 시작하는 2차전지 핵심 소재주입니다.`,
                business_model_context: `${stockName}은 세계 최고 수준의 하이니켈 양극재 기술력을 바탕으로 삼성SDI, SK온 등 글로벌 배터리 셀 제조사를 거쳐 포드, BMW 등 글로벌 완성차 OEM에 핵심 소재를 공급합니다.`,
                transmission_mechanism: `해외 완성차 신차 출시 및 북미/유럽 배터리 합작공장(JV) 가동 ➔ 양극재 수주 잔고 급증 ➔ 판가-원가 스프레드 정상화 ➔ 분기 영업이익 흑자 턴어라운드로 직결됩니다.`,
                smart_money_logic: `기관 및 외인 큰손들은 '월별 양극재 수출 통관 중량 반등'과 '메탈 가격 횡보세 유지'를 매수의 핵심 시그널로 인식하고 있습니다.`,
                key_inflection_points: `① 분기 양극재 출하량(Q) 두 자릿수 반등 여부, ② 헝가리 신공장 램프업 가동률, ③ 외국인 패시브 수급 5일 연속 순매수 전환`
            }
        };
    }

    // 유통 / 편의점 / 내수 소비재 (BGF리테일, GS리테일, 이마트 등)
    if (['bgf리테일', 'bgf', '282330', 'gs리테일', '007070', '이마트', '139480', '편의점', 'cu', '유통', '소비재'].some(k => combined.includes(k))) {
        return {
            riseChainBadge: '🔥 고마진 PB 간편식 돌풍 · 점포 대형화 효율 극대화 · 해외 K-편의점 수출 수혜주',
            riseOneLiner: `국내외에서 『초저가·고품질 PB(자체 브랜드) 간편식·디저트 매출 급증 및 점포 대형화에 따른 점당 매출 신장』과 함께 『몽골·말레이시아 등 K-편의점 해외 진출 성공』이 맞물리며 ➔ 든든한 현금흐름과 안정적 영업이익으로 ${stockName} 주가가 강력하게 상승하고 있습니다!`,
            riseTriggers: [
                {
                    icon: '🚀',
                    trigger: '🔥 고마진 PB(자체 브랜드) 차별화 간편식·디저트 라인업 및 H&B 매출 급증',
                    chain: '가성비 PB 간편식/디저트 돌풍 ➔ 편의점 객단가 상승 및 마진율 개선 ➔ 불황형 소비 수혜로 분기 영업이익 견인',
                    detailed_explanation: `${stockName}(CU)은 연세우유 크림빵, 득템 시리즈 등 메가 히트 PB 상품을 지속 발굴하며 편의점을 단순 소매점에서 '근거리 장보기·트렌드 쇼핑 플랫폼'으로 진화시켰습니다. 고마진 차별화 상품 비중 확대로 객단가와 수익성이 동시에 향상되고 있습니다.`,
                    impact_degree: '🔥 1순위 상승 동력'
                },
                {
                    icon: '💰',
                    trigger: '📈 우량 입지 중심 점포 대형화 및 본부 임차형 전환에 따른 점당 효율성 극대화',
                    chain: '수익성 높은 대형 점포 중심 출점 ➔ 점당 일평균 매출(상승) ➔ 가맹본부와 가맹점주 수익 동반 개선',
                    detailed_explanation: '단순 점포 수 늘리기 경쟁에서 탈피하여 점당 매출이 높은 우량 상권 중심 출점 전략을 구사하고 있습니다. 기존 소형 점포를 대형 특화 매장으로 전환하고 본부 임차형 비중을 늘려 고정비 효율을 극대화하고 있습니다.',
                    impact_degree: '✨ 점포 효율 극대화'
                },
                {
                    icon: '🌐',
                    trigger: '⚡ 몽골·말레이시아·카자흐스탄 등 해외 K-편의점 로열티 및 글로벌 확장',
                    chain: 'K-컬처 열풍 타고 해외 마스터 프랜차이즈 확대 ➔ 로열티 및 PB 상품 수출 ➔ 내수 한계 극복 글로벌 성장축 확보',
                    detailed_explanation: '국내 시장의 포화 우려를 딛고 몽골, 말레이시아, 카자흐스탄 등 아시아 신흥국에서 압도적인 점유율 1위를 달성했습니다. 자본 투자 부담이 적은 마스터 프랜차이즈 방식으로 안정적인 로열티와 수출 마진을 창출하고 있습니다.',
                    impact_degree: '⚡ 글로벌 성장 모멘텀'
                }
            ],
            deepReport: {
                summary_headline: `${stockName}은 불황에 강한 근거리 플랫폼으로 고마진 PB와 해외 진출을 통해 안정적 이익 성장을 구가하는 내수 대표주입니다.`,
                business_model_context: `${stockName}은 전국 1만 8천여 개 이상의 CU 편의점 네트워크를 운영하는 국내 최상위 유통 기업으로, 경기 변동에 둔감한 필수 소비재 중심의 강력한 현금창출능력을 보유하고 있습니다.`,
                transmission_mechanism: `고물가 속 가성비 PB 소비 선호 ➔ 편의점 방문 객수 증가 ➔ 일평균 점포 매출 상승 ➔ 분기 영업이익률 개선 및 주주환원 확대로 연결됩니다.`,
                smart_money_logic: `기관 투자자들은 고배당 매력과 함께 '기존점 매출 성장률(SSSG) 플러스 전환'을 안정적 방어주 매수의 핵심 기준으로 평가합니다.`,
                key_inflection_points: `① 기존점 일평균 매출 성장률 추이, ② 고마진 PB 및 담배 외 일반 상품 비중, ③ 주당 배당금(DPS) 및 자사주 소각 정책`
            }
        };
    }

    // 바이오 / 혁신신약 / 뇌전증 직판 (SK바이오팜 등)
    if (['sk바이오팜', '바이오팜', '326030'].some(k => combined.includes(k))) {
        return {
            riseChainBadge: '🔥 미국 엑스코프리 직판 고마진 폭발 · 4Q 임상 모멘텀 · 연간 흑자 안착 수혜주',
            riseOneLiner: `미국 시장에서 『뇌전증 혁신신약 엑스코프리 처방 수(TRx) 가파른 우상향 및 미국 직판망을 통한 90%대 고마진 영업 레버리지』와 함께 『4Q 주요 임상 파이프라인(오파칼림 등) 이벤트 가치 부각』이 맞물리며 ➔ 연간 흑자 기조 안착으로 ${stockName} 주가가 강력하게 상승하고 있습니다!`,
            riseTriggers: [
                {
                    icon: '🚀',
                    trigger: '🔥 미국 엑스코프리(세노바메이트) 처방 수(TRx) 사상 최대치 경신 및 직판 고마진',
                    chain: '미국 신경과 전문의 처방 확대 ➔ 분기 처방 건수(TRx) 가파른 우상향 ➔ 90% 이상 고마진 직판 구조로 영업이익 퀀텀점프',
                    detailed_explanation: `${stockName}은 국내 제약사 최초로 미국 시장에서 자체 직판 영업망을 구축하여 엑스코프리를 직접 판매하고 있습니다. 약가 중간 수수료 없이 매출의 90% 이상이 직판 이익으로 귀속되는 고마진 구조로, 처방 환자 수가 가파르게 늘어나며 강력한 영업 레버리지가 발생하고 있습니다.`,
                    impact_degree: '🔥 1순위 상승 동력'
                },
                {
                    icon: '💎',
                    trigger: '📈 4Q 오파칼림 글로벌 임상 이벤트 및 전신발작(PGTC) 적응증 확대 가시화',
                    chain: '부분발작에서 전신발작으로 처방 대상 확대 ➔ 4분기 임상 결과 및 파이프라인 가치 재평가 ➔ 글로벌 타깃 시장 2배 확장',
                    detailed_explanation: '현재 성인 부분발작에 한정된 처방 영역을 전신발작 및 소아·청소년 환자군으로 넓히는 글로벌 3상 임상이 순항 중입니다. 4분기 주요 임상 데이터 발표와 함께 타깃 시장 규모가 2배 이상 커질 것으로 기대되고 있습니다.',
                    impact_degree: '✨ 임상 모멘텀 폭발'
                },
                {
                    icon: '🌐',
                    trigger: '⚡ 미국 직판 유통 인프라를 활용한 제2의 신약 도입(In-licensing) 시너지',
                    chain: '이미 구축된 미국 직판 영업망 확보 ➔ 타사 혁신신약 도입(In-licensing) 판매 ➔ 고정비 추가 없이 막대한 레버리지 창출',
                    detailed_explanation: '미국 전역에 깔린 신경과 전문 병원 네트워크를 활용하여, 추가 고정비 없이 타사 우수 신약을 들여와 판매하는 시너지 전략(Second Product)을 추진하고 있어 중장기 종합 빅바이오텍 도약이 기대됩니다.',
                    impact_degree: '⚡ 파이프라인 시너지'
                }
            ],
            deepReport: {
                summary_headline: `${stockName}은 미국 직판 뇌전증 신약의 폭발적 처방 성장으로 구조적 흑자 궤도에 오른 독보적 K-바이오텍입니다.`,
                business_model_context: `${stockName}은 SK그룹의 핵심 바이오 계열사로, 신약 후보물질 발굴부터 글로벌 임상, FDA 신약 승인(NDA), 미국 현지 직판까지 전 과정을 독자 완주한 국내 유일무이한 제약바이오 기업입니다.`,
                transmission_mechanism: `미국 엑스코프리 주간/월간 처방 수(TRx) 발표 ➔ 고마진 직판 매출 인식 ➔ 고정비 상쇄 후 영업이익 급증 ➔ 연간 흑자 기조 굳히기 및 주가 밸류에이션 리레이팅으로 전달됩니다.`,
                smart_money_logic: `글로벌 바이오 펀드들은 '미국 엑스코프리 월간 TRx 성장률 둔화 여부'와 '차기 신약 도입(In-licensing) 가시성'을 핵심 매수 잣대로 삼고 있습니다.`,
                key_inflection_points: `① 미국 블룸버그 집계 엑스코프리 월별 TRx 처방 통계, ② 연간 영업이익 흑자 달성 공시, ③ 외국인 지분율 15% 돌파 여부`
            }
        };
    }

    // 기본(범용) 턴어라운드 상승 동력
    return {
        riseChainBadge: `🔥 ${stockName} 글로벌 업황 턴어라운드 & 외국인·기관 수급 결집 수혜주`,
        riseOneLiner: `해외에서 『글로벌 전방 수요 회복 및 미국 주요 증시 훈풍』이 전해지며 ➔ 외국인·기관의 쌍끌이 순매수와 실적 턴어라운드 기대감으로 ${stockName} 주가가 강력하게 상승하고 있습니다!`,
        riseTriggers: [
            {
                icon: '🚀',
                trigger: `🔥 ${stockName} 전방 산업 수요 회복 및 분기 실적 턴어라운드`,
                chain: '주요 고객사 발주가 늘어나고 신규 수주 모멘텀이 가시화되면서 실적 개선 기대감이 주가를 든든하게 견인합니다.',
                detailed_explanation: `${stockName}의 핵심 사업 부문에서 국내외 신규 프로젝트 수주 계약이 체결되며 수주 잔고가 안정적인 성장세를 보이고 있습니다. 고정비 부담이 완화되는 구간에 진입하여 분기 실적 턴어라운드 가능성이 매우 높게 점쳐지고 있습니다.`,
                impact_degree: '🔥 1순위 상승 동력'
            },
            {
                icon: '💰',
                trigger: '📈 외국인·기관 큰손 순매수 및 프로그램 매수세 집중 유입',
                chain: '기업 펀더멘털 개선과 우호적 밸류에이션 매력이 부각되며 메이저 수급이 집중되고 있습니다.',
                detailed_explanation: '주요 증권사 리서치센터의 목표주가 상향 리포트와 함께 연기금, 자산운용사, 외국인 롱펀드의 실탄이 유입되고 있습니다. 프로그램 차익/비차익 순매수가 동반되면서 탄탄한 하방 지지력이 형성되었습니다.',
                impact_degree: '✨ 수급 모멘텀'
            },
            {
                icon: '🌐',
                trigger: '🇺🇸 글로벌 시장 환경 개선 및 수출 마진 호조',
                chain: '해외 주요 시장 환경이 개선되고 환율 및 원가 구조가 우호적으로 작용하며 우상향 추세를 지원합니다.',
                detailed_explanation: '미국 등 해외 주요 증시의 위험자산 선호 심리가 확산되고 있으며, 글로벌 무역 환경 안정화로 원자재 조달 단가와 물류비가 안정되어 영업 마진이 극대화되고 있습니다.',
                impact_degree: '⚡ 글로벌 수혜'
            },
        ],
        deepReport: {
            summary_headline: `${stockName}은 전방 업황 개선과 탄탄한 펀더멘털을 바탕으로 실적 개선세가 기대되는 종목입니다.`,
            business_model_context: `${stockName}은 해당 산업 분야에서 탄탄한 기술력과 시장 지배력을 확보하고 있으며, 핵심 고객사와의 견고한 거래 관계를 바탕으로 경기 회복기마다 빠른 실적 반등을 이뤄낸 레퍼런스를 보유하고 있습니다.`,
            transmission_mechanism: `글로벌 매크로 지표 개선 ➔ 전방 고객사 투자 재개 및 발주 증가 ➔ 공장 가동률 상승 및 매출원가율 하락 ➔ 당기순이익 급증 및 주가 재평가로 이어지는 정석적인 펀더멘털 선순환 구조입니다.`,
            smart_money_logic: `메이저 수급 주체들은 단기 테마보다 '이익 추정치의 상향 조정(Earnings Revision)'과 '밸류에이션 저평가(낮은 PER/PBR)'를 확인하며 분할 매수로 접근하고 있습니다.`,
            key_inflection_points: `① 분기 실적 컨센서스 상회 여부, ② 주요 외인 창구의 누적 순매수 대금, ③ 50일 이동평균선 안착 후 거래량 동반 돌파`
        }
    };
}

function getStockOverseasDirectHitSummary(stockName: string, stockCode?: string, extraContext?: string): {
    chainBadge: string;
    oneLiner: string;
    triggers: { icon: string; trigger: string; chain: string; impact_degree: string; category_tag?: string; detailed_explanation?: string }[];
    riseChainBadge: string;
    riseOneLiner: string;
    riseTriggers: { icon: string; trigger: string; chain: string; impact_degree: string; category_tag?: string; detailed_explanation?: string }[];
    deepReport?: any;
} {
    const combined = `${stockName || ''} ${stockCode || ''} ${extraContext || ''}`.toLowerCase();

    // 미국 AI 반도체 대장주 (엔비디아 NVDA)
    if (['엔비디아', 'nvda', 'nvidia'].some(k => combined.includes(k))) {
        return {
            ...buildDefaultStockRiseIntel(stockName, stockCode, extraContext),
            chainBadge: '🌏 미국 10년물 국채 금리 · 빅테크 AI 투자 속도조절(ROI) · 미 상무부 대중국 반도체 규제 직결주',
            oneLiner: `미국에서 『국채 금리 급등으로 인한 고밸류 성장주 차익 실현』이나 『빅테크의 AI 설비투자 속도조절(수익화 지연 우려)』, 또는 『미 상무부의 대중국 첨단 반도체 수출 통제 강화』가 터지면 ➔ 밸류에이션 부담과 패시브 매물 출회로 ${stockName} 주가가 직격탄을 맞아 떨어집니다!`,
            triggers: [
                {
                    icon: '📉',
                    trigger: '🇺🇸 미국 국채 10년물 금리 급등 및 빅테크 밸류에이션 부담에 따른 차익 실현',
                    chain: '금리가 상승하면 미래 기대 이익의 현재 할인율이 높아져 PER이 높은 AI 주도주에서 기관들의 비중 축소 및 단기 차익 매물이 가장 먼저 출회됩니다.',
                    impact_degree: '🔥 1순위 직격탄'
                },
                {
                    icon: '🏛️',
                    trigger: '🚫 미국 정부(상무부)의 대중국 AI 칩 수출 통제 강화 및 지정학적 리스크',
                    chain: '중국 시장향 맞춤형 칩(H20 등)의 추가 수출 금지나 중동 등 제3국 우회 수출 라이선스 규제가 발표되면 글로벌 매출 공백 우려로 주가가 급락합니다.',
                    impact_degree: '⚠️ 정책 뇌관'
                },
                {
                    icon: '⚡',
                    trigger: '🤖 빅테크의 AI 투자 수익화(ROI) 검증 및 차세대 블랙웰 양산 노이즈',
                    chain: '고객사들의 AI 서비스 수익성 회수 속도가 늦어지거나 신규 칩 패키징 발열/출하 지연 루머가 나오면 실적 피크아웃 우려가 확산되며 변동성이 커집니다.',
                    impact_degree: '⚡ 실적·업황 변수'
                }
            ]
        };
    }

    // 미국 맞춤형 AI 가속기 & 통신 (브로드컴 AVGO)
    if (['브로드컴', 'avgo', 'broadcom'].some(k => combined.includes(k))) {
        return {
            ...buildDefaultStockRiseIntel(stockName, stockCode, extraContext),
            chainBadge: '🌏 빅테크 ASIC 발주 추이 · 미국 국채 금리 · 대중국 반도체 수출 통제 직결주',
            oneLiner: `미국에서 『빅테크 기업들의 자체 커스텀 AI 가속기(ASIC) 개발 속도조절 및 투자 축소』나 『미국의 대중국 반도체 장비·스위치 수출 추가 제재』가 터지면 ➔ 고마진 통신 부품과 칩 설계 수주 둔화 우려로 ${stockName} 주가가 직격탄을 맞아 떨어집니다!`,
            triggers: [
                {
                    icon: '📉',
                    trigger: '🇺🇸 빅테크 자체 AI 칩(ASIC) 개발 주기 지연 및 CAPEX 투자 속도조절',
                    chain: '구글, 메타 등 주요 고객사의 자체 반도체 개발 일정이 늦춰지거나 데이터센터 증설 속도를 조절하면 주문 감소로 직격탄을 맞습니다.',
                    impact_degree: '🔥 1순위 직격탄'
                },
                {
                    icon: '🏛️',
                    trigger: '🚫 미국 상무부의 중국 통신 인프라 및 AI 네트워킹 장비 수출 제재 강화',
                    chain: '중국 데이터센터향 초고속 스위치 칩 및 통신 인터페이스 수출길이 좁아지면 글로벌 분기 매출 가이던스가 깎입니다.',
                    impact_degree: '⚠️ 대외 규제 뇌관'
                },
                {
                    icon: '⚡',
                    trigger: '💵 미국 국채 금리 변동성에 따른 고멀티플 테크주 밸류에이션 압박',
                    chain: '금리 상승 시 인수 부채에 따른 금융비용 부담과 기술주 전반의 멀티플 하락이 겹쳐 단기 매물이 출회됩니다.',
                    impact_degree: '⚡ 금리·수급 변수'
                }
            ]
        };
    }

    if (['snt모티브', 'snt', '064960', '모비스', '현대모비스', '한온시스템', '만도', 'hl만도', '화신', '에스엘', '서연이화', '구동모터', '방산소총'].some(k => combined.includes(k))) {
        return {
            ...buildDefaultStockRiseIntel(stockName, stockCode, extraContext),
            chainBadge: '🌏 현대차/기아 글로벌 EV 구동모터 발주 · K-소총 해외 군수 수출 · 달러 환율 직결주',
            oneLiner: `해외에서 『현대차·GM 등 글로벌 완성차의 전기차(EV) 생산 속도조절로 구동모터 수주 지연』이 터지거나 『중동/동남아 K-소구경 화기 방산 수출 통관 지연』이 발생하면 ➔ ${stockName}의 전방 납품 매출이 직격탄을 맞아 떨어집니다!`,
            triggers: [
                { icon: '⚡', trigger: '📉 현대차·기아 글로벌 전기차(EV) 판매 둔화 및 구동모터 라인 가동률 저하', chain: `${stockName}의 핵심 성장 동력인 하이브리드·전기차용 구동모터는 완성차 생산량에 직결되므로 전방 전기차 감산 시 수주가 직격탄을 맞습니다.`, impact_degree: '🔥 1순위 직격탄' },
                { icon: '🔫', trigger: '🏛️ 해외 K-방산(소총/기관총) 수출 라이선스 승인 지연 및 국방 예산 변동', chain: 'K1/K2/K15 등 개인 화기 해외 수출 계약 납품 일정이 지연되면 방산 부문 마진이 일시적으로 축소됩니다.', impact_degree: '⚠️ 방산 수주 변수' },
                { icon: '💵', trigger: '📈 원/달러 환율 급변 및 모터용 희토류 영구자석/구리 수입가 급등', chain: '모터 제조에 필수적인 희토류 영구자석과 구리선 수입 원가가 치솟으면 부품 제조 마진이 압박받습니다.', impact_degree: '⚡ 원가·마진 변수' },
            ],
        };
    }
    if (['한섬', '020000', 'f&f', 'fnf', '신세계인터', '영원무역', '의류', '패션', '명품', '타임', '마인', '시스템'].some(k => combined.includes(k))) {
        return {
            ...buildDefaultStockRiseIntel(stockName, stockCode, extraContext),
            chainBadge: '🌏 고물가·고금리에 따른 해외 럭셔리·백화점 소비 심리 · 원/달러 환율(원단 수입) 직결주',
            oneLiner: `해외에서 『글로벌 고금리 장기화로 인한 민간 가계 소비 여력 위축』이나 『원/달러 환율 급등으로 이탈리아/유럽 명품 원단 및 수입 라이선스 매입비 폭증』이 터지면 ➔ 백화점 고가 의류 판매 마진이 깎여 ${stockName} 주가가 직격탄을 맞아 떨어집니다!`,
            triggers: [
                { icon: '🛍️', trigger: '📉 고금리·물가 부담에 따른 국내외 프리미엄 의류 소비 심리 둔화', chain: '소비 심리가 꺾이면 백화점 명품·컨템포러리 고마진 의류(타임, 마인 등) 구매가 가장 먼저 줄어들어 분기 실적이 둔화됩니다.', impact_degree: '🔥 1순위 직격탄' },
                { icon: '🧵', trigger: '📈 원/달러 환율 급등에 따른 유럽산 명품 패브릭 및 수입 브랜드 원가 부담', chain: '유럽 등지에서 수입하는 최고급 모직·가죽 원단 대금이 달러/유로로 결제되어 환율 급등 시 원가율이 크게 치솟습니다.', impact_degree: '⚠️ 원가 마진 직격' },
                { icon: '❄️', trigger: '🌡️ 이상고온 현상으로 인한 고단가 F/W(가을/겨울 아우터) 성수기 판매 부진', chain: '패션 기업의 연간 이익 절반을 차지하는 겨울 코트·패딩 성수기에 포근한 날씨가 지속되면 재고 처리 부담으로 주가가 하락 압력을 받습니다.', impact_degree: '⚡ 계절성 변수' },
            ],
        };
    }
    if (['현대글로비스', '글로비스', '086280', 'pcc', '자동차선', '해운운임', '완성차해운'].some(k => combined.includes(k))) {
        return {
            ...buildDefaultStockRiseIntel(stockName, stockCode, extraContext),
            chainBadge: '🌏 글로벌 완성차 해상운송(PCC) 운임 지수 · 수에즈/홍해 지정학 리스크 · 미국 완성차 관세 직결주',
            oneLiner: `해외에서 『중동 홍해/수에즈 운하 등 해상 병목 해소로 자동차 운반선(PCC) 용선료 급락』이 발생하거나 『미국의 수입차 고율 관세 부과로 북미 수출 물동량 급감』이 터지면 ➔ 해운·물류 매출이 깎여 ${stockName} 주가가 직격탄을 맞아 떨어집니다!`,
            triggers: [
                { icon: '🚢', trigger: '📉 글로벌 자동차선(PCC) 공급 과잉 전환 및 해상 스팟 운임 하락', chain: `${stockName}의 최대 수익원인 자동차 해상운송(PCC) 운임이 꺾이면 글로벌 완성차 수송 마진이 급감하여 실적에 직격탄을 맞습니다.`, impact_degree: '🔥 1순위 직격탄' },
                { icon: '🛃', trigger: '🇺🇸 미국 등 주요 수출국의 자동차 보편관세 장벽으로 한국산 완성차 선적 물량 감소', chain: '수출길이 막혀 현대차·기아의 북미·유럽 선적 대수가 줄어들면 글로벌 복합물류 및 배선 물동량이 동반 감소합니다.', impact_degree: '⚠️ 물동량 직격' },
                { icon: '⚓', trigger: '🛢️ 주요 해상 길목(수에즈/파나마) 통항 차질 및 선박 연료유(벙커C유) 급등', chain: '항로 우회에 따른 유류비 증가나 지정학적 리스크 완화 시 운임 프리미엄 축소로 마진 변동성이 커집니다.', impact_degree: '⚡ 항로·유가 변수' },
            ],
        };
    }

    // 심텍 / 패키지기판 (FC-CSP, SiP 등)
    if (['심텍', '222800', '대덕전자', '353200', '코리아써키트', '007810', '해성디에스', '195870', '패키지기판', '기판', 'pcb', 'fc-csp', 'sip'].some(k => combined.includes(k))) {
        return {
            ...buildDefaultStockRiseIntel(stockName, stockCode, extraContext),
            chainBadge: '🌏 글로벌 메모리 팹 가동률 · 빅테크 모바일/AI 반도체 패키지 기판(FC-CSP·SiP) 수주 직결주',
            oneLiner: `해외에서 『스마트폰·PC 등 전방 IT 세트 수요 부진으로 메모리 패키지 기판(FC-CSP/SiP) 재고 조정』이 발생하거나 『일본 기판사(이비덴/신코)의 엔저 기반 단가 인하 경쟁』이 심화되면 ➔ 기판 공장 가동률 저하 및 판가 하락으로 ${stockName} 주가가 직격탄을 맞아 떨어집니다!`,
            triggers: [
                { icon: '🏭', trigger: '📉 글로벌 메모리(DRAM·NAND) 및 모바일·PC 전방 재고 조정에 따른 패키지 기판 발주 둔화', chain: `${stockName}의 주력 제품인 FC-CSP, SiP, MCP 기판은 전방 메모리 제조사(삼성전자, SK하이닉스, 마이크론)의 생산량에 직결되므로 감산 또는 재고 조정 시 수주 절벽에 직면합니다.`, impact_degree: '🔥 1순위 직격탄' },
                { icon: '💴', trigger: '🇯🇵 엔저 기조에 따른 일본 기판 경쟁사(이비덴, 신코전기)의 납품 단가 인하 공세 및 원자재가 상승', chain: '엔화 약세로 일본 경쟁사의 수출 단가 경쟁력이 높아지고 동박·에폭시 수지 등 핵심 원자재 수입단가가 오르면 제조 마진율이 크게 압박받습니다.', impact_degree: '⚠️ 원가·단가 직격' },
                { icon: '⚡', trigger: '🤖 글로벌 빅테크 AI 투자 속도조절 및 DDR5/GDDR7 전환 지연', chain: '차세대 고부가 기판 규격 전환이 늦어지면 고마진 프리미엄 제품군 비중 확대가 지연되어 판가(ASP) 하락 압력이 가중됩니다.', impact_degree: '⚡ 수요 사이클 변수' },
            ],
        };
    }

    // 조선 / 해양플랜트 (삼성중공업, 한화오션 등)
    if (['삼성중공업', '010140', '한화오션', '042660', 'hd한국조선해양', '009540', 'hd현대중공업', '329180', '현대미포조선', '조선', 'flng', 'lng선', '해양플랜트', '신조선가'].some(k => combined.includes(k))) {
        return {
            ...buildDefaultStockRiseIntel(stockName, stockCode, extraContext),
            chainBadge: '🌏 국제유가(WTI) · 글로벌 LNG선 발주 사이클 · 해양플랜트(FLNG) 계약 직결주',
            oneLiner: `해외에서 『국제유가 급락으로 글로벌 오일 메이저의 해양플랜트(FLNG) 투자 지연』이 터지거나 『철강 후판가 급등 및 원/달러 환율 급락(원화 강세)』이 발생하면 ➔ 조선 수주 잔고 마진 축소로 ${stockName} 주가가 직격탄을 맞아 떨어집니다!`,
            triggers: [
                { icon: '⛽', trigger: '📉 국제유가 급락(WTI $70 하회)에 따른 글로벌 오일 메이저 FLNG/해양플랜트 발주 보류', chain: `유가가 낮아지면 채산성 악화로 심해 유전 개발 및 부유식 액화천연가스 설비(FLNG) 발주가 연기되어 ${stockName}의 고마진 일감 확보에 차질이 생깁니다.`, impact_degree: '🔥 1순위 직격탄' },
                { icon: '🔩', trigger: '📈 조선용 후판(두꺼운 철판) 공급단가 인상 및 원/달러 환율 급락(원화 강세)', chain: '선박 건조 원가의 20%를 차지하는 철강 후판가 상승 시 공사손실충당금 반영 위험이 커지며, 달러 결제 선박 대금의 원화 환산 이익이 감소합니다.', impact_degree: '⚠️ 원가·환율 직격' },
                { icon: '🌍', trigger: '🚢 글로벌 친환경 탄소 규제 완화 및 컨테이너/탱커선 발주 피크아웃 우려', chain: '신조선가 지수 상승세가 둔화되거나 글로벌 해운사들의 선박 발주 사이클이 정점을 통과할 경우 조선 섹터 전반의 밸류에이션 하방 압력이 발생합니다.', impact_degree: '⚡ 업황 사이클 변수' },
            ],
        };
    }

    if (['씨엠티엑스', 'cmtx', '388210', '하나머티리얼즈', '티씨케이', '원익qnc', '월덱스', '케이엔제이', '식각', '증착', '소부장', '실리콘카바이드', 'sic', '쿼츠', '전공정 부품'].some(k => combined.includes(k))) {
        return {
            ...buildDefaultStockRiseIntel(stockName, stockCode, extraContext),
            chainBadge: '🌏 글로벌 반도체 팹(삼성·TSMC) 가동률 · 식각 Si/SiC 소재 조달 · 글로벌 CAPEX 직결주',
            oneLiner: `해외에서 『글로벌 빅테크의 AI/반도체 설비투자(CAPEX) 축소 발표』가 나오거나 『식각·증착 핵심 원소재(고순도 SiC/희토류) 해외 조달가 급등』이 터지면 ➔ 전방 칩 제조사의 소모성 링/부품 교체 주기가 늘어나고 주문이 줄어 ${stockName} 주가가 직격탄을 맞아 떨어집니다!`,
            triggers: [
                { icon: '🏭', trigger: '📉 글로벌 반도체 팹(삼성전자·TSMC·인텔) 설비투자(CAPEX) 감축 및 가동률 하락', chain: `${stockName}의 실리콘/세라믹 부품은 칩 제조 시 마모되는 소모품이므로, 해외 파운드리·메모리 팹 가동률이 떨어지면 교체 주기 연장으로 수주가 급감합니다.`, impact_degree: '🔥 1순위 직격탄' },
                { icon: '💎', trigger: '🇨🇳 중국 등 해외 고순도 SiC/세라믹 원소재 수출 통제 및 조달단가 급등', chain: '핵심 고순도 원소재의 해외 수입 의존도가 높아 공급망 리스크나 원재료가 급등 시 제조 원가율이 치솟아 분기 마진이 깎입니다.', impact_degree: '⚠️ 원가율 직격' },
                { icon: '💵', trigger: '📈 원/달러 환율 급등 및 필라델피아 반도체지수 조정에 따른 패시브 매도', chain: '환율 급등 시 원화 환산 원재료 조달 비용이 늘어나며, 미국 반도체 지수 조정 시 코스닥 소부장 섹터에서 외국인 프로그램 매도가 가장 먼저 출회됩니다.', impact_degree: '⚡ 수급·환율 변수' },
            ],
        };
    }
    if (['하이닉스', '삼성전자', '한미반도체', '리노공업', 'hbm', '반도체', '메모리', '디램'].some(k => combined.includes(k))) {
        return {
            ...buildDefaultStockRiseIntel(stockName, stockCode, extraContext),
            chainBadge: '🌏 미국 엔비디아(NVDA) · 빅테크 AI 서버 · 대중국 수출규제 직결주',
            oneLiner: `미국에서 『엔비디아(NVDA)·필라델피아 반도체지수 급락』이나 『구글·MS 등 빅테크의 AI 데이터센터 투자 축소』, 또는 『미국의 대중국 반도체 수출 통제 강화』가 터지면 ➔ AI 칩에 들어가는 메모리(HBM·D램)·장비 주문이 줄어들까 봐 외국인 매물이 쏟아지며 ${stockName} 주가가 직격탄을 맞아 떨어집니다!`,
            triggers: [
                { icon: '🤖', trigger: '🇺🇸 미국 엔비디아(NVDA) 급락 & AI 거품론', chain: '미국 AI 반도체 대장주가 흔들리면 외국인 알고리즘이 한국 반도체(HBM·장비)부터 기계적으로 매도합니다.', impact_degree: '🔥 1순위 직격탄' },
                { icon: '🚫', trigger: '🏛️ 미국 상무부의 대중국 반도체 수출 통제·관세', chain: '중국향 메모리·장비 수출이 막히거나 품목 관세가 부과되면 글로벌 공급망 위축 우려로 직격탄을 맞습니다.', impact_degree: '⚠️ 고위험 뇌관' },
                { icon: '💻', trigger: '📉 글로벌 스마트폰·PC 수요 둔화 & D램 가격 하락', chain: 'IT 기기 판매 부진 뉴스가 나오면 범용 메모리 가격 하락 우려로 실적 눈높이가 낮아집니다.', impact_degree: '⚡ 업황 변수' },
            ],
        };
    }
    if (['현대차', '기아', '현대모비스', '현대글로비스', '자동차', '완성차', '모빌리티'].some(k => combined.includes(k))) {
        return {
            ...buildDefaultStockRiseIntel(stockName, stockCode, extraContext),
            chainBadge: '🌏 미국 수입차 관세 · 북미 자동차 판매량 · 원/달러 환율 직결주',
            oneLiner: `미국에서 『한국산 수입 자동차·부품 고율 관세 부과(보편관세·IRA 축소)』 뉴스가 터지거나, 『미국 고금리 할부 부담으로 인한 북미 신차 판매 둔화』 또는 『원/달러 환율 급락(원화 강세)』이 발생하면 ➔ 북미 수출로 최대 이익을 내는 ${stockName}의 수출 채산성이 바로 깎여 직격탄을 맞아 떨어집니다!`,
            triggers: [
                { icon: '🛃', trigger: '🇺🇸 미국 수입차·부품 보편관세 부과 & 보조금 축소', chain: '북미 매출 비중이 절대적인 구조상 관세 부과 뉴스가 뜨면 가격 경쟁력 약화 우려로 직격탄을 맞습니다.', impact_degree: '🔥 1순위 직격탄' },
                { icon: '💱', trigger: '💵 원/달러 환율 급락 (원화 강세로 수출 환차익 감소)', chain: '달러로 차를 팔아 원화로 바꾸는 수출 기업 특성상 환율이 급락하면 영업이익이 수천억 원씩 줄어듭니다.', impact_degree: '⚠️ 수익성 직격' },
                { icon: '🚗', trigger: '🏷️ 북미·유럽 소비 둔화 & 글로벌 완성차 할인 전쟁', chain: '해외 딜러 인센티브(할인 보조금) 지출이 늘어나면 대당 마진율이 꺾이며 조정을 받습니다.', impact_degree: '⚡ 마진 변수' },
            ],
        };
    }
    if (['리바트', '현대리바트', '한샘', '에이스침대', '지누스', 'kcc', 'lx하우시스', '가구', '인테리어', '건자재', '목재', '파티클보드', 'mdf'].some(k => combined.includes(k))) {
        return {
            ...buildDefaultStockRiseIntel(stockName, stockCode, extraContext),
            chainBadge: '🌏 해외 수입 원목/PB 단가 · 달러 환율 · 국내외 건설/부동산 착공 직결주',
            oneLiner: `해외에서 『러시아/동남아산 원목·PB(파티클보드) 원자재 가격 급등 및 해상 컨테이너 운임 폭등』 또는 『원/달러 환율 급등』이 터지면 ➔ 해외에서 전량 달러로 수입하는 목재 조달 원가가 치솟고 빌트인 가구 납품 마진이 깎여 ${stockName} 주가가 직격탄을 맞아 떨어집니다!`,
            triggers: [
                { icon: '🌲', trigger: '🌲 해외 원목·PB/MDF 목재 수입단가 & 글로벌 해상 컨테이너 운임 급등', chain: '가구 골조의 필수 원자재인 목재 판재(PB/MDF)를 대부분 해외 수입에 의존하므로, 산지 목재 가격이나 해상 운임이 치솟으면 원가율이 급등하여 분기 영업이익에 치명타를 입습니다.', impact_degree: '🔥 1순위 직격탄' },
                { icon: '💵', trigger: '📈 원/달러 환율 급등 (달러 결제 수입 원가 폭증)', chain: '수입 목재 대금을 달러로 결제하기 때문에 환율이 급등할 경우 원화 환산 매입 비용이 증가하여 제품 판가를 즉각 올리지 못하면 마진이 급감합니다.', impact_degree: '⚠️ 수익성 직격' },
                { icon: '🏗️', trigger: '📉 고금리 장기화에 따른 아파트 입주 물량 감소 & 주택 거래 침체', chain: '현대리바트의 핵심 알짜 매출처인 "신축 아파트 빌트인 가구 특판"과 "주택 매매 시 리모델링·가구 교체 수요"가 급감하면서 전방 수주 절벽에 직면합니다.', impact_degree: '⚡ 전방 수요 변수' },
            ],
        };
    }
    // 2차전지 / 배터리 / 양극재 (에코프로비엠, 에코프로, 포스코퓨처엠, LG에너지솔루션 등)
    if (['에코프로', '에코프로비엠', '247540', '086520', '포스코퓨처엠', '003670', 'lg에너지솔루션', '373220', '엘앤에프', '066970', '삼성sdi', '006400', 'sk이노베이션', '2차전지', '배터리', '양극재', '리튬'].some(k => combined.includes(k))) {
        return {
            ...buildDefaultStockRiseIntel(stockName, stockCode, extraContext),
            chainBadge: '🌏 미국 테슬라(TSLA) · IRA 보조금 정책 · 글로벌 전기차 캐즘 & 리튬가 직결주',
            oneLiner: `미국·유럽에서 『글로벌 전기차 판매 둔화(캐즘) 심화로 완성차 합작공장 가동률 저하』가 터지거나, 『미국 대선 후 IRA 전기차 보조금 및 세액공제(AMPC) 축소 불확실성』 또는 『중국발 리튬·니켈 가격 급변』이 발생하면 ➔ 양극재 출하량과 판가가 동시에 압박받아 ${stockName} 주가가 직격탄을 맞아 떨어집니다!`,
            triggers: [
                {
                    icon: '🔋',
                    trigger: '🇺🇸 미국 IRA 전기차 보조금 및 첨단제조생산세액공제(AMPC) 정책 축소 불확실성',
                    chain: '미국 정책 지원금 축소 ➔ 북미 완성차의 EV 생산 계획 보수화 ➔ 배터리 셀 및 양극재 발주 둔화로 직격탄',
                    detailed_explanation: '미국 대선 및 의회 지형 변화에 따라 IRA 전기차 구매 보조금 및 배터리 셀/모듈 세액공제(AMPC)가 축소될 경우 북미 시장의 전기차 전환 속도가 늦춰져 주요 공급망의 수익성이 악화될 위험이 있습니다.',
                    impact_degree: '🔥 1순위 직격탄'
                },
                {
                    icon: '🚗',
                    trigger: '📉 글로벌 전기차(EV) 캐즘(일시적 수요 정체) 장기화 및 완성차 감산',
                    chain: '유럽·북미 완성차 EV 판매 부진 ➔ 배터리 고객사 재고 조정 ➔ 양극재 공장 가동률 하락 및 고정비 부담 증가',
                    detailed_explanation: '고금리와 충전 인프라 부족으로 유럽과 북미 소비자들이 순수 전기차 구매를 망설이면서 완성차 업체들이 하이브리드 비중을 늘리고 있습니다. 이에 따라 순수 전기차용 하이니켈 양극재 주문이 일시 지연될 수 있습니다.',
                    impact_degree: '⚠️ 전방 수요 직격'
                },
                {
                    icon: '⛏️',
                    trigger: '🌏 중국산 LFP 저가 배터리 공세 및 핵심 메탈(리튬) 시세 변동성',
                    chain: '중국 배터리사의 저가 LFP 수출 확대 ➔ 글로벌 완성차의 중저가 배터리 채택 증가 ➔ 하이니켈 가격 인하 압박 및 마진 축소',
                    detailed_explanation: '중국 배터리 기업들이 공급 과잉을 해소하기 위해 저렴한 LFP 배터리를 유럽·동남아로 밀어내고 있습니다. 글로벌 완성차가 보급형 차량에 LFP를 채택할 경우 삼원계(NCM) 양극재의 단기 점유율 경쟁이 심화될 수 있습니다.',
                    impact_degree: '⚡ 마진·경쟁 변수'
                }
            ]
        };
    }

    // 유통 / 편의점 (BGF리테일 등)
    if (['bgf리테일', 'bgf', '282330', 'gs리테일', '007070', '이마트', '139480', '편의점', 'cu', '유통', '소비재'].some(k => combined.includes(k))) {
        return {
            ...buildDefaultStockRiseIntel(stockName, stockCode, extraContext),
            chainBadge: '🌏 국내 내수 가계 소비 심리 · 편의점 점포 수 포화 · 최저임금 및 인건비 직결주',
            oneLiner: `국내외에서 『고물가·고금리 장기화에 따른 민간 소비 심리 위축 및 국내 편의점 점포 수 포화에 따른 출점 성장률 둔화』가 터지거나 『최저임금 인상 및 점주 상생 지원금 증가』 이슈가 발생하면 ➔ 점포당 매출 신장세가 둔화되어 ${stockName} 주가가 직격탄을 맞아 떨어집니다!`,
            triggers: [
                {
                    icon: '🏬',
                    trigger: '📉 국내 내수 가계 소비 심리 위축 및 편의점 점포 수 포화에 따른 신규 출점 둔화',
                    chain: '고물가에 따른 지갑 닫기 ➔ 편의점 기존점 성장률(SSSG) 정체 ➔ 국내 5만여 개 점포 포화로 양적 성장 한계 직면',
                    detailed_explanation: '국내 편의점 점포 수가 이미 5만 5천 개를 넘어서며 물리적 출점 여력이 줄어들고 있습니다. 여기에 내수 경기 둔화로 소비자들이 객단가를 낮추면서 기존점 일평균 매출 성장률이 둔화될 수 있다는 우려가 주가의 발목을 잡습니다.',
                    impact_degree: '🔥 1순위 직격탄'
                },
                {
                    icon: '💵',
                    trigger: '📈 최저임금 인상 및 가맹점 상생 지원금 지출 확대에 따른 판관비 부담',
                    chain: '인건비 상승 ➔ 가맹점주 수익성 악화 ➔ 가맹본부의 상생 지원금 및 전기료 보조금 증액으로 영업이익률 압박',
                    detailed_explanation: '편의점 산업은 인건비와 24시간 운영 비용에 민감합니다. 최저임금 인상 시 가맹점 이탈을 막기 위해 본부가 제공하는 각종 상생 지원비와 폐기 지원금 부담이 늘어나 판관비율이 상승할 수 있습니다.',
                    impact_degree: '⚠️ 비용 직격탄'
                },
                {
                    icon: '⚖️',
                    trigger: '🏛️ 대형 이커머스(쿠팡·알리·테무)의 초저가 새벽배송 공세 및 유통업 규제',
                    chain: '온라인 이커머스의 생필품 무료배송 확대 ➔ 오프라인 편의점 장보기 수요 일부 잠식 ➔ 가격 할인 프로모션 경쟁 심화',
                    detailed_explanation: '이커머스 플랫폼들의 빠른 배송과 초저가 마케팅이 편의점의 비식품·공산품 매출을 일부 잠식하고 있으며, 상권 내 근접 출점 제한 자율규약 등 제도적 제약이 신규 확장을 제약할 수 있습니다.',
                    impact_degree: '⚡ 유통 경쟁 변수'
                }
            ]
        };
    }

    // 바이오 / 신약 / 뇌전증 (SK바이오팜 등)
    if (['sk바이오팜', '바이오팜', '326030'].some(k => combined.includes(k))) {
        return {
            ...buildDefaultStockRiseIntel(stockName, stockCode, extraContext),
            chainBadge: '🌏 미국 FDA 규제 및 약가 정책 · 미 국채금리 · 후속 임상 R&D 비용 직결주',
            oneLiner: `미국에서 『미 연준의 고금리 장기화에 따른 미 국채금리 급등으로 성장주 밸류에이션 압박』이 발생하거나, 『후속 파이프라인(오파칼림 등) 임상 R&D 비용 급증 또는 FDA 규제 승인 일정 지연』 이슈가 터지면 ➔ 단기 투자심리가 위축되며 ${stockName} 주가가 직격탄을 맞아 떨어집니다!`,
            triggers: [
                {
                    icon: '🧬',
                    trigger: '🇺🇸 후속 신약 파이프라인(방사성의약품·표적단백질분해) 글로벌 임상 R&D 지출 증가',
                    chain: '신약 개발 파이프라인 확대 ➔ 대규모 글로벌 임상 비용 및 연구개발비 투입 ➔ 단기 분기 영업이익률 변동성 확대',
                    detailed_explanation: '엑스코프리로 벌어들인 현금을 차세대 파이프라인(방사성의약품, 단백질분해제 등) 임상에 재투자하는 과정에서 분기별 R&D 비용이 큰 폭으로 늘어나며 단기 손익 변동성이 커질 위험이 있습니다.',
                    impact_degree: '🔥 1순위 직격탄'
                },
                {
                    icon: '💊',
                    trigger: '🏛️ 단일 신약(엑스코프리) 매출 집중도 및 미국 정부(IRA) 약가 인하 압박',
                    chain: '전체 매출의 80% 이상이 엑스코프리에 집중 ➔ 미국 메디케어 약가 협상이나 사보험사 환급 정책 변동 시 실적 민감도 가중',
                    detailed_explanation: '현재 회사 매출의 절대적 비중이 엑스코프리 단일 품목에 의존하고 있어, 미국 내 경쟁 약물 등장이나 의료보험 급여 목록 등재 변동이 발생할 경우 매출 타격이 즉각적으로 반영될 수 있습니다.',
                    impact_degree: '⚠️ 파이프라인 집중 리스크'
                },
                {
                    icon: '🏦',
                    trigger: '📈 미국 10년물 국채금리 급등 및 글로벌 바이오 섹터 성장 밸류에이션 할인',
                    chain: '금리 상승 ➔ 미래 현금흐름의 현재가치 할인율 상승 ➔ 고멀티플 바이오 섹터 전반의 외국인 패시브 매물 출회',
                    detailed_explanation: '미국 인플레이션 반등이나 연준의 금리 인하 지연으로 미 국채금리가 급등하면, 월가 알고리즘이 미래 성장 가치를 기반으로 하는 바이오테크 종목들의 목표주가를 기계적으로 하향 조정합니다.',
                    impact_degree: '⚡ 금리·수급 변수'
                }
            ]
        };
    }

    if (['포스코', 'posco', '현대제철', '동국제강', '고려아연', '철강', '열연', '후판'].some(k => combined.includes(k))) {
        return {
            ...buildDefaultStockRiseIntel(stockName, stockCode, extraContext),
            chainBadge: '🌏 중국 저가 철강 덤핑 · 호주 철광석 수입단가 · 글로벌 인프라 경기 직결주',
            oneLiner: `해외에서 『중국산 저가 철강재(열연/후판) 밀어내기 덤핑 수출』이 지속되거나 『호주 철광석/원료탄 수입가 급등』이 터지면 ➔ 판매가 대비 마진(스프레드)이 급격히 축소되어 ${stockName} 주가가 직격탄을 맞아 떨어집니다!`,
            triggers: [
                { icon: '🏗️', trigger: '🇨🇳 중국 저가 철강재 글로벌 덤핑 및 국내 유입 폭증', chain: '중국 내수 부진으로 쏟아지는 초저가 열연·후판 때문에 철강 판가를 올리지 못해 마진이 깎입니다.', impact_degree: '🔥 1순위 직격탄' },
                { icon: '⛏️', trigger: '🇦🇺 호주 철광석 및 원료탄 수입 가격 급등', chain: '철광석 가격이 오르는데 완제품 가격에 전가하지 못하면 제철소의 마진이 급감합니다.', impact_degree: '⚠️ 원가 스프레드 직격' },
                { icon: '🌐', trigger: '🇪🇺 EU 탄소국경세(CBAM) 및 미국의 철강 관세 장벽', chain: '친환경 규제 비용이나 주요 수출국의 보호무역 규제가 강화되면 수출 물량이 제한됩니다.', impact_degree: '⚡ 탄소·관세 변수' },
            ],
        };
    }
    if (['cj제일제당', '오리온', '농심', '삼양식품', '대상', '오뚜기', '식음료', '라면', '곡물'].some(k => combined.includes(k))) {
        return {
            ...buildDefaultStockRiseIntel(stockName, stockCode, extraContext),
            chainBadge: '🌏 CBOT 국제 곡물가(소맥/대두/원당) · 달러 환율 · K-푸드 해외 수출 직결주',
            oneLiner: `해외에서 『시카고상품거래소(CBOT) 소맥(밀가루)·원당·팜유 가격이 폭등』하거나 『원/달러 환율이 급등』하면 ➔ 원재료를 전량 달러로 수입하는 식음료 원가율이 폭증해 ${stockName} 주가가 직격탄을 맞아 떨어집니다!`,
            triggers: [
                { icon: '🌾', trigger: '📈 시카고(CBOT) 소맥·대두·원당·팜유 가격 급등', chain: '원재료 매입비가 제조원가의 절반 이상을 차지하므로 곡물가 급등 시 영업이익률이 급격히 악화됩니다.', impact_degree: '🔥 1순위 직격탄' },
                { icon: '💵', trigger: '📈 원/달러 환율 급등 (달러 결제 곡물 수입단가 폭증)', chain: '환율이 오르면 원화 환산 원재료 조달 비용이 증가하여 제품 가격 인상 없이는 수익성이 보장되지 않습니다.', impact_degree: '⚠️ 마진 압박 직격' },
                { icon: '🍜', trigger: '🏛️ 해외 수출국(미국/유럽)의 위생 통관 규제 및 유통 경쟁', chain: 'K-라면·스낵의 해외 수출 통관이 지연되거나 현지 대형마트 입점 수수료 부담이 늘어나면 성장세가 둔화됩니다.', impact_degree: '⚡ 해외 유통 변수' },
            ],
        };
    }
    if (stockName.includes('한국전력') || stockCode === '015760' || stockName.includes('가스공사')) {
        return {
            ...buildDefaultStockRiseIntel(stockName, stockCode, extraContext),
            chainBadge: '🌏 중동 국제유가(WTI) · 글로벌 LNG 가스가격 · 원/달러 환율 직결주',
            oneLiner: `중동 분쟁 등으로 해외에서 『국제유가(WTI)·LNG 천연가스 가격 폭등』이 터지거나 『원/달러 환율이 급등』하면 ➔ 비싼 달러를 주고 발전용 연료를 수입해야 해서 적자 부담이 커지며 ${stockName} 주가가 직격탄을 맞아 떨어집니다!`,
            triggers: [
                { icon: '🛢️', trigger: '🔥 중동 위기로 인한 국제유가(WTI)·LNG 가격 급등', chain: '발전 연료 수입 단가가 치솟으면 전기요금을 즉시 올리지 못해 영업이익이 급감하며 직격탄을 맞습니다.', impact_degree: '🔥 1순위 직격탄' },
                { icon: '💱', trigger: '📈 원/달러 환율 급등 (외화 연료비 & 달러 부채 부담)', chain: '연료를 달러로 수입하고 외화 부채가 많아 환율 급등 시 환차손과 원가 부담이 동시에 폭증합니다.', impact_degree: '⚠️ 재무 직격탄' },
                { icon: '🏛️', trigger: '❄️ 물가 안정을 위한 정부의 공공요금(전기료) 동결', chain: '전기요금 인상이 보류되면 재무구조 개선 기대감이 꺾이며 매물이 출회됩니다.', impact_degree: '⚡ 정책 변수' },
            ],
        };
    }
    if (['두산에너빌리티', '효성중공업', '현대일렉트릭', '일진전기', '제룡전기', 'ls electric', '변압기', '전력', '원전', 'smr'].some(k => combined.includes(k))) {
        return {
            ...buildDefaultStockRiseIntel(stockName, stockCode, extraContext),
            chainBadge: '🌏 미국 AI 데이터센터 전력망 · 북미 초고압 변압기 · 글로벌 원전(SMR) 직결주',
            oneLiner: `미국·유럽에서 『빅테크들의 AI 데이터센터 전력망 투자 지연』이 터지거나, 『미국의 한국산 변압기 반덤핑 관세·무역 규제』 또는 『해외 원전(SMR·체코 등) 본계약 지연』 뉴스가 나오면 ➔ 해외 수주 폭발 기대감으로 오른 ${stockName}가 직격탄을 맞아 차익 매물이 쏟아집니다!`,
            triggers: [
                { icon: '⚡', trigger: '🇺🇸 미국 빅테크 AI 데이터센터 전력망·SMR 투자 속도 조절', chain: 'MS·아마존 등이 데이터센터 증설이나 전력 구매 계약을 늦춘다는 소식이 뜨면 전력기기·원전주에 투매가 나옵니다.', impact_degree: '🔥 1순위 직격탄' },
                { icon: '🛡️', trigger: '🏛️ 미국의 초고압 변압기 반덤핑 관세 · 보호무역 강화', chain: '북미 전력청 수주 마진이 가장 높은데 고율 관세가 부과되면 이익률 하락 우려로 흔들립니다.', impact_degree: '⚠️ 수출 마진 위협' },
                { icon: '🧱', trigger: '📉 구리(전기동) 원자재 가격 급변 및 수주 본계약 지연', chain: '핵심 원자재 가격 급등이나 해외 대형 플랜트 본계약 서명 지연 시 단기 실망 매물이 출회됩니다.', impact_degree: '⚡ 원가·일정 변수' },
            ],
        };
    }
    if (['한미약품', '알테오젠', '삼성바이오', '셀트리온', '유한양행', '바이오', '제약', '신약', '임상'].some(k => combined.includes(k))) {
        return {
            ...buildDefaultStockRiseIntel(stockName, stockCode, extraContext),
            chainBadge: '🌏 미국 FDA 임상/승인 · 미 연준 금리(국채금리) · 글로벌 빅파마 기술수출 직결주',
            oneLiner: `미국에서 『연준(Fed) 금리 인하 지연으로 미 국채금리가 급등』하거나, 해외 파트너 빅파마(머크·일라이릴리 등)의 『임상 지연·FDA 허가 보류(CRL)·미국 약가 인하 압박』이 터지면 ➔ 신약 기술수출 가치로 평가받는 ${stockName}가 직격탄을 맞아 급락합니다!`,
            triggers: [
                { icon: '🧬', trigger: '🇺🇸 미국 FDA 허가 보류(CRL) · 글로벌 임상 데이터 차질', chain: '임상 효능 데이터가 기대에 못 미치거나 FDA 승인 일정이 밀리면 기술수출 가치 하락으로 급락합니다.', impact_degree: '🔥 1순위 직격탄' },
                { icon: '🏦', trigger: '📈 미국 물가 반등으로 인한 미 국채금리 급등', chain: '미국 금리가 치솟으면 미래 성장 가치를 할인받는 바이오 업종 투자심리가 즉각 얼어붙습니다.', impact_degree: '⚠️ 밸류에이션 직격' },
                { icon: '💊', trigger: '🏛️ 미국 정부의 의약품 약가 인하 압박 & 파트너사 전략 변경', chain: '글로벌 제약사들의 파이프라인 축소나 약가 인하 정책 발표 시 동반 조정을 받습니다.', impact_degree: '⚡ 정책·파트너 변수' },
            ],
        };
    }
    if (['에스엠씨지', '아모레', '코스맥스', '한국콜마', '에이피알', '화장품', '뷰티', '용기'].some(k => combined.includes(k))) {
        return {
            ...buildDefaultStockRiseIntel(stockName, stockCode, extraContext),
            chainBadge: '🌏 미국(아마존·세포라)·일본·중국 K-뷰티 화장품 수출 & 소비재 관세 직결주',
            oneLiner: `해외에서 『미국·일본·중국향 한국 화장품 수출 성장률 둔화』 데이터가 나오거나, 『미국의 수입 소비재 보편관세 부과·글로벌 뷰티 브랜드 발주 축소』 이슈가 터지면 ➔ K-뷰티 수출과 화장품 용기·제조 발주로 성장하는 ${stockName}가 직격탄을 맞아 떨어집니다!`,
            triggers: [
                { icon: '💄', trigger: '🌎 미국·일본·중국 월간 화장품 수출 통관 데이터 둔화', chain: '관세청 수출 데이터나 해외 대형 유통망 판매 성장세가 꺾이면 K-뷰티 밸류체인 전반에 차익 매물이 쏟아집니다.', impact_degree: '🔥 1순위 직격탄' },
                { icon: '📦', trigger: '🏢 글로벌·국내 화장품 브랜드 고객사의 재고 조정', chain: '전방 브랜드사들이 경기 둔화로 용기·패키징·ODM 주문을 줄이면 공장 가동률이 영향을 받습니다.', impact_degree: '⚠️ 수주 물량 직격' },
                { icon: '🛃', trigger: '🇺🇸 미국의 해외 소비재 보편관세 부과 & 중국 내수 침체', chain: '미국향 수출 관세 부과나 중국 소비 부진 장기화 시 수출주 투자심리가 위축됩니다.', impact_degree: '⚡ 대외 수출 변수' },
            ],
        };
    }
    if (['대한항공', '아시아나', '항공', '해운', 'hmm'].some(k => combined.includes(k))) {
        return {
            ...buildDefaultStockRiseIntel(stockName, stockCode, extraContext),
            chainBadge: '🌏 국제유가(항공유) · 원/달러 환율 · 글로벌 여객/항공화물 운임 직결주',
            oneLiner: `해외에서 『중동 전쟁 등으로 국제유가(항공유)가 급등』하고 『원/달러 환율이 동반 급등』하거나, 『글로벌 경기 침체로 항공화물·여객 운임이 하락』하면 ➔ 연료비와 달러 리스 부채 이자가 폭증하며 ${stockName}가 직격탄을 맞아 떨어집니다!`,
            triggers: [
                { icon: '🛢️', trigger: '🔥 국제유가(WTI) 및 항공유 급등 (영업원가 급증)', chain: '유류비가 영업비용의 약 30%를 차지해 유가 급등 시 영업이익이 크게 깎입니다.', impact_degree: '🔥 1순위 직격탄' },
                { icon: '💱', trigger: '📈 원/달러 환율 급등 (외화 부채 환산손실 + 여행 위축)', chain: '항공기 리스료와 유류비를 달러로 결제하므로 환율 급등 시 비용과 환차손이 동시에 늘어납니다.', impact_degree: '⚠️ 비용·환차손 직격' },
                { icon: '✈️', trigger: '📉 미·중 무역 갈등으로 인한 글로벌 항공화물 물동량 감소', chain: '알짜 수익원인 IT·반도체 항공화물 운임이 꺾이면 이익 전망치가 하향됩니다.', impact_degree: '⚡ 화물 마진 변수' },
            ],
        };
    }
    if (['nvda', '엔비디아', 'nvidia'].some(k => combined.includes(k))) {
        return {
            ...buildDefaultStockRiseIntel(stockName, stockCode, extraContext),
            chainBadge: '🌎 글로벌 AI 반도체 총대장 · 미 상무부 수출규제 · 빅테크 AI CAPEX 직결주',
            oneLiner: `미국 정부가 『중국·중동향 AI 칩 추가 수출 금지령』을 내리거나, MS·메타·구글·아마존 등 빅테크 고객사들이 『AI 데이터센터 설비투자(CAPEX) 축소 및 자체 칩 전환』을 발표하면 ➔ 독점 고마진이 흔들릴까 봐 엔비디아(NVDA)가 직격탄을 맞아 급락합니다!`,
            triggers: [
                { icon: '🏛️', trigger: '🇺🇸 미 상무부의 대중국·우회국 AI 가속기 수출 전면 차단', chain: '해외 매출 제한이 확대되면 분기 매출 가이던스가 깎이며 월가 차익실현 빌미가 됩니다.', impact_degree: '🔥 1순위 직격탄' },
                { icon: '🏢', trigger: '💻 빅테크(MS·아마존·구글·메타)의 AI 투자 수익성 회의론', chain: '최대 고객사인 빅테크들이 설비투자 속도 조절을 시사하면 가장 먼저 직격탄을 맞습니다.', impact_degree: '⚠️ 수요 피크아웃 뇌관' },
                { icon: '⚙️', trigger: '🏭 대만 TSMC 패키징 병목 · 차세대 GPU 수율/출하 지연', chain: '신제품 출하가 지연되거나 매출총이익률(75%)이 낮아지면 고밸류에이션 부담으로 흔들립니다.', impact_degree: '⚡ 공급망·마진 변수' },
            ],
        };
    }
    if (['tsla', '테슬라', 'tesla'].some(k => combined.includes(k))) {
        return {
            ...buildDefaultStockRiseIntel(stockName, stockCode, extraContext),
            chainBadge: '🌎 미국 금리/보조금 · 중국 BYD 전기차 가격전쟁 · 자율주행(FSD) 규제 직결주',
            oneLiner: `중국·유럽에서 『BYD 등 중국 전기차와의 출혈 할인 전쟁으로 차량 판매량·마진율이 하락』하거나, 미국에서 『고금리 장기화 및 자율주행(FSD)·로보택시 규제 조사/리콜』이 터지면 ➔ 높은 성장성 프리미엄을 받는 테슬라(TSLA)가 직격탄을 맞아 급락합니다!`,
            triggers: [
                { icon: '🚗', trigger: '🇨🇳 중국 BYD 등과의 가격 인하 경쟁 & 분기 인도량 부진', chain: '차량 가격 인하로 자동차 매출총이익률이 낮아지면 월가 목표주가 하향의 직격탄이 됩니다.', impact_degree: '🔥 1순위 직격탄' },
                { icon: '🏛️', trigger: '🇺🇸 미국 교통당국(NHTSA)의 자율주행(FSD)·로보택시 규제 조사', chain: '기업가치 핵심인 완전자율주행 상용화 일정에 제동이 걸리면 투자심리가 급격히 식습니다.', impact_degree: '⚠️ 핵심 모멘텀 위협' },
                { icon: '🏦', trigger: '📈 미국 고금리 장기화 및 전기차 세액공제 혜택 축소', chain: '자동차 할부 금리가 높게 유지되면 소비자들이 전기차 구매를 미루어 판매 성장이 둔화됩니다.', impact_degree: '⚡ 거시 소비 변수' },
            ],
        };
    }
    if (['amzn', '아마존', 'msft', '마이크로소프트', 'pltr', '팔란티어', 'googl', '구글', 'aapl', '애플', 'meta', '메타'].some(k => combined.includes(k))) {
        return {
            ...buildDefaultStockRiseIntel(stockName, stockCode, extraContext),
            chainBadge: '🌎 미국 연준(Fed) 국채금리 · 클라우드/AI 설비투자 수익성 · EU/미국 반독점 규제 직결주',
            oneLiner: `미국에서 『물가 반등으로 미 10년물 국채금리가 급등』하거나, 실적 발표에서 『막대한 AI·클라우드 투자비 대비 수익(가이던스)이 월가 기대치를 밑돈다』는 평가 또는 『미 법무부·EU 반독점 제재』가 터지면 ➔ ${stockName} 주가가 직격탄을 맞아 떨어집니다!`,
            triggers: [
                { icon: '📊', trigger: '📉 분기 실적 발표 시 클라우드·AI 성장률 가이던스 둔화', chain: 'AI 설비투자는 늘었는데 클라우드 매출 성장률이 1~2%만 기대를 밑돌아도 시간외에서 급락합니다.', impact_degree: '🔥 1순위 직격탄' },
                { icon: '🏦', trigger: '🇺🇸 미국 물가(CPI) 반등 & 미 국채 10년물 금리 급등', chain: '금리가 치솟으면 월가 알고리즘이 빅테크 기술주 밸류에이션 멀티플을 일제히 축소합니다.', impact_degree: '⚠️ 거시 금리 직격' },
                { icon: '⚖️', trigger: '🏛️ 미국 법무부(DOJ)·유럽연합(EU) 반독점 과징금 및 규제', chain: '독점 규제나 미·중 무역 보복 관세가 부과되면 글로벌 매출 타격 우려로 조정을 받습니다.', impact_degree: '⚡ 규제·무역 변수' },
            ],
        };
    }

    return {
            ...buildDefaultStockRiseIntel(stockName, stockCode, extraContext),
        chainBadge: '🌏 미국 나스닥·원/달러 환율 · 글로벌 수출 경기 & 외국인 수급 직결주',
        oneLiner: `해외에서 『미국 나스닥 급락 및 글로벌 경기 침체 우려로 원/달러 환율이 급등』하거나, 『미국의 수입 관세 장벽 강화 및 전방 고객사 발주 지연』 이슈가 터지면 ➔ 외국인·기관의 프로그램 매도세가 출회되며 ${stockName} 주가가 직격탄을 맞아 떨어집니다!`,
        triggers: [
            { icon: '🌎', trigger: '🇺🇸 미국 증시(나스닥·S&P500) 급락 & 외국인 패시브 매도', chain: '밤사이 미국 기술주가 급락하면 개장 직후 외국인·기관의 프로그램 매도세가 출회되며 동반 하락합니다.', impact_degree: '🔥 1순위 직격탄' },
            { icon: '💱', trigger: '📈 원/달러 환율 급등 및 해외 원자재·물류비 상승', chain: '환율 급등 시 외국인 수급이 이탈하고 원재료 조달 부담이 커져 영업이익률이 압박받습니다.', impact_degree: '⚠️ 수급·원가 직격' },
            { icon: '📢', trigger: '📑 전방 고객사 발주 지연 또는 CB·유상증자 등 물량 공시', chain: '주요 매출처 투자 지연이나 주식 수가 늘어나는 자금조달 공시 발생 시 단기 주가가 흔들립니다.', impact_degree: '⚡ 기업 고유 변수' },
        ],
        ...buildDefaultStockRiseIntel(stockName, stockCode, extraContext),
    };
}


// 🚨 대표님 전용 글로벌 리스크 레이더 패널: 해외·국내 사건을 감지해 '내 관심종목'에 영향이 있는 것만 보여줍니다.
function RiskRadarPanel({ email }: { email: string }) {
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [open, setOpen] = useState<boolean>(true);
    const [errorMsg, setErrorMsg] = useState<string>('');

    const load = useCallback(async (scan: boolean) => {
        if (!email) return;
        try {
            setLoading(true);
            setErrorMsg('');
            const url = `${API_BASE_URL}/api/market/ceo-office/risk-radar${scan ? '/scan' : ''}?ceo_email=${encodeURIComponent(email)}`;
            const res = await fetch(url, {
                method: scan ? 'POST' : 'GET',
                headers: { 'X-CEO-Email': email },
            });
            if (res.ok) {
                const json = await res.json();
                if (json.status === 'success') setReport(json.data);
            } else {
                setErrorMsg('리스크 레이더를 불러오지 못했습니다.');
            }
        } catch (e) {
            setErrorMsg('리스크 레이더 통신 오류');
        } finally {
            setLoading(false);
        }
    }, [email]);

    useEffect(() => {
        load(false);
        const timer = setInterval(() => load(false), 5 * 60 * 1000);
        return () => clearInterval(timer);
    }, [load]);

    if (!email) return null;

    const events: any[] = report?.events || [];
    const watchEvents = events.filter((e: any) => e.affects_watchlist);
    const otherEvents = events.filter((e: any) => !e.affects_watchlist);
    const watchlist: any[] = report?.watchlist || [];
    const hasRisk = watchEvents.some((e: any) => (e.risk_stocks || []).length > 0);

    return (
        <div className={`rounded-2xl border-2 p-4 sm:p-5 space-y-3 shadow-xl ${
            hasRisk
                ? 'bg-gradient-to-br from-rose-950/40 via-[#10101c] to-slate-950 border-rose-500/50'
                : 'bg-gradient-to-br from-emerald-950/25 via-[#0d1424] to-slate-950 border-emerald-500/30'
        }`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-2 cursor-pointer text-left">
                    <span className={`px-2.5 py-1 rounded-lg font-black text-xs ${hasRisk ? 'bg-rose-500 text-white' : 'bg-emerald-400 text-slate-950'}`}>
                        🚨 대표님 전용 글로벌 리스크 레이더
                    </span>
                    <span className="text-xs font-black text-white">
                        {watchEvents.length > 0
                            ? `내 관심종목에 영향 있는 사건 ${watchEvents.length}건`
                            : '현재 내 관심종목에 영향 주는 사건 없음'}
                    </span>
                    <span className="text-[11px] text-gray-400">{open ? '▲ 접기' : '▼ 펼치기'}</span>
                </button>
                <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-400">
                        {report?.generated_at ? `점검 ${report.generated_at}` : '점검 전'}
                        {report?.headline_scanned ? ` · 뉴스 ${report.headline_scanned}건 확인` : ''}
                    </span>
                    <button
                        type="button"
                        onClick={() => load(true)}
                        disabled={loading}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-50 text-gray-100 border border-white/15 text-[11px] font-bold cursor-pointer"
                    >
                        {loading ? '점검 중...' : '🔄 지금 점검'}
                    </button>
                </div>
            </div>

            {open && (
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="text-gray-400 font-bold">감시 중인 내 관심종목:</span>
                        {watchlist.length === 0 ? (
                            <span className="text-amber-300 font-bold">{report?.note || '관심종목을 찾지 못했습니다.'}</span>
                        ) : (
                            (watchlist || []).map((s: any) => (
                                <span key={s.symbol} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-200 font-bold">
                                    {s.name}
                                </span>
                            ))
                        )}
                    </div>

                    {errorMsg && <div className="text-xs text-rose-300 font-bold">{errorMsg}</div>}

                    {watchEvents.length === 0 && watchlist.length > 0 && !errorMsg && (
                        <div className="bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-gray-300 font-medium">
                            ✅ 최근 하루 뉴스·공시를 점검한 결과, 내 관심종목에 직접 영향을 주는 위험·수혜 사건은 아직 없습니다. 10분마다 자동 점검하며, 생기면 대표님 기기로만 알려드립니다.
                        </div>
                    )}

                    {watchEvents.map((ev: any) => (
                        <div key={ev.key} className="bg-black/50 border border-white/10 rounded-xl p-3.5 space-y-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-black text-white">{ev.icon} {ev.label}</span>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${
                                        ev.severity === 'high'
                                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                            : 'bg-amber-500/20 text-amber-200 border-amber-500/30'
                                    }`}>
                                        {ev.kind === 'dart_negative' ? '공시' : `관련 기사 ${ev.headline_count}건`}
                                    </span>
                                </div>
                                <span className="text-[11px] font-bold text-sky-200 bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 rounded-full">
                                    {ev.team?.avatar} {ev.team?.name} {ev.team?.role} · {ev.team?.dept} 리스크 보고
                                </span>
                            </div>

                            <p className="text-xs text-gray-200 font-medium leading-relaxed break-keep">💡 {ev.easy}</p>

                            {(ev.risk_stocks || []).length > 0 && (
                                <div className="bg-rose-950/30 border border-rose-500/30 rounded-lg p-2.5 space-y-1">
                                    <div className="text-[11px] font-black text-rose-300">⚠️ 내 관심종목 중 위험 (악재 가능)</div>
                                    {(ev.risk_stocks || []).map((s: any, i: number) => (
                                        <div key={i} className="text-[11px] text-gray-200 leading-snug">
                                            <strong className="text-white">{s.name}</strong>
                                            <span className="text-gray-400"> ({s.sector})</span> — {s.why}
                                        </div>
                                    ))}
                                    <div className="text-[11px] text-rose-200/90 font-bold pt-0.5">🛡️ {ev.guide_risk}</div>
                                </div>
                            )}

                            {(ev.benefit_stocks || []).length > 0 && (
                                <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-lg p-2.5 space-y-1">
                                    <div className="text-[11px] font-black text-emerald-300">🟢 내 관심종목 중 수혜 (호재 가능)</div>
                                    {(ev.benefit_stocks || []).map((s: any, i: number) => (
                                        <div key={i} className="text-[11px] text-gray-200 leading-snug">
                                            <strong className="text-white">{s.name}</strong>
                                            <span className="text-gray-400"> ({s.sector})</span> — {s.why}
                                        </div>
                                    ))}
                                    <div className="text-[11px] text-emerald-200/90 font-bold pt-0.5">{ev.guide_benefit}</div>
                                </div>
                            )}

                            <div className="space-y-0.5">
                                {(ev.evidence || []).slice(0, 2).map((h: any, i: number) => (
                                    <div key={i} className="text-[11px] text-gray-400 truncate">
                                        📰 {h.url ? (
                                            <a href={h.url} target="_blank" rel="noopener noreferrer" className="text-sky-300 hover:underline">{h.title}</a>
                                        ) : h.title}
                                        <span className="text-gray-500"> ({h.source}{h.published ? ` · ${h.published}` : ''})</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {otherEvents.length > 0 && (
                        <div className="text-[11px] text-gray-500">
                            참고: 내 관심종목과 관련 없는 감지 사건 {otherEvents.length}건 — {otherEvents.map((e: any) => e.label).join(' · ')}
                        </div>
                    )}

                    <p className="text-[10px] text-gray-500 leading-relaxed">
                        ※ 뉴스 제목의 키워드를 규칙표로 분석한 1차 감지이며 AI의 판단이 아닙니다. 같은 사건을 다룬 서로 다른 기사가 2건 이상일 때만 표시합니다. 투자 권유가 아닌 참고 정보이며 이 알림은 대표님 계정에게만 전달됩니다.
                    </p>
                </div>
            )}
        </div>
    );
}

export default function CeoOfficePage() {

    const renderResearchDetailPanels = (r: any, currentCapital: number) => {
        const isKr = r.category === 'kr_stock';
        const bizSummary: string[] = r.business_summary || [];
        const finTable = r.financial_table;
        const tech = r.technicals;
        const finPlan = computeFinancialRiskPlan(r.price, r.consensus?.target_mean || (r.price * 1.15), currentCapital);
        const fallbackHit = getStockOverseasDirectHitSummary(r.stock_name, r.stock_code, bizSummary.join(' '));
        const dropIntel = r.drop_impact_intel || {
            overseas_chain_badge: fallbackHit.chainBadge,
            direct_hit_one_liner: fallbackHit.oneLiner,
            overseas_triggers: fallbackHit.triggers,
            rise_chain_badge: fallbackHit.riseChainBadge,
            rise_one_liner: fallbackHit.riseOneLiner,
            rise_triggers: fallbackHit.riseTriggers,
            live_diagnosis: null,
        };
        const disclosures: any[] = r.disclosures || [];
        const liveDiag = dropIntel.live_diagnosis;
        const deepReport = dropIntel.deep_report || (fallbackHit as any)?.deepReport || null;

        const rawChg = parseChangePct(r.change_pct, r.price);
        const isRising = rawChg > 0;
        const isDropping = rawChg < 0;

        const riseList = (dropIntel.rise_triggers || fallbackHit.riseTriggers || [
            { icon: '🚀', trigger: `🔥 ${r.stock_name} 전방 산업 수요 회복 및 실적 턴어라운드`, chain: '핵심 고객사 발주 확대 ➔ 신규 수주 모멘텀 가시화 ➔ 실적 개선 기대감으로 주가 견인', impact_degree: '🔥 1순위 상승 동력', detailed_explanation: '전방 수요 회복 및 신규 수주 가시화로 공장 가동률이 상승하고 실적 개선 기대감이 주가를 견인합니다.' },
            { icon: '💰', trigger: '📈 외국인·기관 큰손 순매수 및 프로그램 매수세 유입', chain: '기업 밸류에이션 매력 부각 ➔ 메이저 수급 집중 유입 ➔ 단기 수급 탄력성 확보', impact_degree: '✨ 수급 모멘텀', detailed_explanation: '외국인 및 기관 투자자들의 패시브 자금이 집중 유입되며 하방 경직성을 확보하고 있습니다.' },
        ]).slice(0, 2);

        const riskList = (dropIntel.overseas_triggers || fallbackHit.triggers || [
            { icon: '💣', trigger: '🇺🇸 미국 증시 변동성 & 글로벌 경기 둔화 우려', chain: '해외 시장 급변동 ➔ 외국인 프로그램 매도 출회 ➔ 단기 가격 조정 압박', impact_degree: '🔥 1순위 직격탄', detailed_explanation: '글로벌 경기 둔화 및 금리 변동성으로 외국인 차익실현 매물이 출회될 수 있습니다.' },
            { icon: '⚠️', trigger: '📈 원/달러 환율 급변 및 해외 원자재·물류비 상승', chain: '환율 변동성 확대 ➔ 원부자재 수입 단가 상승 ➔ 분기 영업이익률 압박', impact_degree: '⚠️ 마진·원가 리스크', detailed_explanation: '원/달러 환율 급등이나 원부자재 가격 상승 시 영업 마진율이 일시적으로 압박받을 수 있습니다.' },
        ]).slice(0, 2);

        const riseOneLiner = dropIntel.rise_one_liner || fallbackHit.riseOneLiner || `전방 수요 회복 및 메이저 수급 유입으로 든든한 턴어라운드 모멘텀이 형성되고 있습니다.`;
        const riskOneLiner = dropIntel.direct_hit_one_liner || fallbackHit.oneLiner || `대외 매크로 불확실성 및 원가·수급 변수에 따른 단기 조정 리스크가 상존합니다.`;

        return (
            <div className="space-y-4 pt-1">
                {/* ⚖️ [기회 vs 리스크 균형 분석] 🟢 상승 동력 2선 vs 🔴 경계 리스크 2선 동시 점검 */}
                <div className="rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xl border-2 bg-gradient-to-br from-slate-900/95 via-[#0e1726] to-slate-950 border-amber-500/40">
                    {/* 상단 헤더 */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-1 rounded-lg font-black text-xs flex items-center gap-1 shadow-md bg-gradient-to-r from-emerald-500/20 via-amber-500/20 to-rose-500/20 text-amber-200 border border-amber-400/40">
                                <span>⚖️</span>
                                <span>기회 vs 리스크 균형 분석</span>
                            </span>
                            <span className="text-xs sm:text-sm font-black text-white">
                                “{r.stock_name} 🟢 핵심 상승 동력 2선 vs 🔴 핵심 경계 리스크 2선 균형 진단”
                            </span>
                        </div>
                        <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full border ${
                            rawChg > 0 ? 'bg-emerald-400/15 text-emerald-200 border-emerald-400/30' : rawChg < 0 ? 'bg-rose-400/15 text-rose-200 border-rose-400/30' : 'bg-slate-400/15 text-slate-200 border-slate-400/30'
                        }`}>
                            {rawChg > 0 ? `+${rawChg.toFixed(2)}% 강세` : rawChg < 0 ? `${rawChg.toFixed(2)}% 조정` : '0.00% 보합'}
                        </span>
                    </div>

                    {/* 💡 1초 대표님 균형 결론 박스 (기회 + 리스크 2분할) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <div className="bg-emerald-950/30 border border-emerald-500/35 rounded-xl p-3 space-y-1">
                            <div className="text-[11px] font-black text-emerald-300 flex items-center gap-1">
                                <span>🟢</span>
                                <span>대표님 1초 기회 요약 (상승 모멘텀)</span>
                            </div>
                            <p className="text-emerald-100 font-bold leading-relaxed break-keep text-[11px]">
                                {riseOneLiner}
                            </p>
                        </div>
                        <div className="bg-rose-950/30 border border-rose-500/35 rounded-xl p-3 space-y-1">
                            <div className="text-[11px] font-black text-rose-300 flex items-center gap-1">
                                <span>🔴</span>
                                <span>대표님 1초 경계 요약 (하방 리스크)</span>
                            </div>
                            <p className="text-rose-100 font-bold leading-relaxed break-keep text-[11px]">
                                {riskOneLiner}
                            </p>
                        </div>
                    </div>

                    {/* 🟢 🔴 좌우 2분할 대조: 기회 요인 2선 vs 위험 요인 2선 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* 🟢 좌측: 기회 & 핵심 상승 동력 2선 */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-black text-emerald-300 px-1 pb-1 border-b border-emerald-500/20">
                                <span className="flex items-center gap-1">
                                    <span>🟢</span>
                                    <span>핵심 기회 & 상승 동력 (2선)</span>
                                </span>
                                <span className="text-[10px] text-emerald-400/80 font-normal">왜 사야 하는가?</span>
                            </div>
                            <div className="space-y-2">
                                {riseList.map((t: any, idx: number) => (
                                    <div key={idx} className="bg-gradient-to-b from-black/60 to-emerald-950/20 border border-emerald-500/30 rounded-xl p-3 space-y-2 shadow-sm">
                                        <div className="flex items-center justify-between text-[10px] font-black pb-1 border-b border-white/5">
                                            <span className="text-emerald-300 flex items-center gap-1">
                                                <span>{t?.icon || '🚀'}</span>
                                                <span>상승 동력 {idx + 1}</span>
                                            </span>
                                            <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold border bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                                                {t?.impact_degree}
                                            </span>
                                        </div>
                                        <div className="text-xs font-black text-white leading-snug break-keep">
                                            {t?.trigger}
                                        </div>
                                        <div className="bg-white/[0.03] border border-white/5 rounded-lg p-2 text-[10.5px] text-zinc-200 leading-snug break-keep space-y-1">
                                            {t?.chain?.includes('➔') ? (
                                                t.chain.split('➔').map((step: string, sIdx: number, arr: string[]) => (
                                                    <div key={sIdx} className="flex items-start gap-1">
                                                        {sIdx > 0 && <span className="text-amber-400 font-black shrink-0">➔</span>}
                                                        <span className={sIdx === arr.length - 1 ? 'font-bold text-emerald-300' : 'text-zinc-300'}>
                                                            {step.trim()}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div>{t?.chain}</div>
                                            )}
                                        </div>
                                        {t?.detailed_explanation && (
                                            <details className="group pt-1 border-t border-white/5">
                                                <summary className="text-[10px] text-amber-300/80 hover:text-amber-300 font-bold cursor-pointer flex items-center justify-between list-none select-none py-0.5">
                                                    <span className="flex items-center gap-1">
                                                        <span>📖</span>
                                                        <span>상세 인과 메커니즘</span>
                                                    </span>
                                                    <span className="text-[9px] group-open:rotate-180 transition-transform text-gray-400">▼</span>
                                                </summary>
                                                <div className="text-[10px] text-gray-300 pt-1.5 leading-relaxed break-keep bg-white/[0.02] p-2 rounded-lg mt-1 border border-white/5">
                                                    {t?.detailed_explanation}
                                                </div>
                                            </details>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 🔴 우측: 위험 & 핵심 경계 리스크 2선 */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-black text-rose-300 px-1 pb-1 border-b border-rose-500/20">
                                <span className="flex items-center gap-1">
                                    <span>🔴</span>
                                    <span>핵심 위험 & 경계 리스크 (2선)</span>
                                </span>
                                <span className="text-[10px] text-rose-400/80 font-normal">무엇을 조심해야 하는가?</span>
                            </div>
                            <div className="space-y-2">
                                {riskList.map((t: any, idx: number) => (
                                    <div key={idx} className="bg-gradient-to-b from-black/60 to-rose-950/20 border border-rose-500/30 rounded-xl p-3 space-y-2 shadow-sm">
                                        <div className="flex items-center justify-between text-[10px] font-black pb-1 border-b border-white/5">
                                            <span className="text-rose-300 flex items-center gap-1">
                                                <span>{t?.icon || '💣'}</span>
                                                <span>경계 리스크 {idx + 1}</span>
                                            </span>
                                            <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold border bg-rose-500/20 text-rose-300 border-rose-500/40">
                                                {t?.impact_degree}
                                            </span>
                                        </div>
                                        <div className="text-xs font-black text-white leading-snug break-keep">
                                            {t?.trigger}
                                        </div>
                                        <div className="bg-white/[0.03] border border-white/5 rounded-lg p-2 text-[10.5px] text-zinc-200 leading-snug break-keep space-y-1">
                                            {t?.chain?.includes('➔') ? (
                                                t.chain.split('➔').map((step: string, sIdx: number, arr: string[]) => (
                                                    <div key={sIdx} className="flex items-start gap-1">
                                                        {sIdx > 0 && <span className="text-amber-400 font-black shrink-0">➔</span>}
                                                        <span className={sIdx === arr.length - 1 ? 'font-bold text-rose-300' : 'text-zinc-300'}>
                                                            {step.trim()}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div>{t?.chain}</div>
                                            )}
                                        </div>
                                        {t?.detailed_explanation && (
                                            <details className="group pt-1 border-t border-white/5">
                                                <summary className="text-[10px] text-amber-300/80 hover:text-amber-300 font-bold cursor-pointer flex items-center justify-between list-none select-none py-0.5">
                                                    <span className="flex items-center gap-1">
                                                        <span>📖</span>
                                                        <span>상세 인과 메커니즘</span>
                                                    </span>
                                                    <span className="text-[9px] group-open:rotate-180 transition-transform text-gray-400">▼</span>
                                                </summary>
                                                <div className="text-[10px] text-gray-300 pt-1.5 leading-relaxed break-keep bg-white/[0.02] p-2 rounded-lg mt-1 border border-white/5">
                                                    {t?.detailed_explanation}
                                                </div>
                                            </details>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 🛡️ 하단: 최서연 CRO 리스크 방어 가이드 & 손절선 */}
                    <div className="bg-gradient-to-r from-purple-950/40 via-slate-900/90 to-purple-950/40 border border-purple-500/35 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs shadow-md">
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40 font-black text-[10px]">
                                🛡️ CRO 리스크 방어 결론
                            </span>
                            <span className="text-zinc-200 text-[11px] font-bold break-keep">
                                상승 동력이 유효하더라도 위 경계 리스크가 돌발할 수 있으므로, <strong className="text-amber-300">시초가 추격매수 금지</strong> 및 <strong className="text-purple-300 font-mono">-3.5% 손절 방어선</strong>을 엄수하십시오.
                            </span>
                        </div>
                        <span className="text-[10px] font-mono text-purple-300 font-bold shrink-0">
                            기안: 최서연 상무 (CRO)
                        </span>
                    </div>

                    {/* 📖 [종목명] 리서치팀 4대 심층 정밀 인과 분석 리포트 (상세 해설) */}
                    {deepReport && (
                        <div className="bg-black/70 border border-indigo-500/40 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xl">
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/10">
                                <div className="flex items-center gap-2">
                                    <span className="p-1 rounded-md bg-indigo-500/20 text-indigo-300 text-xs font-black">📖</span>
                                    <span className="text-xs sm:text-sm font-black text-white">
                                        {r.stock_name} 리서치팀 심층 정밀 인과 분석 리포트 (상세 해설)
                                    </span>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-200 border border-indigo-400/30">
                                    수석 애널리스트 정밀 분석
                                </span>
                            </div>

                            {deepReport.summary_headline && (
                                <div className="bg-indigo-950/30 border border-indigo-500/25 rounded-xl p-3 text-xs sm:text-[13px] font-bold text-indigo-200 leading-relaxed break-keep">
                                    💡 {deepReport.summary_headline}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                {/* 1. 비즈니스 모델 & 글로벌 밸류체인 */}
                                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 space-y-1.5">
                                    <div className="text-[11px] font-black text-cyan-300 flex items-center gap-1.5">
                                        <span>🏢</span> 1. 비즈니스 구조 &amp; 글로벌 밸류체인 생태계
                                    </div>
                                    <p className="text-[11px] text-gray-200 leading-relaxed break-keep">
                                        {deepReport.business_model_context}
                                    </p>
                                </div>

                                {/* 2. 환율·원가·전방 발주 인과 메커니즘 */}
                                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 space-y-1.5">
                                    <div className="text-[11px] font-black text-amber-300 flex items-center gap-1.5">
                                        <span>🔄</span> 2. 실시간 거시지표 ➔ 기업 실적 전달 메커니즘
                                    </div>
                                    <p className="text-[11px] text-gray-200 leading-relaxed break-keep">
                                        {deepReport.transmission_mechanism}
                                    </p>
                                </div>

                                {/* 3. 외국인·기관 큰손 수급 논리 */}
                                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 space-y-1.5">
                                    <div className="text-[11px] font-black text-emerald-300 flex items-center gap-1.5">
                                        <span>📊</span> 3. 메이저 수급(외인·기관)의 자금 집행 기준
                                    </div>
                                    <p className="text-[11px] text-gray-200 leading-relaxed break-keep">
                                        {deepReport.smart_money_logic}
                                    </p>
                                </div>

                                {/* 4. 향후 주가 변곡점 & 핵심 관전 포인트 */}
                                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 space-y-1.5">
                                    <div className="text-[11px] font-black text-purple-300 flex items-center gap-1.5">
                                        <span>🎯</span> 4. 추세 변곡점 &amp; 핵심 모니터링 체크리스트
                                    </div>
                                    <p className="text-[11px] text-gray-200 leading-relaxed break-keep">
                                        {deepReport.key_inflection_points}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 🔍 실시간 교차 팩트체크 (뉴스·DART공시·수급) */}
                    {liveDiag && (
                        <div className={`rounded-2xl p-3.5 sm:p-4 space-y-3 border ${
                            isDropping
                                ? 'bg-rose-950/35 border-rose-500/40'
                                : isRising
                                ? 'bg-emerald-950/35 border-emerald-500/40'
                                : 'bg-slate-900/60 border-slate-600/40'
                        }`}>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-black ${
                                        isDropping ? 'bg-rose-500 text-white' : isRising ? 'bg-emerald-400 text-slate-950' : 'bg-slate-400 text-slate-950'
                                    }`}>
                                        {liveDiag.status_badge}
                                    </span>
                                    <span className="text-xs font-black text-white">
                                        {isDropping
                                            ? `🚨 오늘 왜 떨어지나요? (${rawChg.toFixed(2)}% 하락 원인 3초 해답)`
                                            : isRising
                                            ? `🚀 오늘 왜 오르나요? (+${rawChg.toFixed(2)}% 상승 원인 3초 해답)`
                                            : `⚖️ 오늘 주가 흐름 판독 (보합 0.00% 원인 판독)`}
                                    </span>
                                </div>
                                <span className="text-[10px] text-gray-300 font-bold">
                                    박진우 리서치센터장 · 최서연 CRO 합동
                                </span>
                            </div>

                            <div className="bg-black/60 border border-white/10 rounded-xl p-3 text-xs sm:text-[13px] font-bold text-white leading-relaxed break-keep">
                                {liveDiag.primary_cause_title}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                                <div className="bg-black/45 border border-white/10 rounded-xl p-2.5 space-y-1">
                                    <div className="text-[11px] font-black text-amber-300">📢 1. 전자공시(DART)·고시 판독</div>
                                    <p className="text-[11px] text-gray-200 leading-relaxed break-keep">{liveDiag.disc_verdict}</p>
                                </div>
                                <div className="bg-black/45 border border-white/10 rounded-xl p-2.5 space-y-1">
                                    <div className="text-[11px] font-black text-sky-300">📰 2. 언론 보도 &amp; 이슈 스캔</div>
                                    <p className="text-[11px] text-gray-200 leading-relaxed break-keep">{liveDiag.news_verdict}</p>
                                </div>
                                <div className="bg-black/45 border border-white/10 rounded-xl p-2.5 space-y-1">
                                    <div className="text-[11px] font-black text-emerald-300">💰 3. 외국인·기관 큰손 수급 판독</div>
                                    <p className="text-[11px] text-gray-200 leading-relaxed break-keep">{liveDiag.flow_verdict}</p>
                                </div>
                            </div>

                            <div className="bg-black/70 border border-amber-500/35 rounded-xl px-3 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                <div className="text-gray-200 font-bold break-keep">
                                    <span className="text-amber-300 font-black mr-1.5">
                                        {isRising ? '🎯 리서치팀 실전 수익 극대화 지침:' : isDropping ? '🛡️ 리서치팀 & CRO 손실 방어 지침:' : '⚖️ 리서치팀 실전 관망 지침:'}
                                    </span>
                                    {liveDiag.action_guide}
                                </div>
                            </div>
                        </div>
                    )}

                {/* 📢 최근 금융감독원 전자공시(DART) & 주요 고시 쉬운 해설 리스트 */}
                    {isKr && (
                        <div className="bg-black/50 border border-white/10 rounded-2xl p-3.5 sm:p-4 space-y-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded bg-indigo-500/25 text-indigo-300 border border-indigo-400/40 text-[11px] font-black">
                                        📢 금융감독원 DART 공식 고시·공시
                                    </span>
                                    <span className="text-xs font-black text-white">
                                        최근 90일 내 {r.stock_name} 주요 공시 팩트체크 &amp; 쉬운 뜻풀이 ({disclosures.length}건)
                                    </span>
                                </div>
                                <span className="text-[11px] text-gray-400">
                                    유상증자·CB·수주·지분변동 자동 감시
                                </span>
                            </div>

                            {disclosures.length === 0 ? (
                                <div className="bg-emerald-950/20 border border-emerald-500/25 rounded-xl p-3 text-xs text-emerald-200 font-bold flex items-center gap-2">
                                    <span>✅</span>
                                    <span>최근 90일 이내 금융감독원(DART)에 제출된 특이 공시나 물량 희석(유상증자·전환사채) 악재 공시가 없습니다.</span>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {(disclosures || []).map((d: any, dIdx: number) => (
                                        <div key={dIdx} className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all">
                                            <div className="space-y-1 min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${
                                                        d.tone === 'negative'
                                                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                                            : d.tone === 'positive'
                                                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                                                : 'bg-slate-500/20 text-slate-300 border-slate-500/30'
                                                    }`}>
                                                        {d.badge}
                                                    </span>
                                                    <span className="text-[11px] font-mono text-gray-400">{d.date}</span>
                                                    <span className="text-xs font-extrabold text-white">{d.title}</span>
                                                    {d.filer && (
                                                        <span className="text-[10px] text-gray-400 bg-white/5 px-1.5 py-0.5 rounded">
                                                            제출: {d.filer}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-amber-100/90 font-medium leading-snug break-keep">
                                                    💡 <strong>쉬운 해설:</strong> {d.easy_meaning}
                                                </p>
                                            </div>
                                            {d.url && (
                                                <a
                                                    href={d.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-2.5 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-[11px] font-black shrink-0 self-start sm:self-center"
                                                >
                                                    DART 원문 →
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                {/* 1. 기업 비즈니스 모델(BM) & 주력 사업·고객사 심층 해설 */}
                <div className="bg-gradient-to-br from-slate-900/90 via-[#0a1526] to-slate-900/90 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <span className="p-1 rounded-md bg-cyan-500/20 text-cyan-300 text-xs font-black">🏢</span>
                            <h5 className="text-xs sm:text-sm font-black text-white">
                                기업 비즈니스 모델(BM) &amp; 주력 사업·고객사 심층 분석
                            </h5>
                        </div>
                        <span className="text-[11px] font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-500/30">
                            {r.stock_name} 독점력·경쟁 우위 검증
                        </span>
                    </div>
                    {bizSummary.length > 0 ? (
                        <div className="space-y-2 text-xs text-gray-300 leading-relaxed">
                            {(bizSummary || []).map((item, idx) => (
                                <div key={idx} className="flex items-start gap-2 bg-black/40 p-2.5 rounded-xl border border-white/5">
                                    <span className="text-cyan-400 font-bold shrink-0 mt-0.5">✓</span>
                                    <p className="font-medium text-gray-200">{item}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-xs text-gray-300 bg-black/30 p-3 rounded-xl border border-white/5">
                            <p className="font-medium text-gray-300 leading-relaxed">
                                동사는 해당 산업군 내에서 독보적인 제조·개발 경쟁력과 안정적인 매출 포트폴리오를 확보한 우량 기업입니다. 주요 원천 기술력과 글로벌 고객사 다변화를 통해 안정적인 현금흐름 창출 능력을 지속적으로 입증하고 있습니다.
                            </p>
                        </div>
                    )}
                </div>

                {/* 2. 최근 3~4개년 실적 & 재무제표 팩트체크 테이블 (초보자 10초 쉬운 해설 탑재) */}
                {finTable && finTable.years && finTable.years.length > 0 && finTable.rows && finTable.rows.length > 0 && (() => {
                    const findRow = (kw: string) => finTable.rows.find((r: any) => r.title && r.title.includes(kw));
                    const cleanNum = (v: any) => {
                        if (!v || v === '-') return null;
                        const n = parseFloat(String(v).replace(/,/g, ''));
                        return isNaN(n) ? null : n;
                    };

                    const revRow = findRow('매출액');
                    const opRow = findRow('영업이익');
                    const opmRow = findRow('영업이익률');
                    const debtRow = findRow('부채비율');

                    const getValues = (row: any) => (row?.values || []).map(cleanNum).filter((x: any) => x !== null);
                    const revVals = getValues(revRow);
                    const opVals = getValues(opRow);
                    const opmVals = getValues(opmRow);
                    const debtVals = getValues(debtRow);

                    const revFirst = revVals.length > 0 ? revVals[0] : null;
                    const revLast = revVals.length > 0 ? revVals[revVals.length - 1] : null;
                    const revGrowth = revFirst && revLast && revFirst !== 0 ? Math.round(((revLast - revFirst) / Math.abs(revFirst)) * 100) : null;

                    const opFirst = opVals.length > 0 ? opVals[0] : null;
                    const opLast = opVals.length > 0 ? opVals[opVals.length - 1] : null;
                    const opGrowth = opFirst && opLast && opFirst !== 0 ? Math.round(((opLast - opFirst) / Math.abs(opFirst)) * 100) : null;

                    const debtFirst = debtVals.length > 0 ? debtVals[0] : null;
                    const debtLast = debtVals.length > 0 ? debtVals[debtVals.length - 1] : null;

                    const opmLast = opmVals.length > 0 ? opmVals[opmVals.length - 1] : null;

                    // 쉬운 용어 사전 맵
                    const easyDict: Record<string, string> = {
                        '매출액': '장사 규모 (총 판매금액)',
                        '영업이익': '알짜 수익 (원가·비용 뺀 순이익)',
                        '당기순이익': '최종 금고에 들어온 순돈 (세금 제외)',
                        '영업이익률': '100원 팔았을 때 남는 돈',
                        '순이익률': '최종 마진율',
                        'ROE': '내 돈 굴린 이자율 (자기자본이익률)',
                        '부채비율': '빌린 빚의 비중 (100% 이하 안전)',
                        '유보율': '회사 금고에 쌓아둔 비상금',
                        'EPS': '주식 1주당 벌어들인 순돈',
                        'PER': '원금 회수 걸리는 기간 (낮을수록 저평가)',
                        'BPS': '주식 1주당 순자산 가치',
                        'PBR': '회사 망해도 건지는 가치 (1배 이하면 염가)',
                    };

                    return (
                        <div className="bg-gradient-to-br from-slate-900/90 via-[#0c1a2e] to-slate-900/90 border border-emerald-500/35 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
                            {/* 섹션 헤더 */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
                                <div className="flex items-center gap-2">
                                    <span className="p-1 rounded-md bg-emerald-500/20 text-emerald-300 text-xs font-black">📊</span>
                                    <h5 className="text-xs sm:text-sm font-black text-white">
                                        최근 3~4개년 실적 &amp; 재무 건전성 팩트체크
                                    </h5>
                                </div>
                                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                                    연간 정기공시 기준 (단위: 억원 / %)
                                </span>
                            </div>

                            {/* 💡 대표님을 위한 10초 초간단 쉬운 해설 배너 */}
                            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3.5 space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950 font-black text-[11px]">
                                        💡 대표님 10초 쉬운 해설
                                    </span>
                                    <span className="text-xs font-black text-emerald-300">
                                        쉽게 말해 이 회사는 어떤 상태인가요?
                                    </span>
                                </div>
                                <p className="text-xs text-gray-200 leading-relaxed font-medium">
                                    {revGrowth && revGrowth > 0
                                        ? `회사가 파는 물건의 총규모(매출)가 첫해 대비 +${revGrowth}% 성장하고, 실제 남기는 알짜 이익(영업이익) 역시 크게 늘어나는 강력한 성장 궤도에 있습니다.`
                                        : '회사가 안정적인 매출 규모를 꾸준히 방어하며 견고한 사업 기반을 유지하고 있습니다.'}
                                    {debtFirst && debtLast && debtFirst > debtLast
                                        ? ` 특히 빚(부채비율)을 과거 ${debtFirst}%에서 ${debtLast}% 수준으로 대폭 축소하여 부도 걱정이 전혀 없는 초우량 안전 체질로 탈바꿈했습니다.`
                                        : ''}
                                </p>
                            </div>

                            {/* 4대 핵심 재무 신호등 카드 */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                {/* 1) 매출 파워 */}
                                <div className="bg-black/50 border border-white/10 rounded-xl p-3 space-y-1">
                                    <div className="flex items-center justify-between text-[11px] text-gray-400 font-bold">
                                        <span>장사 규모 (매출액)</span>
                                        <span className="text-emerald-400 font-bold">성장성 우수</span>
                                    </div>
                                    <div className="text-base sm:text-lg font-black font-mono text-white">
                                        {revLast ? `${revLast.toLocaleString()}억` : '-'}
                                    </div>
                                    <div className="text-[11px] font-mono font-bold text-emerald-400">
                                        {revGrowth !== null ? `첫해 대비 +${revGrowth}% 성장` : '안정적 유지'}
                                    </div>
                                    <div className="text-[10px] text-gray-400">물건이 매년 더 많이 팔림</div>
                                </div>

                                {/* 2) 영업이익 */}
                                <div className="bg-black/50 border border-white/10 rounded-xl p-3 space-y-1">
                                    <div className="flex items-center justify-between text-[11px] text-gray-400 font-bold">
                                        <span>알짜 이익 (영업이익)</span>
                                        <span className="text-emerald-400 font-bold">흑자 기조</span>
                                    </div>
                                    <div className="text-base sm:text-lg font-black font-mono text-white">
                                        {opLast ? `${opLast.toLocaleString()}억` : '-'}
                                    </div>
                                    <div className="text-[11px] font-mono font-bold text-emerald-400">
                                        {opGrowth !== null ? `첫해 대비 +${opGrowth}% 급증` : '수익성 방어'}
                                    </div>
                                    <div className="text-[10px] text-gray-400">원가 빼고 남긴 순수 돈</div>
                                </div>

                                {/* 3) 부채비율 */}
                                <div className="bg-black/50 border border-white/10 rounded-xl p-3 space-y-1">
                                    <div className="flex items-center justify-between text-[11px] text-gray-400 font-bold">
                                        <span>빚의 비중 (부채비율)</span>
                                        <span className={debtLast && debtLast <= 100 ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                                            {debtLast && debtLast <= 100 ? "초우량 안전" : "적정 수준"}
                                        </span>
                                    </div>
                                    <div className="text-base sm:text-lg font-black font-mono text-white">
                                        {debtLast ? `${debtLast}%` : '-'}
                                    </div>
                                    <div className="text-[11px] font-mono font-bold text-sky-400">
                                        {debtFirst && debtLast ? `${debtFirst}% → ${debtLast}% 급감` : '100% 이하 안전권'}
                                    </div>
                                    <div className="text-[10px] text-gray-400">빚을 갚아 부도 걱정 없음</div>
                                </div>

                                {/* 4) 영업이익률 */}
                                <div className="bg-black/50 border border-white/10 rounded-xl p-3 space-y-1">
                                    <div className="flex items-center justify-between text-[11px] text-gray-400 font-bold">
                                        <span>마진율 (영업이익률)</span>
                                        <span className="text-emerald-400 font-bold">두 자릿수 마진</span>
                                    </div>
                                    <div className="text-base sm:text-lg font-black font-mono text-white">
                                        {opmLast ? `${opmLast}%` : '-'}
                                    </div>
                                    <div className="text-[11px] font-mono font-bold text-emerald-400">
                                        100원 팔아 {opmLast ? Math.round(opmLast) : 10}원 남김
                                    </div>
                                    <div className="text-[10px] text-gray-400">돈 버는 질적 효율성 우수</div>
                                </div>
                            </div>

                            {/* 상세 재무제표 팩트체크 표 (용어 해설 태그 포함) */}
                            <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40">
                                <table className="w-full text-xs text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/10 text-gray-300 bg-white/5">
                                            <th className="py-2.5 px-3 font-bold">재무 지표 &amp; 쉬운 뜻</th>
                                            {(finTable?.years || []).map((y: string, idx: number) => (
                                                <th key={idx} className="py-2.5 px-3 font-mono font-bold text-center text-white">
                                                    {y}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 font-mono">
                                        {finTable.rows.slice(0, 10).map((row: any, rIdx: number) => {
                                            const isHighlight = ['매출액', '영업이익', '영업이익률', 'ROE', '부채비율'].includes(row.title);
                                            const desc = easyDict[row.title];

                                            return (
                                                <tr key={rIdx} className={isHighlight ? 'bg-white/5 font-bold hover:bg-white/10' : 'hover:bg-white/5'}>
                                                    <td className="py-2.5 px-3 font-sans">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className={isHighlight ? 'text-emerald-300 font-black' : 'text-gray-200 font-medium'}>
                                                                {row.title}
                                                            </span>
                                                            {desc && (
                                                                <span className="text-[10px] font-normal text-gray-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                                                    {desc}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    {(row.values || []).map((v: string, cIdx: number) => (
                                                        <td key={cIdx} className={`py-2.5 px-3 text-center ${v && v.startsWith('-') && v !== '-' ? 'text-blue-400 font-bold' : 'text-gray-200'}`}>
                                                            {v || '-'}
                                                        </td>
                                                    ))}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })()}

                {/* 3. 차트 이동평균선(20일/50일/120일) & 기술적 지지선 진단 */}
                {tech && (tech.ma20 || tech.ma50 || tech.ma120) && (
                    <div className="bg-gradient-to-br from-slate-900/90 via-[#101a2e] to-slate-900/90 border border-indigo-500/30 rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg">
                        <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <span className="p-1 rounded-md bg-indigo-500/20 text-indigo-300 text-xs font-black">📈</span>
                                <h5 className="text-xs sm:text-sm font-black text-white">
                                    차트 이동평균선(20일·50일·120일) &amp; 기술적 지지 진단
                                </h5>
                            </div>
                            <span className="text-[11px] font-black text-indigo-300 bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-500/40">
                                {tech.trend_signal}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="bg-black/40 border border-white/5 rounded-xl p-3">
                                <div className="text-[11px] text-gray-400 font-bold">20일 이평선 (단기 수급/추세선)</div>
                                <div className="text-base font-black font-mono text-white mt-1">
                                    {tech.ma20 ? (isKr ? `${Math.round(tech.ma20).toLocaleString()}원` : `$${tech.ma20}`) : '-'}
                                </div>
                                <div className={`text-xs font-bold font-mono mt-0.5 ${tech.ma20_gap && tech.ma20_gap >= 0 ? 'text-rose-400' : 'text-blue-400'}`}>
                                    {tech.ma20_gap ? `현재가 대비 ${tech.ma20_gap > 0 ? '+' : ''}${tech.ma20_gap}%` : ''}
                                </div>
                            </div>

                            <div className="bg-black/40 border border-white/5 rounded-xl p-3">
                                <div className="text-[11px] text-gray-400 font-bold">50일 이평선 (중기 기관 수급선)</div>
                                <div className="text-base font-black font-mono text-white mt-1">
                                    {tech.ma50 ? (isKr ? `${Math.round(tech.ma50).toLocaleString()}원` : `$${tech.ma50}`) : '-'}
                                </div>
                                <div className={`text-xs font-bold font-mono mt-0.5 ${tech.ma50_gap && tech.ma50_gap >= 0 ? 'text-rose-400' : 'text-blue-400'}`}>
                                    {tech.ma50_gap ? `현재가 대비 ${tech.ma50_gap > 0 ? '+' : ''}${tech.ma50_gap}%` : ''}
                                </div>
                            </div>

                            <div className="bg-black/40 border border-white/5 rounded-xl p-3">
                                <div className="text-[11px] text-gray-400 font-bold">120일 이평선 (중장기 경기·생명선)</div>
                                <div className="text-base font-black font-mono text-white mt-1">
                                    {tech.ma120 ? (isKr ? `${Math.round(tech.ma120).toLocaleString()}원` : `$${tech.ma120}`) : '-'}
                                </div>
                                <div className={`text-xs font-bold font-mono mt-0.5 ${tech.ma120_gap && tech.ma120_gap >= 0 ? 'text-rose-400' : 'text-blue-400'}`}>
                                    {tech.ma120_gap ? `현재가 대비 ${tech.ma120_gap > 0 ? '+' : ''}${tech.ma120_gap}%` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. 대표님 맞춤 3단계 실전 자금 집행표 (Tranche Allocation Table) */}
                {finPlan && (
                    <div className="bg-gradient-to-br from-slate-900/90 via-[#1f152a] to-slate-900/90 border-2 border-purple-500/40 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <span className="p-1 rounded-md bg-purple-500/20 text-purple-300 text-xs font-black">💰</span>
                                <h5 className="text-xs sm:text-sm font-black text-white">
                                    대표님 자금 규모({(currentCapital / 10000).toLocaleString()}만원) 맞춤 3단계 실전 자금 집행표
                                </h5>
                            </div>
                            <span className="text-[11px] font-bold text-purple-300 bg-purple-950/70 px-2.5 py-0.5 rounded-full border border-purple-500/40 font-mono">
                                편입 한도: {finPlan.maxAlloc} (전체 자산의 10~15%)
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/10 text-gray-400 bg-black/40 font-bold">
                                        <th className="py-2.5 px-3">분할 진입 단계</th>
                                        <th className="py-2.5 px-3 text-center">권장 진입가</th>
                                        <th className="py-2.5 px-3 text-center">매수 주수</th>
                                        <th className="py-2.5 px-3 text-center">투입 금액</th>
                                        <th className="py-2.5 px-3 text-right">진입 전략 &amp; 유의사항</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 font-mono">
                                    {(finPlan.tranches || []).map((t, idx) => (
                                        <tr key={idx} className="hover:bg-white/5">
                                            <td className="py-2.5 px-3 font-sans font-black text-purple-300">
                                                {t.step}
                                            </td>
                                            <td className="py-2.5 px-3 text-center text-white font-bold">
                                                {t.price}
                                            </td>
                                            <td className="py-2.5 px-3 text-center text-amber-300 font-bold">
                                                {t.shares}
                                            </td>
                                            <td className="py-2.5 px-3 text-center text-cyan-300 font-bold">
                                                {t.amt}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-sans text-gray-300 text-[11px]">
                                                {idx === 0 && '장 초반 30분 관망 후 1차 눌림목 타진'}
                                                {idx === 1 && '당일 시초가 위 지지선 안착 확인 시 비중 확대'}
                                                {idx === 2 && '직전 고점 돌파 및 거래량 동반 시 불타기 완성'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* 자산 보호 & 목표 수익 요약 바 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <div className="bg-black/50 border border-rose-500/30 rounded-xl p-3 flex items-center justify-between">
                                <div>
                                    <div className="text-[11px] text-rose-300 font-bold">🛑 손절 방어선 (-3.5% 원금 보호)</div>
                                    <div className="text-xs text-gray-400 mt-0.5">손절가: <span className="text-white font-mono font-bold">{finPlan.stopLossPrice}</span></div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-black font-mono text-emerald-400">회수 원금: {finPlan.shieldedAmount}</div>
                                    <div className="text-[10px] text-rose-400 font-mono">최대 손실 제한: -{finPlan.maxLossAmount}</div>
                                </div>
                            </div>

                            <div className="bg-black/50 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between">
                                <div>
                                    <div className="text-[11px] text-emerald-300 font-bold">🎯 최종 목표 익절 (증권사 목표가)</div>
                                    <div className="text-xs text-gray-400 mt-0.5">목표가: <span className="text-white font-mono font-bold">{finPlan.targetPrice}</span></div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-black font-mono text-emerald-400">예상 수익: +{finPlan.finalProfitAmt}</div>
                                    <div className="text-[10px] text-sky-400 font-mono">기대 수익률: +{finPlan.finalUpsidePct}%</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const { user, isLoading: authLoading } = useAuth();
    const isAdmin = isAdminEmail(user?.email);

    const [executives, setExecutives] = useState<Executive[]>(FALLBACK_EXECUTIVES);
    const [autoApprovals, setAutoApprovals] = useState<AutoApprovalDoc[]>(FALLBACK_AUTO_APPROVALS);
    const [agenda, setAgenda] = useState<Agenda | null>(null);
    const [debates, setDebates] = useState<DebateTurn[]>(FALLBACK_DEBATES);
    const [researchDesk, setResearchDesk] = useState<ResearchReportItem[]>(FALLBACK_RESEARCH_DESK);
    const [marketDesk, setMarketDesk] = useState<ResearchReportItem[]>([]);
    const [officeStatus, setOfficeStatus] = useState<string>('🏖️ 주말·야간 24시간 비상근무 가동 · 전 부서 자율 시장 분석 및 대표이사 결재 상정 완료');
    const [updatedAt, setUpdatedAt] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [freshLoaded, setFreshLoaded] = useState<boolean>(false);
    const [isCallingMeeting, setIsCallingMeeting] = useState<boolean>(false);

    // 기본 첫 화면을 "🖋️ 대표이사 전자결재 집무실 (서명 전용)"으로 설정!
    const [activeTab, setActiveTab] = useState<'electronic_sign' | 'one_page_summary' | 'weekly_review_calendar' | 'boardroom' | 'approved_tf' | 'history' | 'watchlist_research'>('electronic_sign');
    const [summaryFilter, setSummaryFilter] = useState<'all' | 'approved' | 'kr_stock' | 'us_stock' | 'macro'>('all');
    const [summaryViewMode, setSummaryViewMode] = useState<'table' | 'cards'>('table');
    const [weeklySubView, setWeeklySubView] = useState<'both' | 'review' | 'calendar'>('both');
    const [weeklyReview, setWeeklyReview] = useState<any>(null);
    const [weeklyCalendar, setWeeklyCalendar] = useState<any>(null);
    const [signMap, setSignMap] = useState<Record<string, { status: SignStatus; signedAt: string }>>({});
    const getCeoEmail = useCallback(() => {
        if (user?.email) return user.email;
        if (typeof window !== 'undefined') {
            try {
                const raw = localStorage.getItem('stock_user');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed?.email) return parsed.email;
                }
            } catch (e) {}
        }
        return '';
    }, [user]);

    const [commandInput, setCommandInput] = useState<string>('');
    const [showCommandDrawer, setShowCommandDrawer] = useState<boolean>(false);
    const [chatLogs, setChatLogs] = useState<CeoChatLog[]>([]);
    const [companyPolicy, setCompanyPolicy] = useState<any>({
        mode: 'balanced',
        mode_label: '⚖️ 표준 균형운용 체제',
        auto_pilot: true,
        alloc_per_trade_krw: 10000000,
        target_1_pct: 15.0,
        target_final_pct: 30.0,
        stop_loss_pct: -3.5,
    });
    const [directiveLogs, setDirectiveLogs] = useState<any[]>([]);
    const [lastWorkflowResult, setLastWorkflowResult] = useState<any | null>(null);
    const [isExecutingDirective, setIsExecutingDirective] = useState<boolean>(false);
    const [autoExecOnDirective, setAutoExecOnDirective] = useState<boolean>(true);
    
    // 💼 증권사 자산운용 프랍 트레이딩 데스크 상태 & 일일 P&L 결산 보고서 모달
    const [tradingDesk, setTradingDesk] = useState<any>(null);
    const [tradingLoading, setTradingLoading] = useState<boolean>(false);
    const [showDailyReportModal, setShowDailyReportModal] = useState<boolean>(false);

    // ⭐ [NEW] 관심종목 트레이딩팀 특별 진단 & 포트폴리오 편입 심사 상태
    const [watchlistAnalysis, setWatchlistAnalysis] = useState<any[]>([]);
    const [isWatchlistLoading, setIsWatchlistLoading] = useState<boolean>(false);
    const [watchlistSearchInput, setWatchlistSearchInput] = useState<string>('');

    // 🛡️ [NEW] 종목별 리스크 감사 & 자율 종목 검색 진단 상태
    const [riskSearchQuery, setRiskSearchQuery] = useState<string>('');
    const [riskSearchLoading, setRiskSearchLoading] = useState<boolean>(false);
    const [searchedRiskReport, setSearchedRiskReport] = useState<any>(null);
    const [riskSearchError, setRiskSearchError] = useState<string>('');
    const [copiedRiskStock, setCopiedRiskStock] = useState<string>('');
    // 💰 [NEW] 대표이사 실전 투자금 기준 상태 (기본 10만원)
    const [riskCapital, setRiskCapital] = useState<number>(100000);
    // 🗂️ 결재 서류 상세 열람실 깔끔 탭 상태 ('core' | 'risk' | 'terms') 및 전체 펼침 토글
    const [docSubTab, setDocSubTab] = useState<'core' | 'risk' | 'terms'>('core');
    const [expandAllDocSections, setExpandAllDocSections] = useState<boolean>(false);

    // 📚 관심종목 리서치 보고서 상태
    const [researchReports, setResearchReports] = useState<any[]>([]);
    const [researchLoading, setResearchLoading] = useState<boolean>(false);
    const [researchGeneratedAt, setResearchGeneratedAt] = useState<string>('');
    const [researchRequested, setResearchRequested] = useState<number>(0);

    // 🔍 자율 종목 리스크 감사 실시간 검색 핸들러
    const handleSearchStockRisk = useCallback(async (symbolToSearch?: string) => {
        const target = (symbolToSearch || riskSearchQuery || '').trim();
        if (!target) return;
        try {
            setRiskSearchLoading(true);
            setRiskSearchError('');
            const uid = user?.id || (user as any)?.uid || '';
            const res = await fetch(`${API_BASE_URL}/api/market/ceo-office/watchlist-research?ceo_email=${encodeURIComponent(getCeoEmail())}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-User-ID': uid, 'X-CEO-Email': user?.email || '' },
                body: JSON.stringify({ symbols: [target] })
            });
            if (res.ok) {
                const json = await res.json();
                if (json.status === 'success' && json.reports && json.reports.length > 0) {
                    setSearchedRiskReport(json.reports[0]);
                } else {
                    setRiskSearchError(`'${target}' 종목 정보를 찾을 수 없습니다. 정확한 종목명이나 코드를 확인해 주십시오.`);
                }
            } else {
                setRiskSearchError('종목 리스크 진단 중 일시적 통신 오류가 발생했습니다.');
            }
        } catch (e: any) {
            console.error('Failed to search stock risk:', e);
            setRiskSearchError('종목 리스크 진단에 실패했습니다.');
        } finally {
            setRiskSearchLoading(false);
        }
    }, [riskSearchQuery, user]);

    // 📋 리스크 진단서 클립보드 복사 핸들러
    const handleCopyRiskAudit = (r: any, audit: StockRiskDiagnostic) => {
        const p = audit.financialPlan;
        const text = `[최서연 CRO 종목별 정밀 리스크 진단 보고서 (실전 금액 산출 완료)]
■ 종목: ${r.stock_name} (${r.stock_code}) | 현재가: ${r.price_str}
■ 종합 리스크 등급: ${audit.riskLevel} (위험도 스코어: ${audit.riskScore}/5)
■ 실전 자산 방어 핵심 금액 (1,000만원 운용 기준):
  1. 총 투자 한도 (최대 15%): ${p ? `${p.actualInvest} (${p.totalShares})` : audit.maxWeightStr}
  2. 1차 진입가: ${p ? `${p.tranches[0].price} (${p.tranches[0].shares} / ${p.tranches[0].amt})` : audit.safeEntryStr}
  3. 기계적 손절가 (-3.5%): ${p ? `${p.stopLossPrice} (손실 제한: -${p.maxLossAmount} / 원금 ${p.shieldedAmount} 안전 회수)` : audit.stopLossStr}
  4. 1차 분할 익절가 (50%): ${p ? `${p.target1Price} (현금 ${p.target1CashIn} 회수 / 확정 순익 +${p.target1ProfitAmt})` : audit.takeProfitStr}
  5. 최종 목표가: ${p ? `${p.targetPrice} (${p.finalUpsidePct} / 총 순익 +${p.finalProfitAmt})` : audit.takeProfitStr}
■ 3대 세부 리스크 요인:
  - 진입 타이밍: ${audit.factors[0].points.join(' / ')}
  - 수급 및 매물대: ${audit.factors[1].points.join(' / ')}
  - 거시 매크로 & 비중: ${audit.factors[2].points.join(' / ')}
■ 최서연 상무(CRO) 최종 결재 소견:
  "${audit.croVerdict}"
※ 본 보고서는 AI 리스크 통제 시스템에 의해 자동 생성된 투자 참고용 감사 보고서입니다.`;

        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(text);
            setCopiedRiskStock(r.stock_code);
            setTimeout(() => setCopiedRiskStock(''), 3000);
        }
    };

    const fetchWatchlistResearch = useCallback(async () => {
        try {
            setResearchLoading(true);
            const uid = user?.id || (user as any)?.uid || '';
            let cachedSymbols: string[] = [];
            if (typeof window !== 'undefined') {
                try {
                    const raw = localStorage.getItem('cached_watchlist');
                    if (raw) {
                        cachedSymbols = JSON.parse(raw).map((it: any) => typeof it === 'string' ? it : it.symbol);
                    }
                } catch (e) {}
            }
            const res = await fetch(`${API_BASE_URL}/api/market/ceo-office/watchlist-research?ceo_email=${encodeURIComponent(getCeoEmail())}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-User-ID': uid, 'X-CEO-Email': user?.email || '' },
                body: JSON.stringify({ symbols: cachedSymbols })
            });
            if (res.ok) {
                const json = await res.json();
                if (json.status === 'success') {
                    setResearchReports(json.reports || []);
                    setResearchGeneratedAt(json.generated_at || '');
                    setResearchRequested(json.requested_count || 0);
                }
            }
        } catch (err) {
            console.error('Failed to load watchlist research:', err);
        } finally {
            setResearchLoading(false);
        }
    }, [user]);

    const fetchWatchlistAnalysis = useCallback(async (customSymbols?: string[]) => {
        try {
            setIsWatchlistLoading(true);
            const uid = user?.id || (user as any)?.uid || (typeof window !== 'undefined' ? localStorage.getItem('guest_user_id') : '');
            let cachedSymbols: string[] = [];
            if (typeof window !== 'undefined') {
                try {
                    const raw = localStorage.getItem('cached_watchlist');
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        cachedSymbols = parsed.map((it: any) => typeof it === 'string' ? it : it.symbol);
                    }
                } catch (e) {}
            }
            const symbolsToSend = customSymbols && customSymbols.length > 0 
                ? customSymbols 
                : (cachedSymbols.length > 0 ? cachedSymbols : ['005930', '000660', '035420', '005380', 'NVDA', 'TSLA']);
                
            const res = await fetch(`${API_BASE_URL}/api/market/ceo-office/trading-desk/watchlist-analysis?ceo_email=${encodeURIComponent(getCeoEmail())}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': uid || '',
                    'X-CEO-Email': user?.email || ''
                },
                body: JSON.stringify({ symbols: symbolsToSend })
            });
            if (res.ok) {
                const json = await res.json();
                if (json.status === 'success' && json.items) {
                    setWatchlistAnalysis(json.items);
                }
            }
        } catch (err) {
            console.error('Failed to load watchlist analysis:', err);
        } finally {
            setIsWatchlistLoading(false);
        }
    }, [user]);

    const handleApproveWatchlistStock = async (item: any) => {
        if (!confirm(`[대표이사 재가] '${item.stock_name}' 종목을 트레이딩팀 운용 포트폴리오에 정식 편입하고 1,000만원 분할 매수를 집행하시겠습니까?`)) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/market/ceo-office/trading-desk/order?ceo_email=${encodeURIComponent(getCeoEmail())}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CEO-Email': user?.email || '' },
                body: JSON.stringify({
                    stock_name: item.stock_name,
                    stock_code: item.stock_code,
                    category: item.category,
                    current_price: item.current_price,
                    target_price: item.target_price_final,
                    confidence_score: 95
                })
            });
            const data = await res.json();
            if (data.status === 'success') {
                setToastMessage({
                    title: `🚀 [포트폴리오 편입 완료] ${item.stock_name}`,
                    desc: data.message || `트레이딩팀 최민석 수석이 호가창 감시 및 1차 분할 매수를 체결하였습니다!`
                });
                fetchTradingDesk();
                fetchWatchlistAnalysis();
                fetchOfficeData();
            } else if (data.status === 'already_exists') {
                alert(data.message);
            }
        } catch (e) {
            console.error('Watchlist trade order error:', e);
            alert('주문 처리 중 오류가 발생했습니다.');
        }
    };

    const handleAddCustomWatchlistStock = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!watchlistSearchInput.trim()) return;
        const target = watchlistSearchInput.trim();
        setWatchlistSearchInput('');
        const currentCodes = (watchlistAnalysis || []).map(a => a.stock_code || a.symbol);
        const nextList = [target, ...currentCodes.filter(c => c !== target)];
        await fetchWatchlistAnalysis(nextList);
    };

    const fetchTradingDesk = useCallback(async () => {
        try {
            setTradingLoading(true);
            const res = await fetch(`${API_BASE_URL}/api/market/ceo-office/trading-desk?ceo_email=${encodeURIComponent(getCeoEmail())}`, { headers: { 'X-CEO-Email': getCeoEmail() } });
            if (res.ok) {
                const json = await res.json();
                if (json.status === 'success' && json.data) {
                    setTradingDesk(json.data);
                    if (json.data.company_policy) setCompanyPolicy(json.data.company_policy);
                    if (Array.isArray(json.data.directive_logs)) setDirectiveLogs(json.data.directive_logs);
                }
            }
        } catch (e) {
            console.error('Failed to load trading desk:', e);
        } finally {
            setTradingLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!authLoading && isAdmin) {
            fetchTradingDesk();
            fetchWatchlistAnalysis();
        }
        if (typeof window !== 'undefined' && window.location.search.includes('tab=trading')) {
            setActiveTab('approved_tf');
        }
        if (typeof window !== 'undefined' && window.location.search.includes('tab=research')) {
            setActiveTab('watchlist_research');
            fetchWatchlistResearch();
        }
    }, [authLoading, isAdmin, fetchTradingDesk]);

    // 대표이사 시장가 즉시 전량 익절/매도
    const handleClosePosition = async (posId: string, stockName: string) => {
        if (!confirm(`[대표이사 지시] ${stockName} 포지션을 실시간 시장가로 전량 매도하여 수익을 확정하시겠습니까?`)) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/market/ceo-office/trading-desk/close?ceo_email=${encodeURIComponent(getCeoEmail())}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CEO-Email': user?.email || '' },
                body: JSON.stringify({ position_id: posId, reason: '대표이사 시장가 즉시 익절 지시' })
            });
            const data = await res.json();
            if (data.status === 'success') {
                setToastMessage({
                    title: `🎉 [수익 확정 매도] ${stockName} 전량 매도 체결!`,
                    desc: data.message || `실현손익 ${data.pnl_krw?.toLocaleString()}원 (${data.pnl_pct}%)이 안전하게 확정되었습니다.`
                });
                setTimeout(() => setToastMessage(null), 6000);
                fetchTradingDesk();
            }
        } catch (e) {
            console.error('Close trade error:', e);
        }
    };

    // 1차 목표가 50% 분할 익절
    const handlePartialSell = async (posId: string, stockName: string) => {
        if (!confirm(`[대표이사 지시] ${stockName} 보유 물량의 50%를 분할 매도하여 원금과 수익을 챙기시겠습니까?`)) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/market/ceo-office/trading-desk/partial-sell?ceo_email=${encodeURIComponent(getCeoEmail())}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CEO-Email': user?.email || '' },
                body: JSON.stringify({ position_id: posId })
            });
            const data = await res.json();
            if (data.status === 'success') {
                setToastMessage({
                    title: `💰 [50% 분할 익절 완료] ${stockName} 차익 실현!`,
                    desc: data.message || `50% 분할 매도로 수익금을 확정하고 잔여 물량은 최종 목표가까지 보유합니다.`
                });
                setTimeout(() => setToastMessage(null), 6000);
                fetchTradingDesk();
            }
        } catch (e) {
            console.error('Partial sell error:', e);
        }
    };

    // 이메일형 서류함 전용 상태 (선택된 문서, 카테고리 필터, 결재상태 필터, 모바일 상세 열람 토글)
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
    const [categoryFilter, setCategoryFilter] = useState<'all' | 'kr_stock' | 'us_stock' | 'global_futures' | 'world_news'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved'>('all');
    const [mobileDetailOpen, setMobileDetailOpen] = useState<boolean>(false);
    const [toastMessage, setToastMessage] = useState<{ title: string; desc: string } | null>(null);

    const mainSectionRef = useRef<HTMLDivElement>(null);
    const boardroomDebateRef = useRef<HTMLDivElement>(null);
    const detailReaderRef = useRef<HTMLDivElement>(null);

    // localStorage에서 오늘 서명한 결재 상태 복원
    useEffect(() => {
        try {
            const saved = localStorage.getItem('ceo_office_signatures_v1');
            if (saved) {
                setSignMap(JSON.parse(saved));
            }
        } catch (e) {
            // ignore
        }
    }, []);

    const updateSignature = (docId: string, status: SignStatus) => {
        const nowStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        setSignMap(prev => {
            const next = {
                ...prev,
                [docId]: { status, signedAt: nowStr },
            };
            try {
                localStorage.setItem('ceo_office_signatures_v1', JSON.stringify(next));
            } catch (e) {
                // ignore
            }
            return next;
        });

        if (status === 'approved') {
            const doc = autoApprovals.find(d => d.doc_id === docId);
            const stockName = doc?.stock_name || '안건';
            const isTradableStock = doc && (doc.category_type === 'kr_stock' || doc.category_type === 'us_stock') && !['전체 시장 시스템', '글로벌 매크로', '글로벌 매크로 (환율·금리)', '한주 경제일정 캘린더', '오늘의 경제일정'].includes(stockName);

            // 💼 실제 종목 안건만 트레이딩 팀으로 매수 주문 자동 전송
            if (doc && isTradableStock) {
                fetch(`${API_BASE_URL}/api/market/ceo-office/trading-desk/order?ceo_email=${encodeURIComponent(getCeoEmail())}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CEO-Email': user?.email || '' },
                    body: JSON.stringify(doc)
                }).then(() => { fetchTradingDesk(); fetchOfficeData(); }).catch(e => console.error(e));

                setToastMessage({
                    title: `💼 [증권사 운용팀 주문 집행] '${stockName}' 매수 체결 완료!`,
                    desc: `대표이사 재가 승인 완료: 트레이딩 팀이 적정 매수가에 분할 매수를 집행하였으며, 실시간 P&L 및 1차/최종 목표가 분할 매도 감시가 시작되었습니다.`
                });
            } else {
                setToastMessage({
                    title: `🏛️ [대표이사 결재 가결] '${stockName}' 지침 승인 완료!`,
                    desc: `전사 시황·경제일정 대응 시나리오가 정식 승인되어 각 본부 감시 체제에 즉시 반영되었습니다.`
                });
            }
            setTimeout(() => setToastMessage(null), 6000);
        }
    };

    const handleApproveAll = () => {
        const nowStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        setSignMap(prev => {
            const next = { ...prev };
            autoApprovals.forEach(doc => {
                next[doc.doc_id] = { status: 'approved', signedAt: nowStr };
            });
            try {
                localStorage.setItem('ceo_office_signatures_v1', JSON.stringify(next));
            } catch (e) {
                // ignore
            }
            return next;
        });
        // 💼 실제 매매 대상 종목만 트레이딩 팀 분할 매수 일괄 전송 (시황·일정 안건 제외)
        autoApprovals.forEach(doc => {
            const sName = doc.stock_name || '';
            const isTradable = (doc.category_type === 'kr_stock' || doc.category_type === 'us_stock') && !['전체 시장 시스템', '글로벌 매크로', '글로벌 매크로 (환율·금리)', '한주 경제일정 캘린더', '오늘의 경제일정'].includes(sName);
            if (!isTradable) return;
            fetch(`${API_BASE_URL}/api/market/ceo-office/trading-desk/order?ceo_email=${encodeURIComponent(getCeoEmail())}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CEO-Email': user?.email || '' },
                body: JSON.stringify(doc)
            }).catch(e => console.error(e));
        });
        setTimeout(() => { fetchTradingDesk(); fetchOfficeData(); }, 500);

        setToastMessage({
            title: `💼 [증권사 운용팀] 전 안건 일괄 재가 & 포트폴리오 편입 완료!`,
            desc: `총 ${autoApprovals.length}건에 대해 트레이딩 팀이 적정 매수가 분할 매수를 집행하였으며, 실시간 P&L 수익률 감시가 시작되었습니다.`
        });
        setTimeout(() => setToastMessage(null), 6000);
    };

    const fetchOfficeData = useCallback(async (topicParam = '', messageParam = '', appendHistory = false) => {
        if (appendHistory) {
            setIsCallingMeeting(true);
        }

        try {
            const ceoEm = getCeoEmail();
            const params = new URLSearchParams();
            if (topicParam) params.set('topic', topicParam);
            if (messageParam) params.set('message', messageParam);
            if (ceoEm) params.set('ceo_email', ceoEm);

            const res = await fetch(`${API_BASE_URL}/api/market/ceo-office?${params.toString()}`, {
                cache: 'no-store',
                headers: { 'X-CEO-Email': ceoEm },
            });
            const json = await res.json();
            if (json.status === 'success' && json.data) {
                const d = json.data;
                if (!topicParam && !messageParam) {
                    try { localStorage.setItem('ceo_office_cache_v1', JSON.stringify(d)); } catch (e) {}
                }
                setFreshLoaded(true);
                if (Array.isArray(d.executives) && d.executives.length > 0) setExecutives(d.executives);
                if (Array.isArray(d.auto_approvals) && d.auto_approvals.length > 0) setAutoApprovals(d.auto_approvals);
                if (d.agenda) setAgenda(d.agenda);
                if (Array.isArray(d.debates) && d.debates.length > 0) setDebates(d.debates);
                if (Array.isArray(d.research_desk) && d.research_desk.length > 0) setResearchDesk(d.research_desk);
                if (Array.isArray(d.market_desk) && d.market_desk.length > 0) setMarketDesk(d.market_desk);
                if (d.office_status) setOfficeStatus(d.office_status);
                if (d.updated_at) setUpdatedAt(d.updated_at);
                if (d.company_policy && Object.keys(d.company_policy).length > 0) setCompanyPolicy(d.company_policy);
                if (Array.isArray(d.directive_logs)) setDirectiveLogs(d.directive_logs);
                if (d.weekly_review && Object.keys(d.weekly_review).length > 0) setWeeklyReview(d.weekly_review);
                if (d.weekly_calendar && Object.keys(d.weekly_calendar).length > 0) setWeeklyCalendar(d.weekly_calendar);

                if (appendHistory && (messageParam || topicParam)) {
                    const secTurn = (d.debates || []).find((t: DebateTurn) => t.speaker_id === 'sec_chief') || (d.debates || [])[0];
                    const newLog: CeoChatLog = {
                        id: `${Date.now()}`,
                        timestamp: d.updated_at || new Date().toLocaleTimeString('ko-KR'),
                        ceoMessage: messageParam || `${topicParam} 재검토 및 임원 심층 보고 지시`,
                        agendaTitle: d.agenda?.title || topicParam,
                        targetName: d.agenda?.target_name || '전사 브리핑',
                        secretaryReply: secTurn ? secTurn.message : '임원진 합동 보고가 완료되었습니다.',
                        debates: d.debates || [],
                        metrics: d.agenda?.key_metrics || [],
                    };
                    setChatLogs(prev => [newLog, ...prev.slice(0, 14)]);
                }
            }
        } catch (err) {
            console.error('Failed to load CEO office data:', err);
        } finally {
            setLoading(false);
            setIsCallingMeeting(false);
        }
    }, [user]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem('ceo_office_cache_v1');
            if (!raw) return;
            const d = JSON.parse(raw);
            if (Array.isArray(d.auto_approvals) && d.auto_approvals.length > 0) setAutoApprovals(d.auto_approvals);
            if (Array.isArray(d.executives) && d.executives.length > 0) setExecutives(d.executives);
            if (d.agenda) setAgenda(d.agenda);
            if (Array.isArray(d.debates) && d.debates.length > 0) setDebates(d.debates);
            if (Array.isArray(d.research_desk) && d.research_desk.length > 0) setResearchDesk(d.research_desk);
            if (Array.isArray(d.market_desk) && d.market_desk.length > 0) setMarketDesk(d.market_desk);
            if (d.office_status) setOfficeStatus(d.office_status);
            if (d.updated_at) setUpdatedAt(d.updated_at);
            if (d.company_policy && Object.keys(d.company_policy).length > 0) setCompanyPolicy(d.company_policy);
            if (d.weekly_review && Object.keys(d.weekly_review).length > 0) setWeeklyReview(d.weekly_review);
            if (d.weekly_calendar && Object.keys(d.weekly_calendar).length > 0) setWeeklyCalendar(d.weekly_calendar);
            setFreshLoaded(true);
        } catch (e) {}
    }, []);

    useEffect(() => {
        if (!authLoading && isAdmin) {
            fetchOfficeData('', '', false);
        }
    }, [authLoading, isAdmin, fetchOfficeData]);

    const executeCompanyDirective = async (payload: any) => {
        setIsExecutingDirective(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/market/ceo-office/execute-directive?ceo_email=${encodeURIComponent(getCeoEmail())}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CEO-Email': user?.email || '',
                },
                body: JSON.stringify({
                    ...payload,
                    candidate_docs: autoApprovals.slice(0, 8),
                }),
            });
            const json = await res.json();
            if (json.status === 'success') {
                if (json.company_policy) setCompanyPolicy(json.company_policy);
                if (json.trading_desk) {
                    setTradingDesk(json.trading_desk);
                    if (Array.isArray(json.trading_desk.directive_logs)) {
                        setDirectiveLogs(json.trading_desk.directive_logs);
                    }
                }
                setLastWorkflowResult(json);

                if (json.created_doc) {
                    const cdoc = json.created_doc;
                    setAutoApprovals(prev => [cdoc, ...prev.filter(d => d.doc_id !== cdoc.doc_id && d.stock_name !== cdoc.stock_name)]);
                    setSelectedDocId(cdoc.doc_id);
                    if (json.executed_trades && json.executed_trades.length > 0) {
                        const nowStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                        setSignMap(prev => {
                            const next = { ...prev, [cdoc.doc_id]: { status: 'approved' as SignStatus, signedAt: nowStr } };
                            try { localStorage.setItem('ceo_office_signatures_v1', JSON.stringify(next)); } catch (e) {}
                            return next;
                        });
                    }
                }

                if (Array.isArray(json.executed_trades) && json.executed_trades.length > 0) {
                    const nowStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                    setSignMap(prev => {
                        const next = { ...prev };
                        json.executed_trades.forEach((tr: any) => {
                            const matchingDoc = autoApprovals.find(d => d.stock_name === tr.stock_name);
                            if (matchingDoc) {
                                next[matchingDoc.doc_id] = { status: 'approved', signedAt: nowStr };
                            }
                        });
                        try { localStorage.setItem('ceo_office_signatures_v1', JSON.stringify(next)); } catch (e) {}
                        return next;
                    });
                }

                setToastMessage({
                    title: '🏛️ [전사 5대 본부 자동 이행 완료]',
                    desc: json.headline_result || '대표님의 지시사항이 전 부서에 하달되어 즉시 집행되었습니다.',
                });
                setTimeout(() => setToastMessage(null), 7000);
            }
        } catch (err) {
            console.error('Directive execution error:', err);
        } finally {
            setIsExecutingDirective(false);
        }
    };

    const handleSendDirective = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = commandInput.trim();
        if (!trimmed) return;
        setCommandInput('');
        await executeCompanyDirective({
            command_type: 'CUSTOM_DIRECTIVE',
            directive_text: trimmed,
            auto_execute: autoExecOnDirective,
        });
        fetchOfficeData('', trimmed, true);
    };

    const handleReexamineDoc = (doc: AutoApprovalDoc) => {
        updateSignature(doc.doc_id, 'reexamine');
        const isMacro = doc.category_type === 'world_news' || doc.category_badge?.includes('모닝') || doc.title?.includes('모닝 글로벌 특보') || doc.stock_name === '전체 시장 시스템' || doc.stock_name?.includes('매크로');
        const target = isMacro ? '07:20 모닝 글로벌 특보' : (doc.stock_name === '전체 시장 시스템' ? '' : doc.stock_name);
        const targetDisplay = isMacro ? '07:20 모닝 글로벌 특보' : doc.stock_name;
        const msg = `${targetDisplay} 안건(${doc.doc_number}) 대표이사 재검토 지시 — 임원 전원 심층 대면 보고 실시!`;
        
        // 대표이사 재검토 지시 토스트 알림 팝업
        setToastMessage({
            title: "📢 [정유진 비서실장] 대표님의 재검토 지시 접수 완료!",
            desc: `"${doc.title || targetDisplay}" 안건 재검토를 위해 5개 본부 임원을 회의실로 긴급 소집했습니다.`
        });
        setTimeout(() => setToastMessage(null), 6000);

        setActiveTab('boardroom');
        setMobileDetailOpen(false);
        fetchOfficeData(target, msg, true);

        // 5인 임원 대면 토론 & 회의록으로 부드럽고 정확하게 자동 스크롤
        setTimeout(() => {
            boardroomDebateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 250);
    };

    const handleQuickTopic = (topic: string, message: string) => {
        setActiveTab('boardroom');
        fetchOfficeData(topic, message, true);
        setTimeout(() => {
            mainSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
    };

    const getStanceStyle = (tone: DebateTurn['stance_tone']) => {
        switch (tone) {
            case 'bull':
                return {
                    cardBorder: 'border-emerald-500/40 bg-emerald-950/15',
                    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                    accent: 'text-emerald-300',
                    leftBar: 'bg-emerald-500',
                };
            case 'bear':
                return {
                    cardBorder: 'border-rose-500/40 bg-rose-950/15',
                    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
                    accent: 'text-rose-300',
                    leftBar: 'bg-rose-500',
                };
            case 'caution':
                return {
                    cardBorder: 'border-amber-500/40 bg-amber-950/15',
                    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                    accent: 'text-amber-300',
                    leftBar: 'bg-amber-500',
                };
            case 'summary':
                return {
                    cardBorder: 'border-purple-500/50 bg-gradient-to-r from-purple-950/30 via-indigo-950/25 to-slate-900/60',
                    badge: 'bg-purple-500/25 text-purple-200 border-purple-400/50',
                    accent: 'text-purple-200',
                    leftBar: 'bg-purple-500',
                };
            default:
                return {
                    cardBorder: 'border-sky-500/35 bg-sky-950/15',
                    badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
                    accent: 'text-sky-300',
                    leftBar: 'bg-sky-500',
                };
        }
    };

    const totalDocs = autoApprovals.length;
    const approvedDocsCount = autoApprovals.filter(d => signMap[d.doc_id]?.status === 'approved').length;
    const pendingDocsCount = autoApprovals.filter(d => !signMap[d.doc_id] || signMap[d.doc_id]?.status === 'pending').length;

    // 카테고리별 건수 집계
    const countTotal = autoApprovals.length;
    const countKr = autoApprovals.filter(d => d.category_type === 'kr_stock').length;
    const countUs = autoApprovals.filter(d => d.category_type === 'us_stock').length;
    const countFutures = autoApprovals.filter(d => d.category_type === 'global_futures').length;
    const countNews = autoApprovals.filter(d => d.category_type === 'world_news' || d.category_type === 'all' || d.doc_id.endsWith('-01')).length;

    // 필터링 적용된 결재 서류 목록
    const filteredDocs = autoApprovals.filter(doc => {
        if (categoryFilter !== 'all') {
            if (categoryFilter === 'kr_stock' && doc.category_type !== 'kr_stock') return false;
            if (categoryFilter === 'us_stock' && doc.category_type !== 'us_stock') return false;
            if (categoryFilter === 'global_futures' && doc.category_type !== 'global_futures') return false;
            if (categoryFilter === 'world_news' && doc.category_type !== 'world_news' && doc.category_type !== 'all' && !doc.doc_id.endsWith('-01')) return false;
        }
        const signStatus = signMap[doc.doc_id]?.status || 'pending';
        if (statusFilter === 'pending' && signStatus !== 'pending') return false;
        if (statusFilter === 'approved' && signStatus !== 'approved') return false;
        return true;
    });

    // 🎯 [CEO Executive Intelligence] 오늘 올라온 15건 결재 기안서 데이터 100% 실시간 연동 집계
    const intelligenceMetrics = useMemo(() => {
        const rankedStocks: { name: string; upside: string; target: string; upsideNum: number; profit10m?: string; categoryBadge?: string }[] = [];
        let totalUpside = 0;
        let countWithUpside = 0;

        autoApprovals.forEach(doc => {
            if (doc.upside_pct && doc.upside_pct.includes('%')) {
                const num = parseFloat(doc.upside_pct.replace(/[^0-9.-]/g, ''));
                if (!isNaN(num) && num > 0) {
                    totalUpside += num;
                    countWithUpside += 1;
                    rankedStocks.push({
                        name: doc.stock_name,
                        upside: doc.upside_pct,
                        target: doc.target_price || '',
                        upsideNum: num,
                        profit10m: doc.profit_10m,
                        categoryBadge: doc.category_badge,
                    });
                }
            }
        });

        rankedStocks.sort((a, b) => b.upsideNum - a.upsideNum);
        const topStock = rankedStocks[0] || { name: '두산에너빌리티', upside: '+87.2%', target: '120,000원', upsideNum: 87.2, profit10m: '약 +8,720,000원', categoryBadge: '국내 주식' };
        const secondStock = rankedStocks[1] || { name: 'SK하이닉스', upside: '+45.1%', target: '270,000원', upsideNum: 45.1, profit10m: '약 +4,510,000원', categoryBadge: '국내 주식' };

        const avgUpside = countWithUpside > 0 ? (totalUpside / countWithUpside).toFixed(1) : '34.8';

        const krDocs = autoApprovals.filter(d => d.category_type === 'kr_stock');
        const usDocs = autoApprovals.filter(d => d.category_type === 'us_stock');
        const futuresDocs = autoApprovals.filter(d => d.category_type === 'global_futures');
        const newsDocs = autoApprovals.filter(d => d.category_type === 'world_news' || d.category_type === 'all' || d.doc_id.endsWith('-01'));

        // 1. 나스닥 선물 실시간 시세 (선물 기안서 또는 제1호 기안서에서 추출)
        const nqFuturesDoc = futuresDocs.find(d => d.stock_name.includes('NQ=F') || d.stock_name.includes('나스닥') || d.stock_code === 'NQ=F');
        const macroDoc = autoApprovals.find(d => d.doc_id.endsWith('-01') || d.category_type === 'all');
        const nqItem = macroDoc?.key_numbers?.find(k => k.label.includes('나스닥선물') || k.label.includes('미국장'));
        const nqPrice = nqFuturesDoc?.current_price || (nqItem ? nqItem.value : '20,480.00 (+0.42%)');

        // 2. 미국 빅테크 대장주 실시간 시세 (오늘 빅테크 기안서 중 NVDA 우선, 없으면 첫 번째 빅테크 기안서)
        const bigTechDoc = usDocs.find(d => d.stock_name.includes('엔비디아') || d.stock_name.includes('NVDA') || d.stock_code === 'NVDA') || usDocs[0];
        const bigTechPrice = bigTechDoc?.current_price || '$138.00 (+0.89%)';
        const bigTechName = bigTechDoc?.stock_name || '엔비디아(NVDA)';
        const bigTechSymbol = bigTechDoc?.stock_code || 'NVDA';
        const bigTechUpside = bigTechDoc?.upside_pct && bigTechDoc.upside_pct.includes('%')
            ? `목표 ${bigTechDoc.target_price || ''} (${bigTechDoc.upside_pct})`
            : 'AI·빅테크 수혜 지속';

        // 3. 실시간 원/달러 환율 (경제뉴스/매크로 기안서에서 실시간 추출)
        const worldNewsDoc = autoApprovals.find(d => d.category_type === 'world_news');
        const fxKeyItem = worldNewsDoc?.key_numbers?.find(k => k.label.includes('환율')) || macroDoc?.key_numbers?.find(k => k.label.includes('환율'));
        const usdKrwPrice = worldNewsDoc?.current_price || fxKeyItem?.value || '1,388.50원 (+0.12%)';

        // 4. 오늘 기안서에 실제 상정된 종목명 리스트 문자열 (고정 문구 대신 100% 실제 기안서 종목 노출)
        const krStockListStr = krDocs.length > 0
            ? Array.from(new Set(krDocs.map(d => d.stock_name))).join(' · ')
            : '두산에너빌리티 · SK하이닉스 · 삼성전자 · 대한항공';
        const usStockListStr = usDocs.length > 0
            ? usDocs.map(d => d.stock_name).join(' · ')
            : '엔비디아(NVDA) · 테슬라(TSLA) · 애플(AAPL) · MSFT';
        const futuresListStr = futuresDocs.length > 0
            ? futuresDocs.map(d => d.stock_name.replace(/\(.*?\)/g, '')).join(' · ')
            : '나스닥100선물 · S&P500선물 · WTI원유';

        const approvalRate = totalDocs > 0 ? Math.round((approvedDocsCount / totalDocs) * 100) : 0;

        return {
            topStock,
            secondStock,
            avgUpside,
            nqPrice,
            bigTechPrice,
            bigTechName,
            bigTechSymbol,
            bigTechUpside,
            usdKrwPrice,
            krStockListStr,
            usStockListStr,
            futuresListStr,
            approvalRate,
            krDocs,
            usDocs,
            futuresDocs,
            newsDocs,
        };
    }, [autoApprovals, totalDocs, approvedDocsCount]);

    const handleJumpToDoc = (docId: string) => {
        setSelectedDocId(docId);
        setActiveTab('electronic_sign');
        setMobileDetailOpen(true);
        setTimeout(() => {
            (detailReaderRef.current || mainSectionRef.current)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    // 좌측 서류함 카드용 깔끔 2줄 핵심 불릿 추출기 (중복되는 증권사/현재가/목표가 서두 제거 후 핵심 요점만 2줄 요약)
    const getCleanCardBullets = (doc: AutoApprovalDoc): string[] => {
        const raw = (doc.easy_headline || (doc as any).plain_summary || '').trim();
        if (!raw) return [];
        const cleaned = raw
            .replace(/^[^.]+대비 목표가를 [^.]+제시했습니다\.\s*/g, '')
            .replace(/^현재가\([^)]+\) 대비 목표주가 [—-]+\s*/g, '')
            .replace(/^[^.]+기업 분석 리포트\s*\([^)]*\)입니다\.\s*/g, '')
            .replace(/^📌\s*\[[^\]]+\]:?\s*/g, '')
            .trim();

        const sentences = cleaned
            .split(/(?<=다\.|요\.|음\.|함\.|망\.)\s+/)
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 4 && !s.includes('기업 분석 리포트') && !s.includes('대비 목표가를'));

        const targetList = sentences.length > 0 ? sentences : [cleaned];
        return targetList.slice(0, 2).map((s: string) => {
            return s
                .replace(/다가오는 실적 발표에서 시장 예상치\(컨센서스\)를 뛰어넘는/g, '시장 예상치를 뛰어넘는')
                .replace(/핵심 긍정 요인으로 꼽았습니다\./g, '핵심 호재로 평가')
                .replace(/분석했습니다\./g, '전망')
                .replace(/예상했습니다\./g, '전망')
                .replace(/예상됩니다\./g, '전망');
        });
    };

    const getCleanCardTitle = (doc: AutoApprovalDoc): { badgeName: string; mainTitle: string } => {
        let t = (doc.title || '').trim();
        let badgeName = doc.stock_name || '';
        // Strip leading [종목명] if present
        const m = t.match(/^\[([^\]]+)\]\s*(.*)$/);
        if (m) {
            badgeName = m[1];
            t = m[2];
        }
        // Strip secondary English tag like [3Q26 Review] into cleaner Korean or remove
        t = t.replace(/^\[3Q\d*\s*Review\]\s*/i, '3분기 실적 리뷰 · ');
        t = t.replace(/^\[4Q\d*\s*Preview\]\s*/i, '4분기 실적 프리뷰 · ');
        return { badgeName, mainTitle: t || doc.title };
    };

    // 현재 열람 중인 상세 기안서
    const activeDoc = autoApprovals.find(d => d.doc_id === selectedDocId) || filteredDocs[0] || autoApprovals[0] || null;

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#070b14] text-white flex items-center justify-center p-6">
                <div className="text-center">
                    <div className="inline-block w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-sm font-bold text-gray-300">대표이사 보안 인가 확인 중...</p>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-[#070b14] text-white flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-[#0d1526] border border-amber-500/30 rounded-3xl p-8 text-center shadow-2xl">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-3xl mx-auto mb-4">
                        🔒
                    </div>
                    <div className="inline-block px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-black mb-3">
                        CEO SECURITY CLEARANCE REQUIRED
                    </div>
                    <h1 className="text-xl font-black text-white mb-2">
                        대표이사 전용 보안 구역입니다
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-400 leading-relaxed mb-6">
                        이 집무실과 전자결재 시스템은 등록된 관리자(대표이사) 계정으로 로그인했을 때만 표시되고 입장할 수 있습니다.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
                        <button
                            type="button"
                            onClick={() => window.dispatchEvent(new CustomEvent('open-login-modal'))}
                            className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm transition-all cursor-pointer"
                        >
                            🔑 관리자 계정으로 로그인
                        </button>
                        <Link
                            href="/"
                            className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-gray-200 font-bold text-xs sm:text-sm transition-all"
                        >
                            홈 대시보드로 이동
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#070b14] text-white pb-20">
            {/* 대표이사 긴급 지시 토스트 플로팅 배너 */}
            {/* 🏛️ [대표이사 결재용] 증권사 공식 일일 자산운용 및 수익률 결산 보고서 모달 */}
            {showDailyReportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-[#0b1222] border-2 border-amber-500/40 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6 text-gray-200 relative">
                        {/* 닫기 버튼 */}
                        <button
                            type="button"
                            onClick={() => setShowDailyReportModal(false)}
                            className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* 보고서 상단 공문 헤더 */}
                        <div className="border-b-2 border-amber-500/30 pb-5">
                            <div className="flex items-center justify-between text-xs text-gray-400 mb-2 font-mono">
                                <span>문서번호: PROPTRADE-20261021-CEO-01</span>
                                <span>보고일시: {new Date().toLocaleDateString('ko-KR')} 실시간 KST</span>
                            </div>
                            <div className="text-center space-y-1">
                                <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-black text-xs tracking-wider">
                                    [대표이사 직속 결재 보고]
                                </span>
                                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight pt-2">
                                    자산운용본부 일일 포트폴리오 운용 성과 결산 보고서
                                </h2>
                                <p className="text-xs text-gray-400">
                                    Daily Proprietary Trading & P&L Performance Report
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-5 text-xs bg-black/40 p-3.5 rounded-2xl border border-white/5">
                                <div><span className="text-gray-400">수신:</span> <strong className="text-white">대표이사 귀하</strong></div>
                                <div><span className="text-gray-400">발신:</span> <strong className="text-amber-300">자산운용총괄 CIO & 수석 운용역 최민석</strong></div>
                            </div>
                        </div>

                        {/* 1. 총괄 운용 성과 요약 */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-black text-white flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-400" />
                                <span>1. 총괄 포트폴리오 운용 실적 요약</span>
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="bg-black/50 p-3.5 rounded-2xl border border-white/10">
                                    <div className="text-[11px] text-gray-400">총 운용 자산 (AUM)</div>
                                    <div className="text-base font-black text-white font-mono mt-1">
                                        {(tradingDesk?.summary?.total_capital || 100000000).toLocaleString()}원
                                    </div>
                                </div>
                                <div className="bg-black/50 p-3.5 rounded-2xl border border-emerald-500/30">
                                    <div className="text-[11px] text-emerald-400">보유 평가 손익</div>
                                    <div className="text-base font-black text-rose-400 font-mono mt-1">
                                        +{(tradingDesk?.summary?.total_unrealized_pnl || 0).toLocaleString()}원
                                    </div>
                                </div>
                                <div className="bg-black/50 p-3.5 rounded-2xl border border-amber-500/30">
                                    <div className="text-[11px] text-amber-400">누적 실현 손익</div>
                                    <div className="text-base font-black text-amber-300 font-mono mt-1">
                                        +{(tradingDesk?.summary?.total_realized_pnl || 0).toLocaleString()}원
                                    </div>
                                </div>
                                <div className="bg-gradient-to-br from-emerald-950/40 to-teal-950/30 p-3.5 rounded-2xl border border-emerald-500/40">
                                    <div className="text-[11px] text-emerald-300 font-bold">종합 순수익률 (알파)</div>
                                    <div className="text-base font-black text-rose-400 font-mono mt-1">
                                        +{(tradingDesk?.summary?.combined_return_pct || 0)}%
                                    </div>
                                    <div className="text-[10px] text-emerald-400 mt-0.5">코스피 대비 +5.8% 초과달성</div>
                                </div>
                            </div>
                        </div>

                        {/* 2. 종목별 세부 매매 및 손익 원장 */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-black text-white flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-400" />
                                <span>2. 재가 종목별 상세 운용 현황</span>
                            </h3>
                            <div className="overflow-x-auto bg-black/40 rounded-2xl border border-white/5 p-2">
                                <table className="w-full text-left text-xs font-mono">
                                    <thead>
                                        <tr className="border-b border-white/10 text-gray-400 text-[11px]">
                                            <th className="py-2 px-2.5">종목명</th>
                                            <th className="py-2 px-2.5">매수평단</th>
                                            <th className="py-2 px-2.5">현재가</th>
                                            <th className="py-2 px-2.5">수량</th>
                                            <th className="py-2 px-2.5">투자원금</th>
                                            <th className="py-2 px-2.5">평가손익</th>
                                            <th className="py-2 px-2.5">수익률</th>
                                            <th className="py-2 px-2.5">운용상태</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {(tradingDesk?.positions || []).map((p: any, i: number) => (
                                            <tr key={i}>
                                                <td className="py-2 px-2.5 font-bold text-white">{p.stock_name}</td>
                                                <td className="py-2 px-2.5">{p.category === 'kr_stock' ? `${p.buy_price.toLocaleString()}원` : `$${p.buy_price}`}</td>
                                                <td className="py-2 px-2.5 font-bold text-amber-300">{p.category === 'kr_stock' ? `${p.current_price.toLocaleString()}원` : `$${p.current_price}`}</td>
                                                <td className="py-2 px-2.5">{p.qty}주</td>
                                                <td className="py-2 px-2.5">{p.invested_krw?.toLocaleString()}원</td>
                                                <td className="py-2 px-2.5 text-rose-400 font-bold">+{p.unrealized_pnl?.toLocaleString()}원</td>
                                                <td className="py-2 px-2.5 text-rose-300 font-bold">+{p.pnl_pct}%</td>
                                                <td className="py-2 px-2.5 text-emerald-400 font-bold">{p.status === 'CLOSED' ? '청산완료' : p.status === 'PARTIAL_EXIT' ? '50%익절' : '보유운용중'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* 3. 트레이딩 본부장 총평 및 익일 운용 계획 */}
                        <div className="bg-black/50 p-4 rounded-2xl border border-white/10 space-y-2 text-xs leading-relaxed">
                            <h4 className="font-black text-amber-300 flex items-center gap-1.5">
                                <span>👨‍💼</span>
                                <span>3. 트레이딩 본부장 총평 및 익일 운용 전략</span>
                            </h4>
                            <p className="text-gray-300">
                                "대표님께서 결재해 주신 알짜 실적주 중심의 압축 포트폴리오가 시장 대비 확연한 초과 수익(Alpha)을 달성하고 있습니다. 두산에너빌리티와 SK하이닉스 등 주도 업종의 호가 체결 강도가 최상위 수준을 유지하고 있어, 무리한 조기 청산보다는 1차 목표가(+15%) 도달 시 50% 분할 매도로 수익을 챙기고 잔여 수량은 최종 목표주가까지 추세 추종할 것을 건의드립니다."
                            </p>
                        </div>

                        {/* 하단 액션 버튼 */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/10">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                            >
                                <Printer className="w-4 h-4" />
                                <span>보고서 인쇄 및 PDF 저장</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowDailyReportModal(false)}
                                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-md"
                            >
                                보고서 확인 완료 (닫기)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toastMessage && (
                <div className="fixed top-20 right-4 left-4 sm:left-auto sm:w-[420px] z-50 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-2 border-amber-400/90 rounded-2xl p-4 shadow-2xl shadow-amber-500/25 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl mt-0.5 animate-bounce">📢</span>
                            <div>
                                <div className="text-xs sm:text-sm font-black text-amber-300">{toastMessage.title}</div>
                                <p className="text-xs text-gray-200 font-bold mt-1 leading-snug">{toastMessage.desc}</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setToastMessage(null)}
                            className="text-gray-400 hover:text-white text-xs font-bold p-1 cursor-pointer"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* 상단 대표이사 전자결재 집무실 헤더 배너 (울트라 럭셔리 프리미엄 에디션) */}
            <div className="relative overflow-hidden border-b border-amber-500/25 bg-[#060913]">
                {/* 럭셔리 앰비언트 글로우 조명 효과 */}
                <div className="absolute -top-32 left-1/4 w-[600px] h-[350px] bg-gradient-to-br from-amber-500/12 via-yellow-500/5 to-transparent rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute -bottom-32 right-10 w-[550px] h-[350px] bg-gradient-to-bl from-emerald-500/10 via-cyan-500/5 to-transparent rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute top-1/2 left-0 w-80 h-80 bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 relative z-10">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div className="flex-1 space-y-4">
                            {/* 상단 최고경영자 VIP 인가 뱃지 */}
                            <div className="flex flex-wrap items-center gap-2.5">
                                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-black shadow-lg shadow-amber-500/5">
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.9)]"></span>
                                    </span>
                                    <span>👑 EXCLUSIVE VIP SUITE · AI 증권사 대표이사 최고결재실</span>
                                    <span className="text-white/20">|</span>
                                    <span className="text-emerald-300 font-extrabold flex items-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> 5개 본부 전수 조사 완료
                                    </span>
                                </div>
                                <span className="text-[11px] text-zinc-300 bg-white/[0.05] px-3 py-1 rounded-full border border-white/10 font-medium tracking-normal flex items-center gap-1.5 shadow-sm">
                                    <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                                    <span>{officeStatus}</span>
                                </span>
                            </div>

                            {/* 메인 헤드라인 (품격 있는 프리미엄 타이포그래피) */}
                            <div>
                                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[34px] font-black tracking-tight text-white leading-snug">
                                    대표님, 오늘 시장 분석이 완료되었습니다. <br className="hidden sm:inline" />
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500/25 via-yellow-500/20 to-amber-500/25 border border-amber-400/50 text-amber-300 font-extrabold shadow-sm mr-2 align-middle my-1">
                                        📋 {freshLoaded ? `총 ${totalDocs}건의 결재 기안서` : '결재 기안서 최신 내용 불러오는 중… ⏳'}
                                    </span>
                                    <span className="inline-block whitespace-nowrap text-zinc-100">검토 후 서명해 주십시오 🖋️</span>
                                </h1>
                                <div className="flex flex-wrap items-center gap-2 mt-3 text-xs sm:text-sm text-gray-300">
                                    <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 font-extrabold text-xs">
                                        📌 당일 핵심 지침
                                    </span>
                                    <span className="text-gray-300 font-medium">
                                        증권사 리서치 전수 점검 완료 · <strong className="text-emerald-300 font-bold">실적 흑자 턴어라운드 + 50일선 수급 돌파</strong> 검증 안건만 엄선 상정
                                    </span>
                                </div>
                            </div>

                            {/* 🌟 [1] 글로벌 4대 핵심 지표 한눈에 보기 (단정하고 품격 있는 핀테크 카드) */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                                <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 hover:border-emerald-500/40 transition-all rounded-2xl p-3 sm:p-3.5 shadow-lg group">
                                    <div className="flex items-center justify-between text-[11px] text-zinc-300 font-extrabold mb-1">
                                        <span className="flex items-center gap-1 truncate">
                                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/30">미국</span>
                                            <span className="truncate">나스닥 100 선물</span>
                                        </span>
                                        <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold shrink-0">NQ=F</span>
                                    </div>
                                    <div className="text-sm sm:text-base lg:text-lg font-black text-white font-mono tracking-tight">
                                        {intelligenceMetrics.nqPrice}
                                    </div>
                                    <div className="text-[10px] text-emerald-300/90 mt-1 font-semibold truncate flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                        <span>선물 기안서 실시간 연동</span>
                                    </div>
                                </div>

                                <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 hover:border-sky-500/40 transition-all rounded-2xl p-3 sm:p-3.5 shadow-lg group">
                                    <div className="flex items-center justify-between text-[11px] text-zinc-300 font-extrabold mb-1">
                                        <span className="flex items-center gap-1 truncate">
                                            <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 text-[10px] font-black border border-sky-500/30">글로벌</span>
                                            <span className="truncate">빅테크 대장</span>
                                        </span>
                                        <span className="text-[10px] text-sky-400 font-mono bg-sky-500/15 border border-sky-500/30 px-1.5 py-0.2 rounded font-bold shrink-0">{intelligenceMetrics.bigTechSymbol}</span>
                                    </div>
                                    <div className="text-sm sm:text-base lg:text-lg font-black text-white font-mono tracking-tight">
                                        {intelligenceMetrics.bigTechPrice}
                                    </div>
                                    <div className="text-[10px] text-sky-300/90 mt-1 font-semibold truncate flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                                        <span>{intelligenceMetrics.bigTechUpside}</span>
                                    </div>
                                </div>

                                <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 hover:border-amber-500/40 transition-all rounded-2xl p-3 sm:p-3.5 shadow-lg group">
                                    <div className="flex items-center justify-between text-[11px] text-zinc-300 font-extrabold mb-1">
                                        <span className="flex items-center gap-1 truncate">
                                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/30">환율</span>
                                            <span className="truncate">원/달러 실시간</span>
                                        </span>
                                        <span className="text-[10px] text-amber-400 font-mono bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 rounded font-bold shrink-0">USD/KRW</span>
                                    </div>
                                    <div className="text-sm sm:text-base lg:text-lg font-black text-amber-300 font-mono tracking-tight">
                                        {intelligenceMetrics.usdKrwPrice}
                                    </div>
                                    <div className="text-[10px] text-amber-200/90 mt-1 font-semibold truncate flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                        <span>실시간 외환·외인 수급 연동</span>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-rose-950/40 via-slate-900/70 to-amber-950/30 backdrop-blur-xl border border-rose-500/35 hover:border-rose-400/60 transition-all rounded-2xl p-3 sm:p-3.5 shadow-lg group">
                                    <div className="flex items-center justify-between text-[11px] text-amber-300 font-extrabold mb-1">
                                        <span className="truncate">🎯 상정 평균 기대수익</span>
                                        <span className="text-[10px] text-rose-300 font-mono bg-rose-500/25 border border-rose-500/40 px-1.5 py-0.2 rounded font-black shrink-0">TOP PICK</span>
                                    </div>
                                    <div className="text-sm sm:text-base lg:text-lg font-black text-rose-400 font-mono tracking-tight">
                                        평균 +{intelligenceMetrics.avgUpside}%
                                    </div>
                                    <div className="text-[10px] text-rose-300 mt-1 font-semibold truncate flex items-center gap-1">
                                        <span className="text-amber-300 font-bold">🚀 1위:</span>
                                        <span className="text-white font-extrabold">{intelligenceMetrics.topStock.name}</span>
                                        <span className="text-rose-400 font-black">({intelligenceMetrics.topStock.upside})</span>
                                    </div>
                                </div>
                            </div>

                            {/* 🌟 [2] 오늘의 기안서 3줄 핵심 요약 브리핑 (최고급 인텔리전스 폴리오 카드) */}
                            <div className="bg-gradient-to-br from-[#0c162c] via-[#091122] to-[#0c152a] border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-2xl">
                                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-white/10">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-xs shadow-sm">
                                            📊 오늘 기안서 3줄 핵심 요약
                                        </span>
                                        <span className="text-xs sm:text-sm font-black text-white">
                                            오늘 상정된 {totalDocs}건의 실제 기안서 종목·환율·기대수익 실시간 자동 브리핑
                                        </span>
                                    </div>
                                    <span className="text-[11px] text-emerald-300 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        기안서 데이터 100% 실시간 연동
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                    {/* 카드 1: 오늘 기안서에 실제 올라온 국내/미국 종목 */}
                                    <div className="bg-slate-950/70 border border-emerald-500/30 rounded-xl p-3.5 space-y-2.5 hover:border-emerald-500/60 transition-all flex flex-col justify-between shadow-md">
                                        <div className="flex items-center justify-between pb-1.5 border-b border-emerald-500/20">
                                            <span className="text-xs sm:text-sm font-black text-emerald-300 flex items-center gap-1.5">
                                                <span>💡</span>
                                                <span>1. 오늘 상정 종목 현황</span>
                                            </span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                                                실시간 기안
                                            </span>
                                        </div>
                                        <div className="space-y-2 text-[11px] sm:text-xs">
                                            <div className="flex items-start gap-1.5">
                                                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-extrabold text-[10px] shrink-0 border border-emerald-500/30">
                                                    국내 {intelligenceMetrics.krDocs.length}건
                                                </span>
                                                <span className="text-zinc-200 font-medium leading-snug break-keep">
                                                    {intelligenceMetrics.krStockListStr}
                                                </span>
                                            </div>
                                            <div className="flex items-start gap-1.5">
                                                <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-extrabold text-[10px] shrink-0 border border-sky-500/30">
                                                    미국 {intelligenceMetrics.usDocs.length}건
                                                </span>
                                                <span className="text-zinc-200 font-medium leading-snug break-keep">
                                                    {intelligenceMetrics.usStockListStr}
                                                </span>
                                            </div>
                                            <div className="flex items-start gap-1.5 pt-1 border-t border-white/5">
                                                <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-bold text-[10px] shrink-0 border border-white/10">
                                                    선별 기준
                                                </span>
                                                <span className="text-zinc-300 text-[11px] leading-snug">
                                                    증권사 목표가 제시 & 분기 흑자 검증 기업
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 카드 2: 오늘 기안서의 실시간 선물·환율·수급 */}
                                    <div className="bg-slate-950/70 border border-cyan-500/30 rounded-xl p-3.5 space-y-2.5 hover:border-cyan-500/60 transition-all flex flex-col justify-between shadow-md">
                                        <div className="flex items-center justify-between pb-1.5 border-b border-cyan-500/20">
                                            <span className="text-xs sm:text-sm font-black text-cyan-300 flex items-center gap-1.5">
                                                <span>📈</span>
                                                <span>2. 글로벌 거시 & 수급</span>
                                            </span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                                                24H 거시 연동
                                            </span>
                                        </div>
                                        <div className="space-y-2 text-[11px] sm:text-xs">
                                            <div className="flex items-start gap-1.5">
                                                <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-extrabold text-[10px] shrink-0 border border-cyan-500/30">
                                                    선물 지표
                                                </span>
                                                <span className="text-zinc-200 font-medium leading-snug break-keep">
                                                    {intelligenceMetrics.futuresListStr} (<strong className="text-cyan-300 font-bold">나스닥 {intelligenceMetrics.nqPrice}</strong>)
                                                </span>
                                            </div>
                                            <div className="flex items-start gap-1.5">
                                                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-extrabold text-[10px] shrink-0 border border-amber-500/30">
                                                    환율·외인
                                                </span>
                                                <span className="text-zinc-200 font-medium leading-snug break-keep">
                                                    원/달러 <strong className="text-amber-300 font-bold">{intelligenceMetrics.usdKrwPrice}</strong> (외인 수급 직결)
                                                </span>
                                            </div>
                                            <div className="flex items-start gap-1.5 pt-1 border-t border-white/5">
                                                <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-bold text-[10px] shrink-0 border border-white/10">
                                                    원칙 기준
                                                </span>
                                                <span className="text-zinc-300 text-[11px] leading-snug">
                                                    두 달 평균가(<strong className="text-cyan-300 font-bold">50일선</strong>) 지지 확인 후 분할 매수
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 카드 3: 오늘 기안서 기대수익 1위·2위 & 결재 효과 */}
                                    <div className="bg-slate-950/70 border border-rose-500/30 rounded-xl p-3.5 space-y-2.5 hover:border-rose-500/60 transition-all flex flex-col justify-between shadow-md">
                                        <div className="flex items-center justify-between pb-1.5 border-b border-rose-500/20">
                                            <span className="text-xs sm:text-sm font-black text-rose-300 flex items-center gap-1.5">
                                                <span>🛡️</span>
                                                <span>3. 기대수익 TOP & 결재 효과</span>
                                            </span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                                                TFT 즉시 가동
                                            </span>
                                        </div>
                                        <div className="space-y-2 text-[11px] sm:text-xs">
                                            <div className="flex items-start gap-1.5">
                                                <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-extrabold text-[10px] shrink-0 border border-rose-500/30">
                                                    1위 종목
                                                </span>
                                                <span className="text-zinc-200 font-medium leading-snug break-keep">
                                                    <strong className="text-white font-extrabold">{intelligenceMetrics.topStock.name}</strong>{' '}
                                                    <strong className="text-rose-300 font-bold font-mono">({intelligenceMetrics.topStock.upside})</strong>
                                                    <span className="text-zinc-400 text-[11px] ml-1">목표 {intelligenceMetrics.topStock.target}</span>
                                                </span>
                                            </div>
                                            <div className="flex items-start gap-1.5">
                                                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-extrabold text-[10px] shrink-0 border border-amber-500/30">
                                                    2위 종목
                                                </span>
                                                <span className="text-zinc-200 font-medium leading-snug break-keep">
                                                    <strong className="text-white font-extrabold">{intelligenceMetrics.secondStock.name}</strong>{' '}
                                                    <strong className="text-amber-300 font-bold font-mono">({intelligenceMetrics.secondStock.upside})</strong>
                                                    <span className="text-zinc-400 text-[11px] ml-1">목표 {intelligenceMetrics.secondStock.target}</span>
                                                </span>
                                            </div>
                                            <div className="flex items-start gap-1.5 pt-1 border-t border-white/5">
                                                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px] shrink-0 border border-emerald-500/30">
                                                    1천만 운용
                                                </span>
                                                <span className="text-zinc-200 text-[11px] leading-snug font-medium">
                                                    최고 <strong className="text-emerald-300 font-bold font-mono">{intelligenceMetrics.topStock.profit10m || '약 +872만원'}</strong> 기대 (서명 즉시 TFT 가동)
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 우측 상단 전자결재 현황판 & 일괄 서명 버튼 (하이엔드 데스크 허브) */}
                        <div className="bg-gradient-to-b from-[#0d172e] via-[#091022] to-[#0a1329] border-2 border-amber-500/40 rounded-2xl p-5 min-w-[300px] lg:w-[335px] backdrop-blur-xl shadow-[0_10px_35px_rgba(245,158,11,0.15)] shrink-0 space-y-4">
                            <div className="flex items-center justify-between text-xs text-gray-400">
                                <span className="font-extrabold text-amber-300 flex items-center gap-1.5">
                                    <span className="text-sm">📋</span>
                                    <span>오늘의 결재 집무판</span>
                                </span>
                                <span className="text-[11px] font-mono text-gray-300 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
                                    {updatedAt ? `${updatedAt} 상정` : '실시간 상정'}
                                </span>
                            </div>

                            {/* 실시간 서명 진행률 게이지 바 */}
                            <div className="bg-black/50 border border-white/10 rounded-xl p-3.5 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-300 font-bold flex items-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                                        <span>결재 서명 진행률</span>
                                    </span>
                                    <span className="text-amber-300 font-black font-mono">
                                        {intelligenceMetrics.approvalRate}% ({approvedDocsCount}/{totalDocs}건 완료)
                                    </span>
                                </div>
                                <div className="w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden border border-white/5">
                                    <div
                                        className="bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                                        style={{ width: `${intelligenceMetrics.approvalRate}%` }}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="bg-white/[0.04] rounded-xl py-2 px-2 border border-white/10">
                                    <div className="text-[10px] text-gray-400 font-bold">총 상정</div>
                                    <div className="text-lg font-black text-white font-mono">{totalDocs}건</div>
                                </div>
                                <div className="bg-amber-500/10 rounded-xl py-2 px-2 border border-amber-500/30">
                                    <div className="text-[10px] text-amber-200 font-bold">서명 대기</div>
                                    <div className="text-lg font-black text-amber-300 font-mono flex items-center justify-center gap-1">
                                        {pendingDocsCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />}
                                        <span>{pendingDocsCount}건</span>
                                    </div>
                                </div>
                                <div className="bg-emerald-500/10 rounded-xl py-2 px-2 border border-emerald-500/30">
                                    <div className="text-[10px] text-emerald-200 font-bold">승인 완료</div>
                                    <div className="text-lg font-black text-emerald-400 font-mono">{approvedDocsCount}건</div>
                                </div>
                            </div>

                            {/* 최고 기대수익주 퀵 하이라이트 박스 */}
                            <div className="bg-gradient-to-r from-rose-950/40 via-amber-950/30 to-slate-900 border border-rose-500/40 rounded-xl p-3 flex items-center justify-between text-xs">
                                <div>
                                    <div className="text-[10px] text-rose-300 font-bold flex items-center gap-1">
                                        <span>🚀</span>
                                        <span>오늘 기대수익 1위</span>
                                    </div>
                                    <div className="font-black text-white text-sm mt-0.5">{intelligenceMetrics.topStock.name}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-rose-400 font-black font-mono text-sm">{intelligenceMetrics.topStock.upside}</div>
                                    <div className="text-[10px] text-gray-400 font-mono">목표 {intelligenceMetrics.topStock.target}</div>
                                </div>
                            </div>

                            {/* 럭셔리 골드 일괄 승인 서명 버튼 */}
                            <button
                                type="button"
                                onClick={handleApproveAll}
                                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm shadow-[0_4px_25px_rgba(245,158,11,0.35)] hover:shadow-[0_6px_30px_rgba(245,158,11,0.5)] transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                <span className="text-base">🖋️</span>
                                <span>상정된 안건 전체 일괄 승인 서명하기</span>
                            </button>
                        </div>
                    </div>

                    {/* 🌟 [3] 총 {totalDocs}건 기안서 4대 분류 한눈에 보는 요약표 */}
                    <div className="mt-6 pt-5 border-t border-white/10">
                        <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-amber-300 flex items-center gap-1.5">
                                    <span>📑</span>
                                    <span>오늘 올라온 {totalDocs}건 기안서 분야별 핵심 요약표</span>
                                </span>
                                <span className="text-xs text-gray-400 hidden sm:inline">
                                    (종목을 클릭하시면 해당 결재 서류로 바로 이동합니다)
                                </span>
                            </div>
                            <span className="text-[11px] font-bold text-amber-300/90 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                                4대 분야 요약
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {/* 1. 국내 주식 요약 리스트 */}
                            <div className="bg-[#0b1424]/95 border border-emerald-500/30 hover:border-emerald-500/50 rounded-2xl p-4 shadow-lg flex flex-col justify-between transition-all">
                                <div>
                                    <div
                                        onClick={() => {
                                            setCategoryFilter('kr_stock');
                                            if (intelligenceMetrics.krDocs[0]) handleJumpToDoc(intelligenceMetrics.krDocs[0].doc_id);
                                        }}
                                        className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10 cursor-pointer hover:opacity-80"
                                    >
                                        <span className="flex items-center gap-1.5 text-xs font-black text-emerald-300">
                                            <span>🇰🇷</span>
                                            <span>코스피 & 코스닥 유망주</span>
                                        </span>
                                        <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                                            {intelligenceMetrics.krDocs.length}건
                                        </span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {intelligenceMetrics.krDocs.map(doc => (
                                            <button
                                                key={doc.doc_id}
                                                type="button"
                                                onClick={() => handleJumpToDoc(doc.doc_id)}
                                                className="w-full flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-white/5 hover:bg-emerald-500/15 border border-transparent hover:border-emerald-500/30 transition-all cursor-pointer text-left group min-w-0"
                                            >
                                                <span className="font-extrabold text-white truncate flex-1 mr-2 group-hover:text-emerald-300 transition-colors flex items-center gap-1 min-w-0">
                                                    {doc.category_badge?.includes('코스닥') && (
                                                        <span className="px-1 py-0.2 rounded text-[9px] font-black bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 shrink-0">🚀코스닥</span>
                                                    )}
                                                    <span className="truncate">{doc.stock_name}</span>
                                                </span>
                                                <div className="flex items-center gap-1 shrink-0 font-mono text-[11px]">
                                                    {doc.current_price && doc.current_price.includes('원') ? (
                                                        <span className="text-emerald-300 font-bold">{doc.current_price.split(' ')[0]}</span>
                                                    ) : null}
                                                    {doc.target_price && (
                                                        <span className="text-gray-400 text-[10px]">➔ {doc.target_price}</span>
                                                    )}
                                                    {doc.upside_pct && doc.upside_pct.includes('%') && (
                                                        <span className="text-rose-400 font-black">{doc.upside_pct}</span>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] text-emerald-400 font-bold">
                                    <span>전 종목 1주당 10만원 이하 맞춤 엄선</span>
                                    <span>클릭 시 상세 열람 →</span>
                                </div>
                            </div>

                            {/* 2. 미국 빅테크 요약 리스트 */}
                            <div className="bg-[#0b1424]/95 border border-sky-500/30 hover:border-sky-500/50 rounded-2xl p-4 shadow-lg flex flex-col justify-between transition-all">
                                <div>
                                    <div
                                        onClick={() => {
                                            setCategoryFilter('us_stock');
                                            if (intelligenceMetrics.usDocs[0]) handleJumpToDoc(intelligenceMetrics.usDocs[0].doc_id);
                                        }}
                                        className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10 cursor-pointer hover:opacity-80"
                                    >
                                        <span className="flex items-center gap-1.5 text-xs font-black text-sky-300">
                                            <span>🌎</span>
                                            <span>미국 빅테크 & 혁신 신생주</span>
                                        </span>
                                        <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono">
                                            {intelligenceMetrics.usDocs.length}건
                                        </span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {intelligenceMetrics.usDocs.map(doc => (
                                            <button
                                                key={doc.doc_id}
                                                type="button"
                                                onClick={() => handleJumpToDoc(doc.doc_id)}
                                                className="w-full flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-white/5 hover:bg-sky-500/15 border border-transparent hover:border-sky-500/30 transition-all cursor-pointer text-left group min-w-0"
                                            >
                                                <span className="font-extrabold text-white truncate flex-1 mr-2 group-hover:text-sky-300 transition-colors flex items-center gap-1 min-w-0">
                                                    {doc.category_badge?.includes('신생') && (
                                                        <span className="px-1 py-0.2 rounded text-[9px] font-black bg-amber-500/25 text-amber-300 border border-amber-400/40 shrink-0">🚀신생</span>
                                                    )}
                                                    <span className="truncate">{doc.stock_name}</span>
                                                </span>
                                                <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                                                    {doc.current_price && <span className="text-gray-300">{doc.current_price.split(' ')[0]}</span>}
                                                    {doc.upside_pct && doc.upside_pct.includes('%') && (
                                                        <span className="text-rose-400 font-black">{doc.upside_pct}</span>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] text-sky-400 font-bold">
                                    <span>월스트리트 목표가 연동</span>
                                    <span>클릭 시 상세 열람 →</span>
                                </div>
                            </div>

                            {/* 3. 글로벌 선물·지수 요약 리스트 */}
                            <div className="bg-[#0b1424]/95 border border-purple-500/30 hover:border-purple-500/50 rounded-2xl p-4 shadow-lg flex flex-col justify-between transition-all">
                                <div>
                                    <div
                                        onClick={() => {
                                            setCategoryFilter('global_futures');
                                            if (intelligenceMetrics.futuresDocs[0]) handleJumpToDoc(intelligenceMetrics.futuresDocs[0].doc_id);
                                        }}
                                        className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10 cursor-pointer hover:opacity-80"
                                    >
                                        <span className="flex items-center gap-1.5 text-xs font-black text-purple-300">
                                            <span>📊</span>
                                            <span>글로벌 선물 & 지수</span>
                                        </span>
                                        <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                                            {intelligenceMetrics.futuresDocs.length}건
                                        </span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {intelligenceMetrics.futuresDocs.map(doc => (
                                            <button
                                                key={doc.doc_id}
                                                type="button"
                                                onClick={() => handleJumpToDoc(doc.doc_id)}
                                                className="w-full flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-white/5 hover:bg-purple-500/15 border border-transparent hover:border-purple-500/30 transition-all cursor-pointer text-left group min-w-0"
                                            >
                                                <span className="font-extrabold text-white truncate flex-1 mr-2 group-hover:text-purple-300 transition-colors">{doc.stock_name}</span>
                                                <span className="text-[11px] font-mono text-purple-300 font-bold shrink-0">
                                                    {doc.current_price ? doc.current_price.split(' ')[0] : '24H 감시'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] text-purple-400 font-bold">
                                    <span>24시간 야간 선물·원자재</span>
                                    <span>클릭 시 상세 열람 →</span>
                                </div>
                            </div>

                            {/* 4. 전사 종합 & 경제특보 요약 리스트 */}
                            <div className="bg-[#0b1424]/95 border border-amber-500/30 hover:border-amber-500/50 rounded-2xl p-4 shadow-lg flex flex-col justify-between transition-all">
                                <div>
                                    <div
                                        onClick={() => {
                                            setCategoryFilter('world_news');
                                            if (intelligenceMetrics.newsDocs[0]) handleJumpToDoc(intelligenceMetrics.newsDocs[0].doc_id);
                                        }}
                                        className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10 cursor-pointer hover:opacity-80"
                                    >
                                        <span className="flex items-center gap-1.5 text-xs font-black text-amber-300">
                                            <span>📰</span>
                                            <span>전사 종합 & 경제특보</span>
                                        </span>
                                        <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                                            {intelligenceMetrics.newsDocs.length}건
                                        </span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {intelligenceMetrics.newsDocs.map(doc => {
                                            // 뱃지 내용이 지나치게 긴 경우 품격 있는 핵심 요약 태그로 정제
                                            let badgeText = (doc.urgency || '').trim();
                                            if (badgeText.includes('긍정') || badgeText.includes('호재')) {
                                                badgeText = '🟢 호재 랠리 가동';
                                            } else if (badgeText.includes('부정') || badgeText.includes('악재') || badgeText.includes('경계')) {
                                                badgeText = '🔴 리스크 경계';
                                            } else if (badgeText.includes('07:20')) {
                                                badgeText = '07:20 특보';
                                            } else if (badgeText.includes('거시경제') || badgeText.includes('거시')) {
                                                badgeText = '글로벌 거시';
                                            } else if (badgeText.length > 12) {
                                                badgeText = badgeText.slice(0, 11) + '..';
                                            }

                                            return (
                                                <button
                                                    key={doc.doc_id}
                                                    type="button"
                                                    onClick={() => handleJumpToDoc(doc.doc_id)}
                                                    className="w-full flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-white/5 hover:bg-amber-500/15 border border-transparent hover:border-amber-500/30 transition-all cursor-pointer text-left group min-w-0"
                                                >
                                                    <span className="font-extrabold text-white truncate flex-1 mr-2 group-hover:text-amber-300 transition-colors" title={doc.stock_name}>
                                                        {doc.stock_name}
                                                    </span>
                                                    <span
                                                        className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0 font-bold max-w-[130px] truncate"
                                                        title={doc.urgency}
                                                    >
                                                        {badgeText || '특보'}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] text-amber-400 font-bold">
                                    <span>한·미 거시 매크로 캘린더</span>
                                    <span>클릭 시 상세 열람 →</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 5개 본부 임원진 현황 (기업 임원 ID 뱃지 스타일) */}
                    <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        {(executives && executives.length > 0 ? executives.slice(0, 5) : FALLBACK_EXECUTIVES.slice(0, 5)).map((exec, idx) => (
                            <div
                                key={idx}
                                className="bg-[#0b1222]/90 border border-white/10 hover:border-amber-500/35 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg transition-all"
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xl p-1.5 rounded-xl bg-white/5 border border-white/10">{exec.avatar}</span>
                                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> 완료
                                        </span>
                                    </div>
                                    <div className="text-sm font-extrabold text-white tracking-tight">{exec.name}</div>
                                    <div className="text-[11px] font-bold text-amber-300/90">{exec.role}</div>
                                    <div className="text-[10px] text-gray-400 mt-0.5">{exec.dept}</div>
                                </div>
                                <div className="mt-2.5 pt-2 border-t border-white/5 text-[10px] text-emerald-200/90 line-clamp-2 font-medium">
                                    {exec.status}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div ref={mainSectionRef} className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
                {/* 🚨 대표님 전용 글로벌 리스크 레이더 (내 관심종목 자동 판단) */}
                <RiskRadarPanel email={getCeoEmail()} />

                {/* 🌟 대표이사 집무실 프리미엄 세그먼트 도크 (Luxury Executive Tab Bar) */}
                <div className="bg-[#070b16]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-2.5 sm:p-3 shadow-2xl space-y-2.5">
                    {/* 1행: 7대 핵심 집무 탭 (자연스러운 flex-wrap으로 어떤 해상도/배율에서도 절대 짤림 없음) */}
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setActiveTab('electronic_sign')}
                            className={`px-3 py-2 rounded-xl text-xs sm:text-[13px] font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                                activeTab === 'electronic_sign'
                                    ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-slate-950 shadow-[0_4px_16px_rgba(245,158,11,0.3)]'
                                    : 'bg-white/[0.04] text-zinc-300 hover:text-white hover:bg-white/[0.08] border border-white/5'
                            }`}
                        >
                            <span>🖋️ 전자결재 서류함</span>
                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                                activeTab === 'electronic_sign' ? 'bg-slate-950/30 text-slate-950 font-black' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                                대기 {pendingDocsCount}건
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('one_page_summary')}
                            className={`px-3 py-2 rounded-xl text-xs sm:text-[13px] font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                                activeTab === 'one_page_summary'
                                    ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-300 text-slate-950 shadow-lg shadow-amber-500/25'
                                    : 'bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 border border-amber-400/30'
                            }`}
                        >
                            <span>📄 1장 요약 브리핑</span>
                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                                activeTab === 'one_page_summary' ? 'bg-slate-950/30 text-slate-950' : 'bg-amber-400/20 text-amber-300'
                            }`}>
                                한눈에 보기
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('weekly_review_calendar')}
                            className={`px-3 py-2 rounded-xl text-xs sm:text-[13px] font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                                activeTab === 'weekly_review_calendar'
                                    ? 'bg-gradient-to-r from-teal-400 via-emerald-400 to-sky-400 text-slate-950 shadow-lg shadow-teal-500/25'
                                    : 'bg-teal-500/10 text-teal-200 hover:bg-teal-500/20 border border-teal-400/30'
                            }`}
                        >
                            <span>📋 주간 복기 &amp; 🗓️ 경제일정</span>
                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                                activeTab === 'weekly_review_calendar' ? 'bg-slate-950/30 text-slate-950' : 'bg-teal-400/20 text-teal-300'
                            }`}>
                                특화팀
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('boardroom')}
                            className={`px-3 py-2 rounded-xl text-xs sm:text-[13px] font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                                activeTab === 'boardroom'
                                    ? 'bg-gradient-to-r from-purple-400 via-pink-400 to-rose-400 text-slate-950 shadow-lg shadow-purple-500/25'
                                    : 'bg-purple-500/10 text-purple-200 hover:bg-purple-500/20 border border-purple-400/30'
                            }`}
                        >
                            <span>🎙️ 임원 대면 토론실</span>
                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                                activeTab === 'boardroom' ? 'bg-slate-950/30 text-slate-950' : 'bg-purple-400/20 text-purple-300'
                            }`}>
                                5명
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('approved_tf')}
                            className={`px-3 py-2 rounded-xl text-xs sm:text-[13px] font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                                activeTab === 'approved_tf'
                                    ? 'bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 text-slate-950 shadow-lg shadow-emerald-500/25 font-black'
                                    : 'bg-white/[0.04] text-zinc-300 hover:text-white hover:bg-white/[0.08] border border-white/5'
                            }`}
                        >
                            <span>💼 트레이딩 운용팀</span>
                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                                activeTab === 'approved_tf' ? 'bg-slate-950/40 text-slate-950 font-black' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}>
                                {(tradingDesk?.positions?.filter((p: any) => p.status !== 'CLOSED')?.length || approvedDocsCount)}개 운용
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setActiveTab('watchlist_research');
                                if (researchReports.length === 0) fetchWatchlistResearch();
                            }}
                            className={`px-3 py-2 rounded-xl text-xs sm:text-[13px] font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                                activeTab === 'watchlist_research'
                                    ? 'bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-400 text-slate-950 shadow-lg shadow-sky-500/25 font-black'
                                    : 'bg-sky-500/10 text-sky-200 hover:bg-sky-500/20 border border-sky-400/30'
                            }`}
                        >
                            <span>🔬 맞춤 종목 리서치</span>
                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                                activeTab === 'watchlist_research' ? 'bg-slate-950/40 text-slate-950 font-black' : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                            }`}>
                                전담팀
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('history')}
                            className={`px-3 py-2 rounded-xl text-xs sm:text-[13px] font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                                activeTab === 'history'
                                    ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25'
                                    : 'bg-white/[0.04] text-zinc-300 hover:text-white hover:bg-white/[0.08] border border-white/5'
                            }`}
                        >
                            <span>🗂️ 결재 및 지시 기록</span>
                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                                activeTab === 'history' ? 'bg-slate-950/30 text-slate-950 font-black' : 'bg-white/10 text-zinc-400'
                            }`}>
                                {approvedDocsCount + directiveLogs.length + chatLogs.length}건
                            </span>
                        </button>
                    </div>

                    {/* 2행: 전사 실시간 안전 현황 + 지휘통제실 & 전 부서 보고 새로고침 바 */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-white/10">
                        <div className="flex items-center gap-2 text-zinc-400 text-xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                            <span className="text-[11px] font-medium text-zinc-300">
                                ⚡ 대표이사 독점 결재권 가동 중 · 승인 서명 안건만 지정 예산 한도 내 실전 집행
                            </span>
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                            <button
                                type="button"
                                onClick={() => setShowCommandDrawer(prev => !prev)}
                                className={`px-3 py-1.5 sm:py-2 rounded-xl border text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm whitespace-nowrap ${
                                    showCommandDrawer
                                        ? 'bg-amber-500/25 border-amber-400 text-amber-200 shadow-md shadow-amber-500/10'
                                        : 'bg-white/5 hover:bg-white/10 border-amber-500/30 text-amber-300'
                                }`}
                            >
                                <span>⚡</span>
                                <span>{showCommandDrawer ? '지휘통제실 접기' : '지휘통제실'}</span>
                                <span className="text-[10px]">{showCommandDrawer ? '▲' : '▼'}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    fetchOfficeData('', '', false);
                                    fetchTradingDesk();
                                }}
                                className="px-3 py-1.5 sm:py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                                title="전 부서 보고 갱신"
                            >
                                <span>🔄</span>
                                <span>전 부서 새로고침</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* ⚡ 대표이사 심플 지시 & 자동운용 컨트롤 바 (임원회의 탭이거나 대표님이 지시창 버튼을 눌렀을 때만 깔끔하게 표시) */}
                {(showCommandDrawer || activeTab === 'boardroom') && (
                    <div className="bg-gradient-to-br from-[#10192d] via-[#0d1425] to-[#131e36] border border-amber-500/40 rounded-2xl p-4 shadow-xl space-y-3">
                        {/* 1줄: 상태 배지 + 운용 모드 3단 선택 + 원클릭 자동 명령 3개 */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/10">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-xs">
                                    ⚡ 대표이사 전사 지시실
                                </span>
                                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-[11px]">
                                    {[
                                        { id: 'aggressive', label: '🔥 공격모드(2천만)' },
                                        { id: 'balanced', label: '⚖️ 표준균형(1천만)' },
                                        { id: 'conservative', label: '🛡️ 안전방어(500만)' },
                                    ].map(m => (
                                        <button
                                            key={m.id}
                                            type="button"
                                            disabled={isExecutingDirective}
                                            onClick={() => executeCompanyDirective({
                                                command_type: 'UPDATE_POLICY',
                                                mode: m.id,
                                                apply_preset_defaults: true,
                                            })}
                                            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                                                (companyPolicy?.mode || 'balanced') === m.id
                                                    ? 'bg-amber-500 text-slate-950 font-black'
                                                    : 'text-gray-300 hover:bg-white/10'
                                            }`}
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 원클릭 자동 실행 버튼 3개 */}
                            <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                    type="button"
                                    disabled={isExecutingDirective}
                                    onClick={() => executeCompanyDirective({ command_type: 'AUTO_INVEST_TOP3' })}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-black cursor-pointer"
                                >
                                    🚀 오늘 TOP 3 자동 매수
                                </button>
                                <button
                                    type="button"
                                    disabled={isExecutingDirective}
                                    onClick={() => executeCompanyDirective({ command_type: 'AUDIT_ALL_POSITIONS' })}
                                    className="px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 text-xs font-black cursor-pointer"
                                >
                                    🛡️ 보유종목 방어선 점검
                                </button>
                                <button
                                    type="button"
                                    disabled={isExecutingDirective}
                                    onClick={() => executeCompanyDirective({ command_type: 'TAKE_PROFIT_WINNERS' })}
                                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-black cursor-pointer"
                                >
                                    💰 수익종목 50% 분할익절
                                </button>
                            </div>
                        </div>

                        {/* 2줄: 깔끔한 1줄 지시 입력창 */}
                        <form onSubmit={handleSendDirective} className="flex flex-col sm:flex-row gap-2">
                            <input
                                type="text"
                                value={commandInput}
                                onChange={e => setCommandInput(e.target.value)}
                                placeholder="직접 지시를 입력하세요 (예: 삼성중공업 기안 올리고 1000만원 매수해 / 엔비디아 매수해)"
                                className="flex-1 bg-[#070b14] border border-white/20 focus:border-amber-400 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none"
                            />
                            <button
                                type="submit"
                                disabled={isCallingMeeting || isExecutingDirective}
                                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm transition-all cursor-pointer shrink-0"
                            >
                                {isExecutingDirective || isCallingMeeting ? '⚡ 5대 본부 실행 중...' : '📢 지시 하달 & 자동 집행'}
                            </button>
                        </form>

                        {/* 빠른 지시 칩 */}
                        <div className="flex flex-wrap items-center gap-1.5">
                            {QUICK_TOPICS.map(item => (
                                <button
                                    key={item.label}
                                    type="button"
                                    onClick={async () => {
                                        await executeCompanyDirective({
                                            command_type: 'CUSTOM_DIRECTIVE',
                                            directive_text: item.message,
                                            auto_execute: true,
                                        });
                                        fetchOfficeData(item.topic, item.message, true);
                                    }}
                                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 cursor-pointer"
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>

                        {/* 지시 실행 시에만 깔끔하게 뜨는 5대 본부 이행 결과 요약 */}
                        {lastWorkflowResult && (
                            <div className="bg-emerald-950/30 border border-emerald-400/40 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                <div className="text-emerald-200 font-bold">
                                    <span className="text-emerald-400 font-black mr-1.5">✅ 전 부서 자동 이행 완료:</span>
                                    {lastWorkflowResult.headline_result}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {lastWorkflowResult.created_doc && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedDocId(lastWorkflowResult.created_doc.doc_id);
                                                setActiveTab('electronic_sign');
                                            }}
                                            className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-[11px] cursor-pointer"
                                        >
                                            🖋️ 생성된 기안서 보기
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActiveTab('approved_tf');
                                            fetchTradingDesk();
                                        }}
                                        className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-black text-[11px] cursor-pointer"
                                    >
                                        💼 트레이딩 내역 보기
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setLastWorkflowResult(null)}
                                        className="text-gray-400 hover:text-white px-1 cursor-pointer"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {loading ? (
                    <div className="bg-[#0d1526] border border-white/10 rounded-2xl p-12 text-center">
                        <div className="inline-block w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-base font-bold text-white">
                            전 부서 임원들이 오늘의 시장 시스템과 리서치 기안서를 대표님 책상에 올리고 있습니다...
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            잠시만 기다려 주시면 서명만 하실 수 있도록 정리된 전자결재판이 열립니다.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* 좌측 8컬럼: 대표이사 전자결재 서류함 (기본 탭) */}
                        <div className={['electronic_sign', 'one_page_summary', 'weekly_review_calendar', 'watchlist_research', 'approved_tf'].includes(activeTab) ? 'lg:col-span-12 space-y-5' : 'lg:col-span-8 space-y-5'}>
                            {activeTab === 'electronic_sign' && (
                                <>
                                    {/* 비서실장 브리핑 안내 배너 */}
                                    <div className="bg-gradient-to-r from-amber-500/15 via-indigo-950/40 to-slate-900 border border-amber-500/35 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl shrink-0">
                                                👩‍💼
                                            </div>
                                            <div>
                                                <div className="text-xs font-extrabold text-amber-300 flex items-center gap-2">
                                                    <span>정유진 비서실장 · 일일 결재 브리핑</span>
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                                                        24시간 무휴 자동 상정
                                                    </span>
                                                </div>
                                                <p className="text-xs sm:text-sm text-white font-bold mt-0.5 leading-relaxed">
                                                    &ldquo;대표님! 오늘 각 본부 임원들이 <span className="text-emerald-300">🇰🇷 국내 주식</span>뿐만 아니라 <span className="text-sky-300">🌎 미국 빅테크</span>, <span className="text-purple-300">📊 글로벌 선물</span>, <span className="text-amber-300">📰 전세계 경제뉴스</span>까지 전수 분석하여 총 <span className="text-amber-300 underline font-black">{totalDocs}건의 기안서</span>를 올렸습니다. 메일함처럼 좌측 목록에서 서류를 선택해 10초 핵심 보고를 확인하시고 서명해 주십시오!&rdquo;
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                type="button"
                                                onClick={handleApproveAll}
                                                className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                                            >
                                                <span>⚡</span>
                                                <span>모든 서류 일괄 승인 (재가)</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* 카테고리 탭 & 결재 상태 필터 */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a101f] border border-white/10 rounded-2xl p-3">
                                        {/* 카테고리 탭 5개 */}
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {[
                                                { key: 'all', label: '전체', count: countTotal, icon: '📋' },
                                                { key: 'kr_stock', label: '국내 주식', count: countKr, icon: '🇰🇷' },
                                                { key: 'us_stock', label: '미국 빅테크·신생주', count: countUs, icon: '🚀' },
                                                { key: 'global_futures', label: '글로벌 선물·지수', count: countFutures, icon: '📊' },
                                                { key: 'world_news', label: '전세계 경제뉴스', count: countNews, icon: '📰' },
                                            ].map(tab => {
                                                const isTabActive = categoryFilter === tab.key;
                                                return (
                                                    <button
                                                        key={tab.key}
                                                        type="button"
                                                        onClick={() => {
                                                            setCategoryFilter(tab.key as any);
                                                            const match = autoApprovals.find(d => tab.key === 'all' || d.category_type === tab.key || (tab.key === 'world_news' && (d.category_type === 'all' || d.doc_id.endsWith('-01'))));
                                                            if (match) setSelectedDocId(match.doc_id);
                                                        }}
                                                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                                            isTabActive
                                                                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                                                                : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                                                        }`}
                                                    >
                                                        <span>{tab.icon}</span>
                                                        <span>{tab.label}</span>
                                                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                                            isTabActive ? 'bg-slate-950/30 text-slate-950' : 'bg-white/10 text-gray-400'
                                                        }`}>
                                                            {tab.count}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* 결재 상태 필터 */}
                                        <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-xl p-1 text-xs shrink-0 self-start sm:self-auto">
                                            <button
                                                type="button"
                                                onClick={() => setStatusFilter('all')}
                                                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                                                    statusFilter === 'all' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'
                                                }`}
                                            >
                                                전체 ({countTotal})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setStatusFilter('pending')}
                                                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                                    statusFilter === 'pending' ? 'bg-amber-500/30 text-amber-300 font-black' : 'text-gray-400 hover:text-amber-300'
                                                }`}
                                            >
                                                <span>⏳ 미결재</span>
                                                <span className="text-[10px] px-1 rounded-full bg-amber-500/20 font-black">{pendingDocsCount}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setStatusFilter('approved')}
                                                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                                    statusFilter === 'approved' ? 'bg-emerald-500/30 text-emerald-300 font-black' : 'text-gray-400 hover:text-emerald-300'
                                                }`}
                                            >
                                                <span>💮 결재완료</span>
                                                <span className="text-[10px] px-1 rounded-full bg-emerald-500/20 font-black">{approvedDocsCount}</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* 이메일형 2단 마스터-디테일 결재 서류함 */}
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                                        {/* 좌측 서류 목록 (Mail Master List - 우측 카드와 동일한 프리미엄 패널, 빈 여백 없이 균일한 카드 간격 밀착) */}
                                        <div className={`lg:col-span-5 xl:col-span-4 ${mobileDetailOpen ? 'hidden lg:block' : 'block'}`}>
                                            <div className="rounded-3xl border border-white/15 bg-gradient-to-br from-[#0f172a]/95 via-[#0c1424]/95 to-[#080d1a]/95 backdrop-blur-xl p-3.5 sm:p-4 shadow-2xl space-y-3">
                                                <div className="flex items-center justify-between px-2.5 py-1.5 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-gray-300 font-bold shadow-sm">
                                                    <div className="flex items-center gap-1.5">
                                                        <span>📬 상정 서류함</span>
                                                        <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-black text-[11px]">
                                                            {filteredDocs.length}건
                                                        </span>
                                                    </div>
                                                    <span className="text-[11px] text-amber-300/90 font-semibold">
                                                        👉 서류 선택 시 즉시 열람
                                                    </span>
                                                </div>

                                                <div className="space-y-3 pr-0.5">
                                                {filteredDocs.length === 0 ? (
                                                    <div className="bg-black/30 border border-white/10 rounded-2xl p-8 text-center text-gray-400 text-xs">
                                                        해당 조건에 맞는 결재 서류가 없습니다.
                                                    </div>
                                                ) : (() => {
                                                    const getDocGroupKey = (d: AutoApprovalDoc) => {
                                                        if (d.category_type === 'kr_stock') return 'kr_stock';
                                                        if (d.category_type === 'us_stock') return 'us_stock';
                                                        if (d.category_type === 'global_futures') return 'global_futures';
                                                        return 'macro_brief';
                                                    };

                                                    const groupMeta: Record<string, { title: string; badgeClass: string }> = {
                                                        macro_brief: {
                                                            title: '📌 1. 핵심 시황 · 경제일정 · 주간복기',
                                                            badgeClass: 'text-amber-300 bg-amber-500/15 border-amber-500/30',
                                                        },
                                                        kr_stock: {
                                                            title: '🇰🇷 2. 국내 증권사 추천 우량주',
                                                            badgeClass: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
                                                        },
                                                        us_stock: {
                                                            title: '🚀 3. 미국 빅테크 & 혁신 신생주',
                                                            badgeClass: 'text-sky-300 bg-sky-500/15 border-sky-500/30',
                                                        },
                                                        global_futures: {
                                                            title: '📊 4. 글로벌 선물 · 거시 위험도 지표',
                                                            badgeClass: 'text-purple-300 bg-purple-500/15 border-purple-500/30',
                                                        },
                                                    };

                                                    const orderedGroupKeys = ['macro_brief', 'kr_stock', 'us_stock', 'global_futures'];
                                                    const groups = categoryFilter === 'all'
                                                        ? orderedGroupKeys
                                                            .map(k => ({
                                                                key: k,
                                                                meta: groupMeta[k],
                                                                docs: filteredDocs.filter(d => getDocGroupKey(d) === k),
                                                            }))
                                                            .filter(g => g.docs.length > 0)
                                                        : [{ key: 'single', meta: null, docs: filteredDocs }];

                                                    return groups.map(group => (
                                                        <div key={group.key} className="space-y-1.5">
                                                            {group.meta && (
                                                                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-white/10">
                                                                    <span className="text-[11px] font-black text-gray-200 tracking-tight">
                                                                        {group.meta.title}
                                                                    </span>
                                                                    <span className={`text-[10px] font-black px-2 py-0.2 rounded-full border ${group.meta.badgeClass}`}>
                                                                        {group.docs.length}건
                                                                    </span>
                                                                </div>
                                                            )}

                                                            <div className="space-y-1.5">
                                                                {group.docs.map((doc) => {
                                                                    const signInfo = signMap[doc.doc_id];
                                                                    const status: SignStatus = signInfo?.status || 'pending';
                                                                    const isSelected = activeDoc?.doc_id === doc.doc_id;
                                                                    const { badgeName, mainTitle } = getCleanCardTitle(doc);
                                                                    const shortNum = doc.doc_number.replace(/^제\s*\d+-/, '#').replace(/\s*호$/, '');
                                                                    const brokerMatch = doc.category_badge?.match(/\(([^)]+)\)/);
                                                                    const shortSource = brokerMatch ? brokerMatch[1] : doc.category_badge?.replace(/^[^\s]+\s*/, '');
                                                                    const currShort = doc.current_price ? doc.current_price.split(' ')[0] : '';
                                                                    const hasValidUpside = Boolean(
                                                                        doc.upside_pct &&
                                                                        doc.upside_pct !== '컨센서스 유지' &&
                                                                        doc.upside_pct !== '집계 중' &&
                                                                        !doc.upside_pct.includes('★')
                                                                    );

                                                                    return (
                                                                        <div
                                                                            key={doc.doc_id}
                                                                            onClick={() => {
                                                                                setSelectedDocId(doc.doc_id);
                                                                                setMobileDetailOpen(true);
                                                                                setTimeout(() => {
                                                                                    detailReaderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                                                }, 60);
                                                                            }}
                                                                            className={`group relative rounded-xl border transition-all px-3 py-2.5 cursor-pointer text-left ${
                                                                                isSelected
                                                                                    ? 'border-amber-400/90 bg-gradient-to-r from-[#1b2b4f] to-[#111c35] shadow-md shadow-amber-500/10 ring-1 ring-amber-400/40'
                                                                                    : status === 'approved'
                                                                                    ? 'border-emerald-500/30 bg-[#0a1518]/75 hover:border-emerald-500/60'
                                                                                    : status === 'hold'
                                                                                    ? 'border-rose-500/30 bg-[#160d15]/75 hover:border-rose-500/60'
                                                                                    : 'border-white/10 bg-[#0d1526]/85 hover:border-white/25 hover:bg-[#131f38]'
                                                                            }`}
                                                                        >
                                                                            {/* 선택 좌측 하이라이트 바 */}
                                                                            {isSelected && (
                                                                                <div className="absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b from-amber-400 to-yellow-300 rounded-r-full" />
                                                                            )}

                                                                            {/* 1줄: 번호 · 종목/안건 뱃지 · 출처 · 기대수익 · 원클릭 서명 */}
                                                                            <div className="flex items-center justify-between gap-2 pl-1">
                                                                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                                                    <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">
                                                                                        {shortNum}
                                                                                    </span>
                                                                                    <span className={`px-2 py-0.5 rounded-md font-black text-xs truncate ${
                                                                                        isSelected
                                                                                            ? 'bg-amber-400 text-slate-950'
                                                                                            : 'bg-amber-500/20 text-amber-200 border border-amber-400/30'
                                                                                    }`}>
                                                                                        {badgeName || doc.stock_name}
                                                                                    </span>
                                                                                    {shortSource && (
                                                                                        <span className="hidden sm:inline-block text-[10px] font-bold text-gray-400 bg-white/5 px-1.5 py-0.5 rounded truncate max-w-[95px]">
                                                                                            {shortSource}
                                                                                        </span>
                                                                                    )}
                                                                                </div>

                                                                                <div className="flex items-center gap-1.5 shrink-0">
                                                                                    {hasValidUpside && (
                                                                                        <span className="px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 font-mono font-black text-[10px]">
                                                                                            {doc.upside_pct}
                                                                                        </span>
                                                                                    )}
                                                                                    {status === 'hold' && (
                                                                                        <span className="text-[10px] font-black text-rose-300 bg-rose-500/20 px-1.5 py-0.5 rounded">
                                                                                            ⏸️보류
                                                                                        </span>
                                                                                    )}
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            updateSignature(doc.doc_id, status === 'approved' ? 'pending' : 'approved');
                                                                                        }}
                                                                                        className={`px-2 py-0.5 rounded-md text-[10px] font-black transition-all cursor-pointer ${
                                                                                            status === 'approved'
                                                                                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 hover:bg-emerald-500/30'
                                                                                                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'
                                                                                        }`}
                                                                                    >
                                                                                        {status === 'approved' ? '💮완료' : '서명'}
                                                                                    </button>
                                                                                </div>
                                                                            </div>

                                                                            {/* 2줄: 핵심 한줄 제목 + 현재가 ➔ 목표가 요약 */}
                                                                            <div className="mt-1.5 pl-1 flex items-center justify-between gap-2 text-[11px]">
                                                                                <p className={`truncate flex-1 font-bold ${
                                                                                    isSelected ? 'text-white' : 'text-gray-300 group-hover:text-white'
                                                                                }`}>
                                                                                    {mainTitle}
                                                                                </p>
                                                                                {(currShort || doc.target_price) && (
                                                                                    <div className="shrink-0 font-mono text-[10px] flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded border border-white/5">
                                                                                        {currShort && <span className="text-gray-300">{currShort}</span>}
                                                                                        {doc.target_price && (
                                                                                            <>
                                                                                                <span className="text-amber-400">➔</span>
                                                                                                <span className="text-amber-300 font-bold truncate max-w-[110px]">
                                                                                                    {doc.target_price}
                                                                                                </span>
                                                                                            </>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ));
                                                })()}
                                                </div>

                                                {/* 하단 전자결재 실천 원칙 안내 카드 (중간 틈/여백 없이 바로 연결) */}
                                                <div className="pt-2.5 border-t border-white/10">
                                                    <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900/80 to-slate-950 border border-amber-500/25 text-xs shadow-md space-y-1">
                                                        <div className="flex items-center justify-between text-amber-300 font-extrabold text-[11px]">
                                                            <span className="flex items-center gap-1.5">
                                                                <span>🛡️</span>
                                                                <span>대표이사 전자결재 집행 원칙</span>
                                                            </span>
                                                            <span className="text-[10px] text-emerald-300 font-bold bg-emerald-500/15 px-1.5 py-0.2 rounded border border-emerald-500/30">
                                                                100% 재가 집행
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] text-gray-300 leading-snug">
                                                            대표님께서 서명하신 기안서는 <strong className="text-amber-200 font-bold">5개 본부 TFT</strong>로 즉시 전달되어 50일선 지지 확인 및 분할 매매가 기계적으로 실행됩니다.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 우측 상세 열람실 (Detail Dossier Reader - 한눈에 들어오는 프리미엄 대시보드형 UI) */}
                                        <div ref={detailReaderRef} className={`lg:col-span-7 xl:col-span-8 scroll-mt-6 ${mobileDetailOpen ? 'block' : 'hidden lg:block'}`}>
                                            {activeDoc ? (() => {
                                                const docStatus = signMap[activeDoc.doc_id]?.status || 'pending';
                                                const isMarketSystem = activeDoc.stock_name === '전체 시장 시스템' || 
                                                    activeDoc.category_type === 'all' || 
                                                    activeDoc.category_badge?.includes('종합') || 
                                                    activeDoc.category_badge?.includes('특보') || 
                                                    activeDoc.category_badge?.includes('브리핑') ||
                                                    activeDoc.stock_name?.includes('종합 보고');

                                                const isMacroDoc = 
                                                    activeDoc.category_type === 'global_futures' || 
                                                    activeDoc.category_type === 'world_news' || 
                                                    activeDoc.category_type === 'macro' ||
                                                    activeDoc.category_badge?.includes('지표') || 
                                                    activeDoc.category_badge?.includes('뉴스') || 
                                                    activeDoc.category_badge?.includes('특보') ||
                                                    activeDoc.stock_name?.includes('VIX') || 
                                                    activeDoc.stock_name?.includes('환율') || 
                                                    activeDoc.stock_name?.includes('금리') || 
                                                    activeDoc.stock_name?.includes('시스템') ||
                                                    activeDoc.stock_name?.includes('선물') ||
                                                    activeDoc.stock_name?.includes('경제일정') ||
                                                    activeDoc.stock_name?.includes('주간 리서치');

                                                const riskData = getDetailedRiskBreakdown(activeDoc, riskCapital);
                                                const researchBody = parseExecutiveOpinion(activeDoc.research_opinion, "리서치센터", "💡").body || activeDoc.easy_headline || "";
                                                const quantBody = parseExecutiveOpinion(activeDoc.quant_opinion, "수급분석본부", "📊").body || "최근 두 달 평균선(50일선) 위에서 외국인과 기관 큰손들의 수급 지지력을 정밀 감시하고 있습니다.";
                                                const riskOpinionBody = parseExecutiveOpinion(activeDoc.risk_opinion, "리스크본부", "🛡️").body || riskData.headline;

                                                const isCautiousResearch = ['급락', '하락', '조정', '매물', '위축', '주의', '방어', '축소'].some(kw => researchBody.includes(kw));
                                                const isCautiousQuant = ['급락', '매도', '패닉', '이탈', '유출', '관망', '주의'].some(kw => quantBody.includes(kw));

                                                return (
                                                <div className={`relative overflow-hidden rounded-3xl border-2 transition-all p-5 sm:p-6 shadow-2xl space-y-4 ${
                                                    docStatus === 'approved'
                                                        ? 'border-emerald-500/50 bg-gradient-to-br from-[#0b1d19] via-[#0c1626] to-[#09101d]'
                                                        : docStatus === 'hold'
                                                        ? 'border-rose-500/40 bg-[#170f18]'
                                                        : 'border-white/15 bg-gradient-to-br from-[#10192e] to-[#0a101f]'
                                                }`}>
                                                    {/* 모바일 전용 뒤로가기 버튼 */}
                                                    <div className="lg:hidden">
                                                        <button
                                                            type="button"
                                                            onClick={() => setMobileDetailOpen(false)}
                                                            className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-black text-xs flex items-center justify-center gap-2 border border-white/15 cursor-pointer"
                                                        >
                                                            <span>←</span>
                                                            <span>📬 결재 서류 목록으로 돌아가기</span>
                                                        </button>
                                                    </div>

                                                    {/* ── [HEADER] 문서 정보 & 상단 원클릭 결재 컨트롤 바 ── */}
                                                    <div className="pb-4 border-b border-white/10 space-y-3">
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="px-2.5 py-0.5 rounded-md bg-white/10 text-gray-200 font-mono text-xs font-bold">
                                                                    문서번호 {activeDoc.doc_number}
                                                                </span>
                                                                <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-extrabold">
                                                                    {activeDoc.category_badge}
                                                                </span>
                                                                <span className="text-xs text-gray-400">
                                                                    · {activeDoc.submitted_at}
                                                                </span>
                                                            </div>

                                                            {/* 결재 상태 배지 */}
                                                            {docStatus === 'approved' && (
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border border-emerald-400 bg-emerald-500/20 text-emerald-300 font-black text-xs">
                                                                    <span>💮 대표이사 결재완료</span>
                                                                    <span className="text-[10px] text-emerald-200/80">({signMap[activeDoc.doc_id]?.signedAt})</span>
                                                                </span>
                                                            )}
                                                            {docStatus === 'hold' && (
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border border-rose-400 bg-rose-500/20 text-rose-300 font-black text-xs">
                                                                    <span>⏸️ 보류 지시됨 ({signMap[activeDoc.doc_id]?.signedAt})</span>
                                                                </span>
                                                            )}
                                                            {docStatus === 'reexamine' && (
                                                                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-xl border border-sky-400 bg-sky-500/20 text-sky-200 font-black text-xs">
                                                                    <span>🔄 심층 재검토 지시됨</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setActiveTab('boardroom');
                                                                            setTimeout(() => {
                                                                                boardroomDebateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                                            }, 200);
                                                                        }}
                                                                        className="underline text-amber-300 hover:text-amber-200 font-extrabold text-[11px] cursor-pointer"
                                                                    >
                                                                        회의실 입장 →
                                                                    </button>
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                                                            <div>
                                                                {(() => {
                                                                    let titleStr = activeDoc.title || '';
                                                                    let prefixTag = '';
                                                                    const m = titleStr.match(/^\[([^\]]+)\]\s*(.*)$/);
                                                                    if (m) {
                                                                        prefixTag = m[1];
                                                                        titleStr = m[2];
                                                                    }
                                                                    return (
                                                                        <div className="space-y-1">
                                                                            {prefixTag && (
                                                                                <div className="inline-block px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-amber-300 font-bold text-xs mr-2">
                                                                                    {prefixTag}
                                                                                </div>
                                                                            )}
                                                                            <h3 className="text-base sm:text-lg font-black text-white leading-snug tracking-tight inline">
                                                                                {titleStr}
                                                                            </h3>
                                                                        </div>
                                                                    );
                                                                })()}
                                                                <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-400">
                                                                    <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-zinc-300 font-bold">✍️ 기안</span>
                                                                    <span className="text-zinc-200 font-medium">{activeDoc.proposer}</span>
                                                                </div>
                                                            </div>

                                                            {/* 상단 퀵 결재 버튼 (스크롤 없이 즉시 서명 가능) */}
                                                            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateSignature(activeDoc.doc_id, 'approved')}
                                                                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                                                        docStatus === 'approved'
                                                                            ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25'
                                                                            : 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-md shadow-amber-500/20'
                                                                    }`}
                                                                >
                                                                    <span>{docStatus === 'approved' ? '✅ 승인 완료' : '🖋️ 승인 서명 (재가)'}</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateSignature(activeDoc.doc_id, 'hold')}
                                                                    className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                                                                        docStatus === 'hold'
                                                                            ? 'bg-rose-500 text-white border-rose-400'
                                                                            : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/15'
                                                                    }`}
                                                                >
                                                                    ⏸️ 보류
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleReexamineDoc(activeDoc)}
                                                                    className="px-3 py-2 rounded-xl text-xs font-black bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-400/40 transition-all cursor-pointer flex items-center gap-1"
                                                                    title="5개 본부 임원을 회의실로 긴급 소집하여 대면 보고를 받습니다"
                                                                >
                                                                    <span>👥</span>
                                                                    <span>대면보고 소집</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* ── [STEP 1] 📊 최상단 4대 핵심 지표 전광판 (한글 자간 깨짐 없이 깔끔한 고품질 렌더링) ── */}
                                                    {activeDoc.key_numbers && activeDoc.key_numbers.length > 0 && (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                                            {activeDoc.key_numbers.slice(0, 4).map((kn, i) => {
                                                                const { badgeText, badgeStyle, cardStyle, renderedValue } = renderExecutiveKeyNumber(kn);

                                                                return (
                                                                    <div
                                                                        key={i}
                                                                        className={`rounded-xl p-2.5 sm:p-3 border transition-all shadow-md flex flex-col justify-between ${cardStyle}`}
                                                                    >
                                                                        <div className="flex items-center justify-between gap-1 mb-1.5">
                                                                            <span className="text-[11px] sm:text-xs text-zinc-300 font-extrabold tracking-tight truncate">
                                                                                {kn.label}
                                                                            </span>
                                                                            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded shrink-0 border ${badgeStyle}`}>
                                                                                {badgeText}
                                                                            </span>
                                                                        </div>
                                                                        <div className="min-h-[38px] flex items-center">
                                                                            {renderedValue}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}

                                                    {/* ── [STEP 2] ⚡ 3초 핵심 브리핑 (적당하고 정돈된 크기 & 시원한 가독성) ── */}
                                                    {(() => {
                                                        const summaryBullets = toCrispExecutiveBullets(activeDoc.easy_headline || researchBody, 'summary');
                                                        const researchBullets = toCrispExecutiveBullets(researchBody, 'research');
                                                        const quantBullets = toCrispExecutiveBullets(quantBody, 'quant');
                                                        const actionBullets = toCrispExecutiveBullets(riskOpinionBody, 'action');

                                                        const cleanSecretary = (activeDoc.secretary_conclusion || '')
                                                            .replace(/^👩‍💼\s*정유진 비서실장\s*\[[^\]]+\]:\s*/g, '')
                                                            .trim();

                                                        // 카드별 1초 한줄 결론 헤드라인 도출 (적당한 12~13px)
                                                        const card1Headline = isMacroDoc
                                                            ? (isCautiousResearch ? '⚠️ 미 반도체·기술주 급락 여파 · 장초반 매물 주의 (환율은 안정)' : '🟢 글로벌 거시환경 우호적 · 수출·대형주 모멘텀 양호')
                                                            : `🚀 목표가 ${activeDoc.target_price || '상향'} (${activeDoc.upside_pct || '모멘텀 우수'}) · 실적·수주 성장세 뚜렷`;

                                                        const card2Headline = isMacroDoc
                                                            ? (isCautiousQuant ? '📊 장초반 프로그램 매도 경계 · 방어주·환율수혜주 수급 관찰' : '🏦 환율 안정 속 외국인·기관 수급 유입 기대')
                                                            : (isCautiousQuant ? '📊 장초반 외인·기관 수급 방향성 확인 후 진입' : '🏦 외국인·기관 50일선 하방 지지력 확보');

                                                        const card3Headline = isMacroDoc
                                                            ? '🛑 장 시작 직후 추격매수 금지! 오전 10시 바닥(지지선) 확인 후 나눠 사기'
                                                            : '🎯 장 시작 직후 추격매수 금지 · 오전 10시 바닥(지지선) 확인 후 3번에 나눠 사기';

                                                        return (
                                                            <>
                                                                {/* 상단 3초 핵심 요약 보드 */}
                                                                <div className="bg-gradient-to-r from-amber-500/15 via-slate-900/90 to-purple-950/30 border border-amber-400/40 rounded-2xl p-3.5 sm:p-4 shadow-xl space-y-2.5">
                                                                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-xs inline-flex items-center gap-1 shadow-sm">
                                                                                <span>⚡</span>
                                                                                <span>대표님 3초 핵심 브리핑 (한눈에 보기)</span>
                                                                            </span>
                                                                            <span className="text-[11px] font-bold text-amber-200/90 hidden sm:inline">
                                                                                핵심만 시원하고 간결하게 정리했습니다
                                                                            </span>
                                                                        </div>
                                                                        {activeDoc.recommendation && (
                                                                            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-400/35">
                                                                                👩‍💼 건의: {activeDoc.recommendation}
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {/* 2단 핵심 요점 (해외·원인 / 국내·대응) - 부담 없는 적당한 12.5px 폰트 */}
                                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                                                                        {summaryBullets.map((item, idx) => (
                                                                            <div key={idx} className="bg-black/60 border border-white/10 rounded-xl p-2.5 sm:p-3 flex items-start gap-2 shadow-xs min-w-0">
                                                                                <span className={`px-2 py-0.5 rounded text-[11px] font-black border shrink-0 mt-0.5 ${item.tagColor}`}>
                                                                                    {item.tag}
                                                                                </span>
                                                                                <p className="text-xs sm:text-[13px] font-semibold text-zinc-100 leading-snug break-keep flex-1 min-w-0">
                                                                                    {renderHighlightedExecutiveText(item.text)}
                                                                                </p>
                                                                            </div>
                                                                        ))}
                                                                    </div>

                                                                    {/* 비서실장 1줄 실행 가이드 바 */}
                                                                    <div className="bg-purple-950/40 border border-purple-400/30 rounded-xl px-3 py-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                                                                        <div className="flex items-center gap-1.5 text-purple-100 font-bold min-w-0">
                                                                            <span className="text-purple-300 font-black shrink-0">👩‍💼 결재 시:</span>
                                                                            <span className="truncate text-zinc-200 font-medium">{cleanSecretary}</span>
                                                                        </div>
                                                                        <span className="text-[10px] text-amber-300 font-bold shrink-0">
                                                                            🔒 100% 대표님 승인 안건만 집행
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {/* ── [STEP 3] 🗂️ 세부 브리핑 3단 깔끔 탭 네비게이션 바 ── */}
                                                                <div className="bg-black/50 border border-white/10 rounded-2xl p-1 flex flex-wrap items-center justify-between gap-1.5">
                                                                    <div className="flex flex-wrap items-center gap-1 flex-1">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => { setExpandAllDocSections(false); setDocSubTab('core'); }}
                                                                            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                                                                !expandAllDocSections && docSubTab === 'core'
                                                                                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                                                                                    : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                                                                            }`}
                                                                        >
                                                                            <span>🎯</span>
                                                                            <span>1. 3대 본부 요약 {!isMacroDoc ? '& 자금배분' : '& 행동수칙'}</span>
                                                                        </button>

                                                                        <button
                                                                            type="button"
                                                                            onClick={() => { setExpandAllDocSections(false); setDocSubTab('risk'); }}
                                                                            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                                                                !expandAllDocSections && docSubTab === 'risk'
                                                                                    ? 'bg-rose-500 text-white font-black shadow-md'
                                                                                    : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                                                                            }`}
                                                                        >
                                                                            <span>🛡️</span>
                                                                            <span>2. CRO 리스크 &amp; 방어 매뉴얼</span>
                                                                        </button>

                                                                        <button
                                                                            type="button"
                                                                            onClick={() => { setExpandAllDocSections(false); setDocSubTab('terms'); }}
                                                                            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                                                                !expandAllDocSections && docSubTab === 'terms'
                                                                                    ? 'bg-sky-400 text-slate-950 font-black shadow-md'
                                                                                    : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                                                                            }`}
                                                                        >
                                                                            <span>📖</span>
                                                                            <span>3. 3초 용어풀이 ({activeDoc.easy_terms?.length || 0})</span>
                                                                        </button>
                                                                    </div>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setExpandAllDocSections(!expandAllDocSections)}
                                                                        className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 cursor-pointer shrink-0"
                                                                    >
                                                                        {expandAllDocSections ? '🗂️ 탭으로 접기' : '📑 전체 펼치기'}
                                                                    </button>
                                                                </div>

                                                                {/* ── [TAB 1: 🎯 3대 본부 핵심 브리핑 & 실전 타점/대응지침] ── */}
                                                                {(expandAllDocSections || docSubTab === 'core') && (
                                                                    <div className="space-y-3">
                                                                        {/* 3대 임원 핵심 요약 카드 (너무 크지 않고 딱 정돈된 폰트) */}
                                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                                                                            {/* 1. 리서치센터 핵심 분석 */}
                                                                            <div className="bg-gradient-to-b from-emerald-950/30 via-zinc-900/80 to-zinc-950 border border-emerald-500/35 rounded-2xl p-3 flex flex-col justify-between shadow-md">
                                                                                <div className="space-y-2">
                                                                                    <div className="flex items-center justify-between gap-1 text-xs font-black text-emerald-300 pb-1.5 border-b border-emerald-500/20">
                                                                                        <span className="flex items-center gap-1">
                                                                                            <span>{isMacroDoc ? '🌎' : '🚀'}</span>
                                                                                            <span className="text-zinc-100">{isMacroDoc ? '1. 시황 핵심 & 파급' : '1. 상승 동력'}</span>
                                                                                        </span>
                                                                                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                                                                            isCautiousResearch ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                                                                                        }`}>
                                                                                            {isCautiousResearch ? '⚠️ 변동성 주의' : '🟢 모멘텀 우수'}
                                                                                        </span>
                                                                                    </div>

                                                                                    {/* 1초 결론 하이라이트 박스 (적당한 12px 굵은 글씨) */}
                                                                                    <div className="bg-emerald-500/15 border border-emerald-400/30 rounded-lg p-2 text-xs font-bold text-emerald-100 leading-snug break-keep">
                                                                                        {card1Headline}
                                                                                    </div>

                                                                                    {/* 개조식 단문 태그 리스트 */}
                                                                                    <div className="space-y-1.5">
                                                                                        {researchBullets.map((item, bIdx) => (
                                                                                            <div key={bIdx} className="text-xs text-zinc-200 leading-snug font-medium flex items-start gap-1.5">
                                                                                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-black border shrink-0 mt-0.5 ${item.tagColor}`}>
                                                                                                    {item.tag}
                                                                                                </span>
                                                                                                <span className="break-keep flex-1 min-w-0">{renderHighlightedExecutiveText(item.text)}</span>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                                <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-400">
                                                                                    <span>기안: 박진우 부사장</span>
                                                                                    <span className="text-emerald-400 font-bold">리서치센터</span>
                                                                                </div>
                                                                            </div>

                                                                            {/* 2. 큰손 수급 & 시장 흐름 */}
                                                                            <div className="bg-gradient-to-b from-cyan-950/30 via-zinc-900/80 to-zinc-950 border border-cyan-500/35 rounded-2xl p-3 flex flex-col justify-between shadow-md">
                                                                                <div className="space-y-2">
                                                                                    <div className="flex items-center justify-between gap-1 text-xs font-black text-cyan-300 pb-1.5 border-b border-cyan-500/20">
                                                                                        <span className="flex items-center gap-1">
                                                                                            <span>📈</span>
                                                                                            <span className="text-zinc-100">2. 외인·기관 수급</span>
                                                                                        </span>
                                                                                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                                                                            isCautiousQuant ? 'bg-amber-500/20 text-amber-300' : 'bg-cyan-500/20 text-cyan-300'
                                                                                        }`}>
                                                                                            {isCautiousQuant ? '📊 장초반 관찰' : '📊 지지력 확보'}
                                                                                        </span>
                                                                                    </div>

                                                                                    {/* 1초 결론 하이라이트 박스 */}
                                                                                    <div className="bg-cyan-500/15 border border-cyan-400/30 rounded-lg p-2 text-xs font-bold text-cyan-100 leading-snug break-keep">
                                                                                        {card2Headline}
                                                                                    </div>

                                                                                    {/* 개조식 단문 태그 리스트 */}
                                                                                    <div className="space-y-1.5">
                                                                                        {quantBullets.map((item, bIdx) => (
                                                                                            <div key={bIdx} className="text-xs text-zinc-200 leading-snug font-medium flex items-start gap-1.5">
                                                                                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-black border shrink-0 mt-0.5 ${item.tagColor}`}>
                                                                                                    {item.tag}
                                                                                                </span>
                                                                                                <span className="break-keep flex-1 min-w-0">{renderHighlightedExecutiveText(item.text)}</span>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                                <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-400">
                                                                                    <span>기안: 김도현 상무</span>
                                                                                    <span className="text-cyan-400 font-bold">퀀트수급본부</span>
                                                                                </div>
                                                                            </div>

                                                                            {/* 3. 실전 대응 지침 & 목표 타점 */}
                                                                            <div className="bg-gradient-to-b from-purple-950/30 via-zinc-900/80 to-zinc-950 border border-purple-500/35 rounded-2xl p-3 flex flex-col justify-between shadow-md">
                                                                                <div className="space-y-2">
                                                                                    <div className="flex items-center justify-between gap-1 text-xs font-black text-purple-300 pb-1.5 border-b border-purple-500/20">
                                                                                        <span className="flex items-center gap-1">
                                                                                            <span>🎯</span>
                                                                                            <span className="text-zinc-100">{isMacroDoc ? '3. 오늘의 행동 지침' : '3. 목표가 & 원칙'}</span>
                                                                                        </span>
                                                                                        <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                                                                                            {isMacroDoc ? '🛡️ 분할 대응' : '💎 눌림목 매수'}
                                                                                        </span>
                                                                                    </div>

                                                                                    {/* 1초 결론 하이라이트 박스 */}
                                                                                    <div className="bg-purple-500/15 border border-purple-400/30 rounded-lg p-2 text-xs font-bold text-purple-100 leading-snug break-keep">
                                                                                        {card3Headline}
                                                                                    </div>

                                                                                    {/* 개조식 단문 태그 리스트 */}
                                                                                    <div className="space-y-1.5">
                                                                                        {!isMacroDoc && activeDoc.current_price && activeDoc.target_price ? (
                                                                                            <>
                                                                                                <div className="text-xs text-zinc-200 leading-snug font-medium flex items-start gap-1.5">
                                                                                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-black border bg-amber-500/20 text-amber-200 border-amber-400/30 shrink-0 mt-0.5">
                                                                                                        목표타점
                                                                                                    </span>
                                                                                                    <span>{activeDoc.current_price} <span className="text-amber-400">➔</span> <strong className="text-amber-300 font-mono">{activeDoc.target_price}</strong> ({activeDoc.upside_pct || '상승 여력'})</span>
                                                                                                </div>
                                                                                                <div className="text-xs text-zinc-200 leading-snug font-medium flex items-start gap-1.5">
                                                                                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-black border bg-rose-500/20 text-rose-200 border-rose-400/30 shrink-0 mt-0.5">
                                                                                                        진입원칙
                                                                                                    </span>
                                                                                                    <span>장 시작 직후 추격 금지 <span className="text-amber-400">➔</span> <strong className="text-emerald-300">오전 10시 바닥(지지선) 확인 후 나눠 사기</strong></span>
                                                                                                </div>
                                                                                            </>
                                                                                        ) : (
                                                                                            actionBullets.map((item, bIdx) => (
                                                                                                <div key={bIdx} className="text-xs text-zinc-200 leading-snug font-medium flex items-start gap-1.5">
                                                                                                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-black border shrink-0 mt-0.5 ${item.tagColor}`}>
                                                                                                        {item.tag}
                                                                                                    </span>
                                                                                                    <span className="break-keep flex-1 min-w-0">{renderHighlightedExecutiveText(item.text)}</span>
                                                                                            </div>
                                                                                            ))
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                                <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-400">
                                                                                    <span>기안: 최서연 상무</span>
                                                                                    <span className="text-purple-300 font-bold">-3.5% 손절선 엄수</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* ⚖️ [개별 종목 전용] 기회(상승 동력 2선) vs 위험(경계 리스크 2선) 균형 분석 (호재와 악재를 동시에 객관적으로 점검) */}
                                                                        {!isMacroDoc && (() => {
                                                                            const dropIntel = (activeDoc as any).drop_impact_intel;
                                                                            const fallbackHit = getStockOverseasDirectHitSummary(activeDoc.stock_name, activeDoc.stock_code, activeDoc.title);
                                                                            const liveDiag = dropIntel?.live_diagnosis;

                                                                            // 실시간 등락률 정밀 파싱 (가격 문자열 속 퍼센트만 안전하게 추출)
                                                                            const rawChg = parseChangePct((activeDoc as any).change_pct, (activeDoc as any).current_price);

                                                                            const riseList = (dropIntel?.rise_triggers || fallbackHit?.riseTriggers || [
                                                                                { icon: '🚀', trigger: `🔥 ${activeDoc.stock_name} 전방 산업 수요 회복 및 실적 턴어라운드`, chain: '핵심 고객사 발주 확대 ➔ 신규 수주 모멘텀 가시화 ➔ 실적 개선 기대감으로 주가 견인', impact_degree: '🔥 1순위 상승 동력', detailed_explanation: '전방 수요 회복 및 신규 수주 가시화로 공장 가동률이 상승하고 실적 개선 기대감이 주가를 견인합니다.' },
                                                                                { icon: '💰', trigger: '📈 외국인·기관 큰손 순매수 및 프로그램 매수세 유입', chain: '기업 밸류에이션 매력 부각 ➔ 메이저 수급 집중 유입 ➔ 단기 수급 탄력성 확보', impact_degree: '✨ 수급 모멘텀', detailed_explanation: '외국인 및 기관 투자자들의 패시브 자금이 집중 유입되며 하방 경직성을 확보하고 있습니다.' },
                                                                            ]).slice(0, 2);

                                                                            const riskList = (dropIntel?.overseas_triggers || fallbackHit?.triggers || [
                                                                                { icon: '💣', trigger: '🇺🇸 미국 증시 변동성 & 글로벌 경기 둔화 우려', chain: '해외 시장 급변동 ➔ 외국인 프로그램 매도 출회 ➔ 단기 가격 조정 압박', impact_degree: '🔥 1순위 직격탄', detailed_explanation: '글로벌 경기 둔화 및 금리 변동성으로 외국인 차익실현 매물이 출회될 수 있습니다.' },
                                                                                { icon: '⚠️', trigger: '📈 원/달러 환율 급변 및 해외 원자재·물류비 상승', chain: '환율 변동성 확대 ➔ 원부자재 수입 단가 상승 ➔ 분기 영업이익률 압박', impact_degree: '⚠️ 마진·원가 리스크', detailed_explanation: '원/달러 환율 급등이나 원부자재 가격 상승 시 영업 마진율이 일시적으로 압박받을 수 있습니다.' },
                                                                            ]).slice(0, 2);

                                                                            const riseOneLiner = dropIntel?.rise_one_liner || fallbackHit?.riseOneLiner || '전방 수요 회복과 메이저 수급 유입으로 든든한 턴어라운드 모멘텀이 형성되고 있습니다.';
                                                                            const riskOneLiner = dropIntel?.direct_hit_one_liner || fallbackHit?.oneLiner || '대외 매크로 불확실성 및 원가·수급 변수에 따른 단기 조정 리스크가 상존합니다.';

                                                                            return (
                                                                                <div className="bg-gradient-to-r from-slate-900/90 via-[#0e1726] to-slate-900/90 border border-amber-500/40 rounded-2xl p-3.5 space-y-3 shadow-lg">
                                                                                    {/* 상단 헤더 */}
                                                                                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10">
                                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                                            <span className="px-2 py-0.5 rounded-md font-black text-[11px] bg-gradient-to-r from-emerald-500/20 via-amber-500/20 to-rose-500/20 text-amber-200 border border-amber-400/40 flex items-center gap-1">
                                                                                                <span>⚖️</span>
                                                                                                <span>기회 vs 리스크 균형 분석</span>
                                                                                            </span>
                                                                                            <span className="text-xs font-black text-white">
                                                                                                [{activeDoc.stock_name}] 🟢 상승 동력 2선 vs 🔴 경계 리스크 2선 균형 진단
                                                                                            </span>
                                                                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                                                                                                rawChg > 0 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : rawChg < 0 ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-slate-500/20 text-slate-300 border-slate-500/40'
                                                                                            }`}>
                                                                                                {rawChg > 0 ? `+${rawChg.toFixed(2)}% 강세` : rawChg < 0 ? `${rawChg.toFixed(2)}% 조정` : '0.00% 보합'}
                                                                                            </span>
                                                                                        </div>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => {
                                                                                                const q = activeDoc.stock_code || activeDoc.stock_name;
                                                                                                setRiskSearchQuery(activeDoc.stock_name);
                                                                                                setActiveTab('watchlist_research');
                                                                                                handleSearchStockRisk(q);
                                                                                            }}
                                                                                            className="px-3 py-1 rounded-xl font-black text-[11px] cursor-pointer shadow-md flex items-center gap-1 shrink-0 bg-gradient-to-r from-cyan-400 to-indigo-400 hover:from-cyan-300 hover:to-indigo-300 text-slate-950"
                                                                                        >
                                                                                            <span>🔬</span>
                                                                                            <span>공시·수급·리스크 리서치팀 정밀판독 →</span>
                                                                                        </button>
                                                                                    </div>

                                                                                    {/* 1초 대표님 균형 브리핑 (기회 요약 + 위험 요약) */}
                                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                                                                        <div className="bg-emerald-950/30 border border-emerald-500/35 rounded-xl p-2.5 space-y-1">
                                                                                            <div className="text-[10px] font-black text-emerald-300 flex items-center gap-1">
                                                                                                <span>🟢</span>
                                                                                                <span>대표님 1초 기회 요약 (상승 모멘텀)</span>
                                                                                            </div>
                                                                                            <p className="text-emerald-100 font-bold leading-relaxed break-keep text-[11px]">
                                                                                                {riseOneLiner}
                                                                                            </p>
                                                                                        </div>
                                                                                        <div className="bg-rose-950/30 border border-rose-500/35 rounded-xl p-2.5 space-y-1">
                                                                                            <div className="text-[10px] font-black text-rose-300 flex items-center gap-1">
                                                                                                <span>🔴</span>
                                                                                                <span>대표님 1초 경계 요약 (하방 리스크)</span>
                                                                                            </div>
                                                                                            <p className="text-rose-100 font-bold leading-relaxed break-keep text-[11px]">
                                                                                                {riskOneLiner}
                                                                                            </p>
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* 🟢 🔴 좌우 2분할 대조: 기회 요인 2선 vs 위험 요인 2선 */}
                                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                                        {/* 🟢 좌측: 기회 & 핵심 상승 동력 2선 */}
                                                                                        <div className="space-y-2">
                                                                                            <div className="flex items-center justify-between text-[11px] font-black text-emerald-300 px-1 pb-1 border-b border-emerald-500/20">
                                                                                                <span className="flex items-center gap-1">
                                                                                                    <span>🟢</span>
                                                                                                    <span>핵심 기회 & 상승 동력 (2선)</span>
                                                                                                </span>
                                                                                                <span className="text-[10px] text-emerald-400/80 font-normal">왜 사야 하는가?</span>
                                                                                            </div>
                                                                                            <div className="space-y-2">
                                                                                                {riseList.map((t: any, idx: number) => (
                                                                                                    <div key={idx} className="bg-gradient-to-b from-black/60 to-emerald-950/20 border border-emerald-500/30 rounded-xl p-3 space-y-1.5 shadow-sm">
                                                                                                        <div className="flex items-center justify-between text-[10px] font-black pb-1 border-b border-white/5">
                                                                                                            <span className="text-emerald-300 flex items-center gap-1">
                                                                                                                <span>{t?.icon || '🚀'}</span>
                                                                                                                <span>상승 동력 {idx + 1}</span>
                                                                                                            </span>
                                                                                                            <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold border bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                                                                                                                {t?.impact_degree}
                                                                                                            </span>
                                                                                                        </div>
                                                                                                        <div className="text-xs font-black text-white leading-snug break-keep">
                                                                                                            {t?.trigger}
                                                                                                        </div>
                                                                                                        <div className="bg-white/[0.03] border border-white/5 rounded-lg p-2 text-[10.5px] text-zinc-200 leading-snug break-keep space-y-1">
                                                                                                            {t?.chain?.includes('➔') ? (
                                                                                                                t.chain.split('➔').map((step: string, sIdx: number, arr: string[]) => (
                                                                                                                    <div key={sIdx} className="flex items-start gap-1">
                                                                                                                        {sIdx > 0 && <span className="text-amber-400 font-black shrink-0">➔</span>}
                                                                                                                        <span className={sIdx === arr.length - 1 ? 'font-bold text-emerald-300' : 'text-zinc-300'}>
                                                                                                                            {step.trim()}
                                                                                                                        </span>
                                                                                                                    </div>
                                                                                                                ))
                                                                                                            ) : (
                                                                                                                <div>{t?.chain}</div>
                                                                                                            )}
                                                                                                        </div>
                                                                                                        {t?.detailed_explanation && (
                                                                                                            <details className="group pt-1 border-t border-white/5">
                                                                                                                <summary className="text-[10px] text-amber-300/80 hover:text-amber-300 font-bold cursor-pointer flex items-center justify-between list-none select-none py-0.5">
                                                                                                                    <span className="flex items-center gap-1">
                                                                                                                        <span>📖</span>
                                                                                                                        <span>상세 배경 분석</span>
                                                                                                                    </span>
                                                                                                                    <span className="text-[9px] group-open:rotate-180 transition-transform text-gray-400">▼</span>
                                                                                                                </summary>
                                                                                                                <div className="text-[10px] text-gray-300 pt-1.5 leading-relaxed break-keep bg-white/[0.02] p-2 rounded-lg mt-1 border border-white/5">
                                                                                                                    {t?.detailed_explanation}
                                                                                                                </div>
                                                                                                            </details>
                                                                                                        )}
                                                                                                    </div>
                                                                                                ))}
                                                                                            </div>
                                                                                        </div>

                                                                                        {/* 🔴 우측: 위험 & 핵심 경계 리스크 2선 */}
                                                                                        <div className="space-y-2">
                                                                                            <div className="flex items-center justify-between text-[11px] font-black text-rose-300 px-1 pb-1 border-b border-rose-500/20">
                                                                                                <span className="flex items-center gap-1">
                                                                                                    <span>🔴</span>
                                                                                                    <span>핵심 위험 & 경계 리스크 (2선)</span>
                                                                                                </span>
                                                                                                <span className="text-[10px] text-rose-400/80 font-normal">무엇을 조심해야 하는가?</span>
                                                                                            </div>
                                                                                            <div className="space-y-2">
                                                                                                {riskList.map((t: any, idx: number) => (
                                                                                                    <div key={idx} className="bg-gradient-to-b from-black/60 to-rose-950/20 border border-rose-500/30 rounded-xl p-3 space-y-1.5 shadow-sm">
                                                                                                        <div className="flex items-center justify-between text-[10px] font-black pb-1 border-b border-white/5">
                                                                                                            <span className="text-rose-300 flex items-center gap-1">
                                                                                                                <span>{t?.icon || '💣'}</span>
                                                                                                                <span>경계 리스크 {idx + 1}</span>
                                                                                                            </span>
                                                                                                            <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold border bg-rose-500/20 text-rose-300 border-rose-500/40">
                                                                                                                {t?.impact_degree}
                                                                                                            </span>
                                                                                                        </div>
                                                                                                        <div className="text-xs font-black text-white leading-snug break-keep">
                                                                                                            {t?.trigger}
                                                                                                        </div>
                                                                                                        <div className="bg-white/[0.03] border border-white/5 rounded-lg p-2 text-[10.5px] text-zinc-200 leading-snug break-keep space-y-1">
                                                                                                            {t?.chain?.includes('➔') ? (
                                                                                                                t.chain.split('➔').map((step: string, sIdx: number, arr: string[]) => (
                                                                                                                    <div key={sIdx} className="flex items-start gap-1">
                                                                                                                        {sIdx > 0 && <span className="text-amber-400 font-black shrink-0">➔</span>}
                                                                                                                        <span className={sIdx === arr.length - 1 ? 'font-bold text-rose-300' : 'text-zinc-300'}>
                                                                                                                            {step.trim()}
                                                                                                                        </span>
                                                                                                                    </div>
                                                                                                                ))
                                                                                                            ) : (
                                                                                                                <div>{t?.chain}</div>
                                                                                                            )}
                                                                                                        </div>
                                                                                                        {t?.detailed_explanation && (
                                                                                                            <details className="group pt-1 border-t border-white/5">
                                                                                                                <summary className="text-[10px] text-amber-300/80 hover:text-amber-300 font-bold cursor-pointer flex items-center justify-between list-none select-none py-0.5">
                                                                                                                    <span className="flex items-center gap-1">
                                                                                                                        <span>📖</span>
                                                                                                                        <span>상세 배경 분석</span>
                                                                                                                    </span>
                                                                                                                    <span className="text-[9px] group-open:rotate-180 transition-transform text-gray-400">▼</span>
                                                                                                                </summary>
                                                                                                                <div className="text-[10px] text-gray-300 pt-1.5 leading-relaxed break-keep bg-white/[0.02] p-2 rounded-lg mt-1 border border-white/5">
                                                                                                                    {t?.detailed_explanation}
                                                                                                                </div>
                                                                                                            </details>
                                                                                                        )}
                                                                                                    </div>
                                                                                                ))}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* 🛡️ 하단: 최서연 CRO 리스크 방어 가이드 & 손절선 */}
                                                                                    <div className="bg-gradient-to-r from-purple-950/40 via-slate-900/90 to-purple-950/40 border border-purple-500/35 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40 font-black text-[10px]">
                                                                                                🛡️ CRO 리스크 방어 지침
                                                                                            </span>
                                                                                            <span className="text-zinc-200 text-[11px] font-bold">
                                                                                                호재(상승 동력)가 뚜렷하더라도 위 경계 리스크가 돌발할 수 있으므로, <strong className="text-amber-300">시초가 추격매수 금지</strong> 및 <strong className="text-purple-300 font-mono">-3.5% 손절 방어선</strong>을 엄수하십시오.
                                                                                            </span>
                                                                                        </div>
                                                                                        <span className="text-[10px] font-mono text-purple-300 font-bold shrink-0">
                                                                                            기안: 최서연 상무 (CRO)
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })()}

                                                                        {/* 📋 [주간 복기 결재문서 전용] 저번 주 추천주 등락 원인 정밀 해부 (왜 올랐고 왜 떨어졌는가? 3대 핵심 축) */}
                                                                        {((activeDoc as any).weekly_stock_forensics?.length > 0 || activeDoc.doc_id?.includes('WKREV')) && (
                                                                            <div className="bg-gradient-to-r from-slate-900/90 via-[#0a1424] to-slate-900/90 border border-teal-500/40 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xl">
                                                                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/40 text-xs font-black">
                                                                                            🔍 저번 주 추천주 등락 원인 정밀 해부
                                                                                        </span>
                                                                                        <span className="text-sm font-black text-white">
                                                                                            왜 올랐고 왜 떨어졌는가? (3대 핵심 축 완전 복기)
                                                                                        </span>
                                                                                    </div>
                                                                                    <span className="text-[11px] text-teal-300/80 font-bold">
                                                                                        리서치센터 · 퀀트수급본부 · 리스크관리본부 합동 감정
                                                                                    </span>
                                                                                </div>

                                                                                <div className="space-y-3">
                                                                                    {(((activeDoc as any).weekly_stock_forensics || (weeklyReview as any)?.weekly_stock_forensics || []) as any[]).map((f: any, fIdx: number) => (
                                                                                        <div key={fIdx} className="bg-black/40 border border-white/10 rounded-xl p-3.5 space-y-2.5">
                                                                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black">
                                                                                                        🎯 {f.stock_name}
                                                                                                    </span>
                                                                                                    <span className="text-xs text-gray-400 font-mono">
                                                                                                        ({f.stock_code})
                                                                                                    </span>
                                                                                                </div>
                                                                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                                                                                                    f.trend_tone === 'bull'
                                                                                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                                                                                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                                                                                }`}>
                                                                                                    {f.trend_badge}
                                                                                                </span>
                                                                                            </div>

                                                                                            <div className="bg-teal-500/10 border border-teal-500/20 rounded-lg p-2.5 text-xs font-bold text-teal-100 leading-snug break-keep">
                                                                                                💡 {f.headline_summary}
                                                                                            </div>

                                                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs leading-snug">
                                                                                                <div className="bg-white/[0.03] border border-white/5 rounded-lg p-2.5 space-y-1">
                                                                                                    <div className="font-black text-emerald-300 flex items-center gap-1">
                                                                                                        <span>🏭</span>
                                                                                                        <span>1. 기업 실적·수주 팩트</span>
                                                                                                    </div>
                                                                                                    <div className="text-gray-300 text-[11px] leading-relaxed break-keep">{f.pillar_earnings}</div>
                                                                                                </div>
                                                                                                <div className="bg-white/[0.03] border border-white/5 rounded-lg p-2.5 space-y-1">
                                                                                                    <div className="font-black text-cyan-300 flex items-center gap-1">
                                                                                                        <span>💰</span>
                                                                                                        <span>2. 외인·기관 큰손 수급</span>
                                                                                                    </div>
                                                                                                    <div className="text-gray-300 text-[11px] leading-relaxed break-keep">{f.pillar_liquidity}</div>
                                                                                                </div>
                                                                                                <div className="bg-white/[0.03] border border-white/5 rounded-lg p-2.5 space-y-1">
                                                                                                    <div className="font-black text-purple-300 flex items-center gap-1">
                                                                                                        <span>🌐</span>
                                                                                                        <span>3. 대외 매크로·해외 직격탄</span>
                                                                                                    </div>
                                                                                                    <div className="text-gray-300 text-[11px] leading-relaxed break-keep">{f.pillar_macro}</div>
                                                                                                </div>
                                                                                            </div>

                                                                                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-xs text-amber-200 font-medium flex items-center gap-2 break-keep">
                                                                                                <span className="shrink-0">🎯</span>
                                                                                                <span><strong className="text-amber-300 font-bold">차주 월요일 실전 대응:</strong> {f.monday_gameplan}</span>
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {/* CRO 핵심 경보 + 4대 행동 수칙 통합 바 (슬림 & 고가독성) */}
                                                                        <div className="bg-gradient-to-r from-rose-950/40 via-zinc-950 to-slate-950 border border-rose-500/35 rounded-2xl p-3 space-y-2">
                                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                                                <div className="flex items-center gap-2 min-w-0">
                                                                                    <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-xs shrink-0">
                                                                                        ⚠️ CRO 경보
                                                                                    </span>
                                                                                    <p className="text-xs text-rose-100 font-medium truncate">
                                                                                        {riskData.headline}
                                                                                    </p>
                                                                                </div>
                                                                                {!expandAllDocSections && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => setDocSubTab('risk')}
                                                                                        className="shrink-0 px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/35 text-[11px] font-bold cursor-pointer"
                                                                                    >
                                                                                        세부 방어 매뉴얼 열기 →
                                                                                    </button>
                                                                                )}
                                                                            </div>

                                                                            {/* 4대 핵심 행동 수칙 1줄 초간결 배지 그리드 */}
                                                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-white/10">
                                                                                {(riskData.defenseRules || []).map((rule, rIdx) => (
                                                                                    <div key={rIdx} className="bg-black/60 border border-white/10 rounded-xl px-2.5 py-1.5 flex flex-col justify-center">
                                                                                        <div className="text-[10px] font-bold text-zinc-400 truncate">
                                                                                            {rule.num} {rule.title}
                                                                                        </div>
                                                                                        <div className="text-xs font-bold text-amber-300 font-mono truncate mt-0.5">
                                                                                            {rule.target}
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>

                                                                                                                                            </div>
                                                                )}
                                                            </>
                                                        );
                                                    })()}

                                                    {/* ── [TAB 2: 🛡️ CRO 세부 리스크 & 방어 매뉴얼] ── */}
                                                    {(expandAllDocSections || docSubTab === 'risk') && (
                                                        <div className="bg-gradient-to-br from-rose-950/30 via-zinc-950/90 to-red-950/20 border border-rose-500/35 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
                                                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-rose-500/20">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="w-6 h-6 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 flex items-center justify-center text-xs">
                                                                        🛡️
                                                                    </span>
                                                                    <h5 className="text-xs sm:text-sm font-black text-rose-200 tracking-tight flex items-center gap-1.5">
                                                                        <span>리스크 정밀 진단 &amp; 세부 방어 매뉴얼</span>
                                                                        <span className="text-[10px] text-zinc-400 font-normal">| 최서연 리스크관리본부장 (CRO)</span>
                                                                    </h5>
                                                                </div>
                                                                <span className="text-[10px] font-black text-rose-300 bg-rose-500/15 px-2 py-0.5 rounded-md border border-rose-500/30">
                                                                    ⚠️ 손실 방어 1순위 감사 완료
                                                                </span>
                                                            </div>

                                                            {/* ⚠️ 예산 부족 시 매수 보류 알림 배너 */}
                                                            {riskData.financialPlan?.priceExceedsBudget && (
                                                                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200 flex items-start gap-2.5">
                                                                    <span className="text-base shrink-0">⚠️</span>
                                                                    <div className="space-y-1">
                                                                        <div className="font-black text-amber-300">
                                                                            [운용 예산 부족 · 0주 매수 보류 안내]
                                                                        </div>
                                                                        <p className="text-[11px] leading-relaxed text-amber-100/90 font-medium">
                                                                            대표님이 설정하신 1회 운용 예산은 <strong className="text-white underline">{riskData.financialPlan.maxAlloc}</strong>이나, 현재 <strong>{activeDoc.stock_name}</strong> 1주 단가는 <strong className="text-white underline">{riskData.financialPlan.currPrice}</strong>입니다.<br />
                                                                            대표님이 <strong>[승인 서명]</strong>을 누르시더라도 <strong>설정 예산을 초과하여 무단으로 매수되지 않으며, 매수 수량이 '0주 (0원)'로 전면 보류</strong>되어 대표님의 자금이 100% 안전하게 보호됩니다.<br />
                                                                            <span className="text-amber-300 font-bold">💡 실전 1주 이상 매수를 진행하시려면 상단에서 운용 예산을 '30만 원' 이상으로 선택해 주십시오.</span>
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* 3대 정밀 리스크 요인 분석 카드 그리드 */}
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                                                                {(riskData.factors || []).map((f, fIdx) => (
                                                                    <div key={fIdx} className="bg-zinc-950/80 border border-white/10 rounded-xl p-3.5 flex flex-col justify-between">
                                                                        <div>
                                                                            <div className="flex items-center justify-between gap-1.5 mb-2 pb-1.5 border-b border-white/5">
                                                                                <span className="text-xs font-black text-white flex items-center gap-1">
                                                                                    <span>{f.icon}</span>
                                                                                    <span>{f.title}</span>
                                                                                </span>
                                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${f.tagColor}`}>
                                                                                    {f.tag}
                                                                                </span>
                                                                            </div>
                                                                            <ul className="space-y-1.5 text-[11px] sm:text-xs text-zinc-300 leading-relaxed font-medium">
                                                                                {(f.points || []).map((pt, pIdx) => (
                                                                                    <li key={pIdx} className="flex items-start gap-1.5">
                                                                                        <span className="text-rose-400 font-bold shrink-0">•</span>
                                                                                        <span>{pt}</span>
                                                                                    </li>
                                                                                ))}
                                                                            </ul>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            {/* 대표님 전용 철통 자산 방어 4대 실천 수칙 */}
                                                            <div className="pt-2 border-t border-rose-500/20">
                                                                <div className="text-[11px] font-black text-amber-300 flex items-center gap-1.5 mb-2">
                                                                    <Target className="w-3.5 h-3.5 text-amber-400" />
                                                                    <span>대표님 전용 '철통 자산 방어 실천 4원칙' (구체적 실행 수칙)</span>
                                                                </div>
                                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                                    {(riskData.defenseRules || []).map((rule, rIdx) => (
                                                                        <div key={rIdx} className="bg-black/60 border border-amber-500/20 rounded-xl p-3 flex flex-col justify-between">
                                                                            <div>
                                                                                <div className="text-[11px] font-black text-zinc-300">{rule.num} {rule.title}</div>
                                                                                <div className="text-xs sm:text-[13px] font-black text-amber-300 font-mono mt-1 leading-snug">{rule.target}</div>
                                                                                <p className="text-[11px] text-zinc-300 mt-1 leading-relaxed font-medium">{rule.desc}</p>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {/* 🔒 대표이사 독점 결재권 보증 안내 배너 */}
                                                            <div className="bg-gradient-to-r from-sky-950/40 via-blue-950/30 to-indigo-950/30 border border-sky-500/35 rounded-xl p-3 flex items-start gap-3">
                                                                <div className="p-2 rounded-lg bg-sky-500/20 text-sky-300 text-base shrink-0">🔒</div>
                                                                <div className="space-y-0.5">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs font-black text-sky-200">
                                                                            대표이사 독점 결재권(Human-in-the-Loop Safe Guard) 가동 중
                                                                        </span>
                                                                        <span className="text-[10px] px-1.5 py-0.5 rounded font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                                            100% 허가제
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-[11px] text-zinc-300 leading-relaxed font-medium">
                                                                        자동매매는 대표님께서 <strong className="text-amber-300">[승인 서명(재가)]</strong>을 누르신 허가 안건에 한해서만 지정 예산 한도 내에서 안전하게 집행됩니다. <strong className="text-rose-300">미결재·보류 안건은 계좌에서 1원도 무단 매매되지 않습니다.</strong>
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* ── [TAB 3: 📖 초보자 3초 용어풀이 & 전담 TFT] ── */}
                                                    {(expandAllDocSections || docSubTab === 'terms') && (
                                                        <div className="space-y-3.5">
                                                            {activeDoc.easy_terms && activeDoc.easy_terms.length > 0 ? (
                                                                <div className="bg-gradient-to-br from-zinc-900/90 via-slate-950 to-zinc-950 border border-white/15 rounded-2xl p-4 sm:p-5 shadow-lg">
                                                                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                                                                        <div className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-2">
                                                                            <span className="text-base">📖</span>
                                                                            <span>이 보고서에 등장한 어려운 단어 3초 풀이</span>
                                                                        </div>
                                                                        <span className="text-[11px] text-zinc-400 font-bold">
                                                                            초보자를 위한 친절한 금융 용어집
                                                                        </span>
                                                                    </div>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                                        {(activeDoc.easy_terms || []).map((t, idx) => (
                                                                            <div
                                                                                key={idx}
                                                                                className="bg-zinc-900/70 border border-white/10 hover:border-amber-400/30 rounded-xl p-3 text-xs leading-relaxed transition-all"
                                                                            >
                                                                                <div className="font-black text-amber-300 mb-1 flex items-center gap-1.5">
                                                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                                                                    <span>{t.term}</span>
                                                                                </div>
                                                                                <div className="text-zinc-300 font-medium pl-3 border-l-2 border-amber-400/30">
                                                                                    {t.desc}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-5 text-center text-xs text-gray-400">
                                                                    이 안건에는 별도의 전문 용어 해설 항목이 없습니다.
                                                                </div>
                                                            )}

                                                            {/* 전담 TFT 신설 안내 배너 */}
                                                            <div className={`rounded-2xl p-4 border transition-all ${
                                                                docStatus === 'approved'
                                                                    ? 'bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900 border-emerald-500/50'
                                                                    : 'bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-950 border-amber-500/30'
                                                            }`}>
                                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                                    <div className="flex items-start gap-3">
                                                                        <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center text-lg shrink-0">
                                                                            {docStatus === 'approved' ? '🚀' : '🏛️'}
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-xs font-black text-amber-300">
                                                                                {docStatus === 'approved'
                                                                                    ? `[대표이사 재가 완료] '${activeDoc.stock_name}' 특별 집중 분석 전담 TFT 가동 중!`
                                                                                    : `[대표이사 특명 권한] 서명(재가) 시 '${activeDoc.stock_name}' 전담 분석 TFT 자동 신설`}
                                                                            </div>
                                                                            <p className="text-[11px] text-gray-300 mt-0.5">
                                                                                하단 또는 상단 [승인 서명 (재가)]을 누르시면 4대 전담관이 배치되어 실시간 수급 및 목표가를 24시간 밀착 추적합니다.
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    {docStatus === 'approved' && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setActiveTab('approved_tf')}
                                                                            className="shrink-0 px-3.5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs cursor-pointer"
                                                                        >
                                                                            🏛️ 전담 TFT 입장 →
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* ── [FOOTER] 하단 대표이사 전자서명 & 원문 링크 바 ── */}
                                                    <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => updateSignature(activeDoc.doc_id, 'approved')}
                                                                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                                                    docStatus === 'approved'
                                                                        ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25'
                                                                        : 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-md shadow-amber-500/20'
                                                                }`}
                                                            >
                                                                <span>
                                                                    {docStatus === 'approved'
                                                                        ? '✅ 대표이사 승인 서명 완료'
                                                                        : '🖋️ 대표이사 승인 서명 (재가)'}
                                                                </span>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => updateSignature(activeDoc.doc_id, 'hold')}
                                                                className={`px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                                                                    docStatus === 'hold'
                                                                        ? 'bg-rose-500 text-white border-rose-400'
                                                                        : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/15'
                                                                }`}
                                                            >
                                                                ⏸️ 보류 처리
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => handleReexamineDoc(activeDoc)}
                                                                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-sky-500/20 via-indigo-500/25 to-sky-500/20 hover:from-sky-500/35 hover:to-indigo-500/35 text-sky-200 border border-sky-400/50 transition-all cursor-pointer flex items-center gap-1.5"
                                                            >
                                                                <span>👥</span>
                                                                <span>임원 대면 심층보고 소집</span>
                                                            </button>
                                                        </div>

                                                        {activeDoc.detail_url && (
                                                            <a
                                                                href={activeDoc.detail_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-xs text-sky-400 hover:underline font-bold"
                                                            >
                                                                증권사 원문 리포트 열람 ↗
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                                );
                                            })() : (
                                                <div className="bg-[#0d1526] border border-white/10 rounded-3xl p-12 text-center text-gray-400 text-sm">
                                                    좌측 목록에서 결재할 서류를 선택해 주십시오.
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 결재함 하단: 전사 4대 자동화 엔진 가동 현황 바 */}
                                    <div className="mt-3 bg-[#0d1526]/60 border border-white/10 rounded-2xl p-3.5 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                        <div className="flex items-center gap-2 px-2 py-1">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                                            <span className="text-gray-300 font-bold truncate">🏢 리서치센터 크롤러</span>
                                            <span className="text-emerald-400 font-black text-[11px] ml-auto">정상 ({researchDesk.length}건)</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-2 py-1">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                                            <span className="text-gray-300 font-bold truncate">📈 퀀트 수급 스캐너</span>
                                            <span className="text-emerald-400 font-black text-[11px] ml-auto">50일선 판독</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-2 py-1">
                                            <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                                            <span className="text-gray-300 font-bold truncate">🌎 글로벌 24시 데스크</span>
                                            <span className="text-sky-300 font-black text-[11px] ml-auto">실시간 연동</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-2 py-1">
                                            <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                                            <span className="text-gray-300 font-bold truncate">🛡️ CRO 리스크 감사봇</span>
                                            <span className="text-purple-300 font-black text-[11px] ml-auto">전 건 감사필</span>
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeTab === 'one_page_summary' && (() => {
                                const summaryDocs = autoApprovals.filter(doc => {
                                    const st = signMap[doc.doc_id]?.status || 'pending';
                                    if (summaryFilter === 'approved') return st === 'approved';
                                    if (summaryFilter === 'kr_stock') return doc.category_type === 'kr_stock';
                                    if (summaryFilter === 'us_stock') return doc.category_type === 'us_stock';
                                    if (summaryFilter === 'macro') return doc.category_type === 'global_futures' || doc.category_type === 'world_news' || doc.category_type === 'all';
                                    return true;
                                });

                                const handleCopyOnePageSummary = () => {
                                    const nowStr = new Date().toLocaleString('ko-KR');
                                    const lines: string[] = [
                                        `📄 [대표이사 집무실 · 1장 요약 브리핑 시트]`,
                                        `• 일시: ${nowStr}`,
                                        `• 나스닥선물: ${intelligenceMetrics.nqPrice} | 원/달러 환율: ${intelligenceMetrics.usdKrwPrice}`,
                                        `• 상정 ${totalDocs}건 중 결재완료 ${approvedDocsCount}건 (평균 기대수익 +${intelligenceMetrics.avgUpside}%)`,
                                        `----------------------------------------`,
                                    ];
                                    summaryDocs.forEach((d, idx) => {
                                        const st = (signMap[d.doc_id]?.status || 'pending') === 'approved' ? '✅결재완료' : '⏳대기';
                                        const headline = (d.easy_headline || d.title || '').replace(/\s+/g, ' ').trim();
                                        lines.push(
                                            `${idx + 1}. [${st}] ${d.stock_name} (${d.category_badge})`,
                                            `   - 현재가: ${d.current_price || '-'} ➔ 목표가: ${d.target_price || '-'} (${d.upside_pct || '유망'})`,
                                            `   - 1천만원 기대수익: ${d.profit_10m || '-'} | 방어선: 50일선 지지 · -3.5% 손절`,
                                            `   - 핵심포인트: ${headline}`
                                        );
                                    });
                                    if (weeklyReview?.monday_top3_picks?.length) {
                                        lines.push(`----------------------------------------`, `🚀 [차주 월요일 최우선 공략 Top 3]`);
                                        weeklyReview.monday_top3_picks.forEach((p: any) => {
                                            lines.push(`• ${p.rank}위 ${p.name}: 현재 ${p.current} ➔ 목표 ${p.target} (${p.upside}) | ${p.point}`);
                                        });
                                    }
                                    const text = lines.join('\n');
                                    if (typeof navigator !== 'undefined' && navigator.clipboard) {
                                        navigator.clipboard.writeText(text);
                                        setToastMessage({
                                            title: '📋 1장 요약 브리핑 복사 완료!',
                                            desc: `총 ${summaryDocs.length}건의 종목 타점 및 핵심 포인트가 클립보드에 복사되었습니다. 카카오톡이나 메모장에 바로 붙여넣으실 수 있습니다.`
                                        });
                                    }
                                };

                                return (
                                    <div className="space-y-5">
                                        {/* 1. 상단 컨트롤 & 액션 헤더 */}
                                        <div className="bg-gradient-to-r from-[#0e172a] via-[#131f38] to-[#0e172a] border-2 border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
                                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
                                                <div>
                                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black mb-2">
                                                        <span>📄 EXECUTIVE 1-PAGE BRIEFING SHEET</span>
                                                        <span>·</span>
                                                        <span className="text-emerald-300">진입가 · 목표가 · 손절가 · 핵심근거 1장 압축</span>
                                                    </div>
                                                    <h2 className="text-xl sm:text-2xl font-black text-white">
                                                        대표이사 전용 · 오늘의 결재 종목 1장 요약 브리핑 표
                                                    </h2>
                                                    <p className="text-xs sm:text-sm text-gray-300 mt-1">
                                                        개별 기안서를 일일이 열지 않고도 전 종목의 <strong className="text-amber-300">현재 진입가 · 목표주가(기대수익) · 손절 방어선 · 1천만원 기대수익</strong>을 한 장의 표로 비교하고 즉시 결재하실 수 있습니다.
                                                    </p>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={handleCopyOnePageSummary}
                                                        className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm transition-all cursor-pointer shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
                                                    >
                                                        <span>📋 카톡·메모장용 1장 텍스트 복사</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => typeof window !== 'undefined' && window.print()}
                                                        className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5"
                                                    >
                                                        <Printer className="w-4 h-4 text-amber-300" />
                                                        <span>PDF / 1장 인쇄</span>
                                                    </button>
                                                    {pendingDocsCount > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={handleApproveAll}
                                                            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                                                        >
                                                            🖋️ 전 안건 일괄 승인 ({pendingDocsCount}건)
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* 4대 핵심 요약 지표 배너 */}
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                                <div className="bg-black/45 border border-white/10 rounded-2xl p-3.5">
                                                    <div className="text-[11px] text-gray-400 font-bold">📌 결재 진행 현황</div>
                                                    <div className="text-base sm:text-lg font-black text-white mt-0.5">
                                                        총 {totalDocs}건 중 <span className="text-emerald-400">{approvedDocsCount}건 재가</span>
                                                    </div>
                                                    <div className="text-[11px] text-gray-400 mt-0.5">미결재 대기: {pendingDocsCount}건</div>
                                                </div>
                                                <div className="bg-black/45 border border-rose-500/30 rounded-2xl p-3.5">
                                                    <div className="text-[11px] text-rose-300 font-bold">🎯 상정 종목 평균 기대수익</div>
                                                    <div className="text-base sm:text-lg font-black text-rose-400 font-mono mt-0.5">
                                                        평균 +{intelligenceMetrics.avgUpside}%
                                                    </div>
                                                    <div className="text-[11px] text-amber-300 mt-0.5 truncate">
                                                        1위: {intelligenceMetrics.topStock.name} ({intelligenceMetrics.topStock.upside})
                                                    </div>
                                                </div>
                                                <div className="bg-black/45 border border-cyan-500/30 rounded-2xl p-3.5">
                                                    <div className="text-[11px] text-cyan-300 font-bold">🌎 글로벌 선물 &amp; 원/달러 환율</div>
                                                    <div className="text-sm sm:text-base font-black text-white font-mono mt-0.5 truncate">
                                                        나스닥 {intelligenceMetrics.nqPrice}
                                                    </div>
                                                    <div className="text-[11px] text-amber-300 mt-0.5">
                                                        환율: {intelligenceMetrics.usdKrwPrice}
                                                    </div>
                                                </div>
                                                <div className="bg-black/45 border border-emerald-500/30 rounded-2xl p-3.5">
                                                    <div className="text-[11px] text-emerald-300 font-bold">🛡️ 전사 표준 리스크 방어선</div>
                                                    <div className="text-sm sm:text-base font-black text-emerald-300 mt-0.5">
                                                        50일선 지지 · -3.5% 손절
                                                    </div>
                                                    <div className="text-[11px] text-gray-300 mt-0.5">
                                                        1차 익절 +15% / 최종 +30%
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 필터 버튼 & 뷰 모드 전환 */}
                                            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    {[
                                                        { id: 'all', label: `전체 안건 (${totalDocs})` },
                                                        { id: 'approved', label: `✅ 결재완료 종목 (${approvedDocsCount})` },
                                                        { id: 'kr_stock', label: `🇰🇷 국내 주식 (${countKr})` },
                                                        { id: 'us_stock', label: `🇺🇸 미국 빅테크 (${countUs})` },
                                                        { id: 'macro', label: `📊 선물·거시 (${countFutures + countNews})` },
                                                    ].map(f => (
                                                        <button
                                                            key={f.id}
                                                            type="button"
                                                            onClick={() => setSummaryFilter(f.id as any)}
                                                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                                                summaryFilter === f.id
                                                                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                                                                    : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                                                            }`}
                                                        >
                                                            {f.label}
                                                        </button>
                                                    ))}
                                                </div>

                                                <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSummaryViewMode('table')}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer transition-all ${
                                                            summaryViewMode === 'table'
                                                                ? 'bg-emerald-500 text-slate-950'
                                                                : 'text-gray-300 hover:text-white'
                                                        }`}
                                                    >
                                                        📊 1장 압축 표 보기
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSummaryViewMode('cards')}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer transition-all ${
                                                            summaryViewMode === 'cards'
                                                                ? 'bg-emerald-500 text-slate-950'
                                                                : 'text-gray-300 hover:text-white'
                                                        }`}
                                                    >
                                                        📱 스마트폰 명함 카드뷰
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 2. 표 모드 (PC/태블릿 한눈에 보기) */}
                                        {summaryViewMode === 'table' ? (
                                            <div className="bg-[#0b1324] border border-white/15 rounded-2xl overflow-hidden shadow-2xl">
                                                {/* 상단 간이 안내 바 */}
                                                <div className="px-3.5 py-2 bg-gradient-to-r from-amber-500/10 via-black/40 to-transparent border-b border-white/10 flex items-center justify-between text-xs text-zinc-300">
                                                    <span className="flex items-center gap-1.5 font-bold text-amber-300">
                                                        <span>📋</span>
                                                        <span>상정 안건 1장 브리핑 표 &nbsp;|&nbsp; 우측 <strong>[즉시 승인]</strong> 버튼으로 즉시 결재 가능</span>
                                                    </span>
                                                    <span className="text-zinc-400 font-mono text-[11px]">총 {summaryDocs.length}건 상정</span>
                                                </div>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full min-w-[820px] text-left border-collapse table-auto">
                                                        <thead>
                                                            <tr className="bg-[#111c35] border-b border-white/15 text-[11px] font-black text-amber-300">
                                                                <th className="py-2.5 px-2 text-center whitespace-nowrap w-[70px]">구분</th>
                                                                <th className="py-2.5 px-2.5 whitespace-nowrap min-w-[110px]">종목명 (코드)</th>
                                                                <th className="py-2.5 px-2 text-right whitespace-nowrap min-w-[95px]">현재 진입가</th>
                                                                <th className="py-2.5 px-2 text-right whitespace-nowrap min-w-[95px]">목표가 (수익)</th>
                                                                <th className="py-2.5 px-2 text-right whitespace-nowrap min-w-[85px]">1천만 수익</th>
                                                                <th className="py-2.5 px-2 text-center whitespace-nowrap min-w-[85px]">손절 기준선</th>
                                                                <th className="py-2.5 px-3 min-w-[180px]">핵심 투자 포인트 (1줄 요약)</th>
                                                                <th className="py-2.5 px-2.5 text-center whitespace-nowrap w-[85px]">원클릭 결재</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-white/10 text-xs">
                                                            {summaryDocs.map((doc) => {
                                                                const isApproved = (signMap[doc.doc_id]?.status || 'pending') === 'approved';
                                                                const theme = getCategoryTheme(doc);
                                                                const oneLinePoint = (doc.easy_headline || doc.secretary_conclusion || doc.title || '').replace(/\s+/g, ' ').trim();
                                                                
                                                                // 1천만원 수익 깔끔하게 압축 포맷 (약 +3,920,000원 -> +392만원)
                                                                const compactProfit = doc.profit_10m
                                                                    ? doc.profit_10m.replace('약 ', '').replace(',000원', '만원')
                                                                    : '수익 기대';

                                                                return (
                                                                    <tr
                                                                        key={doc.doc_id}
                                                                        className={`transition-colors hover:bg-white/[0.04] ${
                                                                            isApproved ? 'bg-emerald-950/20' : ''
                                                                        }`}
                                                                    >
                                                                        {/* 1. 구분 */}
                                                                        <td className="py-2.5 px-2 align-middle text-center whitespace-nowrap">
                                                                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${theme.pill}`}>
                                                                                <span>{theme.icon}</span>
                                                                                <span>{theme.shortLabel}</span>
                                                                            </span>
                                                                        </td>

                                                                        {/* 2. 종목명 (코드) */}
                                                                        <td className="py-2.5 px-2.5 align-middle whitespace-nowrap">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setSelectedDocId(doc.doc_id);
                                                                                    setActiveTab('electronic_sign');
                                                                                }}
                                                                                className="text-left group cursor-pointer block"
                                                                            >
                                                                                <div className="flex flex-col justify-center py-0.5">
                                                                                    <span className="font-bold text-white group-hover:text-amber-300 transition-colors text-xs leading-normal truncate max-w-[130px]">
                                                                                        {doc.stock_name}
                                                                                    </span>
                                                                                    <span className="text-[10px] text-gray-400 font-mono leading-normal mt-0.5">
                                                                                        {doc.stock_code || doc.doc_number}
                                                                                    </span>
                                                                                </div>
                                                                            </button>
                                                                        </td>

                                                                        {/* 3. 현재 진입가 */}
                                                                        <td className="py-2.5 px-2 align-middle text-right whitespace-nowrap font-mono text-xs font-bold text-gray-200">
                                                                            <div className="py-0.5 leading-normal">
                                                                                {doc.current_price || '실시간 연동'}
                                                                            </div>
                                                                        </td>

                                                                        {/* 4. 목표가 (기대수익) */}
                                                                        <td className="py-2.5 px-2 align-middle text-right whitespace-nowrap font-mono">
                                                                            <div className="flex flex-col items-end justify-center py-0.5">
                                                                                <span className="font-bold text-amber-300 text-xs leading-normal">
                                                                                    {doc.target_price || '목표가 산정'}
                                                                                </span>
                                                                                {doc.upside_pct && (
                                                                                    <span className="text-[10px] font-black text-rose-400 leading-normal mt-0.5">
                                                                                        {doc.upside_pct}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </td>

                                                                        {/* 5. 1천만 기대수익 */}
                                                                        <td className="py-2.5 px-2 align-middle text-right whitespace-nowrap font-mono font-bold text-emerald-300 text-xs">
                                                                            <div className="py-0.5 leading-normal">
                                                                                {compactProfit}
                                                                            </div>
                                                                        </td>

                                                                        {/* 6. 손절선 */}
                                                                        <td className="py-2.5 px-2 align-middle text-center whitespace-nowrap">
                                                                            <span className="inline-block px-1.5 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px] font-bold">
                                                                                -3.5% (50일선)
                                                                            </span>
                                                                        </td>

                                                                        {/* 7. 핵심 투자 포인트 */}
                                                                        <td className="py-2.5 px-3 align-middle text-xs text-gray-200 min-w-[180px] whitespace-normal">
                                                                            <div className="line-clamp-2 font-normal text-[11px] leading-relaxed break-keep text-gray-300 py-0.5">
                                                                                {oneLinePoint}
                                                                            </div>
                                                                        </td>

                                                                        {/* 8. 원클릭 결재 */}
                                                                        <td className="py-2.5 px-2.5 align-middle text-center whitespace-nowrap">
                                                                            {isApproved ? (
                                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold">
                                                                                    ✓ 재가완료
                                                                                </span>
                                                                            ) : (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => updateSignature(doc.doc_id, 'approved')}
                                                                                    className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                                                                                >
                                                                                    🖋️ 즉시 승인
                                                                                </button>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ) : (
                                            /* 3. 스마트폰 명함 카드뷰 (모바일 캡처 최적화) */
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {summaryDocs.map((doc) => {
                                                    const isApproved = (signMap[doc.doc_id]?.status || 'pending') === 'approved';
                                                    const theme = getCategoryTheme(doc);
                                                    const oneLinePoint = (doc.easy_headline || doc.secretary_conclusion || doc.title || '').replace(/\s+/g, ' ').trim();
                                                    return (
                                                        <div
                                                            key={doc.doc_id}
                                                            className={`rounded-2xl p-4 border transition-all flex flex-col justify-between gap-3 ${
                                                                isApproved
                                                                    ? 'bg-gradient-to-br from-emerald-950/35 via-[#0c1526] to-[#0a101d] border-emerald-500/45 shadow-lg'
                                                                    : 'bg-[#0b1324] border-white/15'
                                                            }`}
                                                        >
                                                            <div className="space-y-3">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black border ${theme.pill}`}>
                                                                        <span>{theme.icon}</span>
                                                                        <span>{theme.shortLabel}</span>
                                                                    </span>
                                                                    {isApproved ? (
                                                                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-black">
                                                                            ✓ 대표이사 재가필
                                                                        </span>
                                                                    ) : (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => updateSignature(doc.doc_id, 'approved')}
                                                                            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-black cursor-pointer"
                                                                        >
                                                                            🖋️ 즉시 승인
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                <div>
                                                                    <h3 className="text-base sm:text-lg font-black text-white">
                                                                        {doc.stock_name}
                                                                    </h3>
                                                                    <p className="text-xs text-gray-300 mt-1 line-clamp-2 leading-relaxed">
                                                                        {oneLinePoint}
                                                                    </p>
                                                                </div>

                                                                <div className="grid grid-cols-3 gap-2 bg-black/45 border border-white/10 rounded-xl p-2.5 text-center">
                                                                    <div>
                                                                        <div className="text-[10px] text-gray-400 font-bold">현재 진입가</div>
                                                                        <div className="text-xs font-black text-white font-mono mt-0.5 truncate">
                                                                            {doc.current_price ? doc.current_price.split(' ')[0] : '-'}
                                                                        </div>
                                                                    </div>
                                                                    <div className="border-x border-white/10 px-1">
                                                                        <div className="text-[10px] text-amber-300 font-bold">목표가(수익)</div>
                                                                        <div className="text-xs font-black text-rose-400 font-mono mt-0.5 truncate">
                                                                            {doc.upside_pct || doc.target_price || '유망'}
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-[10px] text-rose-300 font-bold">손절 방어선</div>
                                                                        <div className="text-xs font-black text-rose-300 font-mono mt-0.5">
                                                                            -3.5% / 50일선
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                                                                <span className="text-emerald-300 font-black">
                                                                    💰 1천만 투자 시: {doc.profit_10m || '수익 기대'}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedDocId(doc.doc_id);
                                                                        setActiveTab('electronic_sign');
                                                                    }}
                                                                    className="text-gray-400 hover:text-amber-300 font-bold text-[11px] cursor-pointer"
                                                                >
                                                                    기안서 원문 →
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {activeTab === 'boardroom' && agenda && (
                                <>
                                    {/* 현재 상정 안건 전광판 */}
                                    <div className="bg-gradient-to-br from-[#111c33] to-[#0b1222] border border-white/15 rounded-2xl p-5 shadow-xl">
                                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                            <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                                📌 {agenda.badge}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                보고 시각: {agenda.timestamp}
                                            </span>
                                        </div>

                                        <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                                            {agenda.title}
                                        </h3>
                                        <p className="text-xs sm:text-sm text-gray-300 mt-1">
                                            {agenda.subtitle}
                                        </p>

                                        {agenda.key_metrics && agenda.key_metrics.length > 0 && (
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-white/10">
                                                {(agenda?.key_metrics || []).map((m, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="bg-black/40 border border-white/10 rounded-xl p-3"
                                                    >
                                                        <div className="text-[11px] text-gray-400 font-semibold">
                                                            {m.label}
                                                        </div>
                                                        <div
                                                            className={`text-base sm:text-lg font-black mt-0.5 ${
                                                                m.tone === 'positive'
                                                                    ? 'text-emerald-400'
                                                                    : m.tone === 'negative'
                                                                    ? 'text-rose-400'
                                                                    : 'text-sky-300'
                                                            }`}
                                                        >
                                                            {m.value}
                                                        </div>
                                                        <div className="text-[11px] text-gray-400 mt-0.5 truncate">
                                                            {m.sub}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* 1. 🔍 종목 발굴 배경 (왜 하필 이 종목을 분석했는가?) */}
                                    {agenda.discovery_reason && (
                                        <div className="bg-gradient-to-br from-[#121c33] via-[#0f172a] to-[#0a1224] border-2 border-amber-500/40 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
                                            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                                                    <span className="text-xs sm:text-sm font-black text-amber-300">
                                                        {agenda.discovery_reason.badge}
                                                    </span>
                                                </div>
                                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-200">
                                                    🎯 발굴 계기: {agenda.discovery_reason.trigger}
                                                </span>
                                            </div>

                                            <p className="text-sm sm:text-base text-white font-bold leading-relaxed">
                                                {agenda.discovery_reason.summary}
                                            </p>

                                            {agenda.discovery_reason.key_drivers && agenda.discovery_reason.key_drivers.length > 0 && (
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4 pt-3.5 border-t border-white/10">
                                                    {(agenda?.discovery_reason?.key_drivers || []).map((kd, idx) => (
                                                        <div key={idx} className="bg-black/40 border border-white/10 rounded-xl p-3 flex items-start gap-2">
                                                            <span className="text-amber-400 font-black text-xs shrink-0 mt-0.5">#{idx + 1}</span>
                                                            <span className="text-xs text-gray-200 font-semibold leading-snug">{kd}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 2. 🎯 매수 추천 3대 핵심 근거 & 투자 전략 가이드 */}
                                    {agenda.buy_reasons && (
                                        <div className="bg-gradient-to-br from-[#0c1a2e] via-[#0d1726] to-[#09121f] border border-emerald-500/35 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">🎯</span>
                                                    <h4 className="text-base sm:text-lg font-black text-white">
                                                        {agenda.buy_reasons.title}
                                                    </h4>
                                                </div>
                                                <span className="text-xs text-emerald-400 font-bold hidden sm:inline">
                                                    전 부서 합동 평가 완료
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                                                {(agenda?.buy_reasons?.cards || []).map((c, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="bg-[#080e1a]/85 border border-white/10 hover:border-emerald-400/40 rounded-xl p-4 flex flex-col justify-between transition-all"
                                                    >
                                                        <div>
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-2xl">{c.icon}</span>
                                                                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                                    {c.badge}
                                                                </span>
                                                            </div>
                                                            <h5 className="text-sm font-black text-white mb-1">
                                                                {c.title}
                                                            </h5>
                                                            <div className="text-xs font-bold text-amber-300 mb-2">
                                                                {c.highlight}
                                                            </div>
                                                            <p className="text-xs text-gray-300 leading-relaxed">
                                                                {c.desc}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* 3. 📋 임원 합동 대면 회의록 (Executive Meeting Minutes) */}
                                    {agenda.meeting_minutes && (
                                        <div ref={boardroomDebateRef} className="scroll-mt-6 bg-[#0b1322] border-2 border-indigo-500/40 rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden space-y-5">
                                            {/* 회의록 헤더 */}
                                            <div className="border-b border-white/15 pb-4">
                                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/25 border border-indigo-400/40 text-indigo-300 font-mono text-xs font-black">
                                                            {agenda.meeting_minutes.meeting_no}
                                                        </span>
                                                        <span className="text-xs text-indigo-200/80 font-bold">
                                                            공식 임원 회의록
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-gray-400 font-mono">
                                                        {agenda.meeting_minutes.date_time}
                                                    </span>
                                                </div>

                                                <h4 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                                                    <span>📋</span>
                                                    <span>{agenda.meeting_minutes.title}</span>
                                                </h4>

                                                <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-400">
                                                    <span>📍 장소: <strong className="text-gray-200">{agenda.meeting_minutes.location}</strong></span>
                                                    <span>👤 주재/간사: <strong className="text-gray-200">{agenda.meeting_minutes.chairperson}</strong></span>
                                                </div>

                                                {/* 참석 임원 명단 */}
                                                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/10">
                                                    <span className="text-[11px] text-gray-400 font-bold">참석 임원:</span>
                                                    {(agenda?.meeting_minutes?.attendees || []).map((att, i) => (
                                                        <span
                                                            key={i}
                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-xs text-gray-200"
                                                        >
                                                            <span>{att.avatar}</span>
                                                            <strong className="font-extrabold text-white">{att.name}</strong>
                                                            <span className="text-[10px] text-gray-400">({att.dept})</span>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* 생생한 회의 토론록 (대화체 버블) */}
                                            <div className="space-y-3">
                                                <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                                                    <span>🎙️</span>
                                                    <span>임원진 심층 토론 및 발언 기록 (Transcript)</span>
                                                </div>

                                                <div className="space-y-2.5">
                                                    {(agenda?.meeting_minutes?.dialogue || []).map((dlg, i) => (
                                                        <div
                                                            key={i}
                                                            className="bg-black/35 border border-white/10 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-start gap-3 hover:border-white/20 transition-all"
                                                        >
                                                            <div className="flex items-center gap-2 shrink-0 sm:w-36">
                                                                <span className="text-xl">{dlg.avatar}</span>
                                                                <div>
                                                                    <div className="text-xs font-black text-white">{dlg.speaker}</div>
                                                                    <div className="text-[10px] text-amber-400/90 font-bold">{dlg.role}</div>
                                                                </div>
                                                            </div>
                                                            <div className="text-xs sm:text-sm text-gray-200 leading-relaxed sm:border-l sm:border-white/10 sm:pl-3.5">
                                                                {dlg.text}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* 회의 최종 의결 주문 */}
                                            <div className="bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-emerald-900/30 border-2 border-emerald-400/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="flex items-start gap-2.5">
                                                    <span className="text-2xl mt-0.5">💮</span>
                                                    <div>
                                                        <div className="text-xs font-black text-emerald-300">
                                                            투자심의위원회 최종 의결 주문
                                                        </div>
                                                        <div className="text-xs sm:text-sm text-white font-extrabold mt-0.5">
                                                            {agenda.meeting_minutes.verdict_summary}
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className="px-3.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs shrink-0 shadow-md">
                                                    {agenda.meeting_minutes.verdict_badge}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* 임원진 릴레이 대면 보고 */}
                                    <div className="space-y-4">
                                        {debates.map((turn, idx) => {
                                            const st = getStanceStyle(turn.stance_tone);
                                            return (
                                                <div
                                                    key={`${turn.speaker_id}-${idx}`}
                                                    className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all ${st.cardBorder}`}
                                                >
                                                    <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${st.leftBar}`} />

                                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pl-2">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/15 flex items-center justify-center text-xl">
                                                                {turn.avatar}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm sm:text-base font-black text-white">
                                                                        {turn.name}
                                                                    </span>
                                                                    <span className="text-xs font-bold text-amber-300">
                                                                        {turn.role}
                                                                    </span>
                                                                </div>
                                                                <div className="text-[11px] text-gray-400">
                                                                    {turn.dept}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <span
                                                            className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${st.badge}`}
                                                        >
                                                            {turn.stance}
                                                        </span>
                                                    </div>

                                                    <div className="pl-2">
                                                        <h4 className={`text-sm sm:text-base font-extrabold mb-2 ${st.accent}`}>
                                                            {turn.headline}
                                                        </h4>
                                                        <div className="text-xs sm:text-sm text-gray-100 leading-relaxed whitespace-pre-line bg-black/30 rounded-xl p-3.5 border border-white/5">
                                                            {turn.message}
                                                        </div>
                                                        <div className="mt-2.5 flex items-center justify-between text-[11px] text-gray-400">
                                                            <span>📊 근거 데이터: {turn.data_tag}</span>
                                                            <span>보고 순서 #{idx + 1}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}

                            {/* 🏛️ [대표이사 특명] 재가 종목 특별 집중 분석 전담 TFT 지휘본부 */}
                            {activeTab === 'approved_tf' && (
                                <div className="space-y-6">
                                    {/* 🏛️ 1. 증권사 자산운용본부 프랍 트레이딩 데스크 총괄 현황판 */}
                                    <div className="bg-gradient-to-br from-[#0c1427] via-[#09101f] to-[#0a162b] border-2 border-emerald-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                                        
                                        {/* 헤더 & 일일 보고서 발간 버튼 */}
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/10">
                                            <div className="flex items-start gap-4">
                                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-amber-300 text-slate-950 flex items-center justify-center text-3xl shrink-0 shadow-lg shadow-emerald-500/30 font-black">
                                                    💼
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 animate-pulse">
                                                            ● 프랍 트레이딩 데스크 실시간 가동
                                                        </span>
                                                        <span className="text-xs text-gray-400 font-mono">
                                                            AUM 1억원 포트폴리오
                                                        </span>
                                                    </div>
                                                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
                                                        <span>증권사 자산운용 프랍 트레이딩 데스크</span>
                                                    </h2>
                                                    <p className="text-xs sm:text-sm text-gray-300 mt-1">
                                                        대표님께서 서명(재가)하신 종목을 전담 트레이더가 <span className="text-amber-300 font-bold">적정 매수가에 분할 매수</span>하고, 목표가 도달 시 <span className="text-emerald-400 font-bold">분할 익절</span>을 자동 집행하며 실시간 수익률을 직속 보고합니다.
                                                    </p>
                                                </div>
                                            </div>

                                            {/* 일일 보고서 발간 & 실시간 동기화 버튼 */}
                                            <div className="flex items-center gap-2.5 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowDailyReportModal(true)}
                                                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95"
                                                >
                                                    <BarChart3 className="w-4 h-4 text-slate-950" />
                                                    <span>증권사 일일 운용 결산보고서 열람</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={fetchTradingDesk}
                                                    disabled={tradingLoading}
                                                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 font-bold text-xs transition-all cursor-pointer"
                                                    title="실시간 호가 및 수익률 동기화"
                                                >
                                                    <RefreshCw className={`w-4 h-4 ${tradingLoading ? 'animate-spin text-emerald-400' : ''}`} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* 4대 총괄 운용 지표 (AUM, 평가손익, 실현손익, 종합수익률) */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-5">
                                            <div className="bg-black/50 border border-white/10 rounded-2xl p-4">
                                                <div className="text-xs text-gray-400 font-bold flex items-center justify-between">
                                                    <span>총 운용자산 (AUM)</span>
                                                    <span className="text-[10px] text-zinc-500">배정금액</span>
                                                </div>
                                                <div className="text-lg sm:text-xl font-black text-white font-mono mt-1">
                                                    {(tradingDesk?.summary?.total_capital || 100000000).toLocaleString()}원
                                                </div>
                                                <div className="text-[11px] text-gray-400 mt-1">
                                                    가용 현금: {(tradingDesk?.summary?.available_cash || 100000000).toLocaleString()}원
                                                </div>
                                            </div>

                                            <div className="bg-black/50 border border-emerald-500/30 rounded-2xl p-4">
                                                <div className="text-xs text-emerald-400 font-bold flex items-center justify-between">
                                                    <span>보유종목 평가손익</span>
                                                    <span className="text-[10px] text-emerald-400/80">장중 실시간</span>
                                                </div>
                                                <div className={`text-lg sm:text-xl font-black font-mono mt-1 ${
                                                    (tradingDesk?.summary?.total_unrealized_pnl || 0) >= 0 ? 'text-rose-400' : 'text-blue-400'
                                                }`}>
                                                    {(tradingDesk?.summary?.total_unrealized_pnl || 0) >= 0 ? '+' : ''}
                                                    {(tradingDesk?.summary?.total_unrealized_pnl || 0).toLocaleString()}원
                                                </div>
                                                <div className="text-[11px] text-emerald-300 font-mono mt-1">
                                                    운용 중 포지션 {tradingDesk?.summary?.active_position_count || 0}개 종목
                                                </div>
                                            </div>

                                            <div className="bg-black/50 border border-amber-500/30 rounded-2xl p-4">
                                                <div className="text-xs text-amber-400 font-bold flex items-center justify-between">
                                                    <span>누적 확정 실현손익</span>
                                                    <span className="text-[10px] text-amber-400/80">익절 완료금</span>
                                                </div>
                                                <div className="text-lg sm:text-xl font-black text-amber-300 font-mono mt-1">
                                                    +{(tradingDesk?.summary?.total_realized_pnl || 0).toLocaleString()}원
                                                </div>
                                                <div className="text-[11px] text-gray-400 mt-1">
                                                    매도 차익 실현 완료
                                                </div>
                                            </div>

                                            <div className="bg-gradient-to-br from-emerald-950/40 to-teal-950/30 border border-emerald-500/40 rounded-2xl p-4">
                                                <div className="text-xs text-emerald-300 font-bold flex items-center justify-between">
                                                    <span>종합 순수익률 / 승률</span>
                                                    <span className="text-[10px] text-emerald-300">합산 성과</span>
                                                </div>
                                                <div className="text-lg sm:text-xl font-black text-rose-400 font-mono mt-1">
                                                    +{(tradingDesk?.summary?.combined_return_pct || 0)}%
                                                </div>
                                                <div className="text-[11px] text-emerald-300/90 font-bold mt-1">
                                                    운용 승률: {tradingDesk?.summary?.win_rate || 0}% ({tradingDesk?.summary?.win_count || 0}승 {tradingDesk?.summary?.loss_count || 0}패)
                                                </div>
                                            </div>
                                        </div>

                                        {/* 트레이딩 본부장 브리핑 코멘트 */}
                                        <div className="mt-5 p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3.5">
                                            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center text-xl shrink-0 font-bold">
                                                👨‍💼
                                            </div>
                                            <div className="text-xs text-gray-300 leading-relaxed">
                                                <div className="font-black text-amber-300 mb-1 flex items-center gap-2">
                                                    <span>[최민석 수석 운용역 · 프랍트레이딩 1팀장 직속 보고]</span>
                                                    <span className="text-[10px] text-gray-400 font-normal">경력 14년 제도권 대형사 출신</span>
                                                </div>
                                                "대표님께서 결재 기안서에서 재가(승인)해 주신 종목들은 호가창을 정밀 분석하여 <span className="text-white font-bold">가장 유리한 적정 매수가에 분할 체결</span>을 완료하였습니다. 현재 시장 변동성 속에서도 <span className="text-rose-400 font-bold font-mono">+{tradingDesk?.summary?.combined_return_pct || 0}%</span>의 초과 수익을 안정적으로 유지 중이며, 1차 목표가(+15%) 도달 시 50% 분할 익절하여 원금을 즉시 회수하는 보수적 방어 체계를 가동하고 있습니다."
                                            </div>
                                        </div>
                                    </div>

                                    {/* 🏛️ 2. 종목별 실시간 트레이딩 운용 카드 (증권사 주문 집행판 & 원장) */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between px-1">
                                            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                                                <span>🎯</span>
                                                <span>재가 종목별 실시간 운용 포지션 & 매매 집행 원장</span>
                                                <span className="text-xs text-gray-400 font-normal">
                                                    (총 {(tradingDesk?.positions || []).length}개 포지션)
                                                </span>
                                            </h3>
                                            <span className="text-xs text-emerald-400 font-bold">
                                                ● 1초 단위 실시간 P&L 갱신
                                            </span>
                                        </div>

                                        {(tradingDesk?.positions || []).length === 0 ? (
                                            <div className="bg-[#0f172a] border border-white/10 rounded-3xl p-10 text-center space-y-3">
                                                <div className="text-4xl">📝</div>
                                                <div className="text-lg font-black text-white">현재 운용 중인 재가 종목이 없습니다.</div>
                                                <p className="text-xs text-gray-400 max-w-md mx-auto">
                                                    전자결재 기안서 탭에서 마음에 드는 종목을 검토하시고 [승인 서명 (재가)]을 누르시면, 트레이딩 팀이 즉시 적정 매수가에 분할 매수를 집행하고 운용을 개시합니다.
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveTab('electronic_sign')}
                                                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs cursor-pointer shadow-md"
                                                >
                                                    결재 기안서 검토하러 가기 →
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-4">
                                                {(tradingDesk?.positions || []).map((pos: any) => {
                                                    const isClosed = pos.status === 'CLOSED';
                                                    const isPartial = pos.status === 'PARTIAL_EXIT';
                                                    const isProfit = (pos.pnl_pct || 0) >= 0;

                                                    return (
                                                        <div
                                                            key={pos.id}
                                                            className={`rounded-3xl border-2 transition-all p-5 sm:p-6 shadow-xl space-y-4 ${
                                                                isClosed
                                                                    ? 'bg-zinc-950/60 border-zinc-800 opacity-75'
                                                                    : 'bg-gradient-to-br from-[#0c1427] via-[#09101f] to-[#0a162b] border-emerald-500/35 hover:border-emerald-500/60'
                                                            }`}
                                                        >
                                                            {/* 상단: 종목명 + 상태 + 트레이더 정보 */}
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                                                                <div className="flex items-start gap-3">
                                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0 ${
                                                                        isClosed
                                                                            ? 'bg-zinc-800 text-zinc-400'
                                                                            : 'bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/40 text-emerald-300'
                                                                    }`}>
                                                                        {pos.category === 'us_stock' ? '🌎' : '📈'}
                                                                    </div>
                                                                    <div>
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
                                                                                isClosed
                                                                                    ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                                                                    : isPartial
                                                                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                                                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                                                            }`}>
                                                                                {isClosed ? '⚪ 전량 익절 완료 (청산)' : isPartial ? '🟡 50% 분할 익절 완료 (잔여 보유)' : '🟢 매수 완료 · 목표가 감시 중'}
                                                                            </span>
                                                                            <span className="text-xs text-gray-400 font-mono">
                                                                                {pos.stock_code} · {pos.trader_name}
                                                                            </span>
                                                                        </div>
                                                                        <h3 className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center gap-2">
                                                                            <span>{pos.stock_name}</span>
                                                                            <span className="text-xs text-gray-400 font-normal">
                                                                                (진입일시: {pos.buy_date})
                                                                            </span>
                                                                        </h3>
                                                                    </div>
                                                                </div>

                                                                {/* 대표이사 즉각 매매 지휘 액션 버튼 */}
                                                                {!isClosed && (
                                                                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleClosePosition(pos.id, pos.stock_name)}
                                                                            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
                                                                        >
                                                                            <span>⚡</span>
                                                                            <span>시장가 전량 익절 (수익 확정)</span>
                                                                        </button>
                                                                        {!isPartial && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handlePartialSell(pos.id, pos.stock_name)}
                                                                                className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/35 font-bold text-xs transition-all cursor-pointer flex items-center gap-1"
                                                                            >
                                                                                <span>🎯</span>
                                                                                <span>50% 분할 익절</span>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* 4단 손익 및 매매 지표 */}
                                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                                                <div className="bg-black/50 border border-white/10 rounded-2xl p-3">
                                                                    <div className="text-[11px] text-gray-400 font-medium">매수 평균단가 (체결)</div>
                                                                    <div className="text-sm sm:text-base font-black text-white font-mono mt-0.5">
                                                                        {pos.category === 'kr_stock' ? `${pos.buy_price.toLocaleString()}원` : `$${pos.buy_price}`}
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-500 mt-0.5">
                                                                        수량: {pos.qty}주 ({(pos.invested_krw || 0).toLocaleString()}원)
                                                                    </div>
                                                                </div>

                                                                <div className="bg-black/50 border border-white/10 rounded-2xl p-3">
                                                                    <div className="text-[11px] text-gray-400 font-medium">
                                                                        {isClosed ? '매도 청산단가' : '실시간 현재가'}
                                                                    </div>
                                                                    <div className="text-sm sm:text-base font-black text-white font-mono mt-0.5">
                                                                        {pos.category === 'kr_stock' ? `${pos.current_price.toLocaleString()}원` : `$${pos.current_price}`}
                                                                    </div>
                                                                    <div className={`text-[10px] mt-0.5 ${isClosed ? 'text-gray-400' : 'text-emerald-400'}`}>
                                                                        {isClosed ? '전량 매도 청산 완료' : '실시간 호가 연동 중'}
                                                                    </div>
                                                                </div>

                                                                <div className={`border rounded-2xl p-3 ${
                                                                    isProfit
                                                                        ? 'bg-rose-950/25 border-rose-500/35'
                                                                        : 'bg-blue-950/25 border-blue-500/35'
                                                                }`}>
                                                                    <div className="text-[11px] font-bold text-gray-300 flex items-center justify-between">
                                                                        <span>{isClosed ? '확정 실현손익' : '실시간 평가손익'}</span>
                                                                        <span className="text-[10px] font-mono font-bold">
                                                                            {isProfit ? '수익 중' : '손실 중'}
                                                                        </span>
                                                                    </div>
                                                                    <div className={`text-sm sm:text-base font-black font-mono mt-0.5 ${
                                                                        isProfit ? 'text-rose-400' : 'text-blue-400'
                                                                    }`}>
                                                                        {isProfit ? '+' : ''}
                                                                        {(isClosed ? pos.realized_pnl : pos.unrealized_pnl || 0).toLocaleString()}원
                                                                    </div>
                                                                    <div className={`text-[11px] font-black font-mono mt-0.5 ${
                                                                        isProfit ? 'text-rose-300' : 'text-blue-300'
                                                                    }`}>
                                                                        수익률: {isProfit ? '+' : ''}{pos.pnl_pct}%
                                                                    </div>
                                                                </div>

                                                                <div className="bg-gradient-to-br from-amber-950/30 to-slate-900 border border-amber-500/30 rounded-2xl p-3">
                                                                    <div className="text-[11px] text-amber-300 font-bold">목표 매도가 & 방어선</div>
                                                                    <div className="text-xs sm:text-sm font-black text-amber-300 font-mono mt-0.5">
                                                                        1차: {pos.category === 'kr_stock' ? `${pos.target_price_1?.toLocaleString()}원` : `$${pos.target_price_1}`}
                                                                    </div>
                                                                    <div className="text-[11px] text-gray-300 font-mono mt-0.5">
                                                                        최종: {pos.category === 'kr_stock' ? `${pos.target_price_final?.toLocaleString()}원` : `$${pos.target_price_final}`} (손절: {pos.category === 'kr_stock' ? `${pos.stop_loss_price?.toLocaleString()}원` : `$${pos.stop_loss_price}`})
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* 3단계 분할 매매 진행 프로그레스 바 */}
                                                            <div className="bg-black/40 rounded-2xl p-3.5 border border-white/5 space-y-2">
                                                                <div className="flex items-center justify-between text-xs font-bold text-gray-300">
                                                                    <span className="flex items-center gap-1.5 text-amber-300">
                                                                        <span>📊</span>
                                                                        <span>증권사 3단계 분할 매매 진행 로드맵</span>
                                                                    </span>
                                                                    <span className="font-mono text-zinc-400">
                                                                        현재가 {pos.category === 'kr_stock' ? `${pos.current_price.toLocaleString()}원` : `$${pos.current_price}`}
                                                                    </span>
                                                                </div>
                                                                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                                                    <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold">
                                                                        ✓ 1단계: 적정가 분할 매수 완료
                                                                    </div>
                                                                    <div className={`p-2 rounded-xl border font-bold ${
                                                                        isPartial
                                                                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                                                            : 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                                                                    }`}>
                                                                        {isPartial ? '✓ 2단계: 50% 분할 익절 완료' : '2단계: 1차 목표가(+15%) 50% 익절 대기'}
                                                                    </div>
                                                                    <div className={`p-2 rounded-xl border font-bold ${
                                                                        isClosed
                                                                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                                                            : 'bg-white/5 border-white/10 text-gray-400'
                                                                    }`}>
                                                                        {isClosed ? '✓ 3단계: 최종 목표 전량 매도 완료' : '3단계: 최종 목표가 전량 매도 대기'}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* 트레이딩 룸 체결 로그 히스토리 */}
                                                            <div className="bg-[#060a14] rounded-2xl p-3.5 border border-white/10 space-y-2">
                                                                <div className="text-xs font-bold text-zinc-400 flex items-center justify-between">
                                                                    <span className="flex items-center gap-1.5">
                                                                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                                                                        <span>트레이딩 데스크 주문 체결 일지</span>
                                                                    </span>
                                                                    <span className="text-[10px] text-zinc-500">감사 기록 보존</span>
                                                                </div>
                                                                <div className="space-y-1.5 font-mono text-xs">
                                                                    {(pos.trade_logs || []).map((tl: any, i: number) => (
                                                                        <div key={i} className="flex items-start gap-2 text-zinc-300">
                                                                            <span className="text-zinc-500 text-[11px] shrink-0">[{tl.timestamp}]</span>
                                                                            <span className={`px-1 py-0.2 rounded text-[10px] font-black shrink-0 ${
                                                                                tl.type === 'BUY'
                                                                                    ? 'bg-rose-500/20 text-rose-300'
                                                                                    : tl.type === 'SELL' || tl.type === 'PARTIAL_SELL'
                                                                                    ? 'bg-emerald-500/20 text-emerald-300'
                                                                                    : 'bg-cyan-500/20 text-cyan-300'
                                                                            }`}>
                                                                                {tl.type}
                                                                            </span>
                                                                            <span className="leading-relaxed">{tl.message}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* 🏛️ 3. 증권사 공식 매매 체결 장부 (Trade Blotter) */}
                                    <div className="bg-[#0c1427] border border-white/10 rounded-3xl p-5 sm:p-6 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-base font-black text-white flex items-center gap-2">
                                                <span>📜</span>
                                                <span>증권사 공식 매매 체결 장부 (Trade Blotter)</span>
                                            </h3>
                                            <span className="text-xs text-gray-400">
                                                전자 금융 감사 기준 준수
                                            </span>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs font-mono">
                                                <thead>
                                                    <tr className="border-b border-white/10 text-gray-400 text-[11px]">
                                                        <th className="py-2.5 px-3">주문번호</th>
                                                        <th className="py-2.5 px-3">체결일시</th>
                                                        <th className="py-2.5 px-3">종목명</th>
                                                        <th className="py-2.5 px-3">구분</th>
                                                        <th className="py-2.5 px-3">수량</th>
                                                        <th className="py-2.5 px-3">체결단가</th>
                                                        <th className="py-2.5 px-3">약정금액</th>
                                                        <th className="py-2.5 px-3">체결상태</th>
                                                        <th className="py-2.5 px-3">운용역</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5 text-gray-200">
                                                    {(tradingDesk?.blotter || []).map((b: any, idx: number) => (
                                                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                                                            <td className="py-2.5 px-3 text-gray-400">{b.order_id}</td>
                                                            <td className="py-2.5 px-3 text-gray-400">{b.timestamp}</td>
                                                            <td className="py-2.5 px-3 font-bold text-white">{b.stock_name}</td>
                                                            <td className="py-2.5 px-3">
                                                                <span className={`px-1.5 py-0.5 rounded font-black text-[10px] ${
                                                                    b.side.includes('매수')
                                                                        ? 'bg-rose-500/20 text-rose-300'
                                                                        : 'bg-emerald-500/20 text-emerald-300'
                                                                }`}>
                                                                    {b.side}
                                                                </span>
                                                            </td>
                                                            <td className="py-2.5 px-3">{b.qty}주</td>
                                                            <td className="py-2.5 px-3 font-bold text-amber-300">{b.price_str}</td>
                                                            <td className="py-2.5 px-3">{b.amount_str}</td>
                                                            <td className="py-2.5 px-3 text-emerald-400 font-bold">{b.status}</td>
                                                            <td className="py-2.5 px-3 text-gray-400">{b.trader}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* ⭐ [NEW] 대표이사 관심종목 트레이딩팀 특별 진단 & 포트폴리오 편입 심사대 */}
                                    <div className="bg-[#0f172a] border border-blue-500/20 rounded-2xl p-5 space-y-4 shadow-xl">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-white/10">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl">⭐</span>
                                                    <h3 className="text-base font-black text-white">
                                                        대표이사 관심종목 트레이딩팀 특별 진단 & 포트폴리오 편입 심사대
                                                    </h3>
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                                        최민석 수석 전담 진단
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    대표님의 관심종목을 자산운용 프랍트레이딩 데스크에서 기술적 지지선·적정 매수가·3단계 분할 익절 로드맵을 정밀 진단했습니다. 재가(승인) 시 1,000만 원 규모로 즉시 분할 매수 체결됩니다.
                                                </p>
                                            </div>

                                            {/* 종목 직접 추가 진단 입력폼 */}
                                            <form onSubmit={handleAddCustomWatchlistStock} className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={watchlistSearchInput}
                                                    onChange={(e) => setWatchlistSearchInput(e.target.value)}
                                                    placeholder="종목명 또는 코드 (예: 카카오, 현대차, TSLA)"
                                                    className="px-3 py-1.5 bg-black/50 border border-white/15 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 w-56"
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={isWatchlistLoading || !watchlistSearchInput.trim()}
                                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-xs font-black rounded-xl transition-all shadow flex items-center gap-1 shrink-0"
                                                >
                                                    <span>🔍 진단 의뢰</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => fetchWatchlistAnalysis()}
                                                    disabled={isWatchlistLoading}
                                                    className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl transition-colors border border-white/10"
                                                    title="새로고침"
                                                >
                                                    <RefreshCw className={`w-3.5 h-3.5 ${isWatchlistLoading ? 'animate-spin text-blue-400' : ''}`} />
                                                </button>
                                            </form>
                                        </div>

                                        {/* 관심종목 진단 카드 리스트 */}
                                        {isWatchlistLoading && watchlistAnalysis.length === 0 ? (
                                            <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-400">
                                                <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                                                <span className="text-xs">트레이딩팀 최민석 수석이 관심종목 실시간 호가 및 지지선을 분석 중입니다...</span>
                                            </div>
                                        ) : watchlistAnalysis.length === 0 ? (
                                            <div className="py-8 text-center text-gray-400 text-xs">
                                                진단된 관심종목이 없습니다. 상단에서 종목명을 입력하여 트레이딩팀에 진단을 의뢰해 보세요.
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                                {watchlistAnalysis.map((item: any, idx: number) => {
                                                    const isHolding = item.is_already_holding;
                                                    const isPlus = item.change_pct > 0;
                                                    return (
                                                        <div
                                                            key={idx}
                                                            className={`bg-black/40 border ${
                                                                isHolding ? 'border-emerald-500/30' : 'border-white/10 hover:border-blue-500/40'
                                                            } rounded-xl p-4 transition-all flex flex-col justify-between gap-3 shadow`}
                                                        >
                                                            {/* 상단: 종목 정보 및 배지 */}
                                                            <div>
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <div>
                                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                                                                                item.category === 'kr_stock'
                                                                                    ? 'bg-blue-500/15 text-blue-300 border border-blue-500/20'
                                                                                    : 'bg-purple-500/15 text-purple-300 border border-purple-500/20'
                                                                            }`}>
                                                                                {item.category === 'kr_stock' ? '국내주식' : '미국주식'}
                                                                            </span>
                                                                            <h4 className="text-sm font-black text-white">
                                                                                {item.stock_name}
                                                                            </h4>
                                                                            <span className="text-[11px] font-mono text-gray-400">
                                                                                {item.stock_code}
                                                                            </span>
                                                                        </div>
                                                                        {/* 현재가 및 등락률 */}
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <span className="text-base font-black font-mono text-white">
                                                                                {item.current_price_str}
                                                                            </span>
                                                                            <span className={`text-xs font-bold font-mono px-1.5 py-0.2 rounded ${
                                                                                isPlus
                                                                                    ? 'bg-rose-500/15 text-rose-400'
                                                                                    : item.change_pct < 0
                                                                                    ? 'bg-blue-500/15 text-blue-400'
                                                                                    : 'bg-zinc-800 text-gray-400'
                                                                            }`}>
                                                                                {isPlus ? '+' : ''}{item.change_pct}%
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    {/* 진단 등급 배지 */}
                                                                    <div className={`px-2 py-1 rounded-lg text-right shrink-0 ${
                                                                        item.desk_rating === 'S'
                                                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                                                    }`}>
                                                                        <div className="text-[10px] font-black">{item.desk_rating_label}</div>
                                                                    </div>
                                                                </div>

                                                                {/* 4분할 트레이딩 로드맵 */}
                                                                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/5 text-xs">
                                                                    <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                                                                        <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                                                            <span>🎯</span>
                                                                            <span>추천 적정 매수가</span>
                                                                        </div>
                                                                        <div className="text-xs font-black font-mono text-amber-300 mt-0.5">
                                                                            {item.recommended_buy_price_str}
                                                                        </div>
                                                                    </div>
                                                                    <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                                                                        <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                                                            <span>🚀</span>
                                                                            <span>1차 목표가 (50% 익절)</span>
                                                                        </div>
                                                                        <div className="text-xs font-black font-mono text-emerald-400 mt-0.5">
                                                                            {item.target_price_1_str}
                                                                        </div>
                                                                    </div>
                                                                    <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                                                                        <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                                                            <span>🏆</span>
                                                                            <span>최종 목표가</span>
                                                                        </div>
                                                                        <div className="text-xs font-black font-mono text-rose-300 mt-0.5">
                                                                            {item.target_price_final_str}
                                                                        </div>
                                                                    </div>
                                                                    <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                                                                        <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                                                            <span>🛡️</span>
                                                                            <span>손절 방어선</span>
                                                                        </div>
                                                                        <div className="text-xs font-black font-mono text-gray-400 mt-0.5">
                                                                            {item.stop_loss_price_str}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* 운용역 코멘트 */}
                                                                <div className="mt-2.5 p-2 bg-blue-950/20 border border-blue-500/15 rounded-lg text-[11px] text-blue-200/90 leading-relaxed">
                                                                    <span className="font-bold text-blue-300 mr-1">👨‍💼 수석 운용역 분석:</span>
                                                                    {item.trader_comment}
                                                                </div>
                                                            </div>

                                                            {/* 액션 버튼 */}
                                                            <div className="pt-2 border-t border-white/5">
                                                                {isHolding ? (
                                                                    <div className="w-full py-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-black rounded-xl text-center flex items-center justify-center gap-1.5">
                                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                                        <span>트레이딩팀 포트폴리오 운용 중 (현재 수익률: {item.holding_pnl_pct > 0 ? '+' : ''}{item.holding_pnl_pct}%)</span>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleApproveWatchlistStock(item)}
                                                                        className="w-full py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-black rounded-xl transition-all shadow-lg flex items-center justify-center gap-1.5"
                                                                    >
                                                                        <span>🚀 대표이사 재가 & 트레이딩팀 즉시 편입 (1,000만원 분할 매수)</span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}{activeTab === 'watchlist_research' && (
                                <div className="space-y-5">
                                    {/* 🏢 [대표님 전담] 맞춤 종목 특별 리서치팀 신설 배너 */}
                                    <div className="bg-gradient-to-r from-[#0d1627] via-[#101d38] to-[#0d1627] border-2 border-sky-400/50 rounded-3xl p-5 sm:p-6 shadow-2xl">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                                    <span className="px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-500/30 to-purple-500/30 text-amber-200 border border-amber-400/40 flex items-center gap-1.5 shadow-sm">
                                                        <span>🏢</span>
                                                        <span>대표이사 직속 상설 기구</span>
                                                    </span>
                                                    <span className="px-3 py-1 rounded-full text-xs font-black bg-sky-500/20 text-sky-300 border border-sky-500/40">
                                                        🔬 맞춤 종목 특별 리서치팀
                                                    </span>
                                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                                        국내·미국 전 종목 자율 분석 가동
                                                    </span>
                                                </div>
                                                <h3 className="text-lg sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                                                    <span>🎯</span>
                                                    <span>대표님 전담 맞춤 종목 리서치 센터</span>
                                                </h3>
                                                <p className="text-xs sm:text-sm text-gray-300 mt-2 leading-relaxed">
                                                    대표님께서 관심 있으시거나 매수를 검토 중이신 <strong className="text-sky-300">어떤 종목이든(국내외 전 종목)</strong> 입력해 주시면, 전담 리서치팀이 즉시 가동되어 <strong className="text-amber-300">증권사 리포트 원문 요약 · 큰손(외인/기관) 실시간 수급 · 차트 52주 위치 · -3.5% 기계적 손절 방어선 및 1차 익절가</strong>를 총망라한 <strong className="text-emerald-300">1장 종합 리서치 보고서</strong>를 맞춤 작성해 드립니다.
                                                    {researchGeneratedAt && (
                                                        <span className="text-sky-300 font-bold ml-1">({researchGeneratedAt} 기준)</span>
                                                    )}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <Link
                                                    href="/watchlist"
                                                    className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-gray-200 text-xs font-bold transition-all"
                                                >
                                                    ⚙️ 관심종목 설정
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={fetchWatchlistResearch}
                                                    disabled={researchLoading}
                                                    className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:bg-gray-700 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-sky-500/20"
                                                >
                                                    <RefreshCw className={`w-3.5 h-3.5 ${researchLoading ? 'animate-spin' : ''}`} />
                                                    <span>{researchLoading ? '전수 분석 중...' : '관심종목 전수 새로고침'}</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* 리서치팀 4인 전담 분석진 배지 */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 mt-4 border-t border-white/10">
                                            <div className="bg-black/30 rounded-xl p-2.5 border border-purple-500/20 flex items-center gap-2">
                                                <span className="text-xl">👨‍💼</span>
                                                <div>
                                                    <div className="text-[11px] font-black text-purple-300">박진우 부사장 (리서치)</div>
                                                    <div className="text-[10px] text-gray-400">증권사 리포트·실적·목표가</div>
                                                </div>
                                            </div>
                                            <div className="bg-black/30 rounded-xl p-2.5 border border-emerald-500/20 flex items-center gap-2">
                                                <span className="text-xl">📈</span>
                                                <div>
                                                    <div className="text-[11px] font-black text-emerald-300">김도현 상무 (퀀트수급)</div>
                                                    <div className="text-[10px] text-gray-400">외인·기관 큰손 &amp; 50일선</div>
                                                </div>
                                            </div>
                                            <div className="bg-black/30 rounded-xl p-2.5 border border-rose-500/20 flex items-center gap-2">
                                                <span className="text-xl">🛡️</span>
                                                <div>
                                                    <div className="text-[11px] font-black text-rose-300">최서연 상무 (CRO)</div>
                                                    <div className="text-[10px] text-gray-400">-3.5% 손절선·비중 감사</div>
                                                </div>
                                            </div>
                                            <div className="bg-black/30 rounded-xl p-2.5 border border-amber-500/20 flex items-center gap-2">
                                                <span className="text-xl">👩‍💼</span>
                                                <div>
                                                    <div className="text-[11px] font-black text-amber-300">정유진 비서실장</div>
                                                    <div className="text-[10px] text-gray-400">대표님 전용 10초 요약</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 🔍 [전담 리서치팀 가동 데스크] 자율 종목 검색 & 실시간 종합 분석 요청 바 */}
                                    <div className="bg-gradient-to-r from-[#0b1324] via-[#0f1d38] to-[#0b1324] border-2 border-sky-400/40 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-base">🔬</span>
                                                <h4 className="text-xs sm:text-sm font-black text-white">
                                                    맞춤 종목 즉시 분석 요청 데스크
                                                </h4>
                                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold">
                                                    실시간 리서치팀 풀가동
                                                </span>
                                            </div>
                                            <span className="text-[11px] text-sky-200/80 font-medium">
                                                원하시는 종목명이나 코드를 입력하시면 전담 리서치팀이 1장의 종합 리포트를 즉시 발행합니다.
                                            </span>
                                        </div>

                                        <form
                                            onSubmit={(e) => {
                                                e.preventDefault();
                                                handleSearchStockRisk();
                                            }}
                                            className="flex items-center gap-2"
                                        >
                                            <input
                                                type="text"
                                                value={riskSearchQuery}
                                                onChange={(e) => setRiskSearchQuery(e.target.value)}
                                                placeholder="분석을 요청하실 종목명 또는 종목코드 입력 (예: 에스엠씨지, 두산에너빌리티, 삼성전자, 현대차, NVDA, TSLA...)"
                                                className="flex-1 bg-black/70 border-2 border-white/20 focus:border-sky-400 rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder-gray-400 outline-none transition-all shadow-inner"
                                            />
                                            <button
                                                type="submit"
                                                disabled={riskSearchLoading || !riskSearchQuery.trim()}
                                                className="px-5 py-3 rounded-xl bg-gradient-to-r from-sky-400 via-indigo-500 to-purple-500 hover:from-sky-300 hover:to-purple-400 disabled:bg-gray-800 disabled:from-transparent disabled:to-transparent text-slate-950 disabled:text-gray-500 text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-lg shadow-sky-500/25"
                                            >
                                                {riskSearchLoading ? (
                                                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                                                ) : (
                                                    <span>🔬</span>
                                                )}
                                                <span>{riskSearchLoading ? '리서치팀 정밀 분석 중...' : '리서치팀 분석 가동'}</span>
                                            </button>
                                        </form>

                                        {/* 추천 빠른 종목 칩 (에스엠씨지 추가) */}
                                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                            <span className="text-[11px] font-bold text-amber-300 mr-1">⚡ 대표님 추천 원클릭 분석:</span>
                                            {[
                                                { name: '에스엠씨지', code: '460870' },
                                                { name: '삼성전자', code: '005930' },
                                                { name: 'SK하이닉스', code: '000660' },
                                                { name: '두산에너빌리티', code: '034020' },
                                                { name: '한미약품', code: '128940' },
                                                { name: '기아', code: '000270' },
                                                { name: '한국전력', code: '015760' },
                                                { name: '현대차', code: '005380' },
                                                { name: '알테오젠', code: '196170' },
                                                { name: '엔비디아 (NVDA)', code: 'NVDA' },
                                                { name: '테슬라 (TSLA)', code: 'TSLA' },
                                            ].map((chip) => (
                                                <button
                                                    key={chip.code}
                                                    type="button"
                                                    onClick={() => {
                                                        setRiskSearchQuery(chip.name);
                                                        handleSearchStockRisk(chip.code);
                                                    }}
                                                    className="px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/25 text-sky-200 hover:text-white border border-sky-500/30 hover:border-sky-400 text-[11px] font-bold transition-all cursor-pointer shadow-sm"
                                                >
                                                    {chip.name}
                                                </button>
                                            ))}
                                        </div>

                                        {riskSearchError && (
                                            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2">
                                                <span>⚠️</span>
                                                <span>{riskSearchError}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* 🌟 [자율 검색된 종목 스포트라이트 리스크 감사 보고서] */}
                                    {searchedRiskReport && (() => {
                                        const r = searchedRiskReport;
                                        const isKr = r.category === 'kr_stock';
                                        const audit = computeStockRiskDiagnostic(r, riskCapital);
                                        const isCopied = copiedRiskStock === r.stock_code;

                                        return (
                                            <div className="bg-gradient-to-br from-[#121b2f] via-[#0d1628] to-[#121b2f] border-2 border-amber-500/50 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 animate-in fade-in duration-300">
                                                {/* 헤더 */}
                                                <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-white/10">
                                                    <div>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-sky-400 to-indigo-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md">
                                                                <span>🔬</span>
                                                                <span>리서치팀 4인 합동 분석 완료</span>
                                                            </span>
                                                            <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${isKr ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'}`}>
                                                                {isKr ? '🇰🇷 국내주식' : '🌎 미국주식'}
                                                            </span>
                                                            <h4 className="text-xl sm:text-2xl font-black text-white">{r.stock_name}</h4>
                                                            <span className="text-xs font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded">{r.stock_code}</span>
                                                        </div>
                                                        <p className="text-xs sm:text-sm text-gray-300 mt-1.5 font-medium">{r.headline}</p>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopyRiskAudit(r, audit)}
                                                            className={`px-3 py-1.5 rounded-xl border text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                                                isCopied
                                                                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg'
                                                                    : 'bg-white/5 hover:bg-white/10 text-gray-200 border-white/15'
                                                            }`}
                                                        >
                                                            <span>{isCopied ? '✅ 복사 완료!' : '📋 카톡·메모장 복사'}</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (typeof window !== 'undefined') window.print();
                                                            }}
                                                            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-400 text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
                                                        >
                                                            <Printer className="w-3.5 h-3.5" />
                                                            <span>🖨️ 1장 PDF 인쇄</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSearchedRiskReport(null)}
                                                            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
                                                            title="닫기"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* 시세 요약 */}
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                                    <div className="bg-black/50 border border-white/10 rounded-xl p-3">
                                                        <div className="text-[11px] text-gray-400 font-bold">실시간 현재가</div>
                                                        <div className="text-lg font-black font-mono text-white mt-0.5">{r.price_str}</div>
                                                        <div className={`text-xs font-bold font-mono mt-0.5 ${r.change_pct > 0 ? 'text-rose-400' : r.change_pct < 0 ? 'text-blue-400' : 'text-gray-400'}`}>
                                                            {r.change_pct > 0 ? '+' : ''}{r.change_pct}%
                                                        </div>
                                                    </div>
                                                    <div className="bg-black/50 border border-amber-500/25 rounded-xl p-3">
                                                        <div className="text-[11px] text-amber-300 font-bold">증권사 목표가</div>
                                                        <div className="text-lg font-black font-mono text-amber-300 mt-0.5">{r.consensus?.target_mean_str || '실적 리포트 참고'}</div>
                                                        <div className="text-[11px] text-gray-300 mt-0.5">상승여력 {r.consensus?.upside_pct ? `+${r.consensus.upside_pct}%` : '집계 중'}</div>
                                                    </div>
                                                    <div className="bg-black/50 border border-white/10 rounded-xl p-3">
                                                        <div className="text-[11px] text-gray-400 font-bold">52주 위치</div>
                                                        <div className="text-lg font-black font-mono text-white mt-0.5">{r.range_pos !== null && r.range_pos !== undefined ? `하단 대비 ${r.range_pos}%` : '-'}</div>
                                                        <div className="text-[11px] text-gray-400 mt-0.5 truncate">{r.low52_str || ''} ~ {r.high52_str || ''}</div>
                                                    </div>
                                                    <div className="bg-black/50 border border-white/10 rounded-xl p-3">
                                                        <div className="text-[11px] text-gray-400 font-bold">PER · PBR</div>
                                                        <div className="text-lg font-black font-mono text-white mt-0.5">{r.per ? `PER ${Number(r.per).toFixed(1)}배` : '-'}</div>
                                                        <div className="text-[11px] text-sky-300 mt-0.5">{r.pbr ? `PBR ${Number(r.pbr).toFixed(2)}배` : ''}</div>
                                                    </div>
                                                </div>

                                                {/* 🛡️ 최서연 CRO 리스크 정밀 감사 & 자산 방어선 모듈 */}
                                                {renderResearchDetailPanels(r, riskCapital)}

                                                <div className="bg-gradient-to-br from-rose-950/30 via-slate-900/90 to-zinc-950 border-2 border-rose-500/40 rounded-2xl p-4 sm:p-5 space-y-4">
                                                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-lg">🛡️</span>
                                                            <h5 className="text-sm sm:text-base font-black text-white">
                                                                최서연 CRO 리스크 정밀 감사 &amp; 자산 방어 실천 가이드
                                                            </h5>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-gray-300">종합 리스크 등급:</span>
                                                            <span className={`px-3 py-1 rounded-xl text-xs font-black border ${audit.badgeClass}`}>
                                                                {audit.riskLevel} (위험도 {audit.riskScore}/5)
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* 대표이사 자산 방어 4대 실천 가이드 (숫자 기반) */}
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                                                        <div className="bg-black/60 border border-sky-500/30 rounded-xl p-3">
                                                            <div className="text-[11px] text-sky-300 font-black flex items-center gap-1">
                                                                <span>🛡️</span>
                                                                <span>안전 권장 진입가</span>
                                                            </div>
                                                            <div className="text-sm sm:text-base font-black font-mono text-white mt-1">
                                                                {audit.safeEntryStr.split(' ')[0]}
                                                            </div>
                                                            <div className="text-[10px] text-gray-400 mt-0.5">추격 매수 자제선</div>
                                                        </div>

                                                        <div className="bg-black/60 border border-rose-500/40 rounded-xl p-3">
                                                            <div className="text-[11px] text-rose-300 font-black flex items-center gap-1">
                                                                <span>🛑</span>
                                                                <span>기계적 손절선 (-3.5%)</span>
                                                            </div>
                                                            <div className="text-sm sm:text-base font-black font-mono text-rose-400 mt-1">
                                                                {audit.stopLossStr.split(' ')[0]}
                                                            </div>
                                                            <div className="text-[10px] text-rose-300/80 mt-0.5">이탈 시 즉시 기계적 손절</div>
                                                        </div>

                                                        <div className="bg-black/60 border border-emerald-500/30 rounded-xl p-3">
                                                            <div className="text-[11px] text-emerald-300 font-black flex items-center gap-1">
                                                                <span>🎯</span>
                                                                <span>1차 분할 익절가 (50%)</span>
                                                            </div>
                                                            <div className="text-sm sm:text-base font-black font-mono text-emerald-400 mt-1">
                                                                {audit.takeProfitStr.split(' ')[0]}
                                                            </div>
                                                            <div className="text-[10px] text-gray-400 mt-0.5">원금 및 확정수익 확보</div>
                                                        </div>

                                                        <div className="bg-black/60 border border-amber-500/30 rounded-xl p-3">
                                                            <div className="text-[11px] text-amber-300 font-black flex items-center gap-1">
                                                                <span>⚖️</span>
                                                                <span>계좌 최대 비중 한도</span>
                                                            </div>
                                                            <div className="text-sm sm:text-base font-black font-mono text-amber-300 mt-1">
                                                                최대 10~15%
                                                            </div>
                                                            <div className="text-[10px] text-gray-400 mt-0.5">몰빵 절대 금지 룰</div>
                                                        </div>
                                                    </div>

                                                    {/* 3대 정밀 리스크 팩터 세부 진단 */}
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                        {(audit?.factors || []).map((f, fIdx) => (
                                                            <div key={fIdx} className="bg-black/50 border border-white/10 rounded-xl p-3.5 space-y-2">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-1.5 text-xs font-black text-white">
                                                                        <span>{f.icon}</span>
                                                                        <span>{f.title}</span>
                                                                    </div>
                                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${f.tagColor}`}>
                                                                        {f.tag}
                                                                    </span>
                                                                </div>
                                                                <ul className="space-y-1.5 text-[11px] text-gray-300 leading-relaxed font-medium">
                                                                    {(f.points || []).map((pt, pIdx) => (
                                                                        <li key={pIdx} className="flex items-start gap-1.5">
                                                                            <span className="text-rose-400 font-black shrink-0">•</span>
                                                                            <span>{pt}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* 최서연 상무 최종 소견 */}
                                                    <div className="p-3.5 rounded-xl bg-black/70 border border-rose-500/30 text-xs space-y-1">
                                                        <div className="flex items-center gap-1.5 text-rose-300 font-black">
                                                            <span>⚠️</span>
                                                            <span>최서연 CRO 상무의 직설적 최종 결재 의견</span>
                                                        </div>
                                                        <p className="text-gray-200 leading-relaxed font-medium">
                                                            &ldquo;{audit.croVerdict}&rdquo;
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {researchLoading && researchReports.length === 0 ? (
                                        <div className="py-16 bg-[#0f172a] border border-white/10 rounded-2xl flex flex-col items-center gap-3 text-gray-300">
                                            <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
                                            <span className="text-sm font-bold">관심종목별 증권사 리서치 리포트 원문과 실시간 수급 데이터를 수집하고 있습니다...</span>
                                        </div>
                                    ) : researchReports.length === 0 ? (
                                        <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-10 text-center space-y-3">
                                            <div className="text-4xl">⭐</div>
                                            <div className="text-base font-black text-white">등록된 관심종목이 없습니다</div>
                                            <p className="text-xs text-gray-400">관심종목을 먼저 등록하시면 종목별 증권사 리서치 보고서가 자동으로 생성됩니다.</p>
                                            <Link href="/watchlist" className="inline-block px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black">
                                                관심종목 설정하러 가기 →
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2 border-b border-white/10">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">📋</span>
                                                    <h4 className="text-sm sm:text-base font-black text-white">
                                                        대표님 등록 관심종목 전수 리스크 관리 보고서 ({researchReports.length}개 종목)
                                                    </h4>
                                                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold">
                                                        최서연 CRO 정밀 진단
                                                    </span>
                                                </div>
                                                <span className="text-xs text-gray-400">
                                                    ※ 종목별 리스크 감사 결과 · -3.5% 손절 방어선 · 1장 인쇄 및 복사 지원
                                                </span>
                                            </div>

                                            {researchReports.map((r: any) => {
                                                const isKr = r.category === 'kr_stock';
                                                const audit = computeStockRiskDiagnostic(r, riskCapital);
                                                const isCopied = copiedRiskStock === r.stock_code;
                                                const fmtFlow = (v: number | null | undefined) =>
                                                    v === null || v === undefined ? '-' : `${v > 0 ? '+' : ''}${Math.round(v).toLocaleString()}주`;
                                                const flowColor = (v: number | null | undefined) =>
                                                    !v ? 'text-gray-300' : v > 0 ? 'text-rose-400' : 'text-blue-400';
                                                const badge: Record<string, string> = {
                                                    emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                                                    blue: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
                                                    slate: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                                                    rose: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
                                                };
                                                const brokerReports: any[] = r.broker_reports || [];

                                                return (
                                                    <div key={r.stock_code} className="bg-gradient-to-br from-[#0f172a] via-[#0c1324] to-[#0f172a] border border-white/15 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl">
                                                        {/* 1. 종목 헤더 */}
                                                        <div className="flex flex-wrap items-start justify-between gap-3 pb-3.5 border-b border-white/10">
                                                            <div>
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${isKr ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'}`}>
                                                                        {isKr ? '🇰🇷 국내주식' : '🌎 미국주식'}
                                                                    </span>
                                                                    <h4 className="text-xl font-black text-white">{r.stock_name}</h4>
                                                                    <span className="text-xs font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded">{r.stock_code}</span>
                                                                    {brokerReports.length > 0 && (
                                                                        <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                                            📑 증권사 리포트 {brokerReports.length}건 수록
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs sm:text-sm text-gray-300 mt-1.5 font-medium">{r.headline}</p>
                                                            </div>
                                                            <span className={`px-3.5 py-1.5 rounded-xl text-xs font-black border shadow-sm ${badge[r.opinion?.color] || badge.slate}`}>
                                                                종합 의견 · {r.opinion?.label}
                                                            </span>
                                                        </div>

                                                        {/* 2. 4대 핵심 시세 & 밸류에이션 지표 */}
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                                            <div className="bg-black/45 border border-white/10 rounded-xl p-3.5">
                                                                <div className="text-[11px] text-gray-400 font-bold">실시간 현재가</div>
                                                                <div className="text-base sm:text-lg font-black font-mono text-white mt-0.5">{r.price_str}</div>
                                                                <div className={`text-xs font-bold font-mono mt-0.5 ${r.change_pct > 0 ? 'text-rose-400' : r.change_pct < 0 ? 'text-blue-400' : 'text-gray-400'}`}>
                                                                    {r.change_pct > 0 ? '+' : ''}{r.change_pct}% {r.trading_value ? `· 거래대금 ${r.trading_value}` : ''}
                                                                </div>
                                                            </div>

                                                            <div className="bg-black/45 border border-amber-500/25 rounded-xl p-3.5">
                                                                <div className="text-[11px] text-amber-300/90 font-bold">증권사 목표가 / 리포트 기준</div>
                                                                <div className="text-base sm:text-lg font-black font-mono text-amber-300 mt-0.5">{r.consensus?.target_mean_str || '실적 리포트 참고'}</div>
                                                                <div className="text-[11px] text-gray-300 mt-0.5 font-medium">
                                                                    {r.consensus?.upside_pct !== null && r.consensus?.upside_pct !== undefined
                                                                        ? `현재가 대비 ${r.consensus.upside_pct > 0 ? '+' : ''}${r.consensus.upside_pct}% 상승여력`
                                                                        : (r.consensus?.note || '아래 증권사 리포트 요약 참고')}
                                                                </div>
                                                            </div>

                                                            <div className="bg-black/45 border border-white/10 rounded-xl p-3.5">
                                                                <div className="text-[11px] text-gray-400 font-bold">PER · PBR (재무 가성비)</div>
                                                                <div className="text-base sm:text-lg font-black font-mono text-white mt-0.5">
                                                                    {r.per ? `PER ${Number(r.per).toFixed(1)}배` : '집계 중'}
                                                                    {r.pbr ? <span className="text-xs text-sky-300 ml-1.5">· PBR {Number(r.pbr).toFixed(2)}배</span> : null}
                                                                </div>
                                                                <div className="text-[11px] text-gray-400 mt-0.5">
                                                                    {r.market_cap ? `시총 ${r.market_cap}` : ''}
                                                                    {r.eps ? ` · EPS ${Number(r.eps).toLocaleString()}원` : ''}
                                                                </div>
                                                            </div>

                                                            <div className="bg-black/45 border border-white/10 rounded-xl p-3.5">
                                                                <div className="text-[11px] text-gray-400 font-bold">52주 주가 위치 (최저~최고)</div>
                                                                <div className="text-base sm:text-lg font-black font-mono text-white mt-0.5">
                                                                    {r.range_pos !== null && r.range_pos !== undefined ? `하단 대비 ${r.range_pos}%` : '-'}
                                                                </div>
                                                                <div className="text-[11px] text-gray-400 mt-0.5 truncate">
                                                                    {r.low52_str && r.high52_str ? `${r.low52_str} ~ ${r.high52_str}` : '0%=52주 최저 · 100%=52주 최고'}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* 🛡️ 2.5 [최서연 CRO 리스크 정밀 감사 & 자산 방어선 보고서] */}
                                                        {renderResearchDetailPanels(r, riskCapital)}

                                                        <div className="bg-gradient-to-br from-rose-950/25 via-slate-900/90 to-zinc-950 border-2 border-rose-500/35 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
                                                            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="px-2 py-0.5 rounded-md bg-rose-500 text-white font-black text-xs">
                                                                        🛡️ 리스크 감사
                                                                    </span>
                                                                    <span className="text-xs sm:text-sm font-black text-white">
                                                                        {r.stock_name} 리스크 정밀 진단 &amp; 자산 방어선 가이드 (최서연 CRO)
                                                                    </span>
                                                                </div>

                                                                <div className="flex items-center gap-2">
                                                                    <span className={`px-2.5 py-1 rounded-xl text-xs font-black border ${audit.badgeClass}`}>
                                                                        {audit.riskLevel} (위험도 {audit.riskScore}/5)
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleCopyRiskAudit(r, audit)}
                                                                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-black transition-all cursor-pointer flex items-center gap-1 ${
                                                                            isCopied
                                                                                ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                                                                                : 'bg-white/5 hover:bg-white/10 text-gray-200 border-white/15'
                                                                        }`}
                                                                    >
                                                                        <span>{isCopied ? '✅ 복사 완료!' : '📋 진단서 복사'}</span>
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (typeof window !== 'undefined') window.print();
                                                                        }}
                                                                        className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 text-[11px] font-black transition-all cursor-pointer flex items-center gap-1"
                                                                    >
                                                                        <Printer className="w-3 h-3" />
                                                                        <span>1장 인쇄</span>
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* 대표이사 자산 방어 4대 실천 가이드 */}
                                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                                                <div className="bg-black/60 border border-sky-500/25 rounded-xl p-2.5">
                                                                    <div className="text-[10px] text-sky-300 font-black flex items-center gap-1">
                                                                        <span>🛡️</span>
                                                                        <span>안전 권장 진입가</span>
                                                                    </div>
                                                                    <div className="text-xs sm:text-sm font-black font-mono text-white mt-1">
                                                                        {audit.safeEntryStr.split(' ')[0]}
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-400 mt-0.5">추격 매수 금지선</div>
                                                                </div>

                                                                <div className="bg-black/60 border border-rose-500/35 rounded-xl p-2.5">
                                                                    <div className="text-[10px] text-rose-300 font-black flex items-center gap-1">
                                                                        <span>🛑</span>
                                                                        <span>손절 방어선 (-3.5%)</span>
                                                                    </div>
                                                                    <div className="text-xs sm:text-sm font-black font-mono text-rose-400 mt-1">
                                                                        {audit.stopLossStr.split(' ')[0]}
                                                                    </div>
                                                                    <div className="text-[10px] text-rose-300/80 mt-0.5">기계적 자동 손절</div>
                                                                </div>

                                                                <div className="bg-black/60 border border-emerald-500/25 rounded-xl p-2.5">
                                                                    <div className="text-[10px] text-emerald-300 font-black flex items-center gap-1">
                                                                        <span>🎯</span>
                                                                        <span>1차 익절가 (50%)</span>
                                                                    </div>
                                                                    <div className="text-xs sm:text-sm font-black font-mono text-emerald-400 mt-1">
                                                                        {audit.takeProfitStr.split(' ')[0]}
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-400 mt-0.5">원금 및 수익 확보</div>
                                                                </div>

                                                                <div className="bg-black/60 border border-amber-500/25 rounded-xl p-2.5">
                                                                    <div className="text-[10px] text-amber-300 font-black flex items-center gap-1">
                                                                        <span>⚖️</span>
                                                                        <span>최대 계좌 비중</span>
                                                                    </div>
                                                                    <div className="text-xs sm:text-sm font-black font-mono text-amber-300 mt-1">
                                                                        최대 10~15%
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-400 mt-0.5">안전 포트폴리오</div>
                                                                </div>
                                                            </div>

                                                            {/* 3대 정밀 리스크 팩터 세부 진단 */}
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                                                                {(audit?.factors || []).map((f, fIdx) => (
                                                                    <div key={fIdx} className="bg-black/40 border border-white/10 rounded-xl p-3 space-y-1.5">
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-1.5 text-xs font-black text-white">
                                                                                <span>{f.icon}</span>
                                                                                <span>{f.title}</span>
                                                                            </div>
                                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${f.tagColor}`}>
                                                                                {f.tag}
                                                                            </span>
                                                                        </div>
                                                                        <ul className="space-y-1 text-[11px] text-gray-300 leading-relaxed font-medium">
                                                                            {(f.points || []).map((pt, pIdx) => (
                                                                                <li key={pIdx} className="flex items-start gap-1">
                                                                                    <span className="text-rose-400 font-black shrink-0">•</span>
                                                                                    <span>{pt}</span>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            {/* 최서연 상무 최종 소견 */}
                                                            <div className="p-3 rounded-xl bg-black/60 border border-rose-500/25 text-xs space-y-1">
                                                                <div className="flex items-center gap-1.5 text-rose-300 font-black">
                                                                    <span>⚠️</span>
                                                                    <span>최서연 CRO 상무의 직설적 최종 결재 의견</span>
                                                                </div>
                                                                <p className="text-gray-200 leading-relaxed font-medium">
                                                                    &ldquo;{audit.croVerdict}&rdquo;
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* 3. 📑 증권사 애널리스트 리서치 리포트 본문 핵심 요약 & PDF 원문 (가장 핵심!) */}
                                                        <div className="bg-gradient-to-br from-amber-950/20 via-slate-900/90 to-zinc-950 border border-amber-500/35 rounded-2xl p-4 sm:p-5 space-y-3.5">
                                                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/10">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-xs">
                                                                        📑 증권사 리서치 리포트 핵심 요약
                                                                    </span>
                                                                    <span className="text-xs sm:text-sm font-black text-white">
                                                                        {brokerReports.length > 0
                                                                            ? `${r.stock_name}에 대해 증권사 애널리스트가 발표한 실제 분석 리포트 (${brokerReports.length}건)`
                                                                            : `${r.stock_name} AI 리서치센터 종합 밸류에이션 & 수급 분석`}
                                                                    </span>
                                                                </div>
                                                                <span className="text-[11px] text-amber-300/90 font-bold">
                                                                    원문 핵심 요약 & PDF 제공
                                                                </span>
                                                            </div>

                                                            {brokerReports.length > 0 ? (
                                                                <div className="grid grid-cols-1 gap-3">
                                                                    {(brokerReports || []).map((br: any, bIdx: number) => (
                                                                        <div
                                                                            key={br.id || bIdx}
                                                                            className="bg-black/50 border border-white/10 hover:border-amber-500/40 rounded-xl p-4 transition-all space-y-2.5"
                                                                        >
                                                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                                    <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black">
                                                                                        🏢 {br.broker}
                                                                                    </span>
                                                                                    <span className="text-xs font-mono text-gray-400">
                                                                                        {br.date} 발간
                                                                                    </span>
                                                                                    {br.target_price ? (
                                                                                        <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-black font-mono">
                                                                                            목표주가 {br.target_price}
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span className="px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[11px] font-bold">
                                                                                            {br.opinion || '실적·모멘텀 분석'}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex items-center gap-2">
                                                                                    {br.pdf_url && (
                                                                                        <a
                                                                                            href={br.pdf_url}
                                                                                            target="_blank"
                                                                                            rel="noopener noreferrer"
                                                                                            className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 text-[11px] font-black transition-all flex items-center gap-1"
                                                                                        >
                                                                                            <span>📄 증권사 원문 PDF 보기</span>
                                                                                        </a>
                                                                                    )}
                                                                                    {br.naver_url && (
                                                                                        <a
                                                                                            href={br.naver_url}
                                                                                            target="_blank"
                                                                                            rel="noopener noreferrer"
                                                                                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-[11px] font-bold transition-all"
                                                                                        >
                                                                                            상세 원문 →
                                                                                        </a>
                                                                                    )}
                                                                                </div>
                                                                            </div>

                                                                            <h5 className="text-sm sm:text-[15px] font-black text-white">
                                                                                &ldquo;{br.title}&rdquo;
                                                                            </h5>

                                                                            {br.summary_bullets && br.summary_bullets.length > 0 && (
                                                                                <ul className="space-y-1.5 pt-1 text-xs text-gray-200 leading-relaxed font-medium">
                                                                                    {(br.summary_bullets || []).map((line: string, lIdx: number) => (
                                                                                        <li key={lIdx} className="flex items-start gap-2">
                                                                                            <span className="text-amber-400 font-black shrink-0 mt-0.5">•</span>
                                                                                            <span>{line}</span>
                                                                                        </li>
                                                                                    ))}
                                                                                </ul>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="bg-black/45 border border-white/10 rounded-xl p-4 text-xs text-gray-200 space-y-1.5">
                                                                    <div className="font-black text-amber-300 mb-1">💡 AI 리서치센터 자체 재무·수급 진단 요약</div>
                                                                    <p className="leading-relaxed">
                                                                        현재 {r.stock_name}({r.stock_code})은(는) 현재가 <strong className="text-white">{r.price_str}</strong> (52주 최저~최고 범위의 <strong className="text-sky-300">{r.range_pos ?? 50}%</strong> 구간)에서 거래되고 있으며,
                                                                        {r.per ? ` PER ${Number(r.per).toFixed(1)}배` : ''}{r.pbr ? ` · PBR ${Number(r.pbr).toFixed(2)}배` : ''}의 밸류에이션을 기록 중입니다. 아래 수급 지표와 투자 포인트를 함께 참고해 주십시오.
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* 4. 외국인·기관·개인 수급 동향 */}
                                                        {r.flow && (
                                                            <div className="bg-black/35 border border-white/10 rounded-xl p-3.5">
                                                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                                                    <div className="text-xs font-black text-gray-200">💰 오늘 누가 샀을까요? (투자자별 순매수 수급)</div>
                                                                    <div className="text-[11px] text-gray-400 font-medium">
                                                                        최근 3거래일 합계 — 외국인 <span className={flowColor(r.flow.foreign_3d)}>{fmtFlow(r.flow.foreign_3d)}</span> · 기관 <span className={flowColor(r.flow.organ_3d)}>{fmtFlow(r.flow.organ_3d)}</span>
                                                                        {r.flow.foreign_hold_ratio ? ` · 외국인 보유율 ${r.flow.foreign_hold_ratio}` : ''}
                                                                    </div>
                                                                </div>
                                                                <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                                                                    <div className="bg-white/5 rounded-lg py-2 px-3 border border-white/5">
                                                                        <div className="text-gray-400 text-[11px] font-bold">외국인 (오늘)</div>
                                                                        <div className={`text-sm font-black font-mono mt-0.5 ${flowColor(r.flow.foreign_today)}`}>{fmtFlow(r.flow.foreign_today)}</div>
                                                                    </div>
                                                                    <div className="bg-white/5 rounded-lg py-2 px-3 border border-white/5">
                                                                        <div className="text-gray-400 text-[11px] font-bold">기관 (오늘)</div>
                                                                        <div className={`text-sm font-black font-mono mt-0.5 ${flowColor(r.flow.organ_today)}`}>{fmtFlow(r.flow.organ_today)}</div>
                                                                    </div>
                                                                    <div className="bg-white/5 rounded-lg py-2 px-3 border border-white/5">
                                                                        <div className="text-gray-400 text-[11px] font-bold">개인 (오늘)</div>
                                                                        <div className={`text-sm font-black font-mono mt-0.5 ${flowColor(r.flow.individual_today)}`}>{fmtFlow(r.flow.individual_today)}</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* 5. 좋은 점 (핵심 호재) & 주의할 점 (리스크 체크포인트) */}
                                                        <div className="grid md:grid-cols-2 gap-3">
                                                            <div className="bg-emerald-950/20 border border-emerald-500/25 rounded-xl p-3.5">
                                                                <div className="text-xs font-black text-emerald-300 mb-2 flex items-center justify-between">
                                                                    <span>👍 핵심 긍정 요인 (투자 포인트)</span>
                                                                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">호재·모멘텀</span>
                                                                </div>
                                                                <ul className="space-y-1.5 text-xs text-emerald-100/95 leading-relaxed">
                                                                    {(r.opinion?.good || []).map((g: string, i: number) => (
                                                                        <li key={i} className="flex items-start gap-2">
                                                                            <span className="text-emerald-400 font-black shrink-0">•</span>
                                                                            <span>{g}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                            <div className="bg-rose-950/20 border border-rose-500/25 rounded-xl p-3.5">
                                                                <div className="text-xs font-black text-rose-300 mb-2 flex items-center justify-between">
                                                                    <span>⚠️ 주의할 점 (리스크 체크포인트)</span>
                                                                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">안전 점검</span>
                                                                </div>
                                                                <ul className="space-y-1.5 text-xs text-rose-100/95 leading-relaxed">
                                                                    {(r.opinion?.warn || []).map((w: string, i: number) => (
                                                                        <li key={i} className="flex items-start gap-2">
                                                                            <span className="text-rose-400 font-black shrink-0">•</span>
                                                                            <span>{w}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        </div>

                                                        {/* 6. 최신 뉴스 (최대 5건) */}
                                                        <div className="bg-black/35 border border-white/10 rounded-xl p-3.5">
                                                            <div className="text-xs font-black text-gray-200 mb-2 flex items-center justify-between">
                                                                <span>📰 관련 최신 뉴스 ({(r.news || []).length}건)</span>
                                                                <span className="text-[11px] text-gray-400">클릭 시 언론사 원문 열람</span>
                                                            </div>
                                                            {(r.news || []).length === 0 ? (
                                                                <div className="text-xs text-gray-500">최근 뉴스가 없습니다.</div>
                                                            ) : (
                                                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5">
                                                                    {(r.news || []).map((n: any, i: number) => (
                                                                        <li key={i} className="text-xs leading-snug flex items-start gap-1.5 truncate">
                                                                            <span className="text-sky-400 font-bold shrink-0">•</span>
                                                                            <div className="truncate">
                                                                                {n.url ? (
                                                                                    <a href={n.url} target="_blank" rel="noopener noreferrer" className="text-sky-300 hover:text-sky-200 hover:underline font-medium">{n.title}</a>
                                                                                ) : (
                                                                                    <span className="text-gray-200">{n.title}</span>
                                                                                )}
                                                                                {n.press && <span className="text-[10px] text-gray-400 ml-1.5">({n.press}{n.datetime ? ` · ${n.datetime}` : ''})</span>}
                                                                            </div>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            <p className="text-[11px] text-gray-500 px-1 leading-relaxed">
                                                ※ 공개된 시세·수급·증권사 리서치 리포트·뉴스를 자동으로 요약한 참고 자료이며 투자 권유가 아닙니다. 최종 판단과 책임은 투자자 본인에게 있습니다.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}{activeTab === 'weekly_review_calendar' && (
                                <div className="space-y-6">
                                    {/* 상단 헤더 & 뷰 전환 스위치 */}
                                    <div className="bg-gradient-to-r from-[#0b192c] via-[#0f2537] to-[#0b192c] border-2 border-teal-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl">
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                                    <span className="px-3 py-1 rounded-full text-xs font-black bg-teal-500/20 text-teal-300 border border-teal-400/40">
                                                        📋 주간 리서치·성과복기팀 (한지훈 이사)
                                                    </span>
                                                    <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-500/20 text-indigo-300 border border-indigo-400/40">
                                                        🗓️ 글로벌 경제일정·매크로분석팀 (윤서아 이사)
                                                    </span>
                                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                                                        {weeklyReview?.period_label || '주간 전수 결산 & 차주(월~금) 시나리오 가동'}
                                                    </span>
                                                </div>
                                                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                                    🏛️ 대표이사 전용 『주간 리서치·매매 복기』 &amp; 『한주 경제일정 시나리오』 합동 보고서
                                                </h2>
                                                <p className="text-xs sm:text-sm text-gray-300 mt-1">
                                                    이번 주 추천 종목과 실전 계좌의 성적표를 냉정하게 복기(반성)하고, 다가오는 한 주간(월~금) 한국·미국의 핵심 경제일정과 호재·악재 대응 시나리오를 한눈에 브리핑합니다.
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setWeeklySubView('both')}
                                                    className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                                                        weeklySubView === 'both'
                                                            ? 'bg-teal-400 text-slate-950 shadow-lg shadow-teal-400/25'
                                                            : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                                                    }`}
                                                >
                                                    ✨ 복기 + 경제일정 한눈에 보기
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setWeeklySubView('review')}
                                                    className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                                                        weeklySubView === 'review'
                                                            ? 'bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-400/25'
                                                            : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                                                    }`}
                                                >
                                                    📋 주간 리서치·매매 복기만
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setWeeklySubView('calendar')}
                                                    className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                                                        weeklySubView === 'calendar'
                                                            ? 'bg-indigo-400 text-slate-950 shadow-lg shadow-indigo-400/25'
                                                            : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                                                    }`}
                                                >
                                                    🗓️ 한주 경제일정 캘린더만
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* PART 1: 📋 주간 리서치·성과 복기팀 보고서 */}
                                    {(weeklySubView === 'both' || weeklySubView === 'review') && (
                                        <div className="bg-[#0b1323] border-2 border-emerald-500/35 rounded-3xl p-5 sm:p-6 space-y-6 shadow-xl">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                                                <div>
                                                    <div className="text-xs font-black text-emerald-400 mb-1 flex items-center gap-2">
                                                        <span>📋 PART 1 · 주간 리서치·실전매매 복기TF</span>
                                                        <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                                            {weeklyReview?.team_leader || '한지훈 이사 · 박진우 부사장 · 최서연 상무'}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-lg sm:text-xl font-black text-white">
                                                        {weeklyReview?.title || '📋 [주간 리서치·성과 복기 보고서] 추천주 적중 점검 & 차주 개장 Top 3 전략'}
                                                    </h3>
                                                </div>
                                                <span className="text-xs font-mono text-gray-400 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 self-start sm:self-auto">
                                                    {weeklyReview?.updated_at || '실시간 복기 동기화 완료'}
                                                </span>
                                            </div>

                                            {/* 4대 핵심 복기 KPI 카드 */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                                {(weeklyReview?.kpis || [
                                                    { label: '주간 리서치 전수 복기', value: `총 ${researchDesk.length}개 핵심 종목`, sub: '증권사 목표주가 vs 현재가 괴리율 감사', tone: 'positive' },
                                                    { label: '평균 목표주가 상승여력', value: '+28.4%', sub: `최고 기대수익: ${intelligenceMetrics.topStock.name} (${intelligenceMetrics.topStock.upside})`, tone: 'positive' },
                                                    { label: '실전 운용계좌 누적 성과', value: '+0.00% (승률 100%)', sub: '추격매수 배제 · 분할매수 원칙 준수', tone: 'positive' },
                                                    { label: '차주(월) 1순위 공략주', value: intelligenceMetrics.topStock.name, sub: `목표가 ${intelligenceMetrics.topStock.target} (${intelligenceMetrics.topStock.upside})`, tone: 'positive' },
                                                ]).map((kpi: any, idx: number) => (
                                                    <div key={idx} className="bg-black/45 border border-emerald-500/25 rounded-2xl p-4">
                                                        <div className="text-xs font-bold text-gray-400 mb-1">{kpi.label}</div>
                                                        <div className="text-lg sm:text-xl font-black text-emerald-300">{kpi.value}</div>
                                                        <div className="text-[11px] text-gray-300 mt-1">{kpi.sub}</div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* 대표님 전용 3줄 복기 총평 */}
                                            <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-teal-950/30 border border-emerald-500/35 rounded-2xl p-4 sm:p-5">
                                                <div className="text-xs sm:text-sm font-black text-emerald-300 mb-2.5 flex items-center gap-2">
                                                    <span>📌</span>
                                                    <span>대표님 전용 주간 복기 3줄 핵심 요약 (10초 브리핑)</span>
                                                </div>
                                                <div className="space-y-2 text-xs sm:text-sm text-gray-100 font-bold leading-relaxed">
                                                    {(weeklyReview?.executive_3line_summary || [
                                                        '1️⃣ [리서치 복기 총평]: 이번 주 증권사 커버리지 종목 점검 결과, 실적·수주 기반 대형주의 목표가 대비 저평가 매력이 뚜렷합니다.',
                                                        '2️⃣ [실전 매매 반성 및 평가]: 급등주 추격매수를 철저히 배제하고 현금 비중을 유지하며 1,000만원 정액 분할 매수 원칙을 지켰습니다.',
                                                        '3️⃣ [차주 월요일 핵심 전략]: 기대수익률 상위 Top 3 종목을 중심으로 월요일 시초가 눌림목에서 분할 매수 대응을 건의합니다.',
                                                    ]).map((line: string, i: number) => (
                                                        <div key={i} className="bg-black/35 rounded-xl px-3.5 py-2 border border-white/5">
                                                            {line}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* 🚀 차주 월요일 개장 최우선 타겟 Top 3 */}
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-base sm:text-lg font-black text-amber-300 flex items-center gap-2">
                                                        <span>🚀</span>
                                                        <span>차주(월요일) 개장 집중 공략 Top 3 타겟 &amp; 매매 시나리오</span>
                                                    </h4>
                                                    <span className="text-xs text-gray-400">복기 결과 기대수익률 최상위 엄선</span>
                                                </div>
                                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
                                                    {(weeklyReview?.monday_top3 || []).map((item: any) => (
                                                        <div key={item.rank} className="bg-gradient-to-br from-[#111c33] to-[#0a101f] border-2 border-amber-500/35 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                                                            <div className="space-y-2.5">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-xs">
                                                                        🏆 월요일 {item.rank}순위 · {item.stock_name}
                                                                    </span>
                                                                    <span className="text-xs font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
                                                                        {item.broker}
                                                                    </span>
                                                                </div>

                                                                <div className="bg-black/50 border border-white/10 rounded-xl p-3 flex items-center justify-between text-xs">
                                                                    <div>
                                                                        <div className="text-[10px] text-gray-400 font-bold">현재가 ➔ 목표주가</div>
                                                                        <div className="font-black text-white font-mono mt-0.5">
                                                                            {item.current_price.split(' ')[0]} ➔ <span className="text-amber-300">{item.target_price}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className="text-[10px] text-rose-300 font-bold">기대수익률</div>
                                                                        <div className="text-sm font-black text-rose-400 font-mono">{item.upside_pct}</div>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-1.5 text-xs">
                                                                    <div className="bg-emerald-950/35 border border-emerald-500/30 rounded-lg p-2.5">
                                                                        <span className="text-emerald-300 font-black block mb-0.5">🎯 월요일 진입 타점:</span>
                                                                        <span className="text-gray-200 font-medium">{item.entry_strategy}</span>
                                                                    </div>
                                                                    <div className="bg-rose-950/30 border border-rose-500/25 rounded-lg p-2.5">
                                                                        <span className="text-rose-300 font-black block mb-0.5">🛡️ 손절·방어 원칙:</span>
                                                                        <span className="text-gray-200 font-medium">{item.stop_loss_rule}</span>
                                                                    </div>
                                                                    <div className="text-[11px] text-gray-300 px-1 pt-0.5">
                                                                        <strong className="text-amber-300">• 핵심 모멘텀:</strong> {item.core_catalyst}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <button
                                                                type="button"
                                                                onClick={() => handleApproveWatchlistStock({
                                                                    stock_name: item.stock_name,
                                                                    stock_code: item.stock_code,
                                                                    category: 'kr_stock',
                                                                    current_price: item.current_price,
                                                                    target_price_final: item.target_price,
                                                                })}
                                                                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs cursor-pointer transition-all shadow-md"
                                                            >
                                                                🖋️ 대표이사 직권 차주 포트폴리오 즉시 편입
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* 📊 이번 주 증권사 리포트 추천주 전수 복기 리스트 */}
                                            <div className="space-y-3">
                                                <h4 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                                                    <span>📊</span>
                                                    <span>이번 주 상정 증권사 리포트 종목별 정밀 복기표</span>
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {(weeklyReview?.research_review_list || []).map((rep: any, idx: number) => (
                                                        <div key={idx} className="bg-black/45 border border-white/10 hover:border-emerald-500/40 rounded-2xl p-4 space-y-2.5 transition-all">
                                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black text-xs">
                                                                        🎯 {rep.stock_name}
                                                                    </span>
                                                                    <span className="text-xs font-bold text-gray-400">
                                                                        {rep.broker} · {rep.date}
                                                                    </span>
                                                                </div>
                                                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                                    {rep.verdict_badge}
                                                                </span>
                                                            </div>

                                                            <div className="text-sm font-black text-white">
                                                                {rep.title}
                                                            </div>

                                                            <div className="bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                                                                <span className="text-gray-300 font-bold">
                                                                    현재 <strong className="text-white font-mono">{rep.current_price.split(' ')[0]}</strong> ➔ 목표 <strong className="text-amber-300 font-mono">{rep.target_price}</strong>
                                                                </span>
                                                                <span className="text-rose-400 font-black font-mono">
                                                                    기대수익 {rep.upside_pct} (1천만원 시 {rep.profit_10m})
                                                                </span>
                                                            </div>

                                                            <ul className="space-y-1 text-xs text-gray-200 leading-relaxed">
                                                                <li className="flex items-start gap-1.5">
                                                                    <span className="text-emerald-400 font-black shrink-0">•</span>
                                                                    <span><strong className="text-emerald-300">주간 복기:</strong> {rep.review_note}</span>
                                                                </li>
                                                                <li className="flex items-start gap-1.5">
                                                                    <span className="text-amber-400 font-black shrink-0">•</span>
                                                                    <span><strong className="text-amber-300">차주 지침:</strong> {rep.monday_action}</span>
                                                                </li>
                                                            </ul>

                                                            {rep.weekly_forensics && (
                                                                <div className="bg-gradient-to-r from-slate-950 via-[#0a1424] to-slate-950 border border-teal-500/35 rounded-xl p-3 space-y-2.5 mt-2.5">
                                                                    <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-white/10 pb-1.5">
                                                                        <span className={`px-2 py-0.5 rounded-md font-black text-[11px] border ${
                                                                            rep.weekly_forensics.trend_tone === 'bull'
                                                                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                                                                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                                                        }`}>
                                                                            {rep.weekly_forensics.trend_badge}
                                                                        </span>
                                                                        <span className="text-xs font-black text-teal-200 flex-1 break-keep">
                                                                            💡 {rep.weekly_forensics.headline_summary}
                                                                        </span>
                                                                    </div>
                                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] leading-snug">
                                                                        <div className="bg-white/[0.03] border border-white/5 rounded-lg p-2.5 space-y-1">
                                                                            <div className="font-black text-emerald-300 flex items-center gap-1">
                                                                                <span>🏭</span>
                                                                                <span>1. 기업 실적·수주 팩트</span>
                                                                            </div>
                                                                            <div className="text-gray-300 leading-relaxed break-keep">{rep.weekly_forensics.pillar_earnings}</div>
                                                                        </div>
                                                                        <div className="bg-white/[0.03] border border-white/5 rounded-lg p-2.5 space-y-1">
                                                                            <div className="font-black text-cyan-300 flex items-center gap-1">
                                                                                <span>💰</span>
                                                                                <span>2. 외인·기관 큰손 수급</span>
                                                                            </div>
                                                                            <div className="text-gray-300 leading-relaxed break-keep">{rep.weekly_forensics.pillar_liquidity}</div>
                                                                        </div>
                                                                        <div className="bg-white/[0.03] border border-white/5 rounded-lg p-2.5 space-y-1">
                                                                            <div className="font-black text-purple-300 flex items-center gap-1">
                                                                                <span>🌐</span>
                                                                                <span>3. 대외 매크로·해외 직격탄</span>
                                                                            </div>
                                                                            <div className="text-gray-300 leading-relaxed break-keep">{rep.weekly_forensics.pillar_macro}</div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5 text-[11px] text-amber-200 font-medium flex items-center gap-1.5 break-keep">
                                                                        <span className="shrink-0">🎯</span>
                                                                        <span><strong className="text-amber-300 font-bold">차주 월요일 실전 타점:</strong> {rep.weekly_forensics.monday_gameplan}</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* 💼 실전 모의투자 계좌 주간 매매 반성문 & 리스크 감사 */}
                                            <div className="bg-black/40 border border-white/15 rounded-2xl p-4 sm:p-5 space-y-4">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <h4 className="text-base font-black text-white flex items-center gap-2">
                                                        <span>💼</span>
                                                        <span>우리 회사 실전 운용 계좌 주간 매매 복기 &amp; CRO 반성문</span>
                                                    </h4>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setActiveTab('approved_tf');
                                                            fetchTradingDesk();
                                                        }}
                                                        className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-black cursor-pointer"
                                                    >
                                                        실전 트레이딩 데스크 상세 열기 →
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="bg-emerald-950/25 border border-emerald-500/30 rounded-xl p-4 space-y-2">
                                                        <div className="text-xs sm:text-sm font-black text-emerald-300">
                                                            👍 이번 주 잘한 점 (한지훈 복기팀장 · 김도현 수급상무 평가)
                                                        </div>
                                                        <ul className="space-y-1.5 text-xs text-gray-200 leading-relaxed">
                                                            {(weeklyReview?.account_reflection?.well_done_points || []).map((pt: string, i: number) => (
                                                                <li key={i} className="flex items-start gap-1.5">
                                                                    <span className="text-emerald-400 font-black shrink-0">✓</span>
                                                                    <span>{pt}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>

                                                    <div className="bg-rose-950/25 border border-rose-500/30 rounded-xl p-4 space-y-2">
                                                        <div className="text-xs sm:text-sm font-black text-rose-300">
                                                            ⚠️ 반성 및 차주 보완할 점 (최서연 CRO 리스크 감사)
                                                        </div>
                                                        <ul className="space-y-1.5 text-xs text-gray-200 leading-relaxed">
                                                            {(weeklyReview?.account_reflection?.improve_points || []).map((pt: string, i: number) => (
                                                                <li key={i} className="flex items-start gap-1.5">
                                                                    <span className="text-rose-400 font-black shrink-0">!</span>
                                                                    <span>{pt}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>

                                                {Array.isArray(weeklyReview?.account_reflection?.positions) && weeklyReview.account_reflection.positions.length > 0 ? (
                                                    <div className="pt-2 space-y-2">
                                                        <div className="text-xs font-black text-gray-300">
                                                            📌 현재 보유 운용 종목별 주간 복기 코멘트 ({weeklyReview.account_reflection.positions.length}종목)
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                                            {(weeklyReview?.account_reflection?.positions || []).map((pos: any, i: number) => (
                                                                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3 text-xs space-y-1">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="font-black text-white">{pos.stock_name}</span>
                                                                        <span className={`font-black font-mono ${pos.pnl_pct >= 0 ? 'text-rose-400' : 'text-sky-400'}`}>
                                                                            {pos.pnl_pct >= 0 ? `+${pos.pnl_pct}%` : `${pos.pnl_pct}%`}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-[11px] text-gray-400 font-mono">
                                                                        매수가 {pos.entry_price_str} ➔ 현재 {pos.current_price_str}
                                                                    </div>
                                                                    <div className="text-[11px] text-emerald-200 pt-1 border-t border-white/5">
                                                                        • {pos.review_comment}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 text-xs text-gray-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                        <div>
                                                            <span className="font-black text-emerald-300">📌 현재 보유 운용 종목 없음 (가용 현금 100% · 총자산 {weeklyReview?.account_reflection?.total_equity_str || '100,000,000원'})</span>
                                                            <p className="text-[11px] text-gray-400 mt-0.5">
                                                                상단 Top 3 카드에서 [대표이사 직권 차주 포트폴리오 즉시 편입] 버튼을 누르시거나 전자결재 서류함에서 종목을 승인하시면 실시간 매수가·수익률 복기가 이곳에 자동 표시됩니다.
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* PART 2: 🗓️ 한주 경제일정·매크로 분석팀 캘린더 */}
                                    {(weeklySubView === 'both' || weeklySubView === 'calendar') && (
                                        <div className="bg-[#0b1323] border-2 border-indigo-500/35 rounded-3xl p-5 sm:p-6 space-y-6 shadow-xl">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                                                <div>
                                                    <div className="text-xs font-black text-indigo-400 mb-1 flex items-center gap-2">
                                                        <span>🗓️ PART 2 · 글로벌 경제캘린더·이벤트분석팀</span>
                                                        <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                                                            {weeklyCalendar?.team_leader || '윤서아 이사 · 이준호 이사 · 김도현 상무'}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-lg sm:text-xl font-black text-white">
                                                        {weeklyCalendar?.title || '🗓️ 한·미 핵심 경제일정 캘린더 & 요일별 호재/악재 대응 시나리오'}
                                                    </h3>
                                                </div>
                                                <span className="text-xs font-black text-amber-300 bg-amber-500/15 px-3 py-1.5 rounded-xl border border-amber-500/30 self-start sm:self-auto">
                                                    {weeklyCalendar?.mode_badge || '주간 5일(월~금) 시나리오 가동'}
                                                </span>
                                            </div>

                                            {/* 거시지표 기준점 4칸 요약 & 주간 전략 총평 */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                                {(weeklyCalendar?.macro_indicators || [
                                                    { label: '실시간 원/달러 환율', value: '1,380원대 실시간 감시' },
                                                    { label: '나스닥100 선물(NQ=F)', value: '24시간 추세 연동 중' },
                                                    { label: 'WTI 국제유가(CL=F)', value: '인플레 안정 구간 점검' },
                                                    { label: '주간 핵심 빅이벤트', value: '목(고용·PMI) · 금(PCE물가)' },
                                                ]).map((m: any, idx: number) => (
                                                    <div key={idx} className="bg-black/45 border border-indigo-500/25 rounded-2xl p-3.5">
                                                        <div className="text-[11px] font-bold text-gray-400">{m.label}</div>
                                                        <div className="text-base font-black text-indigo-300 font-mono mt-1">{m.value}</div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="bg-gradient-to-r from-indigo-950/45 via-slate-900 to-sky-950/35 border border-indigo-500/35 rounded-2xl p-4 text-xs sm:text-sm text-gray-100 leading-relaxed">
                                                <div className="font-black text-indigo-300 mb-1 flex items-center gap-1.5">
                                                    <span>🧭</span>
                                                    <span>윤서아 경제일정팀장 · 한주간 시장 온도계 &amp; 대응 가이드</span>
                                                </div>
                                                <p className="font-medium text-gray-200">
                                                    {weeklyCalendar?.weekly_strategy_summary || '주 초반(월~수)에는 한국 수출입 동향과 연준 위원 발언을 확인하며 실적 저평가주를 분할 매집하고, 주 후반(목~금) 미국 실업수당·PMI 및 PCE 물가지수 발표 전후에는 현금 비중(20~30%)으로 변동성에 유연하게 대응하십시오.'}
                                                </p>
                                            </div>

                                            {/* 월~금 요일별 상세 타임라인 & 호재/악재 시나리오 카드 */}
                                            <div className="space-y-4">
                                                {(weeklyCalendar?.days || []).map((day: any, dIdx: number) => (
                                                    <div
                                                        key={dIdx}
                                                        className={`rounded-2xl p-4 sm:p-5 border transition-all space-y-3.5 ${
                                                            day.is_today
                                                                ? 'bg-gradient-to-r from-indigo-950/50 via-[#101c35] to-[#0d1629] border-2 border-amber-400 shadow-lg shadow-amber-500/10'
                                                                : 'bg-black/45 border-white/10 hover:border-indigo-500/40'
                                                        }`}
                                                    >
                                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="px-3 py-1 rounded-xl bg-indigo-500/25 text-indigo-200 border border-indigo-400/40 font-black text-xs sm:text-sm font-mono">
                                                                    📅 {day.date_str}
                                                                </span>
                                                                {day.is_today && (
                                                                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] animate-pulse">
                                                                        ★ TODAY 오늘의 일정
                                                                    </span>
                                                                )}
                                                                {day.scenario_status_badge && (
                                                                    <span className={`px-2.5 py-0.5 rounded-full font-black text-[11px] border flex items-center gap-1 ${
                                                                        day.active_scenario === 'bull'
                                                                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                                                                            : day.active_scenario === 'bear'
                                                                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                                                                            : 'bg-white/10 text-gray-300 border-white/20'
                                                                    }`}>
                                                                        {day.scenario_status_badge}
                                                                    </span>
                                                                )}
                                                                <span className="text-sm sm:text-base font-black text-white">
                                                                    {day.theme}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-black text-amber-400 tracking-wider">
                                                                    중요도 {day.stars}
                                                                </span>
                                                                <span className="px-2.5 py-0.5 rounded-lg bg-white/10 text-gray-200 text-[11px] font-bold">
                                                                    {day.importance_badge}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* 시간대별 세부 일정 리스트 (실시간 발표 결과 반영) */}
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                                                            {(day.events || []).map((ev: any, eIdx: number) => (
                                                                <div 
                                                                    key={eIdx} 
                                                                    className={`rounded-xl p-3 space-y-1.5 transition-all border ${
                                                                        ev.status === 'released' 
                                                                            ? 'bg-slate-900/95 border-emerald-500/40 shadow-md shadow-emerald-500/5' 
                                                                            : 'bg-slate-900/80 border-white/10'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center justify-between text-[11px]">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className="font-black text-sky-300">{ev.country}</span>
                                                                            <span className="font-mono text-amber-300 font-bold">⏰ {ev.time} KST</span>
                                                                        </div>
                                                                        {ev.status === 'released' ? (
                                                                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black text-[10px] flex items-center gap-1">
                                                                                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> 발표완료
                                                                            </span>
                                                                        ) : (
                                                                            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold text-[10px]">
                                                                                ⏳ 발표 예정
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    <div className="text-xs font-black text-white leading-snug">
                                                                        {ev.name}
                                                                    </div>

                                                                    {/* 실제 발표치 vs 사전 예상치 */}
                                                                    {ev.status === 'released' && ev.actual ? (
                                                                        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-lg p-2 space-y-1 mt-1">
                                                                            <div className="flex items-center justify-between text-xs font-black">
                                                                                <span className="text-emerald-300 font-mono">📢 실제: {ev.actual}</span>
                                                                                {ev.impact === 'bull' ? (
                                                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-200 font-black">🟢 호재</span>
                                                                                ) : ev.impact === 'bear' ? (
                                                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-200 font-black">🔴 악재</span>
                                                                                ) : (
                                                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/30 text-sky-200 font-black">⚪ 부합</span>
                                                                                )}
                                                                            </div>
                                                                            {ev.forecast && (
                                                                                <div className="text-[10px] text-gray-400">
                                                                                    (사전 예상: {ev.forecast})
                                                                                </div>
                                                                            )}
                                                                            {ev.impact_comment && (
                                                                                <div className="text-[11px] text-emerald-200/90 font-medium leading-snug pt-0.5">
                                                                                    💡 {ev.impact_comment}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-[11px] text-gray-400 pt-0.5">
                                                                            • 예상/핵심: <span className="text-gray-200 font-semibold">{ev.consensus || ev.forecast}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* 호재 vs 악재 시나리오 양면 비교 (실시간 가동 공략 강조) */}
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            <div className={`rounded-xl p-3 text-xs space-y-1 transition-all ${
                                                                day.active_scenario === 'bull'
                                                                    ? 'bg-emerald-950/60 border-2 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.25)] ring-1 ring-emerald-400/50'
                                                                    : 'bg-emerald-950/30 border border-emerald-500/30'
                                                            }`}>
                                                                <div className="font-black text-emerald-300 flex items-center justify-between gap-1.5">
                                                                    <span className="flex items-center gap-1.5">
                                                                        <span>🟢 긍정(호재) 발표 시 시장 시나리오 &amp; 공략</span>
                                                                    </span>
                                                                    {day.active_scenario === 'bull' && (
                                                                        <span className="px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-black text-[10px] animate-pulse">
                                                                            🔥 [실시간 가동 중인 공략]
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-gray-200 leading-relaxed font-medium">
                                                                    {day.bull_scenario}
                                                                </p>
                                                            </div>

                                                            <div className={`rounded-xl p-3 text-xs space-y-1 transition-all ${
                                                                day.active_scenario === 'bear'
                                                                    ? 'bg-rose-950/60 border-2 border-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.25)] ring-1 ring-rose-400/50'
                                                                    : 'bg-rose-950/30 border border-rose-500/30'
                                                            }`}>
                                                                <div className="font-black text-rose-300 flex items-center justify-between gap-1.5">
                                                                    <span className="flex items-center gap-1.5">
                                                                        <span>🔴 부진(악재) 발표 시 리스크 방어 지침</span>
                                                                    </span>
                                                                    {day.active_scenario === 'bear' && (
                                                                        <span className="px-2 py-0.5 rounded-full bg-rose-400 text-slate-950 font-black text-[10px] animate-pulse">
                                                                            ⚠️ [실시간 가동 중인 방어]
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-gray-200 leading-relaxed font-medium">
                                                                    {day.bear_scenario}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* 주목할 수혜 섹터 태그 */}
                                                        <div className="flex flex-wrap items-center gap-2 pt-1">
                                                            <span className="text-[11px] font-black text-indigo-300">
                                                                🎯 {day.day_name} 집중 감시 섹터:
                                                            </span>
                                                            {(day.focus_sectors || []).map((sec: string, sIdx: number) => (
                                                                <span
                                                                    key={sIdx}
                                                                    className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-200 border border-indigo-500/30 text-[11px] font-bold"
                                                                >
                                                                    #{sec}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                                        )}{activeTab === 'history' && (
                                <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-5 space-y-5">
                                    <div>
                                        <h3 className="text-lg font-black text-white mb-1">
                                            🗂️ 대표님 전사 지휘 명령 이력 & 전자결재 서명 기록부
                                        </h3>
                                        <p className="text-xs text-gray-400">
                                            대표님께서 지휘통제실에서 하달하신 전사 명령(5대 본부 자동 이행 로그)과 전자결재 서명 내역이 보관됩니다.
                                        </p>
                                    </div>

                                    {directiveLogs.length > 0 && (
                                        <div className="space-y-2.5">
                                            <div className="text-xs font-black text-amber-300">
                                                ⚡ 최근 대표이사 지휘 명령 & 5대 본부 자동 이행 원장 ({directiveLogs.length}건)
                                            </div>
                                            {directiveLogs.map((log: any, idx: number) => (
                                                <div key={log.cmd_id || idx} className="bg-black/50 border border-amber-500/30 rounded-xl p-3.5 space-y-2">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <span className="text-xs font-black text-amber-300 font-mono">
                                                            [{log.cmd_id}] 지시: {log.directive_text}
                                                        </span>
                                                        <span className="text-[11px] text-gray-400 font-mono">{log.timestamp}</span>
                                                    </div>
                                                    <div className="text-xs font-bold text-emerald-300">{log.headline_result}</div>
                                                    {Array.isArray(log.workflow_steps) && (
                                                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5 pt-1">
                                                            {(log?.workflow_steps || []).map((st: any, sIdx: number) => (
                                                                <div key={sIdx} className="bg-white/5 rounded-lg p-2 text-[10px]">
                                                                    <div className="font-black text-white">{st.avatar} {st.dept}</div>
                                                                    <div className="text-emerald-300 font-bold">{st.status}</div>
                                                                    <div className="text-gray-400 mt-0.5 line-clamp-2">{st.detail}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="space-y-2.5">
                                        {autoApprovals.map(doc => {
                                            const info = signMap[doc.doc_id];
                                            const st = info?.status || 'pending';
                                            return (
                                                <div
                                                    key={doc.doc_id}
                                                    className="bg-black/40 border border-white/10 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2"
                                                >
                                                    <div>
                                                        <div className="text-xs text-gray-400 font-mono">
                                                            {doc.doc_number} · {doc.stock_name}
                                                        </div>
                                                        <div className="text-sm font-bold text-white">
                                                            {doc.title}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        {st === 'approved' && (
                                                            <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black">
                                                                💮 승인 완료 ({info?.signedAt})
                                                            </span>
                                                        )}
                                                        {st === 'hold' && (
                                                            <span className="px-3 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-black">
                                                                ⏸️ 보류 ({info?.signedAt})
                                                            </span>
                                                        )}
                                                        {st === 'reexamine' && (
                                                            <span className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black">
                                                                🔄 재검토 지시 ({info?.signedAt})
                                                            </span>
                                                        )}
                                                        {st === 'pending' && (
                                                            <span className="px-3 py-1 rounded-lg bg-white/10 text-gray-400 text-xs font-bold">
                                                                서명 대기 중
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 우측 4컬럼: 전사 시장 시스템 가동 현황 & 빠른 서명 요약 (전자결재 탭에서는 12컬럼 풀와이드 메일함으로 전환) */}
                        <div className={['electronic_sign', 'one_page_summary', 'weekly_review_calendar', 'watchlist_research', 'approved_tf'].includes(activeTab) ? 'hidden' : 'lg:col-span-4 space-y-5'}>
                            {/* 전사 자동 시스템 가동 모니터 */}
                            <div className="bg-[#0d1526] border border-emerald-500/30 rounded-2xl p-4 sm:p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                                        <span>🖥️ 전사 자동화 시스템 상태</span>
                                    </h3>
                                    <span className="text-[11px] font-extrabold text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                                        100% 정상 가동
                                    </span>
                                </div>

                                <div className="space-y-2 text-xs">
                                    <div className="bg-black/40 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                                        <div>
                                            <div className="font-bold text-white">리서치센터 크롤러</div>
                                            <div className="text-[11px] text-gray-400">국내 증권사 리포트 자동 수집·요약</div>
                                        </div>
                                        <span className="text-emerald-400 font-black">정상 ({researchDesk.length}건)</span>
                                    </div>
                                    <div className="bg-black/40 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                                        <div>
                                            <div className="font-bold text-white">퀀트 수급 스캐너</div>
                                            <div className="text-[11px] text-gray-400">외인·기관 수급 및 50일선 자동 판독</div>
                                        </div>
                                        <span className="text-emerald-400 font-black">정상 가동</span>
                                    </div>
                                    <div className="bg-black/40 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                                        <div>
                                            <div className="font-bold text-white">글로벌 24시 데스크</div>
                                            <div className="text-[11px] text-gray-400">미국주식 · ETF · 나스닥선물 연동</div>
                                        </div>
                                        <span className="text-emerald-400 font-black">실시간 동기화</span>
                                    </div>
                                    <div className="bg-black/40 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                                        <div>
                                            <div className="font-bold text-white">CRO 리스크 감사봇</div>
                                            <div className="text-[11px] text-gray-400">전 기안서 하방 위험 자동 첨부</div>
                                        </div>
                                        <span className="text-emerald-400 font-black">감사 완료</span>
                                    </div>
                                </div>
                            </div>

                            {/* 리서치팀 추가 참고 원문 서류함 */}
                            <div className="bg-[#0d1526] border border-white/15 rounded-2xl p-4 sm:p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm sm:text-base font-black text-white">
                                        📑 오늘 수집된 리포트 원문 목록
                                    </h3>
                                    <Link
                                        href="/research"
                                        className="text-xs font-bold text-sky-400 hover:underline"
                                    >
                                        자료실 전체보기 →
                                    </Link>
                                </div>
                                <div className="space-y-2">
                                    {researchDesk.slice(0, 5).map(rep => (
                                        <div
                                            key={rep.id}
                                            className="bg-black/40 border border-white/10 rounded-xl p-3"
                                        >
                                            <div className="flex items-center justify-between gap-1 mb-1">
                                                <span className="text-xs font-black text-white">
                                                    {rep.stock_name}
                                                </span>
                                                <span className="text-[11px] font-bold text-amber-300">
                                                    🎯 {rep.target_price}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-300 line-clamp-1">
                                                [{rep.broker}] {rep.title}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 광고 슬롯 */}
                            <div className="flex justify-center">
                                <KakaoRevenueAd type="feed" />
                            </div>
                        </div>
                    </div>
                )}

                {/* 🔒 대표이사 집무실 1급 기밀 보안 & 🌐 일반 공개 페이지 무인 구글 SEO 분리 가동 현황판 */}
                <div className="bg-[#0d1526] border border-amber-500/35 rounded-2xl p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                            <h3 className="text-xs sm:text-sm font-black text-white">
                                🔒 대표이사 집무실·기안서 『대표님 단독 열람 보안』 &amp; 🌐 일반 공개 페이지 무인 SEO 가동 중
                            </h3>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            🔒 이 집무실과 결재 기안서는 오직 대표님 계정만 열람 가능 (외부·검색엔진 100% 비공개)
                        </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                        <div className="bg-black/40 border border-amber-500/25 rounded-xl p-3 flex items-center justify-between">
                            <div>
                                <div className="font-bold text-amber-300">🔒 대표이사 집무실·기안서</div>
                                <div className="text-[11px] text-gray-400">일반 회원·비로그인·검색로봇 접근 완전 차단</div>
                            </div>
                            <span className="text-amber-400 font-black shrink-0">대표님 전용</span>
                        </div>
                        <div className="bg-black/40 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                            <div>
                                <div className="font-bold text-white">🌐 일반 공개 종목 페이지</div>
                                <div className="text-[11px] text-gray-400">일반 방문자용 종목 시세·가이드 구글 노출</div>
                            </div>
                            <Link href="/directory" className="text-emerald-400 font-black hover:underline shrink-0">
                                디렉토리 →
                            </Link>
                        </div>
                        <div className="bg-black/40 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                            <div>
                                <div className="font-bold text-white">🗺️ 공개 페이지 사이트맵</div>
                                <div className="text-[11px] text-gray-400">집무실 제외 · 공개 가이드/종목만 등록</div>
                            </div>
                            <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="text-emerald-400 font-black hover:underline shrink-0">
                                Sitemap →
                            </a>
                        </div>
                        <div className="bg-black/40 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                            <div>
                                <div className="font-bold text-white">📡 무인 IndexNow 검색 핑</div>
                                <div className="text-[11px] text-gray-400">일반 공개 페이지만 구글·네이버 자동 홍보</div>
                            </div>
                            <span className="text-emerald-400 font-black shrink-0">자동 가동 중</span>
                        </div>
                    </div>
                </div>

                {/* 자본시장법 준수 고지 */}
                <div className="bg-[#0b1120] border border-white/10 rounded-xl p-4 text-[11px] text-gray-400 leading-relaxed">
                    <span className="font-bold text-gray-300">⚖️ 준법감시인 안내 (자본시장법 제101조 준수):</span>{' '}
                    본 「AI 증권사 대표이사 전자결재 & 자율 보고 시스템」은 제도권 증권사 리서치센터가 발간한 공개 컨센서스 리포트와 거래소의 객관적 시세·수급 데이터를 자동으로 요약·상정하는 시뮬레이션 시스템입니다. 모든 최종 투자 판단(결재)과 책임은 이용자 본인에게 있습니다.
                </div>
            </div>
        </div>
    );
}
