"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import { mbtiQuestions, mbtiResults } from "./mbtiData";
import KakaoShareButton from "@/components/KakaoShareButton";

export default function MbtiPage() {
  const [step, setStep] = useState<"landing" | "question" | "result">("landing");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({
    E: 0, I: 0,
    S: 0, N: 0,
    T: 0, F: 0,
    J: 0, P: 0,
  });
  const [mbtiResult, setMbtiResult] = useState<string>("");

  const handleStart = () => {
    setStep("question");
    setCurrentQuestionIndex(0);
    setAnswers({ E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 });
  };

  const handleAnswer = (type: string) => {
    const newAnswers = { ...answers, [type]: answers[type] + 1 };
    setAnswers(newAnswers);

    if (currentQuestionIndex < mbtiQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Calculate Result
      const EorI = newAnswers.E >= newAnswers.I ? "E" : "I";
      const SorN = newAnswers.S >= newAnswers.N ? "S" : "N";
      const TorF = newAnswers.T >= newAnswers.F ? "T" : "F";
      const JorP = newAnswers.J >= newAnswers.P ? "J" : "P";
      const resultType = `${EorI}${SorN}${TorF}${JorP}`;
      
      setMbtiResult(resultType);
      setStep("result");
    }
  };

  const progress = ((currentQuestionIndex) / mbtiQuestions.length) * 100;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[80vh]">
        
        {step === "landing" && (
          <div className="text-center animate-fade-in-up w-full">
            <div className="text-6xl mb-6">🦁🐯🦊</div>
            <h1 className="text-4xl md:text-5xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
              나의 주식 투자 MBTI는?
            </h1>
            <p className="text-lg text-slate-400 mb-8 leading-relaxed">
              나는 치타형 단타꾼일까? 거북이형 가치투자자일까?<br/>
              12개의 질문으로 알아보는 나의 진짜 투자 성향!
            </p>
            <button 
              onClick={handleStart}
              className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 text-white text-xl font-bold py-4 px-12 rounded-2xl shadow-lg shadow-indigo-600/20 transition-all transform hover:scale-105"
            >
              테스트 시작하기
            </button>
            <p className="text-slate-500 text-sm mt-6">소요 시간: 약 1분</p>
          </div>
        )}

        {step === "question" && (
          <div className="w-full max-w-lg animate-fade-in-up">
            <div className="mb-8">
              <div className="flex justify-between text-sm text-slate-400 mb-2">
                <span>진행률</span>
                <span>{currentQuestionIndex + 1} / {mbtiQuestions.length}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div 
                  className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 mb-8 shadow-2xl min-h-[200px] flex items-center justify-center">
              <h2 className="text-2xl font-bold text-center leading-relaxed">
                Q{mbtiQuestions[currentQuestionIndex].id}.<br/><br/>
                {mbtiQuestions[currentQuestionIndex].text}
              </h2>
            </div>

            <div className="space-y-4">
              {mbtiQuestions[currentQuestionIndex].options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(opt.type)}
                  className="w-full bg-slate-800 hover:bg-indigo-600/80 border border-slate-700 hover:border-indigo-500 text-left p-5 rounded-xl transition-all duration-200 text-lg hover:shadow-lg hover:shadow-indigo-500/20"
                >
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "result" && mbtiResults[mbtiResult] && (
          <div className="w-full animate-fade-in-up text-center">
            <h2 className="text-slate-400 text-lg mb-2">AI가 분석한 당신의 투자 동물은</h2>
            <div className="text-6xl mb-6">🐾</div>
            <h1 className="text-4xl md:text-5xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
              {mbtiResults[mbtiResult].title}
            </h1>
            
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 mb-8 shadow-2xl text-left">
              <div className="text-xl text-slate-300 leading-relaxed">
                {mbtiResults[mbtiResult].desc}
              </div>
            </div>

            <div className="grid gap-4 mb-8">
              <KakaoShareButton 
                title={`나의 주식 MBTI는 [${mbtiResults[mbtiResult].title}]`}
                description="나는 치타일까 거북이일까? 지금 바로 나의 주식 투자 성향을 테스트해보세요!"
                url={`https://stock-trend-program.co.kr/mbti`}
                imageUrl="https://stock-trend-program.co.kr/api/og?title=주식%20투자%20MBTI%20테스트&subtitle=나의%20투자%20동물은?&theme=이벤트"
                className="w-full bg-[#FEE500] hover:bg-[#FEE500]/90 text-black py-4 rounded-xl text-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-[#FEE500]/10"
                buttonText="카카오톡으로 결과 공유하기"
              />
              
              <button 
                onClick={handleStart}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-xl text-lg font-bold transition-colors border border-slate-700"
              >
                테스트 다시하기
              </button>
            </div>

            <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 rounded-2xl p-8 shadow-2xl mt-12">
              <h3 className="text-2xl font-bold mb-4 flex items-center justify-center gap-2">
                <span>🎯</span> {mbtiResults[mbtiResult].animal} 님에게 딱 맞는 추천 메뉴
              </h3>
              <p className="text-indigo-200 mb-6">
                지금 StockTrend AI가 분석한 오늘의 급등 유력 종목을 무료로 확인해보세요!
              </p>
              <Link href="/ranking/top10" className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all">
                오늘의 급등주 보러가기 🚀
              </Link>
            </div>
          </div>
        )}
        
      </main>
    </div>
  );
}
