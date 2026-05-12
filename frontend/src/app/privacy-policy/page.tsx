export const metadata = {
  title: '개인정보처리방침 | AI 주식 분석 플랫폼',
  description: 'AI 주식 분석 플랫폼의 개인정보처리방침입니다.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-black text-white mb-2">개인정보처리방침</h1>
        <p className="text-gray-500 text-sm mb-12">최종 업데이트: 2025년 1월 1일</p>

        <div className="space-y-10 text-gray-300 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. 개인정보 수집 및 이용 목적</h2>
            <p>
              본 서비스(이하 &quot;서비스&quot;)는 AI 기반 주식 분석 정보를 제공하는 플랫폼입니다.
              서비스 이용 과정에서 아래와 같은 최소한의 개인정보를 수집·이용합니다.
            </p>
            <ul className="list-disc ml-6 mt-3 space-y-1 text-gray-400">
              <li>회원 가입 및 관리 (이메일, 닉네임)</li>
              <li>관심 종목 및 포트폴리오 저장</li>
              <li>서비스 품질 개선 및 통계 분석</li>
              <li>가격 알림 등 사용자 맞춤 기능 제공</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. 수집하는 개인정보 항목</h2>
            <div className="bg-white/5 rounded-xl p-5 border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-white/10">
                    <th className="text-left pb-2">구분</th>
                    <th className="text-left pb-2">항목</th>
                    <th className="text-left pb-2">목적</th>
                  </tr>
                </thead>
                <tbody className="space-y-2">
                  <tr className="border-b border-white/5">
                    <td className="py-2 text-gray-300">필수</td>
                    <td className="py-2 text-gray-300">이메일, Google UID</td>
                    <td className="py-2 text-gray-400">본인 확인, 로그인</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 text-gray-300">선택</td>
                    <td className="py-2 text-gray-300">관심 종목, 알림 설정</td>
                    <td className="py-2 text-gray-400">개인화 서비스</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-300">자동 수집</td>
                    <td className="py-2 text-gray-300">접속 IP, 브라우저 정보, 쿠키</td>
                    <td className="py-2 text-gray-400">서비스 품질 개선</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. 개인정보 보유 및 이용 기간</h2>
            <p>
              회원 탈퇴 시 즉시 파기하는 것을 원칙으로 하며, 관련 법령에 의한 보존 의무가 있는
              경우 해당 기간 동안 보관 후 파기합니다.
            </p>
            <ul className="list-disc ml-6 mt-3 space-y-1 text-gray-400">
              <li>전자상거래 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
              <li>로그인 기록: 3개월 (통신비밀보호법)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. 제3자 서비스 이용 안내</h2>
            <p>본 서비스는 다음 제3자 서비스를 활용합니다:</p>
            <ul className="list-disc ml-6 mt-3 space-y-1 text-gray-400">
              <li><strong className="text-gray-300">Google Analytics</strong>: 서비스 이용 통계 분석</li>
              <li><strong className="text-gray-300">Google AdSense</strong>: 광고 게재 (광고 맞춤 설정을 위한 쿠키 사용)</li>
              <li><strong className="text-gray-300">Firebase / Google Auth</strong>: 사용자 인증</li>
            </ul>
            <p className="mt-3 text-gray-400">
              Google의 개인정보처리 방식에 대한 자세한 내용은{' '}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer"
                className="text-blue-400 hover:underline">
                Google 개인정보처리방침
              </a>을 참고하세요.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. 쿠키(Cookie) 사용 안내</h2>
            <p>
              본 서비스는 사용자 경험 향상 및 광고 서비스 제공을 위해 쿠키를 사용합니다.
              브라우저 설정에서 쿠키 저장을 거부할 수 있으나, 일부 서비스 이용이 제한될 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. 투자 정보 면책 조항</h2>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5">
              <p className="text-yellow-300 font-bold mb-2">⚠️ 중요 안내</p>
              <p className="text-gray-300">
                본 서비스에서 제공하는 모든 주식 분석, AI 점수, 투자 정보는
                <strong> 투자 참고용 정보</strong>이며, 투자 권유 또는 투자 자문이 아닙니다.
                투자의 최종 판단과 책임은 투자자 본인에게 있으며, 투자 손실에 대해 서비스는
                어떠한 책임도 지지 않습니다.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. 개인정보 보호책임자</h2>
            <div className="bg-white/5 rounded-xl p-5 border border-white/10">
              <p className="text-gray-300">개인정보 관련 문의사항은 아래로 연락해 주세요.</p>
              <p className="mt-2 text-gray-400">이메일: support@ai-stock-analyst.com</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. 개인정보처리방침 변경 안내</h2>
            <p>
              본 개인정보처리방침은 법령 또는 서비스 변경사항을 반영하기 위해 수정될 수 있으며,
              변경 시 서비스 공지사항을 통해 안내드립니다.
            </p>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-white/10 text-center text-gray-600 text-sm">
          <p>© 2025 AI 주식 분석 플랫폼. All rights reserved.</p>
          <div className="flex justify-center gap-6 mt-3">
            <a href="/terms" className="hover:text-gray-400 transition-colors">이용약관</a>
            <a href="/" className="hover:text-gray-400 transition-colors">홈으로</a>
          </div>
        </div>
      </div>
    </div>
  );
}
