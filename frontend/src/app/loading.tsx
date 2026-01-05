
import { Loader2 } from "lucide-react";

export default function Loading() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-transparent">
            <div className="relative">
                {/* Outer Glow */}
                <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 animate-pulse rounded-full" />

                {/* Spinner */}
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin relative z-10" />
            </div>
            <p className="mt-4 text-gray-400 font-medium text-sm animate-pulse">
                Loading System...
            </p>
        </div>
    );
}
