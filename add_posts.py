import re
import json

new_posts = [
    {
        "id": "static-6",
        "title": "가치 투자와 성장 투자의 차이점: 나에게 맞는 전략 찾기",
        "content": "<h2>투자 성향에 따른 두 가지 굵직한 철학</h2><p>주식 시장에는 수많은 투자 전략이 있지만, 그 뿌리를 거슬러 올라가면 크게 <strong>가치 투자(Value Investing)</strong>와 <strong>성장 투자(Growth Investing)</strong> 두 가지로 나눌 수 있습니다. 워런 버핏으로 대변되는 가치 투자는 기업의 내재 가치보다 주가가 낮게 거래될 때 매수하여 제값을 받을 때까지 기다리는 전략입니다.</p><h3>가치 투자의 특징</h3><ul><li>안전 마진(Margin of Safety) 확보가 핵심입니다.</li><li>배당 수익률이 높고 재무 구조가 탄탄한 기업(가치주)을 선호합니다.</li><li>시장 변동성에 강하며 하락장에서도 방어력이 뛰어납니다.</li></ul><h3>성장 투자의 특징</h3><p>피터 린치나 필립 피셔가 선호했던 성장 투자는 현재 이익은 적거나 적자일지라도 미래의 매출과 이익 성장성이 매우 높은 기업(성장주)에 프리미엄을 주고 매수하는 전략입니다.</p><ul><li>기술 혁신을 주도하는 IT, 바이오, 친환경 섹터가 주로 포함됩니다.</li><li>상승장에서는 시장 수익률을 압도하는 폭발적인 수익을 기대할 수 있습니다.</li><li>하지만 금리 인상기나 실적이 꺾일 때 주가가 급락할 위험이 큽니다.</li></ul><p>초보 투자자라면 어느 한쪽에 치우치기보다는 두 가지 철학을 융합한 <strong>GARP(Growth At a Reasonable Price, 합리적 가격의 성장주)</strong> 전략을 추천합니다. 자신의 투자 성향과 목표 기간을 명확히 설정하고 그에 맞는 전략을 꾸준히 밀고 나가는 것이 중요합니다.</p>",
        "createdAt": "2026-04-20T09:00:00",
        "tags": ["가치투자", "성장투자", "투자전략"],
        "slug": "value-vs-growth-investing",
        "viewCount": 2100,
        "author": "StockTrend 전문가 멘토링"
    },
    {
        "id": "static-7",
        "title": "배당주 투자의 정석: 마르지 않는 현금흐름 만들기",
        "content": "<h2>주가 시세차익보다 안정적인 현금흐름(Cashflow)에 주목하라</h2><p>주식 투자의 수익은 크게 '시세 차익(Capital Gain)'과 '배당 수익(Dividend Yield)' 두 가지로 나뉩니다. <strong>배당주 투자</strong>는 기업이 영업활동을 통해 벌어들인 이익의 일부를 주주들에게 환원하는 '배당금'에 초점을 맞추는 전략입니다.</p><h3>배당 투자의 복리 효과</h3><p>알베르트 아인슈타인은 복리를 '세계 8대 불가사의'라고 불렀습니다. 배당주 투자의 진정한 위력은 배당금을 소비하지 않고 다시 해당 주식이나 다른 자산에 <strong>재투자(DRIP, Dividend Reinvestment Plan)</strong>할 때 발휘됩니다. 시간이 지날수록 보유 주식 수가 늘어나고, 늘어난 주식이 다시 더 많은 배당금을 창출하는 스노우볼 이펙트(Snowball Effect)를 누릴 수 있습니다.</p><h3>배당주 고를 때 주의할 점: 배당 함정(Dividend Trap)</h3><p>단순히 현재 배당률이 높다고 해서 무작정 매수하는 것은 위험합니다. 주가가 폭락하여 상대적으로 배당률이 높아 보이는 '배당 함정'일 수 있기 때문입니다. 다음과 같은 지표를 반드시 확인하세요.</p><ol><li><strong>배당 성향(Payout Ratio):</strong> 기업의 순이익 중 배당금으로 지급하는 비율입니다. 너무 높으면(예: 80% 이상) 미래 성장을 위한 투자가 부족하거나 배당 삭감 위험이 있습니다.</li><li><strong>배당 성장의 역사:</strong> 코카콜라나 존슨앤드존슨처럼 수십 년간 배당금을 꾸준히 늘려온 '배당 귀족주(Dividend Aristocrats)'를 주목하세요.</li><li><strong>잉여현금흐름(FCF):</strong> 장부상 이익이 아닌 실제로 기업에 들어온 현금흐름이 충분한지 체크해야 합니다.</li></ol><p>은퇴를 앞두거나 안정적인 현금흐름을 원한다면 배당주 투자는 가장 훌륭한 선택지가 될 수 있습니다.</p>",
        "createdAt": "2026-04-12T13:30:00",
        "tags": ["배당주", "은퇴준비", "현금흐름"],
        "slug": "dividend-investing-guide",
        "viewCount": 3850,
        "author": "StockTrend 수석 애널리스트"
    },
    {
        "id": "static-8",
        "title": "금리 인상기와 하락기, 어떤 주식을 사야 할까?",
        "content": "<h2>거시경제(Macro)의 핵심, 금리(Interest Rate) 사이클 이해하기</h2><p>주식 시장을 움직이는 가장 강력한 보이지 않는 손은 바로 중앙은행의 <strong>기준금리</strong>입니다. '금리는 주식 시장의 중력'이라는 워런 버핏의 말처럼, 금리의 향방을 이해하는 것은 성공적인 투자의 필수 조건입니다.</p><h3>금리 인상기(Tightening Cycle)의 투자 전략</h3><p>물가를 잡기 위해 중앙은행이 금리를 올리면, 시중의 유동성이 줄어들고 돈의 가치(이자율)가 높아집니다. 이때는 돈을 빌려서 사업을 확장해야 하는 성장주나 기술주에게는 악재로 작용합니다.</p><ul><li><strong>수혜주:</strong> 은행, 보험 등 금융주 (예대마진 및 이자수익 증가)</li><li><strong>방어주:</strong> 통신, 유틸리티, 필수소비재 등 경기 방어주</li><li><strong>현금 부자 기업:</strong> 부채가 적고 막대한 잉여현금을 보유한 기업은 고금리 환경에서도 타격이 적습니다.</li></ul><h3>금리 하락기(Easing Cycle)의 투자 전략</h3><p>경기를 부양하기 위해 금리를 낮추면, 시중에 돈이 풀리고 이자 부담이 줄어들어 주식 시장과 같은 위험 자산으로 자금이 몰립니다.</p><ul><li><strong>수혜주:</strong> 바이오, 헬스케어, 소프트웨어 등 미래 성장에 베팅하는 성장주와 기술주</li><li><strong>부동산 관련주:</strong> 리츠(REITs)나 건설주 등 대규모 차입이 필요한 기업들</li></ul><p>현재 연준(Fed)의 통화 정책 방향이 '매파적(Hawkish)'인지 '비둘기파적(Dovish)'인지 뉴스를 통해 파악하고, 사이클의 변곡점에서 포트폴리오를 발 빠르게 리밸런싱하는 안목을 기르시기 바랍니다.</p>",
        "createdAt": "2026-03-25T15:20:00",
        "tags": ["금리", "거시경제", "매크로"],
        "slug": "investing-in-different-interest-rate-cycles",
        "viewCount": 4510,
        "author": "StockTrend 매크로 리서치팀"
    },
    {
        "id": "static-9",
        "title": "차트 분석의 기초: 이동평균선과 거래량 읽는 법",
        "content": "<h2>기술적 분석(Technical Analysis) 첫걸음</h2><p>기업의 재무제표와 성장성을 분석하는 기본적 분석(Fundamental Analysis)과 더불어, 주가 차트를 통해 매매 타이밍을 잡는 <strong>기술적 분석</strong> 역시 실전 투자에서 매우 중요합니다. 수많은 차트 지표 중에서도 가장 기본이자 핵심인 두 가지를 소개합니다.</p><h3>1. 이동평균선(Moving Average)</h3><p>이동평균선은 일정 기간 동안의 주가 평균을 선으로 연결한 지표입니다. 주로 5일, 20일, 60일, 120일 선이 사용됩니다.</p><ul><li><strong>정배열과 역배열:</strong> 단기 이평선(5일, 20일)이 장기 이평선(60일, 120일) 위에 있을 때를 '정배열'이라 하며 강세장을 의미합니다. 반대인 '역배열'은 약세장을 뜻합니다.</li><li><strong>골든크로스(Golden Cross):</strong> 단기 이평선이 장기 이평선을 아래에서 위로 돌파하는 시점을 매수 신호로 봅니다.</li><li><strong>데드크로스(Dead Cross):</strong> 반대로 위에서 아래로 하향 돌파하면 매도 신호로 해석합니다.</li></ul><h3>2. 거래량(Volume)</h3><p>'주가는 속여도 거래량은 속일 수 없다'는 격언이 있습니다. 거래량은 주가 움직임의 신뢰도를 결정짓는 가장 강력한 보조지표입니다.</p><ul><li>주가가 상승할 때 거래량이 동반 상승한다면 그 추세는 <strong>매우 강력하며 지속될 가능성이 높습니다.</strong></li><li>주가가 상승하는데 거래량이 점차 줄어든다면, 상승 동력이 소진되어 <strong>조만간 하락 반전할 수 있음</strong>을 암시합니다.</li><li>바닥권에서 엄청난 대량 거래량이 터진다면 큰손(기관, 외인)의 매집 신호로 볼 수 있습니다.</li></ul><p>보조지표는 맹신해서는 안 되며, 언제나 기업의 본질 가치와 함께 종합적으로 판단하는 도구로 활용해야 합니다.</p>",
        "createdAt": "2026-03-10T10:00:00",
        "tags": ["차트분석", "기술적분석", "이동평균선"],
        "slug": "technical-analysis-moving-average-volume",
        "viewCount": 5120,
        "author": "StockTrend 트레이딩 전문가"
    },
    {
        "id": "static-10",
        "title": "미국 주식 세금 완벽 정리: 양도소득세부터 배당소득세까지",
        "content": "<h2>수익률 깎아먹는 세금, 미리 알고 대비하자</h2><p>서학개미 열풍과 함께 미국 주식에 투자하는 분들이 폭발적으로 늘어났습니다. 하지만 높은 수익률 뒤에는 무시무시한 세금 폭탄이 도사리고 있습니다. <strong>절세도 훌륭한 투자</strong>라는 마인드로 미국 주식 관련 세금을 꼼꼼히 정리해 드립니다.</p><h3>1. 양도소득세 (Capital Gains Tax)</h3><p>미국 주식을 사고팔아 남은 매매 차익에 대해 부과되는 세금입니다.</p><ul><li><strong>기본 공제액:</strong> 연간(1월 1일 ~ 12월 31일) 발생한 총 수익에서 <strong>250만 원을 공제</strong>해 줍니다.</li><li><strong>세율:</strong> 공제액을 초과한 수익에 대해 <strong>22% (양도소득세 20% + 지방소득세 2%)</strong>의 단일 세율이 적용됩니다.</li><li><strong>절세 팁:</strong> 수익이 난 종목과 손실이 난 종목을 같은 연도에 함께 매도(손익 통산)하여 순이익을 250만 원 이하로 맞추는 '연말 절세 매매' 전략이 필수입니다.</li></ul><h3>2. 배당소득세 (Dividend Tax)</h3><p>미국 주식에서 지급받는 배당금에 대해 원천징수되는 세금입니다.</p><ul><li><strong>세율:</strong> 미국 현지에서 기본적으로 <strong>15%</strong>가 원천징수된 후 계좌에 입금됩니다. (국내 주식 배당소득세 15.4%와 유사하므로 한국에서 추가로 징수하지 않습니다.)</li><li><strong>금융소득종합과세 주의:</strong> 하지만 한 해 동안 받은 이자와 배당금 등 금융소득의 합계가 <strong>2,000만 원을 초과</strong>할 경우, 근로소득 등 다른 소득과 합산되어 누진세율(최대 49.5%)을 적용받는 '금융소득종합과세' 대상자가 되므로 각별한 주의가 필요합니다.</li></ul><p>해외 주식 세금 신고는 매년 5월 종합소득세 신고 기간에 홈택스를 통해 직접 하거나 증권사의 무료 대행 서비스를 이용하시면 매우 편리합니다.</p>",
        "createdAt": "2026-02-28T14:00:00",
        "tags": ["미국주식세금", "양도소득세", "절세전략"],
        "slug": "us-stock-tax-guide",
        "viewCount": 6800,
        "author": "StockTrend 세무 자문위원"
    }
]

file_path = "frontend/src/lib/staticBlogPosts.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the closing bracket of the array
if content.strip().endswith("];"):
    # Convert new_posts to formatted JS objects
    new_posts_str = ""
    for post in new_posts:
        new_posts_str += f"""    {{
        id: "{post['id']}",
        title: "{post['title']}",
        content: `{post['content']}`,
        createdAt: new Date("{post['createdAt']}"),
        tags: {json.dumps(post['tags'])},
        slug: "{post['slug']}",
        viewCount: {post['viewCount']},
        author: "{post['author']}"
    }},
"""
    # Remove last comma
    new_posts_str = new_posts_str.rstrip(",\n") + "\n"
    
    content = content.replace("];", ",\n" + new_posts_str + "];")

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Added 5 new blog posts.")
else:
    print("Could not find the end of the array in staticBlogPosts.ts")
