"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class SafeErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="fixed bottom-6 right-6 z-[9999] animate-bounce">
                    <div className="bg-red-500/90 backdrop-blur-md border border-red-400 text-white p-4 rounded-2xl shadow-2xl flex flex-col gap-2 max-w-xs">
                        <div className="flex items-center gap-2 font-bold text-sm">
                            <AlertTriangle className="w-5 h-5 text-yellow-300" />
                            <span>위젯 오류 발생</span>
                        </div>
                        <p className="text-[10px] bg-black/20 p-2 rounded break-all font-mono">
                            {this.state.error?.message || "Unknown Error"}
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default SafeErrorBoundary;
