"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useProgress } from "@/lib/progress";

const copy = {
  unknownError:
    "\u4e0d\u660e\u306a\u30a8\u30e9\u30fc\u304c\u767a\u751f\u3057\u307e\u3057\u305f",
  loginFailed:
    "\u30ed\u30b0\u30a4\u30f3\u306b\u5931\u6557\u3057\u307e\u3057\u305f",
  heading:
    "\u30a2\u30ab\u30a6\u30f3\u30c8\u306b\u30b5\u30a4\u30f3\u30a4\u30f3",
  description:
    "\u767b\u9332\u6e08\u307f\u306e\u30e1\u30fc\u30eb\u30a2\u30c9\u30ec\u30b9\u3068\u30d1\u30b9\u30ef\u30fc\u30c9\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
  emailLabel: "\u30e1\u30fc\u30eb\u30a2\u30c9\u30ec\u30b9",
  passwordLabel: "\u30d1\u30b9\u30ef\u30fc\u30c9",
  signingIn: "\u30ed\u30b0\u30a4\u30f3\u4e2d...",
  login: "\u30ed\u30b0\u30a4\u30f3",
  noAccount:
    "\u30a2\u30ab\u30a6\u30f3\u30c8\u3092\u304a\u6301\u3061\u3067\u306a\u3044\u65b9\u306f",
  goSignup: "\u65b0\u898f\u767b\u9332\u3078",
};

const toMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return copy.unknownError;
  }
};

export default function LoginPage() {
  const router = useRouter();
  const { fetchWithProgress } = useProgress();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetchWithProgress("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data: unknown = await response.json().catch(() => ({}));
        const message =
          typeof data === "object" && data !== null && "message" in data
            ? String(
                (data as { message?: unknown }).message ?? copy.loginFailed,
              )
            : copy.loginFailed;
        throw new Error(message);
      }

      const data = await response.json();

      if (data.id) {
        localStorage.setItem("userId", data.id);
      }

      router.push(`/chat?userId=${data.id}`);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "mt-2 w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-base text-white " +
    "placeholder:text-white/60 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/40";

  return (
    <main className="relative flex min-h-full items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-15%] h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-500/40 blur-3xl" />
        <div className="absolute right-[20%] top-[20%] h-64 w-64 rounded-full bg-sky-500/30 blur-3xl" />
        <div className="absolute bottom-[-20%] left-[15%] h-80 w-80 rounded-full bg-fuchsia-500/25 blur-[140px]" />
      </div>

      <div className="relative w-full max-w-lg">
        <div className="absolute inset-0 -z-10 rounded-[2.25rem] bg-gradient-to-br from-indigo-500/40 via-cyan-400/35 to-purple-500/30 blur-md" />
        <div className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-white/10 shadow-[0_35px_80px_rgba(79,70,229,0.35)] backdrop-blur-xl">
          <div className="absolute right-[-30%] top-[-35%] h-48 w-48 rotate-12 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute left-[-20%] bottom-[-30%] h-56 w-56 -rotate-6 rounded-full bg-sky-400/20 blur-3xl" />

          <div className="relative z-10 px-8 py-10 sm:px-10 sm:py-12">
            <div className="mb-8 space-y-3 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.3em] text-cyan-200/90">
                Welcome back
              </span>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {copy.heading}
              </h1>
              <p className="text-sm text-white/70">{copy.description}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-sm font-medium text-white/80">
                  {copy.emailLabel}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className={inputClass}
                  autoComplete="email"
                  inputMode="email"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-white/80">
                  {copy.passwordLabel}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className={inputClass}
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <p className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:shadow-xl hover:shadow-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? copy.signingIn : copy.login}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-white/70">
              {copy.noAccount}{" "}
              <Link
                href="/signup"
                className="font-medium text-cyan-200 transition hover:text-white"
              >
                {copy.goSignup}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
