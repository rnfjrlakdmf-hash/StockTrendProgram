"use client";

import Script from "next/script";

export default function KakaoScript() {
  const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_APP_KEY; // "a1b2c3d4..." 등 카카오 JS 앱 키

  const handleLoad = () => {
    // window.Kakao 객체가 존재하고, 아직 초기화되지 않았다면 초기화
    if (window.Kakao && !window.Kakao.isInitialized() && KAKAO_KEY) {
      window.Kakao.init(KAKAO_KEY);
      console.log("Kakao SDK Initialized.");
    }
  };

  return (
    <Script
      src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.1/kakao.min.js"
      integrity="sha384-kDljxUXHaJ9xAb2bOigrtzFEK32g//t9S8XgV/S4ZqB17wQ+kF3FjX8D90g5EezB"
      crossOrigin="anonymous"
      strategy="lazyOnload"
      onLoad={handleLoad}
    />
  );
}
