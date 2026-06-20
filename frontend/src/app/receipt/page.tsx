"use client";

import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { Download, Plus, Trash2, Camera, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface StockEntry {
    id: string;
    name: string;
    roi: string;
}

export default function ReceiptPage() {
    const [stocks, setStocks] = useState<StockEntry[]>([{ id: '1', name: '삼성전자', roi: '-15' }]);
    const [newName, setNewName] = useState('');
    const [newRoi, setNewRoi] = useState('');
    const receiptRef = useRef<HTMLDivElement>(null);
    const [isGenerated, setIsGenerated] = useState(false);

    const addStock = () => {
        if (!newName || !newRoi) return;
        setStocks([...stocks, { id: Date.now().toString(), name: newName, roi: newRoi }]);
        setNewName('');
        setNewRoi('');
    };

    const removeStock = (id: string) => {
        setStocks(stocks.filter(s => s.id !== id));
    };

    const handleDownload = async () => {
        if (!receiptRef.current) return;
        
        try {
            const canvas = await html2canvas(receiptRef.current, {
                scale: 2, // 고해상도
                backgroundColor: '#ffffff',
                logging: false,
            });
            
            const image = canvas.toDataURL("image/png");
            const link = document.createElement('a');
            link.href = image;
            link.download = `stock_receipt_${new Date().getTime()}.png`;
            link.click();
        } catch (err) {
            console.error("Failed to generate image", err);
            alert("이미지 저장에 실패했습니다.");
        }
    };

    const getTitleAndSubtitle = () => {
        if (stocks.length === 0) return { title: "투자를 시작하세요", sub: "아직 매수한 종목이 없습니다." };
        
        let totalRoi = 0;
        let isHighVolatility = false;
        
        stocks.forEach(s => {
            const r = parseFloat(s.roi);
            if (!isNaN(r)) {
                totalRoi += r;
                if (Math.abs(r) >= 30) isHighVolatility = true;
            }
        });
        
        const avgRoi = totalRoi / stocks.length;
        
        if (avgRoi > 50) return { title: "투자의 신 🏆", sub: "워렌 버핏도 울고 갈 수익률" };
        if (avgRoi > 10) return { title: "은은한 고수 😎", sub: "조용히 계좌를 불려가는 중" };
        if (avgRoi > 0) return { title: "안전제일 국밥충 🥣", sub: "수익은 났지만 재미는 없음" };
        if (avgRoi > -15) return { title: "흔한 개미 🐜", sub: "파란불이 익숙한 평범한 투자자" };
        if (avgRoi <= -15 && !isHighVolatility) return { title: "물린 흑우 🐮", sub: "본전 오면 무조건 판다" };
        if (avgRoi <= -30 && isHighVolatility) return { title: "상남자 야수의 심장 🦁", sub: "상폐 아니면 상한가뿐" };
        
        return { title: "가치투자자 💎", sub: "시간이 해결해 줄 거라 믿음" };
    };

    const getBarcode = () => {
        return "|| | ||| | || ||| | | || ||| | ||"; // Fake barcode visual
    };

    const { title, sub } = getTitleAndSubtitle();
    const currentDate = new Date().toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute:'2-digit' });

    return (
        <div className="min-h-screen bg-gray-50 p-4 pb-20">
            <div className="max-w-md mx-auto space-y-6">
                
                <div className="text-center mt-6">
                    <h1 className="text-2xl font-black tracking-tight text-gray-900">내 주식 전투력 영수증 🧾</h1>
                    <p className="text-gray-500 mt-2 text-sm">보유 종목을 입력하고 나의 투자 성향을 확인하세요!</p>
                </div>

                {/* 입력 폼 */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="font-bold text-gray-800 mb-4">보유 종목 추가</h2>
                    <div className="flex gap-2 mb-4">
                        <input 
                            type="text" 
                            placeholder="종목명 (예: 삼성전자)" 
                            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                        />
                        <input 
                            type="number" 
                            placeholder="수익률(%)" 
                            className="w-24 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newRoi}
                            onChange={(e) => setNewRoi(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addStock()}
                        />
                        <button 
                            onClick={addStock}
                            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700"
                        >
                            <Plus size={20} />
                        </button>
                    </div>

                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {stocks.map((stock) => (
                            <div key={stock.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                                <span className="font-medium text-sm text-gray-700">{stock.name}</span>
                                <div className="flex items-center gap-3">
                                    <span className={`text-sm font-bold ${parseFloat(stock.roi) > 0 ? 'text-red-500' : 'text-blue-500'}`}>
                                        {parseFloat(stock.roi) > 0 ? '+' : ''}{stock.roi}%
                                    </span>
                                    <button onClick={() => removeStock(stock.id)} className="text-gray-400 hover:text-red-500">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {stocks.length > 0 && (
                        <button 
                            onClick={() => setIsGenerated(true)}
                            className="w-full mt-5 bg-black text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-gray-800 transition-colors"
                        >
                            <Camera size={18} /> 영수증 발급하기
                        </button>
                    )}
                </div>

                {/* 영수증 프리뷰 영역 */}
                {isGenerated && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center"
                    >
                        {/* 실제 이미지로 변환될 영수증 DOM (흑백/모노스페이스 감성) */}
                        <div 
                            ref={receiptRef}
                            className="bg-white w-[320px] p-8 shadow-sm"
                            style={{ 
                                fontFamily: "'Courier New', Courier, monospace", 
                                color: "#000",
                                borderTop: "1px dashed #ccc",
                                borderBottom: "1px dashed #ccc",
                                backgroundImage: "linear-gradient(to bottom, #fff 0%, #fefefe 100%)"
                            }}
                        >
                            <div className="text-center mb-6">
                                <h2 className="text-xl font-black uppercase tracking-widest mb-1">STOCK TREND</h2>
                                <p className="text-xs text-gray-600">주식 전투력 영수증</p>
                                <div className="mt-2 text-xs border-b border-black pb-2 text-gray-500">
                                    {currentDate}
                                </div>
                            </div>

                            <div className="mb-6">
                                <p className="text-xs mb-1 uppercase tracking-wider text-gray-500">Customer Type</p>
                                <h3 className="text-lg font-bold leading-tight">{title}</h3>
                                <p className="text-xs mt-1 text-gray-600">"{sub}"</p>
                            </div>

                            <div className="border-t border-b border-dashed border-gray-400 py-3 mb-6 space-y-2">
                                <div className="flex justify-between text-xs font-bold text-gray-500 mb-2 uppercase">
                                    <span>Item</span>
                                    <span>ROI(%)</span>
                                </div>
                                {stocks.map((s, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                        <span className="truncate max-w-[180px]">{s.name}</span>
                                        <span className="font-bold">{s.roi}%</span>
                                    </div>
                                ))}
                            </div>

                            <div className="text-center mt-8">
                                <p className="text-xs text-gray-500 mb-2">Thank you for your tears & sweat.</p>
                                <div className="text-xl font-bold tracking-widest text-gray-400 mb-2">
                                    {getBarcode()}
                                </div>
                                <p className="text-[10px] text-gray-400">만들기: stock-trend-program.co.kr/receipt</p>
                            </div>
                        </div>

                        {/* 액션 버튼 */}
                        <div className="flex gap-3 w-full mt-6">
                            <button 
                                onClick={handleDownload}
                                className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 shadow-lg shadow-green-200"
                            >
                                <Download size={18} /> 이미지 저장
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-4">인스타그램 스토리에 올려 친구들과 공유해보세요!</p>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
