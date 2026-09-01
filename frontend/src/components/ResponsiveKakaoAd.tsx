"use client";

import React from "react";

interface ResponsiveKakaoAdProps {
  mobileAdUnit: string;
  mobileAdWidth?: string;
  mobileAdHeight?: string;
  pcAdUnit: string;
  pcAdWidth?: string;
  pcAdHeight?: string;
  className?: string;
}

export default function ResponsiveKakaoAd(props: ResponsiveKakaoAdProps) {
  // [Google AdSense Approval Clean Review Mode]
  const isReviewMode = true;
  if (isReviewMode) {
    return null;
  }

  return null;
}
