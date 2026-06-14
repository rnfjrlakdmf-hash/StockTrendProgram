import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Font fetcher - fetches Pretendard Bold TTF
const getFont = async () => {
  const res = await fetch(
    'https://cdn.jsdelivr.net/gh/orioncactus/pretendard/packages/pretendard/dist/public/static/Pretendard-Bold.ttf'
  );
  return res.arrayBuffer();
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // 파라미터 파싱
    const title = searchParams.get('title') || '스톡 트렌드 프로그램';
    const subtitle = searchParams.get('subtitle') || '실시간 AI 매수 시그널 포착';
    const theme = searchParams.get('theme') || '오늘의 특징주';
    const change = searchParams.get('change'); // e.g. "+25.4%"
    
    const fontData = await getFont();

    // 상승/하락에 따른 색상 변경
    const isUp = change && change.startsWith('+');
    const isDown = change && change.startsWith('-');
    
    let highlightColor = '#3b82f6'; // 기본 파란색
    let bgColor = '#0f172a';
    if (isUp) {
      highlightColor = '#ef4444'; // 빨간색 (상승)
      bgColor = '#1e1b4b'; // 딥 퍼플/블랙
    } else if (isDown) {
      highlightColor = '#3b82f6'; // 파란색 (하락)
      bgColor = '#0f172a';
    }

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
            backgroundColor: bgColor,
            backgroundImage: `radial-gradient(circle at 50% 120%, ${highlightColor} 0%, ${bgColor} 60%)`,
            fontFamily: '"Pretendard"',
            padding: '40px 80px',
            color: 'white',
          }}
        >
          {/* 상단 라벨 (테마명) */}
          <div
            style={{
              display: 'flex',
              padding: '12px 32px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: `2px solid ${highlightColor}`,
              borderRadius: '9999px',
              color: isUp ? '#fca5a5' : '#93c5fd',
              fontSize: '32px',
              fontWeight: 700,
              marginBottom: change ? '20px' : '40px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            🔥 {theme}
          </div>

          {/* 등락률 (change 파라미터가 있을 때만 표시) */}
          {change && (
            <div
              style={{
                display: 'flex',
                fontSize: '130px',
                fontWeight: 800,
                color: isUp ? '#f87171' : '#60a5fa',
                textShadow: `0 0 40px ${isUp ? 'rgba(248,113,113,0.5)' : 'rgba(96,165,250,0.5)'}`,
                marginBottom: '10px',
                lineHeight: 1,
              }}
            >
              {change}
            </div>
          )}

          {/* 메인 타이틀 (종목명) */}
          <div
            style={{
              display: 'flex',
              fontSize: change ? '90px' : '110px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              textAlign: 'center',
              marginBottom: '30px',
              color: '#ffffff',
              textShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}
          >
            [{title}]
          </div>

          {/* 서브 타이틀 (시그널 요약) */}
          <div
            style={{
              display: 'flex',
              fontSize: '48px',
              fontWeight: 700,
              color: '#e2e8f0',
              textAlign: 'center',
              backgroundColor: 'rgba(0,0,0,0.4)',
              padding: '10px 30px',
              borderRadius: '20px',
            }}
          >
            {subtitle}
          </div>

          {/* 하단 사이트명 및 장식 */}
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              bottom: '40px',
              width: '100%',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0 80px',
            }}
          >
            <div style={{ display: 'flex', fontSize: '32px', color: '#94a3b8', fontWeight: 700 }}>
              📈 AI Stock Analyst
            </div>
            <div style={{ display: 'flex', fontSize: '32px', color: highlightColor, fontWeight: 700 }}>
              지금 확인하기 →
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: 'Pretendard',
            data: fontData,
            style: 'normal',
            weight: 700,
          },
        ],
      }
    );
  } catch (e: any) {
    console.error(`[OG Image Error]: ${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
