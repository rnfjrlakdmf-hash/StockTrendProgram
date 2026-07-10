import sys

file_path = r'c:\Users\rnfjr\StockTrendProgram\frontend\src\app\admin\page.tsx'
with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

new_content = "".join(lines[:539]) + """                {/* Section Header for Admin Tools */}
                <div className="pt-12 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-white flex items-center gap-3">
                            <Settings className="w-6 h-6 text-indigo-500" />
                            관리자 운영 도구
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">자동화 로봇 제어, 수익 확인 및 시스템 모니터링</p>
                    </div>
                </div>

                {/* 3x2 Grid for Standard Tools */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Premium Management */}
                    <div className="p-8 rounded-[2rem] bg-gradient-to-br from-blue-600/10 to-transparent border border-blue-500/10 flex flex-col h-full group hover:border-blue-500/30 transition-all">
                        <div className="flex-grow">
                            <UserCheck className="w-10 h-10 text-blue-500 mb-6 group-hover:scale-110 transition-transform" />
                            <h3 className="text-xl font-bold text-white mb-2">프리미엄 권한 부여</h3>
                            <p className="text-sm text-gray-400 leading-relaxed mb-6">사용자들에게 Pro 등급을 제공합니다. 위 회원 리스트에서 토글을 클릭하면 즉시 동기화됩니다.</p>
                        </div>
                        <div className="pt-4 border-t border-blue-500/10 mt-auto">
                            <button
                                onClick={() => window.scrollTo({top: 500, behavior: 'smooth'})}
                                className="flex items-center justify-center w-full bg-white/5 hover:bg-white/10 text-gray-300 font-bold py-3.5 px-6 rounded-2xl transition-all text-sm"
                            >
                                👆 위 회원 리스트에서 설정
                            </button>
                        </div>
                    </div>

                    {/* SNS Marketing Bot */}
                    <div className="p-8 rounded-[2rem] bg-gradient-to-br from-orange-600/10 to-transparent border border-orange-500/10 flex flex-col h-full group hover:border-orange-500/30 transition-all">
                        <div className="flex-grow">
                            <Megaphone className="w-10 h-10 text-orange-500 mb-6 group-hover:scale-110 transition-transform" />
                            <h3 className="text-xl font-bold text-white mb-2">SNS 마케팅 봇</h3>
                            <p className="text-sm text-gray-400 leading-relaxed mb-6">원클릭으로 블로그, 커뮤니티, 쇼츠용 홍보 문구를 자동 생성합니다.</p>
                        </div>
                        <div className="pt-4 border-t border-orange-500/10 mt-auto">
                            <button
                                onClick={() => router.push('/admin/marketing')}
                                className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-lg text-sm"
                            >
                                <Megaphone className="w-4 h-4" />
                                마케팅 봇 실행하기
                            </button>
                        </div>
                    </div>

                    {/* Daily Analytics Report Card */}
                    <div className="p-8 rounded-[2rem] bg-gradient-to-br from-indigo-600/10 to-transparent border border-indigo-500/10 flex flex-col h-full group hover:border-indigo-500/30 transition-all">
                        <div className="flex-grow">
                            <Activity className="w-10 h-10 text-indigo-400 mb-6 group-hover:scale-110 transition-transform" />
                            <h3 className="text-xl font-bold text-white mb-2">운영 보고서 (일일 발송)</h3>
                            <p className="text-sm text-gray-400 leading-relaxed mb-6">매일 밤 23시 59분에 방문자수 및 PV 등을 요약하여 알림으로 자동 발송합니다.</p>
                            <div className="flex items-center gap-2 text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg mb-6 w-fit">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                스케줄러 정상 작동 중
                            </div>
                        </div>
                        <div className="pt-4 border-t border-indigo-500/10 mt-auto">
                            <button
                                onClick={handleTestDailyReport}
                                disabled={reportSending}
                                className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-lg text-sm disabled:opacity-50"
                            >
                                {reportSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                {reportSending ? "발송 중..." : "수동 발송 테스트"}
                            </button>
                        </div>
                    </div>

                    {/* Google AdSense */}
                    <div className="p-8 rounded-[2rem] bg-gradient-to-br from-green-600/10 to-transparent border border-green-500/10 flex flex-col h-full group hover:border-green-500/30 transition-all">
                        <div className="flex-grow">
                            <DollarSign className="w-10 h-10 text-green-500 mb-6 group-hover:scale-110 transition-transform" />
                            <h3 className="text-xl font-bold text-white mb-2">구글 애드센스</h3>
                            <p className="text-sm text-gray-400 leading-relaxed mb-6">달러 수익과 클릭률(CTR), 트래픽 지표를 구글 대시보드에서 실시간 확인합니다.</p>
                        </div>
                        <div className="pt-4 border-t border-green-500/10 mt-auto">
                            <button
                                onClick={() => window.open('https://www.google.com/adsense/', '_blank')}
                                className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-lg text-sm"
                            >
                                <ExternalLink className="w-4 h-4" />
                                수익 확인하기
                            </button>
                        </div>
                    </div>

                    {/* Kakao AdFit */}
                    <div className="p-8 rounded-[2rem] bg-gradient-to-br from-yellow-500/10 to-transparent border border-yellow-500/10 flex flex-col h-full group hover:border-yellow-500/30 transition-all">
                        <div className="flex-grow">
                            <DollarSign className="w-10 h-10 text-yellow-500 mb-6 group-hover:scale-110 transition-transform" />
                            <h3 className="text-xl font-bold text-white mb-2">카카오 애드핏</h3>
                            <p className="text-sm text-gray-400 leading-relaxed mb-6">카카오 광고 수익과 노출수 지표를 애드핏 대시보드에서 실시간 확인합니다.</p>
                        </div>
                        <div className="pt-4 border-t border-yellow-500/10 mt-auto">
                            <button
                                onClick={() => window.open('https://adfit.kakao.com/', '_blank')}
                                className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-lg text-sm"
                            >
                                <ExternalLink className="w-4 h-4" />
                                수익 확인하기
                            </button>
                        </div>
                    </div>

                    {/* System Logs */}
                    <div className="p-8 rounded-[2rem] bg-gradient-to-br from-fuchsia-600/10 to-transparent border border-fuchsia-500/10 flex flex-col h-full group hover:border-fuchsia-500/30 transition-all">
                        <div className="flex-grow">
                            <Activity className="w-10 h-10 text-fuchsia-500 mb-6 group-hover:scale-110 transition-transform" />
                            <h3 className="text-xl font-bold text-white mb-2">시스템 로그 열람</h3>
                            <p className="text-sm text-gray-400 leading-relaxed mb-6">발송 성공/실패 여부, 토큰 만료 등 백그라운드 발생 로그를 엑셀 표로 확인합니다.</p>
                        </div>
                        <div className="pt-4 border-t border-fuchsia-500/10 mt-auto">
                            <button
                                onClick={() => router.push('/admin/logs')}
                                className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-lg text-sm"
                            >
                                <Eye className="w-4 h-4" />
                                로그 대시보드 입장
                            </button>
                        </div>
                    </div>
                </div>

                {/* Emergency Master Control Room */}
                <div className="mt-6 p-8 rounded-[2rem] bg-gradient-to-br from-red-600/10 via-black/40 to-black/80 border border-red-500/20 backdrop-blur-3xl shadow-[0_0_50px_rgba(239,68,68,0.1)] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-red-500/20 transition-all"></div>
                    
                    <div className="flex flex-col md:flex-row gap-8 items-center relative z-10">
                        {/* Left Info */}
                        <div className="md:w-1/3 w-full">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="relative flex h-4 w-4">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                                </span>
                                <h3 className="text-2xl font-black text-white">긴급 제어 시스템</h3>
                            </div>
                            <p className="text-sm text-gray-400 leading-relaxed">
                                백엔드 서버에 장애가 발생하거나 로봇이 멈췄을 때 원격으로 복구할 수 있는 최상위 권한 컨트롤 패널입니다.
                            </p>
                        </div>
                        
                        {/* Right Controls */}
                        <div className="md:w-2/3 w-full grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Auto Heal */}
                            <div className="bg-black/60 border border-red-500/20 p-5 rounded-2xl flex flex-col justify-between h-full">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2 text-white font-bold">
                                        <RefreshCw className={`w-4 h-4 ${autoHealEnabled ? 'text-green-400 animate-spin-slow' : 'text-gray-500'}`} />
                                        자가 치유 로봇
                                    </div>
                                    <button 
                                        onClick={handleToggleAutoHeal}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoHealEnabled ? 'bg-green-500' : 'bg-gray-600'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoHealEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                                <p className="text-[11px] text-gray-500 leading-tight">자동 복구 스케줄러를 활성화하여 서버 다운 시 자동 재시작합니다.</p>
                            </div>
                            
                            {/* Ping Test */}
                            <button
                                onClick={handlePingTest}
                                disabled={pingSending}
                                className="bg-gradient-to-b from-blue-600/20 to-blue-900/40 hover:from-blue-500/30 border border-blue-500/30 p-5 rounded-2xl flex flex-col justify-between h-full text-left transition-all active:scale-95 disabled:opacity-50"
                            >
                                <div className="flex items-center gap-2 text-blue-400 font-bold mb-4">
                                    {pingSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                    알림 핑(Ping) 전송
                                </div>
                                <p className="text-[11px] text-gray-400 leading-tight text-white/70">스마트폰으로 테스트 알림을 발송하여 푸시 서버 상태를 점검합니다.</p>
                            </button>
                            
                            {/* Reboot */}
                            <button
                                onClick={handleRebootServer}
                                className="bg-gradient-to-b from-red-600/20 to-red-900/40 hover:from-red-500/30 border border-red-500/30 p-5 rounded-2xl flex flex-col justify-between h-full text-left transition-all active:scale-95"
                            >
                                <div className="flex items-center gap-2 text-red-400 font-bold mb-4">
                                    <Power className="w-4 h-4" />
                                    서버 강제 재부팅
                                </div>
                                <p className="text-[11px] text-gray-400 leading-tight text-white/70">경고: 서버 인스턴스를 강제 재시작합니다. 5초간 서비스가 중단됩니다.</p>
                            </button>
                        </div>
                    </div>
                </div>
""" + "".join(lines[710:])
with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)
print("SUCCESS")
