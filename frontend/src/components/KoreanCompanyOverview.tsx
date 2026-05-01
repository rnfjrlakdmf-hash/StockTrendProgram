"use client";

import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/config";
import { Loader2, Building2, History, PieChart, FlaskConical, Users, Globe, Phone, MapPin, Calendar, User, Briefcase, Landmark } from "lucide-react";
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface Props {
  symbol: string;
  stockName: string;
}

export default function KoreanCompanyOverview({ symbol, stockName }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/stock/${symbol}/overview`);
        const json = await res.json();
        if (json.status === "success" && json.data) {
          setData(json.data);
        } else {
          setError(true);
        }
      } catch (e) {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    if (symbol) load();
  }, [symbol]);

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-sm font-medium"><span>상세 기업 정보 수집 중...</span></p>
      </div>
    );
  }

  if (error || !data) return null;

  const { basic_info, history, sales_composition, rnd_status, staff_status } = data;

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
      {/* 1. 기본 정보 테이블 */}
      <section>
        <h4 className="text-sm font-black text-blue-300 flex items-center gap-2 mb-4 uppercase tracking-widest">
          <Building2 className="w-4 h-4" /> <span>기업 기본 정보</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/10 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
          {Object.entries(basic_info || {}).map(([key, val]: any) => (
            <div key={key} className="flex bg-slate-900/40">
              <div className="w-32 bg-white/5 p-3 text-[11px] font-bold text-slate-400 flex items-center border-r border-white/5">
                <span>{key}</span>
              </div>
              <div className="flex-1 p-3 text-xs text-slate-200 flex items-center break-all whitespace-pre-wrap leading-relaxed">
                {val === "-" ? <span className="text-slate-600"><span>-</span></span> : <span>{val}</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. 최근 연혁 */}
      {Array.isArray(history) && history.length > 0 && (
        <section>
          <h4 className="text-sm font-black text-purple-300 flex items-center gap-2 mb-4 uppercase tracking-widest">
            <History className="w-4 h-4" /> <span>최근 주요 연혁</span>
          </h4>
          <div className="bg-slate-900/40 rounded-2xl border border-white/10 p-5 space-y-4">
            {history.slice(0, 10).map((h: any, i: number) => (
              <div key={i} className="flex gap-4 group">
                <div className="w-20 text-[11px] font-mono text-blue-400 font-bold pt-0.5 flex-shrink-0">
                  <span>{h.date}</span>
                </div>
                <div className="flex-1 text-sm text-slate-300 leading-relaxed group-hover:text-white transition-colors">
                  <span>{h.content}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. 주요 제품 및 매출 구성 */}
      {Array.isArray(sales_composition) && sales_composition.length > 0 && (
        <section>
          <h4 className="text-sm font-black text-emerald-300 flex items-center gap-2 mb-4 uppercase tracking-widest">
            <PieChart className="w-4 h-4" /> <span>주요 제품 및 매출 구성</span>
          </h4>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 bg-slate-900/40 rounded-3xl border border-white/10 p-6 shadow-xl">
            {/* 차트 영역 */}
            <div className="lg:col-span-2 h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={sales_composition}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="percentage"
                    nameKey="product"
                    labelLine={false}
                  >
                    {sales_composition.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "12px", color: "#f8fafc" }}
                    itemStyle={{ color: "#f8fafc" }}
                  />
                  <Legend />
                </RePieChart>
              </ResponsiveContainer>
            </div>
            {/* 테이블 영역 */}
            <div className="lg:col-span-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-500 font-bold">
                    <th className="py-3 px-4">매출 품목 / 서비스</th>
                    <th className="py-3 px-4 text-right">비중 (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sales_composition.map((s: any, i: number) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-slate-200 font-medium"><span>{s.product}</span></span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                        <span>{typeof s.percentage === 'number' ? s.percentage.toFixed(2) : (parseFloat(s.percentage) || 0).toFixed(2)}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* 4. 연구개발비 지출 현황 */}
      {Array.isArray(rnd_status) && rnd_status.length > 0 && (
        <section>
          <h4 className="text-sm font-black text-amber-300 flex items-center gap-2 mb-4 uppercase tracking-widest">
            <FlaskConical className="w-4 h-4" /> <span>연구개발비 지출 현황</span>
          </h4>
          <div className="bg-slate-900/40 rounded-2xl border border-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-white/5 text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                  <tr>
                    {Array.isArray(rnd_status) && rnd_status.length > 0 && rnd_status[0] && Object.keys(rnd_status[0]).map(h => (
                      <th key={h} className="py-3 px-4 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rnd_status.map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      {Object.values(row).map((val: any, j: number) => (
                        <td key={j} className={`py-3 px-4 font-medium whitespace-nowrap ${j === 0 ? 'text-blue-300 font-bold' : 'text-slate-300'}`}>
                          <span>{val}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* 5. 인원 현황 */}
      {Array.isArray(staff_status) && staff_status.length > 0 && (
        <section>
          <h4 className="text-sm font-black text-rose-300 flex items-center gap-2 mb-4 uppercase tracking-widest">
            <Users className="w-4 h-4" /> <span>임직원 및 급여 현황</span>
          </h4>
          <div className="bg-slate-900/40 rounded-2xl border border-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-white/5 text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                  <tr>
                    {Array.isArray(staff_status) && staff_status.length > 0 && staff_status[0] && Object.keys(staff_status[0]).map(h => (
                      <th key={h} className="py-3 px-4 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {staff_status.map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      {Object.values(row).map((val: any, j: number) => (
                        <td key={j} className={`py-3 px-4 font-medium whitespace-nowrap ${j === 0 ? 'text-blue-300 font-bold' : 'text-slate-300'}`}>
                          <span>{val}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
      
      <div className="mt-8 p-4 bg-indigo-900/20 rounded-2xl border border-indigo-500/20 border-dashed text-center">
        <p className="text-[11px] text-indigo-400 font-medium">
          <span>위 데이터는 네이버 금융 기업분석 정보를 기반으로 실시간 제공됩니다. </span>
          <span>기업의 공시 시점에 따라 실제 데이터와 미세한 시차가 발생할 수 있습니다.</span>
        </p>
      </div>
    </div>
  );
}
