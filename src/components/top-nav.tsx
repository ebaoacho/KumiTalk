"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useProgress } from "@/lib/progress";
import Image from 'next/image';


export default function TopNav() {
  const router = useRouter();
  const { track } = useProgress();
  const [isPending, setIsPending] = useState(false);

  const handleLogout = useCallback(async () => {
    if (isPending) return;

    setIsPending(true);
    try {
      await track(async () => {
        const response = await fetch("/api/auth/logout", { method: "POST" });
        if (!response.ok) {
          throw new Error("\u30ed\u30b0\u30a2\u30a6\u30c8\u306b\u5931\u6557\u3057\u307e\u3057\u305f");
        }
      });

      if (typeof window !== "undefined") {
        window.localStorage.removeItem("userId");
      }
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Failed to logout", error);
    } finally {
      setIsPending(false);
    }
  }, [isPending, router, track]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/30 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Image
            src="/images/KumiTalk.png"
            alt = "ロゴ"
            width = {50}
            height = {32}
            className="object-contain"
            />
          <span className="text-lg font-semibold tracking-tight text-white drop-shadow">
            Kumi Talk
          </span>
        </div>
        <Button
          onClick={handleLogout}
          disabled={isPending}
          className="rounded-full border border-white/10 bg-white/15 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition hover:border-white/20 hover:bg-white/25 hover:shadow-xl hover:shadow-indigo-400/30 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "\u30ed\u30b0\u30a2\u30a6\u30c8\u4e2d..." : "\u30ed\u30b0\u30a2\u30a6\u30c8"}
        </Button>
      </div>
    </header>
  );
}
