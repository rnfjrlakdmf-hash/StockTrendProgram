"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, HelpCircle, Sparkles, Trophy, XCircle, RotateCcw } from "lucide-react";
import { EconomicsQuizItem } from "@/lib/economicsFallback";
import { API_BASE_URL } from "@/lib/config";

const COMPLETED_STORAGE_KEY = "econ_completed_slugs_v1";

interface EconomicsStudyToolsProps {
    slug: string;
    dayNumber: number;
    title: string;
    quiz: EconomicsQuizItem[];
}

export default function EconomicsStudyTools({
    slug,
    dayNumber,
    title,
    quiz,
}: EconomicsStudyToolsProps) {
    const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
    const [isCompleted, setIsCompleted] = useState<boolean>(false);
    const [justCompleted, setJustCompleted] = useState<boolean>(false);

    // 완료 여부 로드 & 조회수 +1
    useEffect(() => {
        try {
            const raw = localStorage.getItem(COMPLETED_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.includes(slug)) {
                    setIsCompleted(true);
                }
            }
        } catch {
            // ignore
        }

        const baseUrl = API_BASE_URL || "";
        if (slug && !slug.startsWith("econ-starter")) {
            fetch(`${baseUrl}/api/economics/posts/${encodeURIComponent(slug)}/view`, {
                method: "POST",
            }).catch(() => {});
        }
    }, [slug]);

    const toggleComplete = () => {
        try {
            const raw = localStorage.getItem(COMPLETED_STORAGE_KEY);
            const list: string[] = raw ? JSON.parse(raw) : [];
            const exists = list.includes(slug);
            let next: string[];
            if (exists) {
                next = list.filter((s) => s !== slug);
                setIsCompleted(false);
                setJustCompleted(false);
            } else {
                next = Array.from(new Set([...list, slug]));
                setIsCompleted(true);
                setJustCompleted(true);
            }
            localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(next));
        } catch {
            setIsCompleted(!isCompleted);
        }
    };

    const handleSelectOption = (qIdx: number, optIdx: number) => {
        if (selectedAnswers[qIdx] !== undefined) return;
        setSelectedAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
    };

    const resetQuiz = () => {
        setSelectedAnswers({});
    };

    const answeredCount = Object.keys(selectedAnswers).length;
    const correctCount = quiz.reduce((acc, q, idx) => {
        return acc + (selectedAnswers[idx] === q.answerIndex ? 1 : 0);
    }, 0);
    const allAnswered = quiz.length > 0 && answeredCount === quiz.length;

    return (
        <div className="mt-14 space-y-8">
            {/* 1. 인터랙티브 복습 퀴즈 섹션 */}
            {quiz && quiz.length > 0 && (
                <section className="rounded-3xl bg-gradient-to-br from-indigo-950/60 via-slate-900/95 to-zinc-950 border-2 border-indigo-500/35 p-6 md:p-8 shadow-2xl">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-white/10">
                        <div>
                            <div className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-300 bg-indigo-500/20 border border-indigo-400/30 px-3 py-1 rounded-full mb-2">
                                <HelpCircle className="w-3.5 h-3.5" />
                                <span>방금 배운 내용 10초 복습 테스트</span>
                            </div>
                            <h3 className="text-xl md:text-2xl font-black text-white">
                                📝 오늘의 경제학 복습 퀴즈 ({quiz.length}문제)
                            </h3>
                        </div>

                        {answeredCount > 0 && (
                            <button
                                type="button"
                                onClick={resetQuiz}
                                className="text-xs font-bold text-gray-300 hover:text-white bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>다시 풀기</span>
                            </button>
                        )}
                    </div>

                    <div className="space-y-6">
                        {quiz.map((q, qIdx) => {
                            const picked = selectedAnswers[qIdx];
                            const isAnswered = picked !== undefined;
                            const isCorrect = picked === q.answerIndex;

                            return (
                                <div
                                    key={qIdx}
                                    className="rounded-2xl bg-black/40 border border-white/10 p-5 md:p-6 space-y-4"
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="shrink-0 w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 font-black text-sm flex items-center justify-center">
                                            Q{qIdx + 1}
                                        </span>
                                        <p className="text-base md:text-lg font-bold text-white leading-snug break-keep">
                                            {q.question}
                                        </p>
                                    </div>

                                    <div className="space-y-2.5 pl-0 sm:pl-10">
                                        {q.options.map((opt, oIdx) => {
                                            let btnStyle =
                                                "bg-white/5 border-white/10 text-gray-200 hover:bg-white/10 hover:border-amber-400/50";
                                            if (isAnswered) {
                                                if (oIdx === q.answerIndex) {
                                                    btnStyle =
                                                        "bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold";
                                                } else if (oIdx === picked && oIdx !== q.answerIndex) {
                                                    btnStyle = "bg-rose-500/20 border-rose-400 text-rose-200";
                                                } else {
                                                    btnStyle = "bg-white/[0.02] border-white/5 text-gray-500";
                                                }
                                            }

                                            return (
                                                <button
                                                    key={oIdx}
                                                    type="button"
                                                    disabled={isAnswered}
                                                    onClick={() => handleSelectOption(qIdx, oIdx)}
                                                    className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm md:text-base transition-all flex items-center justify-between gap-3 ${btnStyle} ${
                                                        !isAnswered ? "cursor-pointer active:scale-[0.99]" : "cursor-default"
                                                    }`}
                                                >
                                                    <span className="flex items-start gap-2.5 break-keep">
                                                        <span className="font-black text-xs px-2 py-0.5 rounded bg-black/40 text-amber-300 mt-0.5 shrink-0">
                                                            {oIdx + 1}
                                                        </span>
                                                        <span>{opt}</span>
                                                    </span>

                                                    {isAnswered && oIdx === q.answerIndex && (
                                                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                                                    )}
                                                    {isAnswered && oIdx === picked && oIdx !== q.answerIndex && (
                                                        <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* 정답 해설 박스 */}
                                    {isAnswered && (
                                        <div
                                            className={`sm:ml-10 p-4 rounded-xl border text-sm leading-relaxed break-keep ${
                                                isCorrect
                                                    ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-100"
                                                    : "bg-amber-950/40 border-amber-500/40 text-amber-100"
                                            }`}
                                        >
                                            <div className="font-black mb-1 flex items-center gap-1.5">
                                                {isCorrect ? (
                                                    <>
                                                        <span>🎉 정답입니다! 정확히 이해하셨어요!</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>💡 아쉬워요! 정답은 {q.answerIndex + 1}번입니다.</span>
                                                    </>
                                                )}
                                            </div>
                                            <p className="text-gray-200">{q.explanation}</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* 전체 채점 결과 배너 */}
                    {allAnswered && (
                        <div className="mt-6 p-5 rounded-2xl bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border border-amber-400/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shrink-0">
                                    <Trophy className="w-6 h-6 text-amber-300" />
                                </div>
                                <div>
                                    <div className="text-base md:text-lg font-black text-white">
                                        복습 퀴즈 결과: {quiz.length}문제 중{" "}
                                        <span className="text-amber-300">{correctCount}문제 정답!</span>
                                    </div>
                                    <div className="text-xs md:text-sm text-gray-300">
                                        {correctCount === quiz.length
                                            ? "완벽합니다! 오늘의 경제학 개념을 100% 내 것으로 만드셨습니다!"
                                            : "해설을 한 번 더 읽어보시면 평생 잊히지 않는 경제 지식이 됩니다!"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            )}

            {/* 2. 오늘의 공부 완료 도장 찍기 카드 */}
            <section
                className={`rounded-3xl p-6 md:p-7 border-2 transition-all flex flex-col md:flex-row items-center justify-between gap-5 shadow-xl ${
                    isCompleted
                        ? "bg-gradient-to-r from-emerald-950/60 via-teal-950/40 to-slate-900 border-emerald-500/50"
                        : "bg-gradient-to-r from-amber-950/40 via-zinc-900 to-indigo-950/40 border-amber-500/40"
                }`}
            >
                <div className="space-y-1 text-center md:text-left">
                    <div className="inline-flex items-center gap-1.5 text-xs font-black text-amber-300">
                        <Sparkles className="w-4 h-4" />
                        <span>Day {dayNumber || 1} 학습 완료 체크</span>
                    </div>
                    <h4 className="text-lg md:text-xl font-black text-white break-keep">
                        {isCompleted
                            ? "🎉 오늘의 경제학 공부를 훌륭하게 완료하셨습니다!"
                            : "강의를 다 읽으셨다면 공부 완료 도장을 꾹 눌러주세요!"}
                    </h4>
                    <p className="text-xs md:text-sm text-gray-300 break-keep">
                        {justCompleted
                            ? `'${title}' 강의가 나의 경제학 진도표에 완주 기록으로 저장되었습니다!`
                            : "완료 체크를 누르면 경제학 공부방 상단의 '나의 진도표'에 자동으로 누적 기록됩니다."}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={toggleComplete}
                    className={`shrink-0 px-6 py-3.5 rounded-2xl text-sm md:text-base font-black flex items-center gap-2 transition-all shadow-lg cursor-pointer active:scale-95 ${
                        isCompleted
                            ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25"
                            : "bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 shadow-amber-500/25"
                    }`}
                >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{isCompleted ? "공부 완료됨 (도장 쾅!)" : "오늘 공부 완료 체크하기"}</span>
                </button>
            </section>
        </div>
    );
}
