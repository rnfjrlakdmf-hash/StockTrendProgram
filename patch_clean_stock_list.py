import os
import re

file_path = "frontend/src/components/CleanStockList.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add imports
imports_to_add = """import { getApiBaseUrl } from '@/config/api';
import KakaoShareButton from '@/components/KakaoShareButton';
"""
if "KakaoShareButton" not in content:
    content = content.replace("import BlinkingPrice from './BlinkingPrice';", 
                              "import BlinkingPrice from './BlinkingPrice';\n" + imports_to_add)

# Add "자랑하기" button if pct > 0
# We inject it next to the return percentage
target = """                                                                        isUSD
                                                                                ? totalDiff.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                                                : totalDiff.toLocaleString(undefined, { maximumFractionDigits: 0 })
                                                                        }${currencyUnit} (${pct > 0 ? '+' : ''}${pct.toFixed(2)}%)${krwDiffStr}`
                                                                    )}
                                                                </div>"""

replacement = """                                                                        isUSD
                                                                                ? totalDiff.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                                                : totalDiff.toLocaleString(undefined, { maximumFractionDigits: 0 })
                                                                        }${currencyUnit} (${pct > 0 ? '+' : ''}${pct.toFixed(2)}%)${krwDiffStr}`
                                                                    )}
                                                                    
                                                                    {/* 자랑하기 버튼 (수익 중일 때만 표시) */}
                                                                    {pct > 0 && (
                                                                        <div onClick={(e) => e.stopPropagation()} className="ml-2 inline-block">
                                                                            {(() => {
                                                                                const shareUrl = new URL(`${getApiBaseUrl() === 'http://13.209.99.170:8000' ? 'https://stock-trend-program.co.kr' : 'http://localhost:3000'}/api/og`);
                                                                                shareUrl.searchParams.set('title', item.name || item.symbol);
                                                                                shareUrl.searchParams.set('subtitle', '세력 포착 라이브 알림 덕분!');
                                                                                shareUrl.searchParams.set('theme', '내 수익률 인증');
                                                                                shareUrl.searchParams.set('change', `+${pct.toFixed(2)}%`);
                                                                                
                                                                                return (
                                                                                    <KakaoShareButton 
                                                                                        title={`[수익인증] ${item.name} +${pct.toFixed(2)}%`}
                                                                                        description="제가 보유한 종목의 수익률을 확인해보세요! 스톡 트렌드 프로그램의 무료 프리미엄 알림 덕분입니다."
                                                                                        path={`/stock/${item.symbol.split('.')[0]}`}
                                                                                        imageUrl={shareUrl.toString()}
                                                                                        small={true}
                                                                                        customIcon={<span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded shadow">자랑하기 🔥</span>}
                                                                                    />
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    )}
                                                                </div>"""

if "자랑하기 버튼" not in content:
    content = content.replace(target, replacement)
    
with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Patched CleanStockList.tsx")
