export const metadata = {
  title: '이용약관 | AI 주식 분석 플랫폼',
  description: 'AI 주식 분석 플랫폼의 이용약관입니다.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-black text-white mb-2">이용약관</h1>
        <p className="text-gray-500 text-sm mb-12">최종 업데이트: 2025년 1월 1일</p>

        <div className="space-y-10 text-gray-300 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-white mb-3">제1조 (목적)</h2>
            <p>
              본 약관은 AI 주식 분석 플랫폼(이하 &quot;서비스&quot;)이 제공하는 모든 서비스의
              이용 조건 및 절차, 이용자와 서비스 간의 권리, 의무 및 책임 사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">제2조 (서비스 내용)</h2>
            <p>본 서비스는 다음과 같은 기능을 제공합니다:</p>
            <ul className="list-disc ml-6 mt-3 space-y-1 text-gray-400">
              <li>AI 기반 주식 종목 분석 및 점수화</li>
              <li>실시간 국내외 주가 데이터 조회</li>
              <li>재무제표 및 기업 정보 제공</li>
              <li>관심 종목 등록 및 관리</li>
              <li>주가 알림 서비스</li>
              <li>커뮤니티 기반 투자 토론</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">제3조 (면책 조항)</h2>
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
              <p className="text-red-300 font-bold mb-2">⚠️ 투자 책임 면책 안내</p>
              <ul className="space-y-2 text-gray-300">
                <li>• 본 서비스에서 제공하는 모든 정보는 <strong>투자 참고용</strong>이며, 투자 권유가 아닙니다.</li>
                <li>• AI 분석 점수 및 예측은 정확성을 보장하지 않습니다.</li>
                <li>• 주식 투자는 원금 손실의 위험이 있으며, 투자의 최종 판단과 책임은 <strong>투자자 본인</strong>에게 있습니다.</li>
                <li>• 서비스는 이용자의 투자 손실에 대하여 어떠한 법적 책임도 지지 않습니다.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">제4조 (이용자의 의무)</h2>
            <p>이용자는 다음 행위를 하여서는 안 됩니다:</p>
            <ul className="list-disc ml-6 mt-3 space-y-1 text-gray-400">
              <li>타인의 개인정보를 무단으로 수집, 저장, 공개하는 행위</li>
              <li>서비스의 정상적인 운영을 방해하는 행위</li>
              <li>허위 정보를 작성하거나 타인을 기만하는 행위</li>
              <li>저작권 등 지적재산권을 침해하는 행위</li>
              <li>기타 관련 법령에 위반되는 행위</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">제5조 (서비스 중단)</h2>
            <p>
              서비스는 시스템 점검, 설비 보수, 천재지변, 기술적 문제 등 불가피한 사유로
              서비스를 일시 중단할 수 있습니다. 이 경우 사전 공지를 원칙으로 하나,
              긴급한 경우 사후 공지할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">제6조 (광고 및 제3자 서비스)</h2>
            <p>
              본 서비스는 Google AdSense를 통한 광고를 게재할 수 있습니다.
              광고 클릭 등으로 인해 발생하는 제3자 사이트와의 거래에 대해서는
              서비스가 책임지지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">제7조 (저작권)</h2>
            <p>
              서비스가 제공하는 콘텐츠(텍스트, 이미지, AI 분석 결과 등)의 저작권은
              서비스 또는 원저작자에게 있습니다. 무단 복제 및 배포를 금지합니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">제8조 (약관 변경)</h2>
            <p>
              서비스는 관련 법령 또는 서비스 운영 방침에 따라 본 약관을 수정할 수 있으며,
              변경된 약관은 서비스 내 공지를 통해 효력이 발생합니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">제9조 (준거법 및 관할)</h2>
            <p>
              본 약관은 대한민국 법률에 따라 해석되며, 서비스와 이용자 간 분쟁 발생 시
              서울중앙지방법원을 제1심 관할 법원으로 합니다.
            </p>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-white/10 text-center text-gray-600 text-sm">
          <p>© 2025 AI 주식 분석 플랫폼. All rights reserved.</p>
          <div className="flex justify-center gap-6 mt-3">
            <a href="/privacy-policy" className="hover:text-gray-400 transition-colors">개인정보처리방침</a>
            <a href="/" className="hover:text-gray-400 transition-colors">홈으로</a>
          </div>
        </div>
      </div>
    </div>
  );
}
