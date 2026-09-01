"use client";

import React from "react";

interface KakaoAdFitProps {
  adUnit: string;
  adWidth: string | number;
  adHeight: string | number;
  className?: string;
}

export default function KakaoAdFit({ adUnit, adWidth, adHeight, className = "" }: KakaoAdFitProps) {
  // [Google AdSense Approval Clean Review Mode]
  const isReviewMode = true;
  if (isReviewMode) {
    return null;
  }

  return null;
}
