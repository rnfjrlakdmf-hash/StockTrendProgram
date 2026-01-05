"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface GaugeChartProps {
    score: number;
    label: string;
    subLabel?: string;
    color?: string;
}

export default function GaugeChart({ score, label, subLabel, color = "#3b82f6" }: GaugeChartProps) {
    const data = [
        { name: "Score", value: score },
        { name: "Remaining", value: 100 - score },
    ];

    const trackData = [{ name: "Track", value: 100 }];

    return (
        <div className="relative flex flex-col items-center justify-center">
            <div className="h-48 w-full max-w-[200px] aspect-square relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={trackData}
                            dataKey="value"
                            cx="50%"
                            cy="70%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius="70%"
                            outerRadius="90%"
                            fill="#ffffff10"
                            stroke="none"
                            isAnimationActive={false}
                        />
                        <Pie
                            data={data}
                            dataKey="value"
                            cx="50%"
                            cy="70%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius="70%"
                            outerRadius="90%"
                            paddingAngle={0}
                            cornerRadius={4}
                            stroke="none"
                        >
                            <Cell fill={color} />
                            <Cell fill="transparent" />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>

                <div className="absolute top-[60%] left-1/2 -translate-x-1/2 text-center transform -translate-y-1/2 whitespace-nowrap">
                    <span className="text-4xl font-bold text-white block drop-shadow-lg">{score}</span>
                    <span className="text-xs text-gray-400 uppercase tracking-widest font-semibold">{label}</span>
                </div>
            </div>
            {subLabel && <p className="text-sm text-gray-500 mt-[-20px] text-center">{subLabel}</p>}
        </div>
    );
}
