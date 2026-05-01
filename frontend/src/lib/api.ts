
import { API_BASE_URL } from "./config";

export interface StockData {
    symbol: string;
    name: string;
    price: string;
    currency: string;
    change: string;
    summary: string;
    sector: string;
    score: number;
    metrics: {
        supplyDemand: number;
        financials: number;
        news: number;
    };
}

export async function fetchStockAnalysis(symbol: string): Promise<StockData | null> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/analysis/stock/${symbol}`);
        if (!response.ok) {
            console.error("Failed to fetch stock data");
            return null;
        }
        const result = await response.json();
        if (result.status === "success") {
            return result.data;
        }
        return null;
    } catch (error) {
        console.error("API Error:", error);
        return null;
    }
}

export interface ThemeStock {
    symbol: string;
    name: string;
    reason: string;
}

export interface ThemeAnalysisResult {
    theme: string;
    description: string;
    risk_factor: string;
    leaders: ThemeStock[];
    followers: ThemeStock[];
}

export async function fetchThemeAnalysis(keyword: string): Promise<ThemeAnalysisResult | null> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/analysis/theme/${keyword}`);
        if (!response.ok) return null;
        const result = await response.json();
        if (result.status === "success") {
            return result.data;
        }
        return null;
    } catch (error) {
        console.error("Theme API Error:", error);
        return null;
    }
}

export async function fetchChatResponse(message: string): Promise<string | null> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message }),
        });
        if (!response.ok) return null;
        const result = await response.json();
        if (result.status === "success") {
            return result.reply;
        }
        return null;
    } catch (error) {
        console.error("Chat API Error:", error);
        return null;
    }
}
