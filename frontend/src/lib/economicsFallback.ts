export interface EconomicsQuizItem {
    question: string;
    options: string[];
    answerIndex: number;
    explanation: string;
}

export interface EconomicsCategoryStat {
    id: string;
    label: string;
    emoji: string;
    shortDesc: string;
    publishedCount?: number;
    totalPlanned?: number;
}

export interface EconomicsPost {
    id: string;
    slug: string;
    dayNumber: number;
    title: string;
    oneLineDef: string;
    summary: string;
    content: string;
    quiz?: EconomicsQuizItem[];
    category: string;
    categoryLabel: string;
    categoryEmoji: string;
    difficulty: string;
    tags: string[];
    originalTopic?: string;
    author: string;
    createdAt: string | Date;
    createdDateKst?: string;
    viewCount: number;
    quizCount?: number;
}

export const ECONOMICS_CATEGORIES_META: EconomicsCategoryStat[] = [
    { id: "micro", label: "생활 & 미시경제", emoji: "🛒", shortDesc: "내 일상·가격·소비·기업 선택의 원리", totalPlanned: 30 },
    { id: "macro", label: "거시경제 & 경기순환", emoji: "🌍", shortDesc: "물가·GDP·실업·호황과 불황의 큰 그림", totalPlanned: 30 },
    { id: "money", label: "화폐·금리·중앙은행", emoji: "🏦", shortDesc: "돈의 탄생·기준금리·연준·채권과 대출", totalPlanned: 30 },
    { id: "global", label: "환율·무역·국제경제", emoji: "💱", shortDesc: "달러·엔화·관세·글로벌 자금 흐름", totalPlanned: 30 },
    { id: "behavior", label: "행동경제 & 돈의 심리", emoji: "🧠", shortDesc: "인간이 돈 앞에서 흔들리는 심리 함정", totalPlanned: 30 },
    { id: "history", label: "경제사·거장 & 현대경제", emoji: "📜", shortDesc: "역사적 위기·위대한 경제학자·최신 트렌드", totalPlanned: 30 },
];

