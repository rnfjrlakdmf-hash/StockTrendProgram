'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Search, Eye, Sparkles } from 'lucide-react';

const MESSAGES = [
  { template: "익명의 유저가 방금 [ITEM] 수익률을 확인했습니다.", type: 'view' },
  { template: "서울의 한 유저가 [ITEM] 테마를 검색했습니다.", type: 'search' },
  { template: "방금 누군가 [ITEM] 관련주 분석을 시작했습니다.", type: 'analyze' },
  { template: "현재 [ITEM]에 트래픽이 몰리고 있습니다!", type: 'trend' },
];

const ITEMS = [
  "초전도체", "삼성전자", "SK하이닉스", "에코프로", "HLB", "AI 반도체", "의료 AI", "엔비디아 관련주", "비트코인 관련주", "원전 관련주", "한미반도체", "알테오젠", "이차전지"
];

// 랜덤 함수
const getRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

export default function FOMOPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState({ text: '', type: 'view' });

  useEffect(() => {
    // 팝업 표시 로직
    const showPopup = () => {
      const randomMsg = getRandom(MESSAGES);
      const randomItem = getRandom(ITEMS);
      
      setMessage({
        text: randomMsg.template.replace('[ITEM]', `<strong class="text-cyan-400">${randomItem}</strong>`),
        type: randomMsg.type
      });
      
      setIsVisible(true);

      // 4~5초 후 사라짐
      setTimeout(() => {
        setIsVisible(false);
      }, 4500);
    };

    // 초기 렌더링 후 약간의 지연 뒤 첫 팝업
    const initialTimeout = setTimeout(showPopup, 3000);

    // 이후 12초 ~ 25초 간격으로 반복
    const intervalId = setInterval(() => {
      // 이미 보이는 중이 아닐 때만
      setIsVisible(false); // 혹시 모를 충돌 방지
      setTimeout(showPopup, 500); // 0.5초 대기 후 새 팝업
    }, Math.floor(Math.random() * 13000) + 12000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-sm w-[calc(100%-3rem)] md:w-auto">
      <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-[0_8px_30px_rgba(6,182,212,0.15)] flex items-start gap-3">
        <div className="mt-1 shrink-0">
          {message.type === 'view' && <Eye className="w-5 h-5 text-purple-400" />}
          {message.type === 'search' && <Search className="w-5 h-5 text-blue-400" />}
          {message.type === 'analyze' && <Sparkles className="w-5 h-5 text-yellow-400" />}
          {message.type === 'trend' && <TrendingUp className="w-5 h-5 text-red-400" />}
        </div>
        <div className="flex flex-col">
          <p 
            className="text-sm text-gray-200 leading-snug"
            dangerouslySetInnerHTML={{ __html: message.text }}
          />
          <span className="text-[10px] text-gray-500 mt-1">방금 전</span>
        </div>
      </div>
    </div>
  );
}
