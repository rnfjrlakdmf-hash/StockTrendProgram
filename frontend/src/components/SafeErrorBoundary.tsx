"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
}

class SafeErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
    };

    public static getDerivedStateFromError(_: Error): State {
        return { hasError: true };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="fixed bottom-6 right-6 z-[9999] animate-bounce">
                    <div className="bg-red-500/10 backdrop-blur-md border border-red-500 text-red-500 p-3 rounded-full shadow-2xl flex items-center gap-2" title="알림 위젯 오류">
                        <AlertTriangle className="w-6 h-6" />
                        <span className="text-xs font-bold">Error</span>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default SafeErrorBoundary;
