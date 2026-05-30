"use client";

import { motion } from "framer-motion";
import { ArrowRight, TrendingUp, Gift } from "lucide-react";
import Link from "next/link";

interface CpaBannerProps {
  title?: string;
  description?: string;
  buttonText?: string;
  linkUrl?: string;
  theme?: "indigo" | "amber" | "emerald";
}

export default function CpaBanner({
  title = "키움증권 비대면 계좌 개설하고 40달러 받기",
  description = "지금 계좌를 개설하면 수수료 혜택과 함께 미국주식 투자 지원금을 즉시 지급해 드립니다.",
  buttonText = "지원금 받고 시작하기",
  linkUrl = "#", // 여기에 발급받은 CPA 링크 삽입
  theme = "indigo"
}: CpaBannerProps) {
  
  const themeStyles = {
    indigo: {
      bg: "bg-indigo-500/10 border-indigo-500/20",
      iconBg: "bg-indigo-500/20 text-indigo-400",
      buttonBg: "bg-indigo-600 hover:bg-indigo-500 text-white",
      highlight: "text-indigo-400"
    },
    amber: {
      bg: "bg-amber-500/10 border-amber-500/20",
      iconBg: "bg-amber-500/20 text-amber-400",
      buttonBg: "bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold",
      highlight: "text-amber-400"
    },
    emerald: {
      bg: "bg-emerald-500/10 border-emerald-500/20",
      iconBg: "bg-emerald-500/20 text-emerald-400",
      buttonBg: "bg-emerald-600 hover:bg-emerald-500 text-white",
      highlight: "text-emerald-400"
    }
  };

  const activeTheme = themeStyles[theme];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`relative overflow-hidden rounded-2xl border ${activeTheme.bg} p-6 mt-6 backdrop-blur-sm flex flex-col md:flex-row items-center justify-between gap-6`}
    >
      {/* Background Decor */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-start gap-4 flex-1">
        <div className={`p-3 rounded-xl ${activeTheme.iconBg} shrink-0`}>
          <Gift className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
            {title}
            <span className={`text-xs px-2 py-0.5 rounded-full bg-white/10 ${activeTheme.highlight}`}>
              이벤트
            </span>
          </h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      <Link 
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`shrink-0 flex items-center justify-center gap-2 px-6 py-3 rounded-xl transition-all shadow-lg shadow-black/20 ${activeTheme.buttonBg}`}
      >
        <span>{buttonText}</span>
        <ArrowRight className="w-4 h-4" />
      </Link>
    </motion.div>
  );
}
