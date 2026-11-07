import { API_BASE_URL } from '@/lib/config';
import { Metadata } from 'next';
import Link from 'next/link';
import { Layers, TrendingUp, ShieldAlert, ArrowLeft, BookOpen, CheckCircle2, BarChart3 } from 'lucide-react';
import SeoContentBlock from '@/components/SeoContentBlock';

export const revalidate = 21600;

type ThemeStock = { ticker: string; name: string; role?: string };
type ThemeEntry = {
    slug: string;
    name: string;
    description: string;
    risk_factor: string;
    value_chain: string;
    key_metrics: string;
    leaders: ThemeStock[];
    followers: ThemeStock[];
};

const STATIC_THEME_DATABASE: Record<string, ThemeEntry> = {
    'semiconductor': {
        slug: 'semiconductor',
        name: 'AI 반도체 · HBM · 소부장',
        description: '글로벌 데이터센터의 AI 가속기 투자 확대에 따라 고대BM(HBM3E·HBM4), 최선단 파운드리 공정, 온디바이스 AI NPU 및 전공정·후공정(어드밴스드 패키징) 핵심 소재·부품·장비 기업으로 구성된 대한민국 핵심 수출 주도 섹터입니다.',
        risk_factor: '글로벌 빅테크(CSP)의 설비투자(CAPEX) 증가율 둔화, 레거시 DRAM/NAND 판가(ASP) 하락 사이클 진입, 미·중 반도체 수출 통제 강화 및 환율 변동성에 따른 분기 영업이익률 훼손 리스크를 상시 점검해야 합니다.',
        value_chain: '업스트림(웨이퍼·특수가스·포토레지스트·노광/식각 전공정 장비) ➔ 미드스트림(메모리 IDM 및 파운드리 전공정 제조) ➔ 다운스트림(TC본더·플립칩 패키징·테스트 소켓 후공정 및 서버/데이터센터 탑재)으로 이어지는 분업 구조를 가집니다.',
        key_metrics: '관세청 월간(1~10일, 1~20일) 반도체 수출 증감률, 필라델피아 반도체지수(SOX) 추이, DRAMeXchange 고정거래가격, 기업별 재고자산회전율 및 HBM 매출 비중.',
        leaders: [
            { ticker: '000660', name: 'SK하이닉스', role: '글로벌 HBM3E 시장 선도 및 AI 서버향 고부가 메모리 공급' },
            { ticker: '005930', name: '삼성전자', role: '메모리·파운드리·어드밴스드 패키징 턴키(Turn-key) 종합반도체(IDM)' },
            { ticker: '042700', name: '한미반도체', role: 'HBM 적층 공정 필수 장비인 듀얼 TC 본더(Thermal Compression Bonder) 글로벌 공급' }
        ],
        followers: [
            { ticker: '058470', name: '리노공업', role: '반도체 테스트 핀(리노핀) 및 초정밀 검사용 IC 소켓 제조' },
            { ticker: '403870', name: 'HPSP', role: '선단 공정 필수 고압수소어닐링(HPA) 전공정 독점 장비' },
            { ticker: '007660', name: '이수페타시스', role: 'AI 가속기 및 데이터센터 네트워크용 초다층 인쇄회로기판(MLB)' }
        ]
    },
    'ai': {
        slug: 'ai',
        name: '인공지능(AI) 소프트웨어 · 클라우드 · 데이터센터',
        description: '초거대 언어모델(LLM)을 넘어 기업용 AI 에이전트(B2B SaaS), 의료·국방·제조 버티컬 AI 솔루션, 그리고 이를 뒷받침하는 AI 데이터센터 전력·액침냉각 인프라 기업군을 포괄하는 구조적 성장 섹터입니다.',
        risk_factor: 'AI 도입 기대감 대비 실제 B2B 유료 구독 매출(ARR) 전환 지연, 클라우드 인프라 및 GPU 임차 비용 증가에 따른 영업적자 장기화, 고밸류에이션(높은 PSR·PER) 구간의 금리 민감도 확대에 유의해야 합니다.',
        value_chain: '파운데이션 모델 및 클라우드 인프라(CSP/MSP) ➔ 데이터 전처리·보안·벡터 DB 미들웨어 ➔ 엔터프라이즈 업무 자동화·의료 영상 판독·금융 AI 등 버티컬 애플리케이션 계층으로 구성됩니다.',
        key_metrics: '연간 반복 매출(ARR) 성장률, 수주잔고(Backlog), 영업현금흐름(OCF) 흑자 전환 여부, R&D 비용 대비 매출총이익률(GPM).',
        leaders: [
            { ticker: '035420', name: 'NAVER', role: '하이퍼클로바X 기반 소버린 AI 생태계 및 검색·커머스 AI 고도화' },
            { ticker: '018260', name: '삼성에스디에스', role: '생성형 AI 플랫폼 패브릭스(FabriX) 및 기업용 클라우드 MSP/CSP' },
            { ticker: '012510', name: '더존비즈온', role: 'ERP·그룹웨어 결합 기업용 AI 비서(ONE AI) B2B 유료화 확산' }
        ],
        followers: [
            { ticker: '328130', name: '루닛', role: 'AI 기반 암 진단 및 면역항암제 바이오마커 영상 분석 솔루션' },
            { ticker: '053580', name: '웹케시', role: 'B2B 금융 AI 자금관리 및 경리나라 클라우드 SaaS 솔루션' },
            { ticker: '030520', name: '한글과컴퓨터', role: '한컴독스 AI 및 공공·기업 문서 데이터 자산화 솔루션' }
        ]
    },
    'secondary-battery': {
        slug: 'secondary-battery',
        name: '2차전지 · 하이니켈 양극재 · ESS · 전고체',
        description: '글로벌 전기차(EV) 및 에너지저장장치(ESS)에 탑재되는 리튬이온 배터리 셀 제조사와 양극재·음극재·전해질·분리막 4대 핵심 소재, 차세대 전고체 배터리 및 폐배터리 리사이클링 밸류체인을 아우르는 섹터입니다.',
        risk_factor: '전기차 캐즘(Chasm·일시적 수요 정체) 장기화, 리튬·니켈 등 광물 가격 하락에 따른 역래깅(고가 원재료 투입 후 판가 하락) 재고평가손실, 북미·유럽 친환경 보조금 정책 변화 리스크를 반드시 점검해야 합니다.',
        value_chain: '업스트림(리튬·니켈 광산 정련 및 전구체 제조) ➔ 미드스트림(양극재·음극재·동박·분리막·전해액 4대 소재 생산) ➔ 다운스트림(배터리 셀 조립·패키징 및 완성차/ESS 전력망 납품)으로 연결됩니다.',
        key_metrics: '탄산리튬/수산화리튬 국제 현물 가격, 양극재 수출 중량 및 단가 추이, 북미 합작법인(JV) 공장 가동률, AMPC(첨단제조생산세액공제) 제외 본업 영업이익률.',
        leaders: [
            { ticker: '373220', name: 'LG에너지솔루션', role: '글로벌 전기차 배터리 셀 및 북미 전력망 ESS 시장 핵심 공급사' },
            { ticker: '006400', name: '삼성SDI', role: '각형 프리미엄 배터리 및 차세대 전고체 배터리(ASB) 상용화 선도' },
            { ticker: '247540', name: '에코프로비엠', role: '하이니켈 NCA/NCM 양극재 글로벌 생산 역량 및 전구체 수직계열화' }
        ],
        followers: [
            { ticker: '003670', name: '포스코퓨처엠', role: '양극재·천연/인조흑연 음극재 동시 생산 및 광물 밸류체인 내재화' },
            { ticker: '066970', name: '엘앤에프', role: '고에너지밀도 하이니켈 NCMA 양극재 및 LFP 신사업 추진' },
            { ticker: '005490', name: 'POSCO홀딩스', role: '아르헨티나 염호 및 광석 리튬 상업 생산을 통한 배터리 소재 원료 공급' }
        ]
    },
    'bio': {
        slug: 'bio',
        name: '제약·바이오 · ADC · 비만치료제 · CDMO',
        description: '글로벌 블록버스터 의약품의 위탁개발생산(CDMO), 차세대 항암 기술인 항체-약물접합체(ADC), GLP-1 계열 비만·대사질환 치료제, 그리고 이중항체·피하주사(SC) 제형 변경 플랫폼 기술수출(L/O) 기업으로 구성된 섹터입니다.',
        risk_factor: '임상 1·2·3상 유효성(Primary Endpoint) 미달 및 FDA 승인 보류(CRL) 리스크, 기술수출 계약 반환, 전환사채(CB)·유상증자 발행에 따른 주주가치 희석 및 관리종목(법차손) 지정 여부를 엄격히 확인해야 합니다.',
        value_chain: '신약 후보물질 탐색·전임상/임상 개발(바이오텍 플랫폼) ➔ 글로벌 빅파마 기술이전(L/O) 및 공동 임상 ➔ 대규모 상업화 원료의약품(DS)·완제의약품(DP) 위탁생산(CDMO) 및 글로벌 유통으로 이어집니다.',
        key_metrics: 'CDMO 공장 가동률 및 신규 수주액, 임상 단계별 파이프라인 마일스톤 유입액, 현금성 자산 보유량 대비 연간 R&D 집행 비용(Runway).',
        leaders: [
            { ticker: '207940', name: '삼성바이오로직스', role: '글로벌 1위 규모 항체의약품 위탁개발생산(CDMO) 및 ADC 생산시설 확장' },
            { ticker: '068270', name: '셀트리온', role: '자가면역질환·항암 바이오시밀러 글로벌 직판 체제 및 신약 짐펜트라 확대' },
            { ticker: '196170', name: '알테오젠', role: '정맥주사(IV)를 피하주사(SC)로 전환하는 ALT-B4 플랫폼 글로벌 빅파마 기술수출' }
        ],
        followers: [
            { ticker: '000100', name: '유한양행', role: '비소세포폐암 신약 렉라자(레이저티닙) FDA 승인 및 글로벌 로열티 수취' },
            { ticker: '141080', name: '리가켐바이오', role: '차세대 항체-약물접합체(ADC) 링커 플랫폼 및 다중 파이프라인 기술이전' },
            { ticker: '128940', name: '한미약품', role: '한국형 비만·대사질환(MASH) 신약 파이프라인 및 자체 원료의약품 생산 역량' }
        ]
    },
    'robot': {
        slug: 'robot',
        name: '휴머노이드 · 협동로봇 · 스마트팩토리 자동화',
        description: '인구 고령화와 생산가능인구 감소에 대응하여 제조·물류 현장에 투입되는 협동로봇(Cobot), 자율주행 물류로봇(AMR), AI 휴머노이드 로봇 및 핵심 부품인 정밀감속기·서보모터·액추에이터 제조 기업군입니다.',
        risk_factor: '로봇 하드웨어 단가 경쟁 심화, 대규모 설비투자 초기 단계에서의 영업적자 지속, 제조 경기 둔화 시 고객사의 스마트팩토리 설비 도입 지연 리스크를 고려해야 합니다.',
        value_chain: '핵심 부품(하모닉 감속기·토크 센서·구동 액추에이터·AI 비전 제어기) ➔ 완제품 로봇 제조(협동로봇·산업용 다관절 로봇·물류 AMR) ➔ 시스템 통합(SI) 및 공정 자동화 구축으로 구성됩니다.',
        key_metrics: '협동로봇 글로벌 수출 대수, 핵심 부품(감속기·액추에이터) 국산화율 및 내재화 비중, 대기업 캡티브(Captive) 물량 발주 규모.',
        leaders: [
            { ticker: '277810', name: '레인보우로보틱스', role: '핵심 부품 내재화 기반 협동로봇·이족보행 휴머노이드 및 양팔 로봇 개발' },
            { ticker: '454910', name: '두산로보틱스', role: '다양한 가반하중 라인업을 보유한 글로벌 협동로봇 솔루션 선도 기업' },
            { ticker: '108490', name: '로보티즈', role: '로봇 전용 일체형 구동 모듈(다이나믹셀 액추에이터) 및 자율주행 로봇' }
        ],
        followers: [
            { ticker: '389500', name: '에스비비테크', role: '로봇 관절 핵심 부품인 초정밀 하모닉 감속기 국산화 및 양산' },
            { ticker: '272210', name: '한화시스템', role: '국방 무인체계 및 스마트 방산·자동화 관제 시스템 통합' },
            { ticker: '056080', name: '유진로봇', role: '공장·창고용 자율주행 물류로봇(AMR) 및 3D 라이다 센서 솔루션' }
        ]
    },
    'defense': {
        slug: 'defense',
        name: 'K-방산 · 자주포 · 유도무기 · 항공우주',
        description: '글로벌 지정학적 안보 위기 심화와 각국의 국방비 증액 기조 속에서 빠른 납기, 검증된 화력, 우수한 가성비를 앞세워 유럽·중동·동남아 시장을 석권하고 있는 대한민국 방위산업 수출 주도 섹터입니다.',
        risk_factor: '정부 간(G2G) 대규모 수주 계약의 시점 이연 가능성, 수출금융 지원 한도 이슈, 지정학적 분쟁 완화 시 차익실현 매물 출회 및 환율 하락 시 원화 환산 수익성 변동에 유의해야 합니다.',
        value_chain: '핵심 구성품(엔진·변속기·다기능 레이더·적외선 탐색기·탄약/장약) ➔ 체계종합(자주포·전차·장갑차·지대공 유도무기·경공격기 조립) ➔ 해외 수주 납품 및 20~30년 장기 유지·보수·정비(MRO) 수익 창출 구조입니다.',
        key_metrics: '수주잔고(Backlog) 규모 및 매출 대비 수주잔고 배수(Book-to-Bill Ratio), 전체 매출 중 해외 수출 비중(%), 분기별 인도 물량 스케줄.',
        leaders: [
            { ticker: '012450', name: '한화에어로스페이스', role: 'K9 자주포, 천무 다연장로켓 글로벌 수출 및 항공우주 가스터빈 엔진 제조' },
            { ticker: '079550', name: 'LIG넥스원', role: '천궁-II 중거리 지대공 유도무기 체계 및 정밀 타격 미사일 수출' },
            { ticker: '064350', name: '현대로템', role: 'K2 흑표 전차 폴란드·유럽 수출 및 차세대 다목적 무인차량 개발' }
        ],
        followers: [
            { ticker: '047810', name: '한국항공우주', role: 'FA-50 경공격기, KF-21 보라매 전투기 및 수리온 회전익 항공기 체계종합' },
            { ticker: '272210', name: '한화시스템', role: '천궁-II 다기능 레이더(MFR), 전술정보통신체계 및 저궤도 위성통신' },
            { ticker: '103140', name: '풍산', role: '155mm 대구경 포탄 등 방산 탄약 글로벌 수출 및 신동 사업 영위' }
        ]
    },
    'nuclear': {
        slug: 'nuclear',
        name: '원자력 발전 · SMR(소형모듈원전) · 전력기기',
        description: 'AI 데이터센터 확산에 따른 24시간 무탄소 기저전력 수요 급증과 글로벌 원전 생태계 복원, 차세대 소형모듈원전(SMR) 상용화 및 북미 노후 전력망 교체 사이클의 핵심 수혜 섹터입니다.',
        risk_factor: '원전 본계약 체결 및 착공까지의 긴 리드타임, 각국 정권 교체에 따른 에너지 정책 변동성, 구리·전기강판 등 원자재 가격 상승에 따른 공사원가 부담을 점검해야 합니다.',
        value_chain: '원전 설계·계통 엔지니어링 ➔ 주기기자재(원자로 용기·증기발생기·터빈발전기) 및 SMR 모듈 제작 ➔ 원전 시공·정비 및 초고압 변압기·차단기 송배전 전력망 인프라로 이어집니다.',
        key_metrics: '글로벌 SMR 파운드리 발주 물량, 초고압 변압기 북미 수주잔고 및 납기(Lead Time), 한국전력 및 해외 원전 정비·기자재 수주 공시.',
        leaders: [
            { ticker: '034020', name: '두산에너빌리티', role: '대형 원전 주기기자재 독점 공급 및 글로벌 SMR 파운드리 핵심 제작사' },
            { ticker: '267260', name: 'HD현대일렉트릭', role: '북미·중동 AI 데이터센터 및 전력망 확충용 초고압 변압기·고압차단기' },
            { ticker: '298040', name: '효성중공업', role: '초고압 변압기·스태콤(전력안정화장치) 글로벌 수주 및 수소·원전 인프라' }
        ],
        followers: [
            { ticker: '052690', name: '한전기술', role: '원자력발전소 종합설계(A/E) 및 원자로계통설계(NSSS) 독보적 기술력' },
            { ticker: '130660', name: '한전산업', role: '원자력·화력발전소 설비 운전 및 정비(O&M) 전문 서비스' },
            { ticker: '010120', name: 'LS ELECTRIC', role: '데이터센터 배전반·초고압 변압기 및 스마트 그리드 전력 자동화 솔루션' }
        ]
    },
    'shipbuilding': {
        slug: 'shipbuilding',
        name: '조선 · LNG 운반선 · 해양플랜트 · MRO',
        description: '국제해사기구(IMO)의 환경규제 강화에 따른 친환경 선박(LNG·메탄올·암모니아 추진선) 교체 수요와 3년 치 이상의 넉넉한 수주잔고, 미 해군 함정 유지·보수·정비(MRO) 시장 진출로 구조적 호황(슈퍼사이클)에 진입한 섹터입니다.',
        risk_factor: '후판(선박용 두꺼운 철판) 가격 협상 결과에 따른 원가 변동, 숙련 기능인력 수급 문제로 인한 공정 지연 가능성, 글로벌 해운 운임 및 발주량 피크아웃 우려를 함께 체크해야 합니다.',
        value_chain: '업스트림(철강 후판·선박용 대형 엔진·보냉재·피팅 밸브 기자재) ➔ 미드스트림(대형 조선소의 선박 건조 및 시운전) ➔ 다운스트림(글로벌 선주사 인도 및 특수선/함정 MRO 사업)으로 구성됩니다.',
        key_metrics: '클락슨 신조선가지수(Newbuilding Price Index), 고선가 물량 매출 인식 비중, 조선용 후판 협상 가격, 환율 및 헤지 비율.',
        leaders: [
            { ticker: '009540', name: 'HD한국조선해양', role: '글로벌 1위 조선 그룹 중간지주사로 고부가 LNG선·친환경 선박 수주 선도' },
            { ticker: '042660', name: '한화오션', role: 'LNG 운반선, 잠수함·수상함 특수선 강자 및 미 해군 함정 MRO 사업 본격화' },
            { ticker: '010140', name: '삼성중공업', role: 'FLNG(부유식 액화천연가스 생산설비) 독보적 경쟁력 및 고수익 선박 선별 수주' }
        ],
        followers: [
            { ticker: '329180', name: 'HD현대중공업', role: '세계 최대 건조 능력과 선박용 대형 엔진 독자 제작 기술 보유' },
            { ticker: '082740', name: '한화엔진', role: '친환경 이중연료(DF) 저속엔진 수주 확대 및 가동률 상승' },
            { ticker: '033500', name: '동성화인텍', role: 'LNG 추진선 및 운반선 화물창 필수 초저온 보냉재 전문 제조' }
        ]
    },
    'low-pbr': {
        slug: 'low-pbr',
        name: '기업 밸류업 · 저PBR · 고배당 주주환원',
        description: '정부의 기업 밸류업 프로그램과 상법 개정 논의에 발맞춰 자기자본이익률(ROE) 개선, 자사주 매입·소각, 배당성향 상향(분기·중간배당 확대)을 통해 코리아 디스카운트 해소를 주도하는 금융·지주·자동차 핵심 섹터입니다.',
        risk_factor: '주주환원 공시 이후 실제 자사주 소각 규모가 시장 기대치에 미달할 경우의 실망 매물, 시중금리 급변동에 따른 순이자마진(NIM) 축소 및 경기 침체 시 대손충당금 적립 증가 리스크를 확인해야 합니다.',
        value_chain: '안정적 현금흐름 창출(금융 이자/비이자이익, 완성차 글로벌 판매, 지주사 배당수익) ➔ 보통주자본비율(CET1) 및 잉여현금흐름(FCF) 확보 ➔ 자사주 매입·소각 및 현금배당 확대를 통한 주당순자산(BPS)·주당순이익(EPS) 제고 구조입니다.',
        key_metrics: 'PBR(주가순자산비율) 및 ROE(자기자본이익률), 총주주환원율(TSR = 배당금 + 자사주 매입·소각액 / 당기순이익), 금융지주 보통주자본비율(CET1 13% 상회 여부).',
        leaders: [
            { ticker: '105560', name: 'KB금융', role: '국내 최고 수준의 CET1 비율을 바탕으로 한 선제적 자사주 매입·소각 및 밸류업 대장주' },
            { ticker: '005380', name: '현대차', role: '하이브리드·제네시스 고수익 믹스 개선 및 총주주환원율(TSR) 35% 이상 밸류업 정책' },
            { ticker: '055550', name: '신한지주', role: '분기 균등 배당 및 지속적인 유통주식수 감축을 통한 주주가치 제고' }
        ],
        followers: [
            { ticker: '086790', name: '하나금융지주', role: '우수한 자본비율과 높은 배당수익률 기반 주주환원 확대' },
            { ticker: '000270', name: '기아', role: '글로벌 완성차 최고 수준의 영업이익률과 적극적인 자사주 소각 병행' },
            { ticker: '000810', name: '삼성화재', role: '압도적인 지급여력비율(K-ICS)을 바탕으로 한 손해보험 업종 대표 고배당주' }
        ]
    },
    'entertainment': {
        slug: 'entertainment',
        name: 'K-엔터테인먼트 · 글로벌 팬덤 플랫폼 · 공연',
        description: 'K-팝 아티스트의 글로벌 스타디움 월드투어 확대, 음반·음원 스트리밍, MD(기획상품) 및 글로벌 팬덤 플랫폼 유료 구독 모델을 통해 구조적인 해외 매출 성장을 달성하는 문화 콘텐츠 섹터입니다.',
        risk_factor: '핵심 아티스트의 재계약 불발 또는 군 복무 공백기, 초동 음반 판매량 피크아웃 우려, 신인 IP 데뷔 초기 제작비 증가 및 경영권·제작 레이블 갈등 리스크를 점검해야 합니다.',
        value_chain: '신인 캐스팅·트레이닝 및 멀티 레이블 IP 기획 ➔ 음반·디지털 음원 글로벌 발매 ➔ 월드투어 콘서트·공연·MD 굿즈 및 팬 커뮤니티 플랫폼(위버스·버블) 2차 저작물 수익화로 확장됩니다.',
        key_metrics: '글로벌 콘서트 모객 수 및 회당 평균 티켓 단가(ATP), 빌보드·스포티파이 스트리밍 지표, 신인 그룹 손익분기점(BEP) 도달 기간, 플랫폼 월간활성이용자(MAU) 및 유료 결제율.',
        leaders: [
            { ticker: '352820', name: '하이브', role: '멀티 레이블 체제 기반 글로벌 메가 IP 보유 및 팬덤 플랫폼 위버스(Weverse) 운영' },
            { ticker: '035900', name: 'JYP Ent.', role: '높은 영업이익률과 북미·일본 스타디움 투어가 가능한 탄탄한 아티스트 라인업' },
            { ticker: '041510', name: '에스엠', role: '신인 IP 성공적 세대교체 및 카탈로그 음원·공연 수익성 개선' }
        ],
        followers: [
            { ticker: '122870', name: '와이지엔터테인먼트', role: '글로벌 메가 걸그룹 투어 모멘텀 및 신인 글로벌 팬덤 확장' },
            { ticker: '376300', name: '디어유', role: '아티스트 1:1 프라이빗 메시지 구독 플랫폼 버블(bubble) 운영' },
            { ticker: '253450', name: '스튜디오드래곤', role: '글로벌 OTT(넷플릭스·아마존 등) 동시방영 K-드라마 대작 제작' }
        ]
    },
    'beauty': {
        slug: 'beauty',
        name: 'K-뷰티 · 인디브랜드 수출 · 화장품 ODM',
        description: '과거 중국 편중 구조에서 완전히 벗어나 미국(아마존·얼타·코스트코), 일본, 유럽, 중동 등 글로벌 시장에서 가성비와 제품력을 인정받은 K-뷰티 인디브랜드와 이를 제조하는 글로벌 톱티어 ODM(제조자개발생산) 및 미용의료기기 섹터입니다.',
        risk_factor: '해외 수출 통관 데이터 둔화 시 고밸류에이션 멀티플 축소, 마케팅 비용(틱톡·아마존 프로모션) 급증에 따른 영업이익률 하락, 계절적 비수기 및 모방 제품 경쟁 심화 리스크를 확인해야 합니다.',
        value_chain: '원료·용기 부자재 조달 ➔ 화장품 ODM 기업의 제형 연구개발 및 대량 생산 ➔ 인디브랜드 기획사 및 글로벌 유통벤더(실리콘투 등)를 통한 북미·유럽·일본 온·오프라인 채널 수출로 이어집니다.',
        key_metrics: '관세청 화장품 국가별(미국·일본·유럽) 월간 수출액, 아마존 카테고리 랭킹, ODM 국내외 법인 가동률 및 영업이익률.',
        leaders: [
            { ticker: '278470', name: '에이피알', role: '메디큐브 뷰티 디바이스 및 글로벌 K-뷰티 스킨케어 북미·일본 고성장' },
            { ticker: '192820', name: '코스맥스', role: '글로벌 1위 화장품 ODM 기업으로 국내외 인디브랜드 주문 급증 수혜' },
            { ticker: '161890', name: '한국콜마', role: '썬케어·기초 스킨케어 독보적 기술력 기반 글로벌 ODM 실적 호조' }
        ],
        followers: [
            { ticker: '090430', name: '아모레퍼시픽', role: '코스알엑스(COSRX) 연결 편입 및 라네즈 등 서구권 중심 체질 개선' },
            { ticker: '257720', name: '실리콘투', role: '글로벌 역직구 플랫폼(StyleKorean) 및 전 세계 K-뷰티 B2B 유통 인프라' },
            { ticker: '214150', name: '클래시스', role: '슈링크 유니버스·볼뉴머 등 비침습 고주파/집속초음파 미용의료기기 수출' }
        ]
    },
    'food': {
        slug: 'food',
        name: 'K-푸드 · 라면·간편식 글로벌 수출',
        description: '불닭볶음면, 냉동김밥, 만두, 스낵 등 한국 식문화(K-Food)가 북미·유럽·동남아 대형 마트(월마트·코스트코) 메인 매대에 입점하며 내수 방어주를 넘어 고성장 수출주로 재평가받고 있는 섹터입니다.',
        risk_factor: '밀·팜유·코코아 등 국제 곡물/원자재 가격 급등 시 원가율 상승, 수출용 신공장 증설 전까지 생산능력(CAPA) 한계에 따른 매출 성장 둔화, 식품 안전 및 통관 규제 리스크를 점검해야 합니다.',
        value_chain: '국제 곡물·원재료 도입 및 제분/소재 가공 ➔ 국내외 스마트팩토리 식품 제조 ➔ 해외 판매법인 및 현지 대형 리테일 체인 입점을 통한 외화 매출 창출 구조입니다.',
        key_metrics: '농림축산식품부 라면·가공식품 월간 수출액, 기업별 전체 매출 중 해외 비중(%), 공장 가동률 및 증설 라인 가동 시점.',
        leaders: [
            { ticker: '003230', name: '삼양식품', role: '불닭 브랜드 글로벌 메가 히트 및 밀양 신공장 증설을 통한 고수익 수출 주도' },
            { ticker: '097950', name: 'CJ제일제당', role: '비비고(Bibigo) 만두·K-스트리트 푸드 중심 북미·유럽 시장 점유율 확대' },
            { ticker: '271560', name: '오리온', role: '한국·중국·베트남·러시아 글로벌 생산 법인 기반 높은 영업이익률 유지' }
        ],
        followers: [
            { ticker: '004370', name: '농심', role: '신라면 글로벌 브랜드 파워 및 북미 제2공장 가동 확대' },
            { ticker: '007310', name: '오뚜기', role: '라면·소스류 해외 시장 개척 및 안정적인 내수 현금흐름' },
            { ticker: '005180', name: '빙그레', role: '바나나맛우유·메로나 등 유음료 및 빙과류 북미·동남아 수출 확대' }
        ]
    },
    'cloud': {
        slug: 'cloud',
        name: '클라우드 컴퓨팅 · MSP · 사이버보안',
        description: '공공기관과 금융권, 대기업의 클라우드 네이티브 전환(Cloud Transition)과 하이브리드 멀티 클라우드 관리(MSP), 그리고 제로트러스트 기반 클라우드 보안 솔루션을 제공하는 IT 인프라 섹터입니다.',
        risk_factor: '경기 둔화기 기업들의 IT 외주 및 전산 예산 삭감, 글로벌 퍼블릭 클라우드(AWS·Azure·GCP) 리셀링 마진율 하락 압력을 확인해야 합니다.',
        value_chain: '데이터센터 하드웨어 및 IaaS(인프라) ➔ 클라우드 전환 컨설팅·구축·운영(MSP) 및 PaaS ➔ SaaS(서비스형 소프트웨어) 및 클라우드 네트워크 보안으로 연결됩니다.',
        key_metrics: '클라우드 부문 매출 비중 및 전년 동기 대비 성장률, 공공/금융 클라우드 수주 잔고, 반복 구독 매출 비중.',
        leaders: [
            { ticker: '018260', name: '삼성에스디에스', role: '삼성클라우드플랫폼(SCP) 및 고성능 GPU 기반 엔터프라이즈 클라우드 서비스' },
            { ticker: '356860', name: '티엘비', role: '데이터센터 및 클라우드 서버용 고성능 메모리 모듈(SSD/DDR5) PCB 제조' },
            { ticker: '053800', name: '안랩', role: '클라우드 워크로드 보안 및 엔드포인트·네트워크 통합 사이버보안' }
        ],
        followers: [
            { ticker: '067160', name: 'SOOP', role: '글로벌 라이브 스트리밍 미디어 플랫폼 및 클라우드 트래픽 기술' },
            { ticker: '012510', name: '더존비즈온', role: '클라우드 기반 전사적자원관리(ERP) 및 비즈니스 플랫폼' },
            { ticker: '290550', name: '디케이티', role: '전장 및 IT 기기용 표면실장(SMT) 부품 및 전력 제어 모듈' }
        ]
    },
    'gaming': {
        slug: 'gaming',
        name: '게임 · PC/콘솔 대작 · 글로벌 퍼블리싱',
        description: '모바일 MMORPG 중심에서 벗어나 스팀(Steam)·플레이스테이션·엑스박스 등 글로벌 PC/콘솔 트리플A(AAA)급 신작과 배틀로얄·슈팅 장르 라이브 서비스를 통해 글로벌 시장 점유율을 높이는 콘텐츠 섹터입니다.',
        risk_factor: '기대 신작의 출시 일정 연기, 출시 초기 스팀/메타크리틱 평점 부진에 따른 흥행 실패, 기존 캐시카우 게임의 매출 자연 감소(하향 안정화) 및 개발 인건비 부담을 점검해야 합니다.',
        value_chain: '게임 엔진 기반 IP 기획·개발 스튜디오 ➔ 글로벌 퍼블리싱·마케팅 및 플랫폼(스팀·콘솔·모바일 앱마켓) 입점 ➔ 시즌 패스·인게임 아이템 업데이트를 통한 장기 라이브 서비스 운영으로 구성됩니다.',
        key_metrics: '스팀 동시접속자 수(CCU) 및 위시리스트 순위, 분기별 해외 매출 비중, 신작 출시 타임라인 및 영업이익률.',
        leaders: [
            { ticker: '259960', name: '크래프톤', role: 'PUBG: 배틀그라운드 글로벌 트래픽 고성장 및 신규 인생시뮬레이션·익스트랙션 IP 확장' },
            { ticker: '251270', name: '넷마블', role: '글로벌 유명 웹툰/애니메이션 IP 기반 액션 RPG 흥행 및 비용 구조 효율화' },
            { ticker: '263750', name: '펄어비스', role: '자체 블랙스페이스 엔진 기반 오픈월드 대작 붉은사막 및 검은사막 글로벌 서비스' }
        ],
        followers: [
            { ticker: '036570', name: '엔씨소프트', role: '리니지·TL 등 MMORPG 라이브 서비스 및 글로벌 퍼블리싱 다변화' },
            { ticker: '194480', name: '데브시스터즈', role: '쿠키런 IP 기반 모바일 게임 글로벌 서비스 확장' },
            { ticker: '293490', name: '카카오게임즈', role: 'PC·콘솔·모바일 멀티플랫폼 퍼블리싱 및 산하 개발 스튜디오 운영' }
        ]
    },
    'healthcare': {
        slug: 'healthcare',
        name: '디지털 헬스케어 · 의료기기 · 임플란트 · 미용의료',
        description: '글로벌 고령화 메가트렌드에 발맞춰 치과용 디지털 임플란트, 생체신호 원격 모니터링, AI 영상진단 및 비침습 에스테틱 의료장비 수출이 구조적으로 성장하는 의료기기 섹터입니다.',
        risk_factor: '신약 바이오 대비 실적 가시성이 높으나, 중국 물량기반조달(VBP) 단가 인하 정책 영향, 글로벌 의료기기 인허가(FDA·CE) 지연 및 해외 대리점 재고 조정 리스크를 확인해야 합니다.',
        value_chain: '의료기기 R&D 및 임상·인허가 획득 ➔ 장비(하드웨어) 병·의원 보급 설치 ➔ 시술 건수 증가에 따른 고마진 소모품(카트리지·센서) 반복 매출 창출(Razor & Blade 모델)로 이어집니다.',
        key_metrics: '전체 매출 중 고마진 소모품 매출 비중(%), 북미·브라질·유럽 등 해외 지역별 수출 성장률, 영업이익률(OPM 20~40% 상회 여부).',
        leaders: [
            { ticker: '214150', name: '클래시스', role: '장비 보급 확대에 따른 고마진 소모품(카트리지·팁) 매출 비중이 높은 대표 의료기기 기업' },
            { ticker: '145020', name: '휴젤', role: '보툴리눔 톡신(보툴렉스) 미국·중국·유럽 3대 빅마켓 허가 획득 및 글로벌 수출' },
            { ticker: '069620', name: '대웅제약', role: '나보타 글로벌 수출 호조 및 펙수클루·엔블로 자체 개발 신약 성장' }
        ],
        followers: [
            { ticker: '328130', name: '루닛', role: '글로벌 의료장비 기업과 파트너십을 맺은 AI 암 검진 소프트웨어' },
            { ticker: '214450', name: '파마리서치', role: '리쥬란 힐러(PN 성분 스킨부스터) 의료기기 내수·방한 의료관광 및 해외 수출' },
            { ticker: '008930', name: '한미사이언스', role: '헬스케어 지주사 및 의약품 유통·의료기기 계열사 포트폴리오' }
        ]
    },
    'aviation': {
        slug: 'aviation',
        name: '항공 · 여객·화물 운송 · 여행 · 면세',
        description: '글로벌 여객 수요 회복과 전자상거래 항공화물 물동량 강세, 대형 항공사 통합에 따른 노선 경쟁력 강화 및 인바운드/아웃바운드 여행 수요 확대를 반영하는 항공·레저 섹터입니다.',
        risk_factor: '국제유가(항공유) 급등 및 원/달러 환율 상승에 따른 외화부채 환산손실·리스료 부담 증가, 글로벌 경기 침체 시 여객/화물 운임(Yield) 하락 리스크를 면밀히 살피셔야 합니다.',
        value_chain: '항공기 기재 도입·정비(MRO) 및 급유 ➔ 국제선/국내선 여객 및 반도체·전자상거래 항공화물 운송 ➔ 여행사 패키지·OTA 플랫폼 및 공항 면세·카지노 인바운드 소비로 연결됩니다.',
        key_metrics: '국제선 여객수송실적(RPK) 및 탑승률(Load Factor), 항공화물 운임지수(BAI), 싱가포르 항공유 가격 및 원/달러 환율.',
        leaders: [
            { ticker: '003490', name: '대한항공', role: '장거리 미주·유럽 노선 지배력과 고수익 항공화물 경쟁력을 겸비한 대형 국적기(FSC)' },
            { ticker: '089590', name: '제주항공', role: '일본·동남아 중단거리 노선 점유율 선두 저비용항공사(LCC)' },
            { ticker: '272450', name: '진에어', role: '효율적인 기재 운영과 높은 영업이익률을 기록하는 한진그룹 계열 LCC' }
        ],
        followers: [
            { ticker: '039130', name: '하나투어', role: '중고가 패키지 여행 상품 비중 확대를 통한 수익성 개선' },
            { ticker: '008770', name: '호텔신라', role: '글로벌 공항 면세점 운영 및 서울·제주 프리미엄 호텔 사업' },
            { ticker: '032350', name: '롯데관광개발', role: '제주 드림타워 복합리조트 외국인 카지노 및 호텔 인바운드 수혜' }
        ]
    },
    'ecommerce': {
        slug: 'ecommerce',
        name: '이커머스 · 풀필먼트 물류 · 간편결제 핀테크',
        description: 'AI 기반 초개인화 상품 추천, 당일·새벽배송 풀필먼트(Fulfillment) 물류 자동화, 그리고 온·오프라인 간편결제 및 크로스보더(역직구) 커머스 플랫폼으로 구성된 디지털 유통 섹터입니다.',
        risk_factor: '내수 소매판매액 증가율 둔화, 알리·테무 등 글로벌 C-커머스 플랫폼과의 출혈 경쟁, 택배·물류센터 인건비 상승에 따른 수익성 압박을 점검해야 합니다.',
        value_chain: '판매자(셀러) 입점 및 상품 소싱·AI 검색/쇼핑 광고 ➔ 간편결제(Fintech) 정산 ➔ 스마트 물류센터(풀필먼트) 자동 분류 및 라스트마일(Last-mile) 택배 배송으로 완성됩니다.',
        key_metrics: '총거래액(GMV) 성장률, 커머스 광고·수수료 Take-rate(수익화율), 물류센터 처리 물동량 및 건당 배송 단가.',
        leaders: [
            { ticker: '035420', name: 'NAVER', role: '네이버플러스 스토어 AI 쇼핑 에이전트 및 도착보장 물류 생태계' },
            { ticker: '000120', name: 'CJ대한통운', role: '이커머스 풀필먼트 물류 자동화 및 주7일 배송 인프라 선도' },
            { ticker: '035720', name: '카카오', role: '카카오톡 선물하기·톡딜 커머스 및 카카오페이 간편결제 생태계' }
        ],
        followers: [
            { ticker: '377300', name: '카카오페이', role: '온·오프라인 간편결제 및 대출·보험·증권 모바일 금융 플랫폼' },
            { ticker: '060250', name: 'NHN KCP', role: '국내외 대형 이커머스 가맹점을 보유한 전자지급결제대행(PG) 선도 기업' },
            { ticker: '257720', name: '실리콘투', role: '전 세계 160여 개국 대상 K-뷰티 역직구 이커머스 및 해외 물류 거점 운영' }
        ]
    },
    'webtoon': {
        slug: 'webtoon',
        name: '웹툰 · 웹소설 스토리 IP · 영상화 제작',
        description: '검증된 웹툰·웹소설 원천 스토리 IP를 발굴하여 글로벌 유료 열람 수익을 창출하고, 이를 드라마·영화·애니메이션·게임으로 2차 영상화(OSM, One Source Multi-Use)하는 K-콘텐츠 핵심 섹터입니다.',
        risk_factor: '글로벌 엔데믹 이후 웹툰 플랫폼 유료 결제이용자(PU) 성장 둔화, 불법 유통 사이트로 인한 저작권 침해, 드라마 제작비 상승 대비 OTT 판권 판매 마진율 변동 리스크를 확인해야 합니다.',
        value_chain: '웹소설·웹툰 작가 에이전시 및 스튜디오(CP) 제작 ➔ 글로벌 웹툰 플랫폼 연재 및 유료 미리보기/광고 수익 ➔ 드라마·애니메이션·게임 2차 판권 판매 및 글로벌 OTT 배급으로 확장됩니다.',
        key_metrics: '플랫폼 유료결제이용자(MPU) 및 결제당 평균수익(ARPPU), 원천 IP 영상화 제작 편수, 글로벌(북미·일본) 거래액 비중.',
        leaders: [
            { ticker: '035420', name: 'NAVER', role: '네이버웹툰(웹툰 엔터테인먼트)을 통한 글로벌 1위 스토리테크 플랫폼 운영' },
            { ticker: '035720', name: '카카오', role: '카카오페이지·픽코마(일본) 기반 글로벌 웹툰·웹소설 IP 밸류체인 보유' },
            { ticker: '253450', name: '스튜디오드래곤', role: '인기 웹툰 원작 IP의 글로벌 흥행 드라마 제작 및 OTT 선판매' }
        ],
        followers: [
            { ticker: '299900', name: '위지윅스튜디오', role: 'CG/VFX 시각특수효과 기술 기반 웹툰·드라마·영화 종합 미디어 제작' },
            { ticker: '206560', name: '덱스터', role: '아시아 톱티어 VFX 기술력 및 웹툰 원작 대작 콘텐츠 제작 참여' },
            { ticker: '348340', name: '뉴멕스', role: '디지털 콘텐츠 유통 및 미디어 플랫폼 인프라 지원' }
        ]
    },
    'metaverse': {
        slug: 'metaverse',
        name: 'XR(확장현실) 디바이스 · 공간컴퓨팅 · 3D 엔진',
        description: '스마트글래스·XR 헤드셋 등 차세대 웨어러블 기기에 탑재되는 마이크로 OLED(OLEDoS) 디스플레이, 3D 센싱 카메라 모듈, 디지털 트윈 및 VFX 시각특수효과 기술을 포괄하는 공간컴퓨팅 섹터입니다.',
        risk_factor: 'XR 기기 초기 높은 가격대로 인한 대중화 지연, 하드웨어 출시 주기 공백기 동안의 부품 발주 변동성, 메타버스 플랫폼의 실질적 수익 모델 검증 필요성을 유의해야 합니다.',
        value_chain: '초고해상도 OLEDoS 패널·ToF 3D 카메라 모듈·광학렌즈 부품 ➔ 스마트글래스·XR 디바이스 완제품 조립 ➔ 산업용 디지털 트윈·3D 버추얼 프로덕션 콘텐츠로 이어집니다.',
        key_metrics: '글로벌 빅테크의 XR/스마트글래스 신제품 출하량, OLEDoS 증착 장비 및 카메라 모듈 수주 잔고, 본업 디스플레이/광학 사업 현금흐름.',
        leaders: [
            { ticker: '011070', name: 'LG이노텍', role: '글로벌 빅테크향 고성능 카메라 모듈 및 3D 센싱(ToF) 광학솔루션 공급' },
            { ticker: '034220', name: 'LG디스플레이', role: '차세대 XR 기기용 초고해상도 마이크로 OLED 및 IT용 OLED 패널 기술' },
            { ticker: '160550', name: 'NEW', role: '영화·드라마 콘텐츠 배급 및 VFX 계열사 기반 디지털 미디어 사업' }
        ],
        followers: [
            { ticker: '206560', name: '덱스터', role: '버추얼 프로덕션 스튜디오 및 실감형 미디어 콘텐츠 제작' },
            { ticker: '299900', name: '위지윅스튜디오', role: '실시간 렌더링 기반 메타버스·VFX 종합 콘텐츠 솔루션' },
            { ticker: '108860', name: '셀바스AI', role: '음성인식·음성합성 AI 기술을 활용한 가상 인간 및 공간 인터페이스' }
        ]
    },
    'superconductor': {
        slug: 'superconductor',
        name: '초전도체 · 초고압 전력케이블 · 핵융합 에너지',
        description: '전력 손실이 없는 초전도 선재(Wire) 및 초전도 케이블 상용화 기술과 AI 데이터센터·신재생에너지 송전망의 병목을 해결하는 HVDC(초고압직류송전) 해저·지중 전력케이블 핵심 섹터입니다.',
        risk_factor: '상온·상압 초전도체 등 학술적 검증 단계의 단순 테마성 뉴스에 따른 급등락 변동성이 매우 크므로, 반드시 실제 초고압 전력케이블·선재 수주잔고와 영업이익이 발생하는 기업 위주로 접근해야 합니다.',
        value_chain: '전기동(구리) 및 희토류 초전도 선재 가공 ➔ HVDC 해저케이블·지중케이블 및 초전도 한류기/케이블 제조 ➔ 글로벌 전력청 및 데이터센터 전력망 포설·시공으로 구성됩니다.',
        key_metrics: '초고압 해저·지중 케이블 수주잔고(조 원 단위), 구리(LME) 국제 가격 추이, 북미·유럽 전력청 장기 공급계약 공시.',
        leaders: [
            { ticker: '006260', name: 'LS', role: '자회사 LS전선을 통해 세계 최고 수준의 HVDC 해저케이블 및 초전도 케이블 상용화 기술 보유' },
            { ticker: '001440', name: '대한전선', role: '북미·유럽·중동 초고압 전력망 케이블 수주 확대 및 해저케이블 공장 증설' },
            { ticker: '034020', name: '두산에너빌리티', role: '국제핵융합실험로(ITER) 핵심 기자재 공급 및 차세대 에너지 플랜트 제작' }
        ],
        followers: [
            { ticker: '103140', name: '풍산', role: '전력 인프라 및 첨단 산업용 고성능 구리 합금 판·대·선재 제조' },
            { ticker: '010120', name: 'LS ELECTRIC', role: '초전도 한류기 및 초고압 변압기·스마트 전력망 배전 시스템' },
            { ticker: '229640', name: 'LS에코에너지', role: '동남아·유럽 초고압 전력케이블 수출 및 희토류·해저케이블 신사업' }
        ]
    }
};

