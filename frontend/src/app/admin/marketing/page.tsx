"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Megaphone, Copy, Loader2, FileText, MessageCircle, Video, CheckCircle2, Send, Sparkles, Instagram } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function MarketingAdminPage() {
    const { user: currentUser, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [keyword, setKeyword] = useState("");
    const [tone, setTone] = useState("aggressive");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const [publishing, setPublishing] = useState<string | null>(null); // 'blog' or 'telegram'

    // [Security] Strict administrator check
    useEffect(() => {
        if (!authLoading) {
            if (!currentUser) {
                router.push("/");
            } else {
                const email = currentUser.email?.toLowerCase();
                if (email !== "rnfjr@gmail.com" && email !== "rnfjrlakdmf@gmail.com") {
                    alert("🛑 접근 권한이 없습니다. 관리자 전용 마케팅 도구입니다.");
                    router.push("/");
                }
            }
        }
    }, [currentUser, authLoading, router]);

    const handleGenerate = async () => {
        if (!keyword.trim()) {
            alert("키워드 또는 주제를 입력해주세요.");
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const res = await fetch(`${API_BASE_URL}/api/marketing/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ keyword, tone })
            });

            if (!res.ok) throw new Error("API 오류 발생");

            const data = await res.json();
            setResult(data);
        } catch (e) {
            alert("마케팅 문구 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAutoKeyword = async () => {
        setKeyword("🔥 실시간 핫 트렌드 분석 중...");
        try {
            const res = await fetch(`${API_BASE_URL}/api/marketing/auto-keyword`);
            if (res.ok) {
                const data = await res.json();
                setKeyword(data.keyword);
            } else {
                setKeyword("엔비디아 실적발표 및 AI 반도체 수혜주");
            }
        } catch (e) {
            setKeyword("반도체 슈퍼사이클 핵심 대장주 총정리");
        }
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const handlePublish = async (channel: string, title: string, content: string) => {
        if (!confirm(`${channel === 'tistory' ? '티스토리 블로그' : channel}에 지금 바로 발행하시겠습니까?`)) return;
        
        setPublishing(channel);
        try {
            const res = await fetch(`${API_BASE_URL}/api/marketing/publish`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    channel: channel,
                    title: title,
                    content: content
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.detail || "발행 중 오류가 발생했습니다.");
            }

            alert(`✅ 발행 성공!\nURL: ${data.url}`);
        } catch (e: any) {
            alert(`🛑 발행 실패: ${e.message}\n(서버 환경변수에 API 토큰이 제대로 설정되었는지 확인하세요)`);
        } finally {
            setPublishing(null);
        }
    };

    if (authLoading) return <div className="min-h-screen bg-black" />;

    return (
        <div className="min-h-screen bg-black text-white pb-20">
            <Header title="SNS 홍보 봇 (관리자)" subtitle="클릭 한 번으로 블로그, 커뮤니티, 쇼츠용 바이럴 텍스트를 자동 생성합니다." />

            <div className="max-w-6xl mx-auto p-6 space-y-8 mt-8">
                {/* Input Section */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-gray-400 font-bold text-sm">홍보 키워드 또는 주제</label>
                                <button 
                                    onClick={handleAutoKeyword}
                                    className="flex items-center gap-1 text-xs font-bold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-1 rounded transition-colors"
                                    title="AI가 오늘 가장 핫한 주식 시장 트렌드를 찾아 자동으로 입력해줍니다."
                                >
                                    <Sparkles className="w-3 h-3" />
                                    AI 자동 추천
                                </button>
                            </div>
                            <input 
                                type="text"
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                placeholder="예: 삼성전자 HBM 수혜주, 엔비디아 실적발표"
                                className="w-full bg-black border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>
                        <div className="w-full md:w-48 space-y-2">
                            <label className="text-gray-400 font-bold text-sm">문구 분위기</label>
                            <select 
                                value={tone} 
                                onChange={(e) => setTone(e.target.value)}
                                className="w-full bg-black border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 text-white appearance-none cursor-pointer"
                            >
                                <option value="aggressive">🔥 어그로/도발적 (추천)</option>
                                <option value="professional">💼 전문가/논리적</option>
                                <option value="emotional">🥺 감성/공감형</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button 
                                onClick={handleGenerate}
                                disabled={loading}
                                className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-black px-8 py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/20"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Megaphone className="w-5 h-5" />}
                                생성하기
                            </button>
                        </div>
                    </div>
                </div>

                {/* Results Section */}
                {loading && (
                    <div className="py-20 flex flex-col items-center justify-center space-y-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
                            <Loader2 className="w-12 h-12 text-blue-500 animate-spin relative z-10" />
                        </div>
                        <p className="text-gray-400 font-bold animate-pulse">주식 시장 1타 마케터가 글을 쓰는 중입니다...</p>
                    </div>
                )}

                {result && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        
                        {/* 1. Blog */}
                        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 flex flex-col h-full hover:border-green-500/50 transition-colors">
                            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-green-500/10 rounded-lg"><FileText className="w-5 h-5 text-green-400" /></div>
                                    <h3 className="font-bold text-white">블로그 포스팅용</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => handlePublish('tistory', result.blog.title, result.blog.content)} 
                                        disabled={publishing === 'tistory'}
                                        className="flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs font-bold hover:bg-green-500/30 transition-colors disabled:opacity-50"
                                        title="티스토리 블로그에 바로 발행하기"
                                    >
                                        {publishing === 'tistory' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        바로 발행
                                    </button>
                                    <button onClick={() => handleCopy(`${result.blog.title}\n\n${result.blog.content}`, 'blog')} className="text-gray-400 hover:text-white p-1">
                                        {copied === 'blog' ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 space-y-4 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                                <div className="font-bold text-green-400 text-lg leading-tight">{result.blog.title}</div>
                                <div className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{result.blog.content}</div>
                            </div>
                        </div>

                        {/* 2. Community */}
                        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 flex flex-col h-full hover:border-blue-500/50 transition-colors">
                            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-blue-500/10 rounded-lg"><MessageCircle className="w-5 h-5 text-blue-400" /></div>
                                    <h3 className="font-bold text-white">디시/종토방 어그로용</h3>
                                </div>
                                <button onClick={() => handleCopy(`${result.community.title}\n\n${result.community.content}`, 'community')} className="text-gray-400 hover:text-white">
                                    {copied === 'community' ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                                </button>
                            </div>
                            <div className="flex-1 space-y-4 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                                <div className="font-bold text-blue-400 text-lg leading-tight">{result.community.title}</div>
                                <div className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{result.community.content}</div>
                            </div>
                        </div>

                        {/* 3. Shorts */}
                        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 flex flex-col h-full hover:border-purple-500/50 transition-colors">
                            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-purple-500/10 rounded-lg"><Video className="w-5 h-5 text-purple-400" /></div>
                                    <h3 className="font-bold text-white">유튜브 숏츠/릴스 대본</h3>
                                </div>
                                <button onClick={() => handleCopy(`${result.shorts.title}\n\n${result.shorts.script}`, 'shorts')} className="text-gray-400 hover:text-white">
                                    {copied === 'shorts' ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                                </button>
                            </div>
                            <div className="flex-1 space-y-4 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                                <div className="font-bold text-purple-400 text-lg leading-tight">{result.shorts.title}</div>
                                <div className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{result.shorts.script}</div>
                            </div>
                        </div>

                        {/* 4. Instagram */}
                        {result.instagram && (
                            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 flex flex-col h-full hover:border-pink-500/50 transition-colors">
                                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-pink-500/10 rounded-lg"><Instagram className="w-5 h-5 text-pink-400" /></div>
                                        <h3 className="font-bold text-white">인스타 피드 / 쓰레즈</h3>
                                    </div>
                                    <button onClick={() => handleCopy(`${result.instagram.title}\n\n${result.instagram.content}`, 'instagram')} className="text-gray-400 hover:text-white">
                                        {copied === 'instagram' ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                                    </button>
                                </div>
                                <div className="flex-1 space-y-4 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                                    <div className="font-bold text-pink-400 text-lg leading-tight">{result.instagram.title}</div>
                                    <div className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{result.instagram.content}</div>
                                </div>
                            </div>
                        )}

                    </div>
                )}
            </div>
            
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </div>
    );
}
