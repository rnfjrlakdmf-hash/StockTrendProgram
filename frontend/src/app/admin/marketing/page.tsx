"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Megaphone, Copy, Loader2, FileText, MessageCircle, Video, CheckCircle2 } from "lucide-react";
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

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
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
                            <label className="text-gray-400 font-bold text-sm">홍보 키워드 또는 주제</label>
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        
                        {/* 1. Blog */}
                        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 flex flex-col h-full hover:border-green-500/50 transition-colors">
                            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-green-500/10 rounded-lg"><FileText className="w-5 h-5 text-green-400" /></div>
                                    <h3 className="font-bold text-white">블로그 포스팅용</h3>
                                </div>
                                <button onClick={() => handleCopy(`${result.blog.title}\n\n${result.blog.content}`, 'blog')} className="text-gray-400 hover:text-white">
                                    {copied === 'blog' ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                                </button>
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
