import os

def patch():
    file_path = os.path.abspath("../frontend/src/app/settings/page.tsx")
    if not os.path.exists(file_path):
        file_path = os.path.abspath("frontend/src/app/settings/page.tsx")
        
    print(f"Target file: {file_path}")
    
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. 버전명 변경
    content = content.replace("Sector Trend v2.9.0", "Sector Trend v2.9.4")
    content = content.replace("Sector Trend v2.9.2", "Sector Trend v2.9.4")

    # 2. 토스증권 치환
    toss_old = """                                    {
                                        name: "토스증권",
                                        color: "from-blue-500 to-blue-700",
                                        shadow: "shadow-blue-900/40",
                                        deepLink: "supertoss://invest",
                                        iosStore: "https://apps.apple.com/kr/app/id839333328",
                                        androidStore: "https://play.google.com/store/apps/details?id=viva.republica.toss",
                                        htsUrl: "https://tossinvest.com",
                                        webUrl: "https://tossinvest.com",
                                        label: "웹 트레이딩"
                                    },"""
    toss_new = """                                    {
                                        name: "토스증권",
                                        color: "from-blue-500 to-blue-700",
                                        shadow: "shadow-blue-900/40",
                                        deepLink: "supertoss://invest",
                                        packageName: "viva.republica.toss",
                                        iosStore: "https://apps.apple.com/kr/app/id839333328",
                                        androidStore: "https://play.google.com/store/apps/details?id=viva.republica.toss",
                                        htsUrl: "https://tossinvest.com",
                                        webUrl: "https://tossinvest.com",
                                        label: "웹 트레이딩"
                                    },"""

    # 3. KB증권 치환
    kb_old = """                                    {
                                        name: "KB증권",
                                        color: "from-yellow-500 to-yellow-700",
                                        shadow: "shadow-yellow-900/40",
                                        deepLink: "kb-mable://",
                                        iosStore: "https://apps.apple.com/kr/app/id1372899048",
                                        androidStore: "https://play.google.com/store/apps/details?id=com.kbsec.m_able",
                                        htsUrl: "https://m-able.kbsec.com/Mtradesub.do?cmd=TF01SP00100MU1",
                                        webUrl: "https://m-able.kbsec.com",
                                        label: "M-able"
                                    },"""
    kb_new = """                                    {
                                        name: "KB증권",
                                        color: "from-yellow-500 to-yellow-700",
                                        shadow: "shadow-yellow-900/40",
                                        deepLink: "kb-mable://",
                                        packageName: "com.kb.securities.mobile.mable",
                                        iosStore: "https://apps.apple.com/kr/app/id1372899048",
                                        androidStore: "https://play.google.com/store/apps/details?id=com.kb.securities.mobile.mable",
                                        htsUrl: "https://m-able.kbsec.com/Mtradesub.do?cmd=TF01SP00100MU1",
                                        webUrl: "https://m-able.kbsec.com",
                                        label: "M-able"
                                    },"""

    # 4. 미래에셋 치환
    mirae_old = """                                    {
                                        name: "미래에셋",
                                        color: "from-orange-500 to-red-600",
                                        shadow: "shadow-orange-900/40",
                                        deepLink: "miraeasset-mstock://",
                                        iosStore: "https://apps.apple.com/kr/app/id489213167",
                                        androidStore: "https://play.google.com/store/apps/details?id=com.miraeasset.stock",
                                        htsUrl: "https://securities.miraeasset.com/hts/index.do",
                                        webUrl: "https://securities.miraeasset.com",
                                        label: "M-Stock"
                                    },"""
    mirae_new = """                                    {
                                        name: "미래에셋",
                                        color: "from-orange-500 to-red-600",
                                        shadow: "shadow-orange-900/40",
                                        deepLink: "miraeasset-mstock://",
                                        packageName: "com.miraeasset.trade",
                                        iosStore: "https://apps.apple.com/kr/app/id489213167",
                                        androidStore: "https://play.google.com/store/apps/details?id=com.miraeasset.trade",
                                        htsUrl: "https://securities.miraeasset.com/hts/index.do",
                                        webUrl: "https://securities.miraeasset.com",
                                        label: "M-Stock"
                                    },"""

    # 5. 나무증권 치환
    namuh_old = """                                    {
                                        name: "나무증권",
                                        color: "from-[#C4E82F] to-[#A0C714]",
                                        textColor: "text-[#0A1A05]",
                                        shadow: "shadow-[#A0C714]/40",
                                        deepLink: "namuh://",
                                        iosStore: "https://apps.apple.com/kr/app/id1228853333",
                                        androidStore: "https://play.google.com/store/apps/details?id=com.nhqv.namuh",
                                        htsUrl: "https://www.mynamuh.com",
                                        webUrl: "https://www.mynamuh.com",
                                        label: "나무"
                                    },"""
    namuh_new = """                                    {
                                        name: "나무증권",
                                        color: "from-[#C4E82F] to-[#A0C714]",
                                        textColor: "text-[#0A1A05]",
                                        shadow: "shadow-[#A0C714]/40",
                                        deepLink: "namuh://",
                                        packageName: "com.nhqv.namuh",
                                        iosStore: "https://apps.apple.com/kr/app/id1228853333",
                                        androidStore: "https://play.google.com/store/apps/details?id=com.nhqv.namuh",
                                        htsUrl: "https://www.mynamuh.com",
                                        webUrl: "https://www.mynamuh.com",
                                        label: "나무"
                                    },"""

    # 6. 삼성증권 치환
    samsung_old = """                                    {
                                        name: "삼성증권",
                                        color: "from-indigo-500 to-indigo-700",
                                        shadow: "shadow-indigo-900/40",
                                        deepLink: "samsungpop://",
                                        iosStore: "https://apps.apple.com/kr/app/id441266665",
                                        androidStore: "https://play.google.com/store/apps/details?id=com.samsungpop.android",
                                        htsUrl: "https://www.samsungpop.com/trading/hts.do",
                                        webUrl: "https://www.samsungpop.com",
                                        label: "POP"
                                    },"""
    samsung_new = """                                    {
                                        name: "삼성증권",
                                        color: "from-indigo-500 to-indigo-700",
                                        shadow: "shadow-indigo-900/40",
                                        deepLink: "samsungpop://",
                                        packageName: "com.samsungpop.android.mpop",
                                        iosStore: "https://apps.apple.com/kr/app/id441266665",
                                        androidStore: "https://play.google.com/store/apps/details?id=com.samsungpop.android.mpop",
                                        htsUrl: "https://www.samsungpop.com/trading/hts.do",
                                        webUrl: "https://www.samsungpop.com",
                                        label: "POP"
                                    },"""

    # 7. 카카오페이증권 치환
    kakao_old = """                                    {
                                        name: "카카오페이증권",
                                        color: "from-amber-400 to-orange-500",
                                        shadow: "shadow-amber-900/40",
                                        deepLink: "kakaopay://",
                                        iosStore: "https://apps.apple.com/kr/app/id1514643599",
                                        androidStore: "https://play.google.com/store/apps/details?id=com.kakaopaycorp.securities",
                                        htsUrl: "https://securities.kakaopay.com",
                                        webUrl: "https://securities.kakaopay.com",
                                        label: "카카오페이"
                                    },"""
    kakao_new = """                                    {
                                        name: "카카오페이증권",
                                        color: "from-amber-400 to-orange-500",
                                        shadow: "shadow-amber-900/40",
                                        deepLink: "kakaopay://",
                                        packageName: "com.kakaopay.app",
                                        iosStore: "https://apps.apple.com/kr/app/id1514643599",
                                        androidStore: "https://play.google.com/store/apps/details?id=com.kakaopay.app",
                                        htsUrl: "https://securities.kakaopay.com",
                                        webUrl: "https://securities.kakaopay.com",
                                        label: "카카오페이"
                                    },"""

    # 8. 안드로이드 이동 로직 치환
    logic_old = """                                                if (isAndroid) {
                                                    // 안드로이드 패키지명을 플레이스토어 링크에서 추출하여 표준 인텐트 생성
                                                    const packageName = broker.androidStore.includes('id=') 
                                                        ? broker.androidStore.split('id=')[1] 
                                                        : '';
                                                    if (packageName) {
                                                        // 스키마 불일치로 인한 오작동을 피하기 위해 안드로이드에서는
                                                        // scheme을 기재하지 않고 패키지명만 명시하여 해당 앱을 강제 실행합니다.
                                                        targetDeepLink = `intent://#Intent;package=${packageName};end`;
                                                    }
                                                }"""

    # (주의: 기존 page.tsx의 원본 로직에는 const packageName = ...; 와 targetDeepLink = `intent://#Intent;package=${packageName};end` 가 들어있었습니다.)
    # 실제 원본 page.tsx의 로직:
    # 502:                                                 if (isAndroid) {
    # 503:                                                     // 안드로이드 패키지명을 플레이스토어 링크에서 추출하여 표준 인텐트 생성
    # 504:                                                     const packageName = broker.androidStore.includes('id=') 
    # 505:                                                         ? broker.androidStore.split('id=')[1] 
    # 506:                                                         : '';
    # 507:                                                     if (packageName) {
    # 508:                                                         // 스키마 불일치로 인한 오작동을 피하기 위해 안드로이드에서는
    # 509:                                                         // scheme을 기재하지 않고 패키지명만 명시하여 해당 앱을 강제 실행합니다.
    # 510:                                                         targetDeepLink = `intent://#Intent;package=${packageName};end`;
    # 511:                                                     }
    # 512:                                                 }
    
    logic_old = """                                                if (isAndroid) {
                                                    // 안드로이드 패키지명을 플레이스토어 링크에서 추출하여 표준 인텐트 생성
                                                    const packageName = broker.androidStore.includes('id=') 
                                                        ? broker.androidStore.split('id=')[1] 
                                                        : '';
                                                    if (packageName) {
                                                        // 스키마 불일치로 인한 오작동을 피하기 위해 안드로이드에서는
                                                        // scheme을 기재하지 않고 패키지명만 명시하여 해당 앱을 강제 실행합니다.
                                                        targetDeepLink = `intent://#Intent;package=${packageName};end`;
                                                    }
                                                }"""

    # new_logic에서는 targetDeepLink가 아니라 단일 window.location.href 구문으로 깔끔하게 처리하고,
    # 밑에 있는 window.location.href = targetDeepLink 및 setTimeout(storeUrl) 구문까지 통째로 교체합니다.
    # 따라서 502행부터 527행의 onVisibilityChange 등록 부분 직전까지를 타겟팅합니다.

    # 497행부터 527행까지 통째로 치환하는 덩어리를 만듭니다.
    large_old = """                                            if (isMobile) {
                                                // 모바일(안드로이드/iOS): 딥링크로 앱 실행 시도 후 미설치 시 스토어로 이동 (타임아웃 방식)
                                                const storeUrl = isAndroid ? broker.androidStore : broker.iosStore;
                                                
                                                let targetDeepLink = broker.deepLink;
                                                if (isAndroid) {
                                                    // 안드로이드 패키지명을 플레이스토어 링크에서 추출하여 표준 인텐트 생성
                                                    const packageName = broker.androidStore.includes('id=') 
                                                        ? broker.androidStore.split('id=')[1] 
                                                        : '';
                                                    if (packageName) {
                                                        // 스키마 불일치로 인한 오작동을 피하기 위해 안드로이드에서는
                                                        // scheme을 기재하지 않고 패키지명만 명시하여 해당 앱을 강제 실행합니다.
                                                        targetDeepLink = `intent://#Intent;package=${packageName};end`;
                                                    }
                                                }

                                                window.location.href = targetDeepLink;

                                                const t = setTimeout(() => {
                                                    window.location.href = storeUrl;
                                                }, 2000);

                                                const onVisibilityChange = () => {
                                                    if (document.hidden) {
                                                        clearTimeout(t);
                                                        document.removeEventListener('visibilitychange', onVisibilityChange);
                                                    }
                                                };
                                                document.addEventListener('visibilitychange', onVisibilityChange);"""

    large_new = """                                            if (isMobile) {
                                                if (isAndroid) {
                                                    const packageName = (broker as any).packageName;
                                                    const fallbackUrl = encodeURIComponent(`market://details?id=${packageName}`);
                                                    
                                                    // 안드로이드 크롬/웹뷰 표준 인텐트 구성: 
                                                    // 1. 앱이 있으면 패키지명을 기반으로 메인 액티비티를 실행합니다.
                                                    // 2. 앱이 없으면 S.browser_fallback_url에 지정한 플레이스토어 앱(market://)으로 즉시 리다이렉트합니다.
                                                    // 3. 기존의 인코딩 문제 및 자바스크립트 타이머 간섭을 완전히 제거하여 플레이스토어가 정상 로딩되도록 조치했습니다.
                                                    let intentUrl = "";
                                                    if (broker.name === "토스증권") {
                                                        intentUrl = `intent://invest#Intent;scheme=supertoss;package=${packageName};S.browser_fallback_url=${fallbackUrl};end`;
                                                    } else {
                                                        intentUrl = `intent://open#Intent;package=${packageName};S.browser_fallback_url=${fallbackUrl};end`;
                                                    }
                                                    
                                                    window.location.href = intentUrl;
                                                } else {
                                                    // iOS 처리: 커스텀 딥링크 시도 후 미설치 시 앱스토어 이동 타이머 작동
                                                    const storeUrl = broker.iosStore;
                                                    window.location.href = broker.deepLink;
                                                    
                                                    const start = Date.now();
                                                    const t = setTimeout(() => {
                                                        if (Date.now() - start < 1800 && !document.hidden) {
                                                            window.location.href = storeUrl;
                                                        }
                                                    }, 1200);

                                                    const onVisibilityChange = () => {
                                                        if (document.hidden) {
                                                            clearTimeout(t);
                                                            document.removeEventListener('visibilitychange', onVisibilityChange);
                                                        }
                                                    };
                                                    document.addEventListener('visibilitychange', onVisibilityChange);
                                                }"""

    # CRLF/LF 정규화 치환 실행
    content_norm = content.replace("\r\n", "\n")
    
    pairs = [
        ("Toss", toss_old, toss_new),
        ("KB", kb_old, kb_new),
        ("Mirae", mirae_old, mirae_new),
        ("Namuh", namuh_old, namuh_new),
        ("Samsung", samsung_old, samsung_new),
        ("Kakao", kakao_old, kakao_new),
        ("Logic", large_old, large_new)
    ]
    
    for name, old, new in pairs:
        old_norm = old.replace("\r\n", "\n")
        new_norm = new.replace("\r\n", "\n")
        if old_norm in content_norm:
            content_norm = content_norm.replace(old_norm, new_norm)
            print(f"Success: Replaced {name} block!")
        else:
            print(f"Error: Could not find {name} block in content")
            return

    content = content_norm.replace("\n", "\r\n")
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("3rd patch applied successfully!")

if __name__ == "__main__":
    patch()
