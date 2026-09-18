"use client";

import React, { memo, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface GaugeChartProps {
    score: number;
    label: string;
    subLabel?: string;
    color?: string;
    size?: "sm" | "md" | "lg";
}

const GaugeChart = memo(function GaugeChart({ score, label, subLabel, color = "#3b82f6", size = "lg" }: GaugeChartProps) {
    const data = useMemo(() => [
        { name: "Score", value: score },
        { name: "Remaining", value: 100 - score },
    ], [score]);

    const trackData = useMemo(() => [{ name: "Track", value: 100 }], []);

    const sizeConfig = useMemo(() => {
        switch (size) {
            case "sm":
                return {
                    container: "h-28 w-full max-w-[130px]",
                    score: "text-xl font-black",
                    label: "text-[8px] uppercase tracking-wider font-semibold",
                    top: "top-[62%]"
                };
            case "md":
                return {
                    container: "h-32 sm:h-36 w-full max-w-[150px] sm:max-w-[170px]",
                    score: "text-2xl sm:text-3xl font-black",
                    label: "text-[9px] uppercase tracking-wider font-semibold",
                    top: "top-[60%]"
                };
            case "lg":
            default:
                return {
                    container: "h-48 w-full max-w-[200px]",
                    score: "text-2xl md:text-4xl font-bold",
                    label: "text-[10px] md:text-xs uppercase tracking-widest font-semibold",
                    top: "top-[60%]"
                };
        }
    }, [size]);

    return (
        <div className="relative flex flex-col items-center justify-center">
            <div className={`${sizeConfig.container} aspect-square relative`}>
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
                            isAnimationActive={true}
                        >
                            <Cell fill={color} />
                            <Cell fill="transparent" />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>

                <div className={`absolute ${sizeConfig.top} left-1/2 -translate-x-1/2 text-center transform -translate-y-1/2 whitespace-nowrap`}>
                    <span className={`${sizeConfig.score} text-white block drop-shadow-lg leading-tight`}>{score}</span>
                    <span className={`${sizeConfig.label} text-gray-400 block mt-0.5`}>{label}</span>
                </div>
            </div>
            {subLabel && <p className="text-xs text-gray-500 mt-[-10px] text-center">{subLabel}</p>}
        </div>
    );
});

export default GaugeChart;
