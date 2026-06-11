import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// 한국어 폰트 (Pretendard Bold) 로드
async function getFont() {
  try {
    const res = await fetch(
      'https://cdn.jsdelivr.net/gh/orioncactus/pretendard/packages/pretendard/dist/public/static/Pretendard-Bold.ttf'
    );
    return await res.arrayBuffer();
  } catch (e) {
    console.error('폰트 로드 실패:', e);
    return null;
  }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        
        // 범용 파라미터 받기
        const title = searchParams.get('title') || 'StockTrend AI 주식 분석';
        const subtitle = searchParams.get('subtitle') || '기관급 데이터와 AI가 분석한 객관적 리포트';
        const tag = searchParams.get('tag') || '시황 리포트';
        const symbol = searchParams.get('symbol'); // 공급망 등에서 사용

        const fontData = await getFont();

        const options: any = {
            width: 1200,
            height: 630,
        };

        if (fontData) {
            options.fonts = [
                {
                    name: 'Pretendard',
                    data: fontData,
                    style: 'normal',
                },
            ];
        }

        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                        backgroundColor: '#0f172a', // Slate 900
                        backgroundImage: 'radial-gradient(circle at 25px 25px, rgba(255, 255, 255, 0.05) 2%, transparent 0%), radial-gradient(circle at 75px 75px, rgba(255, 255, 255, 0.05) 2%, transparent 0%)',
                        backgroundSize: '100px 100px',
                        padding: '80px',
                        fontFamily: fontData ? '"Pretendard", sans-serif' : 'sans-serif',
                    }}
                >
                    {/* 상단 태그 배지 */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(59, 130, 246, 0.15)',
                            padding: '12px 32px',
                            borderRadius: '32px',
                            border: '2px solid rgba(59, 130, 246, 0.4)',
                            color: '#93c5fd',
                            fontSize: 32,
                            fontWeight: 800,
                            marginBottom: 40,
                            letterSpacing: '1px',
                        }}
                    >
                        #{tag} {symbol ? `· ${symbol}` : ''}
                    </div>

                    {/* 메인 타이틀 */}
                    <div
                        style={{
                            display: 'flex',
                            fontSize: 72,
                            fontWeight: 900,
                            color: 'white',
                            lineHeight: 1.3,
                            letterSpacing: '-0.02em',
                            marginBottom: 30,
                            wordBreak: 'keep-all',
                            maxWidth: '1000px',
                        }}
                    >
                        {title.slice(0, 45)}{title.length > 45 ? '...' : ''}
                    </div>

                    {/* 서브 타이틀 (티저) */}
                    <div
                        style={{
                            display: 'flex',
                            fontSize: 40,
                            fontWeight: 700,
                            background: 'linear-gradient(to right, #60a5fa, #a78bfa)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            color: 'transparent',
                            marginBottom: 60,
                        }}
                    >
                        {subtitle}
                    </div>

                    {/* 하단 브랜드 로고 영역 */}
                    <div
                        style={{
                            display: 'flex',
                            width: '100%',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderTop: '2px solid rgba(255,255,255,0.1)',
                            paddingTop: '40px',
                            marginTop: 'auto',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div
                                style={{
                                    width: '56px',
                                    height: '56px',
                                    borderRadius: '16px',
                                    background: 'linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: 32,
                                    fontWeight: 'bold',
                                }}
                            >
                                S
                            </div>
                            <div style={{ display: 'flex', fontSize: 38, fontWeight: 800, color: '#f8fafc' }}>
                                StockTrend AI
                            </div>
                        </div>
                        
                        <div style={{ display: 'flex', fontSize: 32, fontWeight: 600, color: '#64748b' }}>
                            stock-trend-program.co.kr
                        </div>
                    </div>

                    {/* 배경 그라데이션 장식 */}
                    <div style={{ position: 'absolute', top: -100, right: -100, width: 500, height: 500, background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)', borderRadius: '50%', zIndex: -1 }}></div>
                </div>
            ),
            options
        );
    } catch (e: any) {
        console.error('OG Image Generation Error:', e);
        return new Response(`Failed to generate OG image`, { status: 500 });
    }
}
