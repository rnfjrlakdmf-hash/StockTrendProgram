"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { Settings, Key, Bell, Moon, Shield, Save, Crown } from "lucide-react";

export default function SettingsPage() {
    const [isPro, setIsPro] = useState(false);
    const [secretCount, setSecretCount] = useState(0);

    useEffect(() => {
        const saved = localStorage.getItem("isPro");
        if (saved === "true") setIsPro(true);
    }, []);

    const togglePro = () => {
        const newVal = !isPro;
        setIsPro(newVal);
        localStorage.setItem("isPro", String(newVal));
    };

    const handleSecretTap = () => {
        const newCount = secretCount + 1;
        setSecretCount(newCount);

        if (newCount === 7) {
            const newVal = !isPro;
            setIsPro(newVal);
            localStorage.setItem("isPro", String(newVal));
            alert(newVal ? "👑 Developer Mode Activated! (Ads Removed)" : "Developer Mode Disabled.");
            setSecretCount(0);
        }
    };

    return (
        <div className="min-h-screen pb-10 text-white">
            <Header title="Settings" subtitle="Configure your AI preferences and API keys" />

            <div className="p-6 max-w-4xl mx-auto space-y-8">

                {/* Developer Mode Card (Only visible if ALREADY Pro, so admin can toggle off) */}
                {isPro && (
                    <div className="rounded-3xl bg-gradient-to-r from-gray-900 to-black border border-white/10 p-8 relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="absolute top-0 right-0 p-6 opacity-20">
                            <Crown className="w-24 h-24 text-yellow-500" />
                        </div>
                        <div className="relative z-10 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-yellow-400">
                                    <Crown className="w-5 h-5 fill-yellow-400" /> Developer Mode (Pro)
                                </h3>
                                <p className="text-gray-400 text-sm max-w-md">
                                    현재 <strong>운영자 권한</strong>이 활성화되었습니다. 모든 광고가 제거됩니다.
                                </p>
                            </div>
                            <button
                                onClick={togglePro}
                                className="px-6 py-3 rounded-xl font-bold bg-yellow-500 text-black hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/20"
                            >
                                ACTIVATED
                            </button>
                        </div>
                    </div>
                )}

                {/* API Configuration */}
                <div className="rounded-3xl bg-black/20 border border-white/10 p-8">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Key className="w-5 h-5 text-blue-400" /> API Connections
                    </h3>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">OpenAI API Key (for Analysis)</label>
                            <div className="relative">
                                <input type="password" value="sk-xxxxxxxxxxxxxxxxxxxxxxxx" disabled className="w-full h-12 rounded-xl bg-white/5 border border-white/10 px-4 text-gray-400 font-mono text-sm opacity-50" />
                                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-blue-600 px-3 py-1 rounded-lg hover:bg-blue-500">Edit</button>
                            </div>
                            <p className="text-xs text-gray-500">Used to generate daily briefings and sentiment analysis.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Brokerage API (Korea Investment / Kiwoom)</label>
                            <div className="relative">
                                <input type="password" value="APP-xxxxxxxx-xxxx" disabled className="w-full h-12 rounded-xl bg-white/5 border border-white/10 px-4 text-gray-400 font-mono text-sm opacity-50" />
                                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-blue-600 px-3 py-1 rounded-lg hover:bg-blue-500">Edit</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preferences */}
                <div className="rounded-3xl bg-black/20 border border-white/10 p-8">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-purple-400" /> Preferences
                    </h3>

                    <div className="space-y-4">
                        {[
                            { icon: Bell, title: "Price Alerts", desc: "Push notifications for sudden price drops" },
                            { icon: Shield, title: "Risk Auto-Check", desc: "Daily automatic portfolio health scan" },
                            { icon: Moon, title: "Dark Mode", desc: "Always use dark theme (System default)" },
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-transparent hover:border-white/10 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 rounded-lg bg-white/10 text-gray-300">
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm">{item.title}</h4>
                                        <p className="text-xs text-gray-500">{item.desc}</p>
                                    </div>
                                </div>
                                <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600 cursor-pointer">
                                    <span className="inline-block h-4 w-4 transform translate-x-6 rounded-full bg-white transition" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4">
                    <button className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 rounded-xl font-bold hover:shadow-lg hover:shadow-blue-500/20 transition-all active:scale-95">
                        <Save className="w-5 h-5" /> Save Changes
                    </button>
                </div>

                {/* Secret Trigger Area */}
                <div
                    onClick={handleSecretTap}
                    className="mt-10 py-10 text-center text-gray-800 hover:text-gray-700 transition-colors cursor-default select-none text-xs font-mono"
                >
                    ANTIGRAVITY v1.1.0 (Build 20251231)
                </div>

            </div>
        </div>
    );
}