function getFallbackThemeData(slug: string): ThemeEntry {
    const cleanSlug = decodeURIComponent(slug || 'semiconductor').toLowerCase().trim();
    if (STATIC_THEME_DATABASE[cleanSlug]) {
        return STATIC_THEME_DATABASE[cleanSlug];
    }
    const readableName = decodeURIComponent(slug || '핵심 산업 테마').replace(/[-_]/g, ' ').toUpperCase();
    return {
        slug: cleanSlug,
        name: `${readableName} 밸류체인`,
        description: `${readableName} 섹터는 글로벌 산업 구조 재편과 설비투자(CAPEX) 확대 국면에서 핵심 기술력과 수주잔고를 보유한 국내 증시(코스피·코스닥) 주요 상장 기업군으로 구성됩니다.`,
        risk_factor: '글로벌 거시경제 금리·환율 변동성, 전방 산업의 설비투자 지연 가능성, 원자재 가격 등락에 따른 분기별 영업이익률 변화를 DART 분기보고서를 통해 교차 점검해야 합니다.',
        value_chain: '업스트림(핵심 원소재 및 기초 부품·장비) ➔ 미드스트림(주력 모듈 및 완제품 제조·플랫폼 구축) ➔ 다운스트림(글로벌 고객사 납품 및 유지·보수 서비스)으로 이어지는 산업 분업 체계를 갖추고 있습니다.',
        key_metrics: '관세청 품목별 월간 수출입 데이터, 기업별 수주잔고(Backlog) 추이, 영업이익률(OPM) 및 자기자본이익률(ROE) 개선 여부.',
        leaders: [
            { ticker: '005930', name: '삼성전자', role: '글로벌 IT·첨단 하드웨어 및 반도체 밸류체인 핵심 대표주' },
            { ticker: '000660', name: 'SK하이닉스', role: '차세대 AI 메모리 반도체 및 글로벌 서버 인프라 선도 기업' },
            { ticker: '005380', name: '현대차', role: '글로벌 모빌리티·로보틱스 및 전동화 밸류체인 핵심 기업' }
        ],
        followers: [
            { ticker: '035420', name: 'NAVER', role: '국내 대표 AI·클라우드·커머스 플랫폼 생태계 운영' },
            { ticker: '012450', name: '한화에어로스페이스', role: '글로벌 방산·항공우주 및 차세대 모빌리티 체계종합' },
            { ticker: '207940', name: '삼성바이오로직스', role: '글로벌 바이오의약품 위탁개발생산(CDMO) 선도 기업' }
        ]
    };
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const resolvedParams = await params;
    const slug = resolvedParams?.slug || 'semiconductor';
    const staticTheme = getFallbackThemeData(slug);

    const title = `[산업 리서치] ${staticTheme.name} 밸류체인 · 대장주 및 핵심 재무 지표 분석 | 스마트 투자 비서`;
    const description = `${staticTheme.description} ${staticTheme.name} 섹터의 업스트림·다운스트림 밸류체인 구조와 투자 리스크 체크리스트를 확인하세요.`;

    return {
        title,
        description,
        alternates: {
            canonical: `/theme/${slug}`,
        },
        keywords: [staticTheme.name, `${staticTheme.name} 밸류체인`, `${staticTheme.name} 대장주`, `${staticTheme.name} 산업분석`, "섹터 리서치", "주식 투자 백과사전"],
        openGraph: {
            title,
            description,
            url: `/theme/${slug}`,
            type: 'article',
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
        },
    };
}

