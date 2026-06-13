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
    
    // 파라미터 파싱 (종목명, 테마명, 서브타이틀 등)
    const title = searchParams.get('title') || '스톡 트렌드 프로그램';
    const subtitle = searchParams.get('subtitle') || '실시간 AI 매수 시그널 포착';
    const theme = searchParams.get('theme') || '오늘의 특징주';
    
    const fontData = await getFont();

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
            backgroundColor: '#0f172a', // slate-900 (다크 모드 배경)
            backgroundImage: 'radial-gradient(circle at 50% 120%, #3b82f6 0%, #0f172a 60%)', // 블루 그라데이션 하이라이트
            fontFamily: '"Pretendard"',
            padding: '40px 80px',
            color: 'white',
          }}
        >
          {/* 상단 라벨 (테마명) */}
          <div
            style={{
              display: 'flex',
              padding: '12px 24px',
              backgroundColor: 'rgba(59, 130, 246, 0.2)', // blue-500 with opacity
              border: '2px solid rgba(59, 130, 246, 0.5)',
              borderRadius: '9999px',
              color: '#60a5fa', // blue-400
              fontSize: '32px',
              fontWeight: 700,
              marginBottom: '40px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            🔥 {theme}
          </div>

          {/* 메인 타이틀 (종목명) */}
          <div
            style={{
              display: 'flex',
              fontSize: '110px',
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
              color: '#cbd5e1', // slate-300
              textAlign: 'center',
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
              📈 Stock Trend Program
            </div>
            <div style={{ display: 'flex', fontSize: '32px', color: '#3b82f6', fontWeight: 700 }}>
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
