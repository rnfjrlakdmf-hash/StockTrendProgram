"use client";

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface PurchaseRecord {
    id: number;
    buy_price: number;
    quantity: number;
    purchase_date: string;
}

interface WatchlistPurchaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    symbol: string;
    onSuccess: () => void;
}

export default function WatchlistPurchaseModal({ isOpen, onClose, symbol, onSuccess }: WatchlistPurchaseModalProps) {
    const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [newPrice, setNewPrice] = useState('');
    const [newQty, setNewQty] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && symbol) {
            fetchPurchases();
        }
    }, [isOpen, symbol]);

    const fetchPurchases = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token || "";
            const encodedSymbol = encodeURIComponent(symbol);
            
            const res = await fetch(`/api/watchlist/purchases?symbol=${encodedSymbol}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const result = await res.json();
            if (result.status === 'success') {
                setPurchases(result.data);
            }
        } catch (error) {
            console.error('Failed to fetch purchases', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const price = parseFloat(newPrice.replace(/,/g, ''));
        const qty = parseFloat(newQty.replace(/,/g, ''));
        
        if (isNaN(price) || isNaN(qty) || price <= 0 || qty <= 0) {
            alert('올바른 가격과 수량을 입력해주세요.');
            return;
        }

        setIsSubmitting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token || "";
            
            const res = await fetch(`/api/watchlist/purchases`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    symbol,
                    buy_price: price,
                    quantity: qty
                })
            });
            
            const result = await res.json();
            if (result.status === 'success') {
                setNewPrice('');
                setNewQty('');
                fetchPurchases();
                onSuccess();
            } else {
                alert('추가 실패: ' + result.message);
            }
        } catch (error) {
            alert('에러가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('이 매수 내역을 삭제하시겠습니까?')) return;
        
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token || "";
            const encodedSymbol = encodeURIComponent(symbol);
            
            const res = await fetch(`/api/watchlist/purchases/${id}?symbol=${encodedSymbol}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const result = await res.json();
            if (result.status === 'success') {
                fetchPurchases();
                onSuccess();
            } else {
                alert('삭제 실패: ' + result.message);
            }
        } catch (error) {
            alert('에러가 발생했습니다.');
        }
    };

    if (!isOpen) return null;

    const totalQty = purchases.reduce((acc, curr) => acc + curr.quantity, 0);
    const avgPrice = totalQty > 0 ? purchases.reduce((acc, curr) => acc + (curr.buy_price * curr.quantity), 0) / totalQty : 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-[#1c1c1e] w-full max-w-lg rounded-2xl shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[85vh]">
                
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-white/10">
                    <div>
                        <h2 className="text-xl font-bold text-white">{symbol} 매수 내역 관리</h2>
                        <p className="text-sm text-gray-400 mt-1">물타기 및 분할 매수 기록을 관리하세요</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Summary Info */}
                <div className="p-5 bg-blue-500/10 border-b border-blue-500/20 flex justify-around text-center">
                    <div>
                        <p className="text-sm text-blue-300 mb-1">총 평균단가</p>
                        <p className="text-2xl font-bold text-blue-100">{Math.round(avgPrice).toLocaleString()}원</p>
                    </div>
                    <div className="w-px bg-blue-500/20"></div>
                    <div>
                        <p className="text-sm text-blue-300 mb-1">보유 수량</p>
                        <p className="text-2xl font-bold text-blue-100">{totalQty.toLocaleString()}주</p>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    {/* Add Form */}
                    <form onSubmit={handleAdd} className="flex gap-3 mb-6 bg-white/5 p-4 rounded-xl border border-white/10">
                        <div className="flex-1 flex flex-col gap-3">
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">단가</span>
                                <input 
                                    type="text"
                                    className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 text-sm transition-colors"
                                    value={newPrice}
                                    onChange={(e) => setNewPrice(e.target.value.replace(/[^0-9]/g, ''))}
                                    required
                                />
                            </div>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">수량</span>
                                <input 
                                    type="text"
                                    className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 text-sm transition-colors"
                                    value={newQty}
                                    onChange={(e) => setNewQty(e.target.value.replace(/[^0-9]/g, ''))}
                                    required
                                />
                            </div>
                        </div>
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50 min-w-[80px]"
                        >
                            <Plus className="w-5 h-5" />
                            <span className="text-sm font-semibold whitespace-nowrap">추가</span>
                        </button>
                    </form>

                    {/* List */}
                    <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center justify-between">
                        상세 매수 기록
                        <span className="bg-white/10 px-2 py-0.5 rounded-full text-xs text-white">{purchases.length}건</span>
                    </h3>
                    
                    {loading ? (
                        <div className="py-8 text-center text-gray-400 text-sm animate-pulse">불러오는 중...</div>
                    ) : purchases.length === 0 ? (
                        <div className="py-10 text-center text-gray-500 text-sm bg-black/20 rounded-xl border border-white/5">
                            아직 매수 기록이 없습니다.<br/>위 폼에서 추가해보세요.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {purchases.map((p, idx) => (
                                <div key={p.id} className="flex justify-between items-center p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/10 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-xs font-bold text-gray-400 border border-white/10">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <p className="text-white font-medium text-base">{p.buy_price.toLocaleString()}원</p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {p.quantity.toLocaleString()}주 <span className="mx-1.5 opacity-50">•</span> 
                                                {new Date(p.purchase_date).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleDelete(p.id)}
                                        className="p-2.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        title="기록 삭제"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                {/* Footer */}
                <div className="p-4 border-t border-white/10 bg-black/20 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm font-semibold"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
}