export async function generateStaticParams() {
    return Object.keys(STATIC_THEME_DATABASE).map((slug) => ({ slug }));
}

export default async function ThemeDetailPage({ params }: Props) {
    const resolvedParams = await params;
    const slug = resolvedParams?.slug || 'semiconductor';
    const staticTheme = getFallbackThemeData(slug);

    let themeData: ThemeEntry = staticTheme;
    try {
        const res = await fetch(`${API_BASE_URL}/api/seo/themes/${slug}?v=2`, { 
            next: { revalidate: 21600 },
            signal: AbortSignal.timeout(2500)
        });
        if (res.ok) {
            const data = await res.json();
            if (data.status === 'success' && data.name && Array.isArray(data.leaders) && data.leaders.length > 0) {
                themeData = {
                    slug,
                    name: data.name,
                    description: data.description && data.description.length >= staticTheme.description.length ? data.description : staticTheme.description,
                    risk_factor: data.risk_factor && data.risk_factor.length >= staticTheme.risk_factor.length ? data.risk_factor : staticTheme.risk_factor,
                    value_chain: staticTheme.value_chain,
                    key_metrics: staticTheme.key_metrics,
                    leaders: data.leaders.map((s: any, idx: number) => ({
                        ticker: s.ticker,
                        name: s.name,
                        role: staticTheme.leaders[idx]?.role || '섹터 내 핵심 매출 비중 및 시가총액·수급 선도 기업'
                    })),
                    followers: Array.isArray(data.followers) && data.followers.length > 0
                        ? data.followers.map((s: any, idx: number) => ({
                            ticker: s.ticker,
                            name: s.name,
                            role: staticTheme.followers[idx]?.role || '밸류체인 전후방 소재·부품·장비 및 솔루션 공급 기업'
                        }))
                        : staticTheme.followers
                };
            }
        }
    } catch {
        // 백엔드 지연 시 100% 정적 산업 리서치 데이터베이스 즉시 서빙
    }

    const otherThemes = Object.values(STATIC_THEME_DATABASE)
        .filter((t) => t.slug !== slug)
        .slice(0, 8);

    return (
        <div className="min-h-screen bg-black pb-20">
            <div className="max-w-4xl mx-auto px-6 pt-24">
                <Link href="/guide" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors text-sm font-semibold">
                    <ArrowLeft className="w-4 h-4" /> 금융 지식 백과사전 및 산업 리서치 홈으로 돌아가기
                </Link>

                <article className="bg-gradient-to-br from-indigo-900/20 to-black border border-indigo-500/30 rounded-3xl p-8 md:p-12 relative overflow-hidden mb-8">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <Layers className="w-64 h-64 text-indigo-400 -rotate-12 transform translate-x-12 -translate-y-12" />
                    </div>
                    
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold mb-4">
                        <span>🏭 대한민국 핵심 산업 밸류체인 리서치</span>
                    </div>

                    <h1 className="text-3xl md:text-5xl font-black text-indigo-100 mb-6 leading-tight relative z-10">
                        {themeData.name} 산업 구조 및 밸류체인 분석
                    </h1>
                    
                    <p className="text-base md:text-lg text-gray-300 leading-relaxed font-medium relative z-10 mb-8">
                        {themeData.description}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10 mb-6">
                        <div className="bg-black/50 border border-indigo-500/20 p-5 rounded-2xl">
                            <div className="text-indigo-400 font-bold text-sm mb-2 flex items-center gap-2">
                                <Layers className="w-4 h-4" /> 산업 밸류체인 (Value Chain) 구조
                            </div>
                            <p className="text-gray-300 text-xs md:text-sm leading-relaxed">
                                {themeData.value_chain}
                            </p>
                        </div>
                        <div className="bg-black/50 border border-emerald-500/20 p-5 rounded-2xl">
                            <div className="text-emerald-400 font-bold text-sm mb-2 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4" /> 핵심 점검 재무·거시 지표 (Key KPI)
                            </div>
                            <p className="text-gray-300 text-xs md:text-sm leading-relaxed">
                                {themeData.key_metrics}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 bg-red-900/20 p-5 rounded-2xl border border-red-500/20 relative z-10">
                        <ShieldAlert className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <div className="text-red-400 font-bold text-sm mb-2 uppercase tracking-wide">⚠️ 반대 시나리오 및 투자 리스크 요인 (Risk Factor)</div>
                            <p className="text-gray-300 text-sm md:text-base leading-relaxed">{themeData.risk_factor}</p>
                        </div>
                    </div>
                </article>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Leaders */}
                    <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
                        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                            <TrendingUp className="text-red-400 w-6 h-6" /> 밸류체인 선도 기업 (Leaders)
                        </h2>
                        <p className="text-xs text-gray-400 mb-6">
                            섹터 내 시가총액, 시장 점유율, 기관·외국인 수급을 주도하는 대표 상장사
                        </p>
                        <div className="space-y-4">
                            {themeData.leaders.map((stock, i) => (
                                <Link href="/guide/fundamental-analysis" key={stock.ticker} className="block group">
                                    <div className="flex items-start gap-4 p-4 rounded-xl bg-black/40 border border-white/5 hover:border-red-500/30 transition-colors">
                                        <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center font-bold text-red-400 shrink-0 group-hover:bg-red-500 group-hover:text-white transition-colors">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-base md:text-lg text-white group-hover:text-red-400 transition-colors">{stock.name}</span>
                                                <span className="text-xs font-mono text-gray-500 bg-white/5 px-2 py-0.5 rounded">KRX: {stock.ticker}</span>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                                                {stock.role || '섹터 핵심 밸류체인 및 시장 점유율 선도 기업'}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>

                    {/* Followers */}
                    <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
                        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                            <Layers className="text-blue-400 w-6 h-6" /> 전후방 밸류체인 기업 (Related)
                        </h2>
                        <p className="text-xs text-gray-400 mb-6">
                            핵심 소재·부품·장비(소부장) 및 유관 플랫폼을 공급하는 밸류체인 기업
                        </p>
                        <div className="space-y-4">
                            {themeData.followers.map((stock, i) => (
                                <Link href="/guide/supply-chain-analysis" key={stock.ticker} className="block group">
                                    <div className="flex items-start gap-4 p-4 rounded-xl bg-black/40 border border-white/5 hover:border-blue-500/30 transition-colors">
                                        <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center font-bold text-blue-400 shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-base md:text-lg text-white group-hover:text-blue-400 transition-colors">{stock.name}</span>
                                                <span className="text-xs font-mono text-gray-500 bg-white/5 px-2 py-0.5 rounded">KRX: {stock.ticker}</span>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                                                {stock.role || '밸류체인 전후방 소재·부품·장비 및 솔루션 공급 기업'}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                </div>
                
                {/* 심층 산업 분석 리포트 본문 */}
                <section className="mt-12 p-8 bg-zinc-900/50 border border-white/10 rounded-3xl text-gray-300 text-sm md:text-base leading-relaxed space-y-6">
                    <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                        <CheckCircle2 className="w-6 h-6 text-indigo-400" />
                        {themeData.name} 섹터 밸류체인 및 실전 펀더멘털 검증 가이드
                    </h2>
                    <p>
                        본 리포트는 <strong>{themeData.name}</strong> 산업과 관련된 국내 증시(코스피·코스닥) 상장 기업들의 밸류체인(업스트림·미드스트림·다운스트림) 구조와 선도 기업·전후방 연관 기업을 체계적으로 정리한 산업 분석 자료입니다. 
                        특정 산업 섹터에 투자할 때는 단기적인 언론 보도나 단순 테마성 모멘텀에만 의존하기보다, 해당 사업 부문에서 실제로 유의미한 매출 비중(최소 15~30% 이상)과 영업이익 기여도가 발생하고 있는지 <strong>금융감독원 전자공시시스템(DART) 사업보고서의 &apos;주요 제품 및 서비스&apos; 항목</strong>을 통해 반드시 교차 검증해야 합니다.
                    </p>
                    <p>
                        특히 기관과 외국인 투자자가 주도하는 <strong>섹터 순환매(Sector Rotation)</strong> 국면에서는 시가총액이 크고 글로벌 시장 점유율과 실적 가시성이 가장 먼저 확인되는 <strong>선도 기업(Leaders)</strong>으로 패시브 및 액티브 자금이 우선 유입됩니다. 
                        이후 선도 기업의 설비투자(CAPEX) 확대나 수주 잔고 증가가 실제 발주 공시로 이어질 때 전공정·후공정 소재·부품·장비(소부장) 등 <strong>전후방 밸류체인 기업(Followers)</strong>으로 실적 온기가 확산되는 타임래그(Time-lag) 현상이 나타납니다.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/10">
                        <Link href="/guide/fundamental-analysis" className="p-4 rounded-2xl bg-black/50 border border-white/10 hover:border-indigo-500/40 transition-all">
                            <div className="text-xs font-bold text-indigo-400 mb-1">필수 연계 학습 01</div>
                            <div className="font-bold text-white text-sm mb-1">기업 기본적 분석 (재무제표)</div>
                            <p className="text-xs text-gray-400">매출액·영업이익률·잉여현금흐름으로 진짜 수혜주 가려내는 법</p>
                        </Link>
                        <Link href="/guide/sector-rotation" className="p-4 rounded-2xl bg-black/50 border border-white/10 hover:border-indigo-500/40 transition-all">
                            <div className="text-xs font-bold text-emerald-400 mb-1">필수 연계 학습 02</div>
                            <div className="font-bold text-white text-sm mb-1">섹터 순환매 (Sector Rotation)</div>
                            <p className="text-xs text-gray-400">금리·경기 사이클에 따라 주도 업종이 이동하는 거시경제 원리</p>
                        </Link>
                        <Link href="/guide/supply-chain-analysis" className="p-4 rounded-2xl bg-black/50 border border-white/10 hover:border-indigo-500/40 transition-all">
                            <div className="text-xs font-bold text-amber-400 mb-1">필수 연계 학습 03</div>
                            <div className="font-bold text-white text-sm mb-1">공급망(밸류체인) 분석법</div>
                            <p className="text-xs text-gray-400">완제품 대장주에서 소부장 핵심 기업으로 수혜가 전이되는 구조</p>
                        </Link>
                    </div>
                </section>

                {/* 다른 주요 산업 섹터 리서치 탐색 */}
                <section className="mt-10 p-6 md:p-8 bg-zinc-900/30 border border-white/10 rounded-3xl">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-indigo-400" /> 다른 핵심 산업 밸류체인 리서치 이어보기
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {otherThemes.map((item) => (
                            <Link
                                key={item.slug}
                                href={`/theme/${item.slug}`}
                                className="p-3 rounded-xl bg-black/50 border border-white/5 hover:border-indigo-500/40 transition-all text-xs font-bold text-gray-300 hover:text-indigo-300 truncate"
                            >
                                # {item.name}
                            </Link>
                        ))}
                    </div>
                </section>
            </div>
            <SeoContentBlock
                asH1={false}
                pageTitle={`${themeData.name} 테마 수급 분석 방법론 및 퀀트 검증 가이드`}
                pageDescription={`${themeData.name} 대장주 및 밸류체인 기업의 재무 건전성(PER·PBR·ROE), 외국인·기관 수급 추적, 그리고 테마 변동성 방어 전략을 안내합니다.`}
            />
        </div>
    );
}
