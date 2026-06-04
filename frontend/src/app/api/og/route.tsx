import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        
        // ?symbol=TSLA
        const symbol = searchParams.get('symbol') || '기업';
        
        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#0f172a', // Tailwind slate-900
                        backgroundImage: 'radial-gradient(circle at 25px 25px, rgba(255, 255, 255, 0.05) 2%, transparent 0%), radial-gradient(circle at 75px 75px, rgba(255, 255, 255, 0.05) 2%, transparent 0%)',
                        backgroundSize: '100px 100px',
                        fontFamily: 'sans-serif',
                        padding: '40px',
                    }}
                >
                    {/* Header Badge */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(6, 182, 212, 0.1)', // cyan-500/10
                            border: '1px solid rgba(6, 182, 212, 0.5)',
                            padding: '10px 30px',
                            borderRadius: '50px',
                            marginBottom: '40px',
                        }}
                    >
                        <span style={{ fontSize: 24, color: '#22d3ee', fontWeight: 'bold', letterSpacing: '2px' }}>
                            GLOBAL VALUE CHAIN AI RADAR
                        </span>
                    </div>

                    {/* Main Title */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                        }}
                    >
                        <h1
                            style={{
                                fontSize: 90,
                                fontWeight: 900,
                                color: 'white',
                                marginBottom: 20,
                                lineHeight: 1.1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '20px'
                            }}
                        >
                            <span style={{ color: '#ef4444' }}>🚨</span> {symbol}
                        </h1>
                        <h2
                            style={{
                                fontSize: 60,
                                fontWeight: 800,
                                marginTop: 0,
                                background: 'linear-gradient(to right, #06b6d4, #3b82f6)',
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                color: 'transparent',
                            }}
                        >
                            공급망 완벽 해부
                        </h2>
                    </div>

                    {/* Sub Title / Teaser */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: '50px',
                            fontSize: 32,
                            fontWeight: 'bold',
                            color: '#94a3b8', // slate-400
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            padding: '20px 40px',
                            borderRadius: '20px',
                            border: '1px dashed rgba(255,255,255,0.2)'
                        }}
                    >
                        숨겨진 수혜주 3가지와 핵심 경쟁사를 지금 확인하세요 👀
                    </div>
                    
                    {/* Floating Orbs (Visuals) */}
                    <div style={{ position: 'absolute', top: -50, left: -50, width: 300, height: 300, background: 'radial-gradient(circle, rgba(6,182,212,0.2) 0%, transparent 70%)', borderRadius: '50%' }}></div>
                    <div style={{ position: 'absolute', bottom: -50, right: -50, width: 400, height: 400, background: 'radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 70%)', borderRadius: '50%' }}></div>
                </div>
            ),
            {
                width: 1200,
                height: 630,
            }
        );
    } catch (e: any) {
        return new Response(`Failed to generate OG image`, { status: 500 });
    }
}
