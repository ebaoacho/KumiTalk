"use client";

import { useProgress } from "@/lib/progress";
import { Loader2 } from "lucide-react";

export default function GlobalProgressOverlay() {
  const { isLoading } = useProgress();

  return (
    <div
      aria-live="polite"
      aria-busy={isLoading}
      className={`fixed inset-0 z-[60] flex items-center justify-center transition-opacity duration-200 ${
        isLoading ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
      <div className="relative flex flex-col items-center gap-4 text-slate-100">
        <Loader2
          className="h-10 w-10 animate-spin text-sky-200 drop-shadow-[0_0_14px_rgba(14,165,233,0.45)]"
          aria-hidden="true"
        />
        <div className="text-center text-sm font-medium tracking-wide">
          データを読み込んでいます
        </div>
        <div className="h-1.5 w-64 overflow-hidden rounded-full bg-white/15 shadow-inner shadow-black/30">
          <div className="progress-active h-full w-1/3 rounded-full bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-300 shadow-[0_0_16px_rgba(56,189,248,0.55)]" />
        </div>
      </div>

      <style jsx>{`
        .progress-active {
          animation: overlay-indeterminate 1.4s infinite;
          animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes overlay-indeterminate {
          0% {
            transform: translateX(-120%);
          }
          100% {
            transform: translateX(360%);
          }
        }
      `}</style>
    </div>
  );
}

