
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
        const response = await fetch(`${API_BASE_URL}/api/stock/${symbol}`);
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

export async function fetchThemeAnalysis(keyword: string): Promise<any> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/theme/${keyword}`);
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