export const FALLBACK_ECONOMICS_POSTS: EconomicsPost[] = [
    {
        id: "econ-starter-01",
        slug: "econ-starter-01",
        dayNumber: 1,
        title: "수요와 공급의 법칙 - 배추값과 인기 콘서트 티켓값은 왜 갑자기 뛸까?",
        oneLineDef: "사고 싶은 사람이 많으면 가격이 오르고, 팔 물건이 넘치면 가격이 내려가는 경제학의 1번 원리입니다.",
        summary: "경제학의 가장 기초이자 모든 가격 변동의 출발점인 수요와 공급의 원리를 일상 비유와 그림으로 5분 만에 정리합니다.",
        category: "micro",
        categoryLabel: "생활 & 미시경제",
        categoryEmoji: "🛒",
        difficulty: "입문",
        tags: ["1일1경제학", "생활 & 미시경제", "수요와공급", "입문"],
        originalTopic: "수요와 공급의 법칙 - 왜 배추값과 인기 콘서트 티켓값은 갑자기 뛸까?",
        author: "StockTrend 경제학 1타 선생님",
        createdAt: "2026-11-20T00:00:00.000Z",
        createdDateKst: "2026-11-20",
        viewCount: 128,
        quizCount: 2,
        quiz: [
            {
                question: "폭염과 태풍으로 배추 수확량이 절반으로 줄어들었을 때, 시장에서 가장 먼저 일어나는 현상은 무엇일까요?",
                options: [
                    "공급이 줄어들어 배추 가격이 크게 오른다",
                    "공급이 줄어들어 배추 가격이 절반으로 떨어진다",
                    "공급과 가격은 서로 아무 관계가 없다"
                ],
                answerIndex: 0,
                explanation: "사고 싶은 사람(수요)은 그대로인데 팔 물건(공급)이 급격히 줄어들면 서로 사려고 경쟁이 붙으면서 가격이 올라갑니다."
            },
            {
                question: "인기 아이돌 콘서트 좌석은 1만 석뿐인데 사고 싶은 팬이 20만 명 몰렸습니다. 이때 암표 가격이 치솟는 이유는 무엇일까요?",
                options: [
                    "공급 과잉으로 표가 남아서",
                    "수요가 공급을 압도하는 초과 수요 상태이기 때문에",
                    "공연장이 너무 넓어서"
                ],
                answerIndex: 1,
                explanation: "공급(좌석 수)은 고정되어 있는데 수요(팬들의 구매 욕구)가 폭발적으로 많으면 가격이 자연스럽게 상승 압력을 받습니다."
            }
        ],
        content: `
<div class="bg-gradient-to-br from-indigo-950/80 to-slate-900/80 border border-indigo-400/40 rounded-3xl p-6 md:p-8 my-8 shadow-xl">
  <p class="text-amber-300 font-black text-lg mb-3">⚡ 30초 만에 끝내는 오늘의 핵심 3줄 요약</p>
  <ul class="list-none space-y-3 mb-0">
    <li class="flex items-start gap-3 text-gray-100 text-base md:text-lg"><span class="text-amber-400 font-black">1.</span><span><strong class="text-amber-200">수요(Demand)</strong>는 사고 싶은 마음과 지갑의 힘, <strong class="text-amber-200">공급(Supply)</strong>은 시장에 내놓는 물건의 양입니다.</span></li>
    <li class="flex items-start gap-3 text-gray-100 text-base md:text-lg"><span class="text-amber-400 font-black">2.</span><span>물건이 귀해지거나 찾는 사람이 몰리면 가격은 오르고, 물건이 남아돌면 가격은 내려갑니다.</span></li>
    <li class="flex items-start gap-3 text-gray-100 text-base md:text-lg"><span class="text-amber-400 font-black">3.</span><span>마트 배추값부터 아파트 가격, 삼성전자 주가, 달러 환율까지 세상의 모든 가격은 이 원리로 움직입니다.</span></li>
  </ul>
</div>

<h2 class="text-2xl md:text-3xl font-black text-white pb-3 border-b-2 border-amber-500/40 mb-8 mt-14">1단계 💡 일상 속 비유로 1분 만에 깨닫기</h2>
<p class="text-gray-100 text-base md:text-lg leading-relaxed mb-6 break-keep">
  여름철 갑자기 큰 태풍이 지나가면 뉴스에 꼭 나오는 단골 소식이 있습니다. 바로 <strong class="text-amber-200 bg-amber-500/20 px-1.5 py-0.5 rounded font-bold">"금배추 대란! 배추 한 포기 1만 원 돌파"</strong> 같은 헤드라인이죠. 반대로 풍년이 들어 배추가 넘쳐나면 마트에서 한 포기에 2천 원에도 팔립니다.
</p>
<p class="text-gray-100 text-base md:text-lg leading-relaxed mb-6 break-keep">
  경제학에서 이 현상을 설명하는 가장 유명한 공식이 바로 <strong class="text-amber-200 bg-amber-500/20 px-1.5 py-0.5 rounded font-bold">수요(사고 싶은 힘)와 공급(팔려는 물건의 양)의 법칙</strong>입니다. 동네 인기 베이커리에 소금빵이 딱 10개 남았는데 줄 서 있는 손님이 50명이라면? 가격이 조금 올라도 사겠다는 사람이 나타납니다. 반대로 마감 10분 전인데 빵이 30개나 남아 있다면 사장님은 50% 할인 스티커를 붙여서라도 팔려고 하겠죠.
</p>

<h2 class="text-2xl md:text-3xl font-black text-white pb-3 border-b-2 border-amber-500/40 mb-8 mt-14">2단계 🎨 그림과 숫자로 보는 핵심 원리</h2>
<div class="overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/30 p-5 md:p-7 my-10 shadow-2xl">
  <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
    <span class="text-amber-400 font-black text-base md:text-lg">🎨 그림으로 10초 만에 이해하는 수요·공급 균형가격</span>
    <span class="text-xs px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold">초보자 시각 도식</span>
  </div>
  <svg viewBox="0 0 840 420" class="w-full h-auto font-sans">
    <rect width="840" height="420" fill="#0b1120" rx="16" />
    <line x1="120" y1="340" x2="740" y2="340" stroke="#475569" stroke-width="2" />
    <line x1="120" y1="70" x2="120" y2="340" stroke="#475569" stroke-width="2" />
    <text x="85" y="75" fill="#94a3b8" font-size="14" font-weight="bold">가격 ↑</text>
    <text x="690" y="370" fill="#94a3b8" font-size="14" font-weight="bold">거래량 →</text>
    <line x1="180" y1="100" x2="650" y2="310" stroke="#38bdf8" stroke-width="4" />
    <text x="655" y="315" fill="#38bdf8" font-size="15" font-weight="bold">수요곡선 (쌀수록 더 삼)</text>
    <line x1="180" y1="310" x2="650" y2="100" stroke="#f59e0b" stroke-width="4" />
    <text x="580" y="90" fill="#f59e0b" font-size="15" font-weight="bold">공급곡선 (비쌀수록 더 팜)</text>
    <circle cx="415" cy="205" r="10" fill="#10b981" stroke="#ffffff" stroke-width="3" />
    <rect x="440" y="172" width="235" height="62" rx="10" fill="#10b981" opacity="0.18" stroke="#10b981" />
    <text x="456" y="198" fill="#34d399" font-size="15" font-weight="bold">🟢 시장 균형 가격 (만남의 점)</text>
    <text x="456" y="220" fill="#cbd5e1" font-size="13">사고 싶은 양 = 팔려는 양 일치!</text>
  </svg>
  <p class="text-gray-400 text-sm mt-3 text-center">▲ 파란 선(수요)과 주황 선(공급)이 딱 만나는 지점이 시장에서 자연스럽게 형성되는 가격입니다.</p>
</div>

<h2 class="text-2xl md:text-3xl font-black text-white pb-3 border-b-2 border-amber-500/40 mb-8 mt-14">3단계 💰 내 지갑·투자에 미치는 진짜 영향</h2>
<p class="text-gray-100 text-base md:text-lg leading-relaxed mb-6 break-keep">
  주식 시장도 똑같습니다. AI 반도체 칩을 만들고 싶은 빅테크 기업은 줄을 섰는데(수요 폭발), 최첨단 칩을 찍어낼 수 있는 공장은 한정되어 있다면(공급 부족) 반도체 가격과 기업 이익, 그리고 주가가 강하게 올라갑니다. 반대로 공장들이 너도나도 너무 많이 물건을 찍어내면(공급 과잉) 가격이 떨어지며 주가도 조정을 받게 됩니다.
</p>
<div class="bg-emerald-950/40 border-l-4 border-emerald-500 rounded-2xl p-6 my-8 shadow-lg">
  <p class="text-emerald-200 text-base md:text-lg font-bold leading-relaxed mb-0">💡 경제 뉴스를 볼 때 딱 두 가지만 물어보세요: "지금 이 물건(또는 주식·집·달러)을 사려는 사람이 늘었나? 아니면 파는 물량이 늘었나?" 이 질문 하나만으로도 세상의 절반이 보이기 시작합니다!</p>
</div>
`
    }
];
