"use client";

import { useProgress } from "@/lib/progress";

export default function TopProgressBar() {
  const { isLoading } = useProgress();

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 right-0 top-0 z-50 h-[3px]"
    >
      <div
        className={`h-full origin-left transition-opacity duration-200 ${
          isLoading ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="h-full w-full rounded-full bg-white/10 backdrop-blur" />
        <div
          className="absolute left-0 top-0 h-full w-1/3 animate-[indeterminate_1.2s_infinite] rounded-full bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-300 shadow-[0_0_12px_rgba(56,189,248,0.45)]"
          style={{
            animationTimingFunction: "cubic-bezier(.4,0,.2,1)",
          }}
        />
      </div>
      <style jsx>{`
        @keyframes indeterminate {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }
      `}</style>
    </div>
  );
}
