"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useProgress } from "@/lib/progress";

const copy = {
  unknownError:
    "\u4e0d\u660e\u306a\u30a8\u30e9\u30fc\u304c\u767a\u751f\u3057\u307e\u3057\u305f",
  signupFailed:
    "\u30b5\u30a4\u30f3\u30a2\u30c3\u30d7\u306b\u5931\u6557\u3057\u307e\u3057\u305f",
  mismatch:
    "\u30d1\u30b9\u30ef\u30fc\u30c9\u304c\u4e00\u81f4\u3057\u307e\u305b\u3093",
  heading: "\u304b\u3093\u305f\u3093\u30b9\u30bf\u30fc\u30c8",
  description:
    "\u30e1\u30fc\u30eb\u30a2\u30c9\u30ec\u30b9\u3092\u767b\u9332\u3057\u3066\u3001Kumi Talk\u306e\u4e16\u754c\u3092\u4eca\u3059\u3050\u4f53\u9a13\u3057\u307e\u3057\u3087\u3046\u3002",
  emailLabel: "\u30e1\u30fc\u30eb\u30a2\u30c9\u30ec\u30b9",
  passwordLabel: "\u30d1\u30b9\u30ef\u30fc\u30c9",
  passwordConfirmLabel: "\u30d1\u30b9\u30ef\u30fc\u30c9\uff08\u78ba\u8a8d\u7528\uff09",
  signingUp: "\u767b\u9332\u4e2d...",
  createAccount: "\u30a2\u30ab\u30a6\u30f3\u30c8\u3092\u4f5c\u6210",
  haveAccount:
    "\u3059\u3067\u306b\u30a2\u30ab\u30a6\u30f3\u30c8\u3092\u304a\u6301\u3061\u306e\u65b9\u306f",
  goLogin: "\u30ed\u30b0\u30a4\u30f3\u3078",
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

export default function SignupPage() {
  const router = useRouter();
  const { fetchWithProgress } = useProgress();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (password !== passwordConfirm) {
      setError(copy.mismatch);
      return;
    }

    setLoading(true);

    try {
      const response = await fetchWithProgress("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, passwordConfirm }),
      });

      if (!response.ok) {
        const data: unknown = await response.json().catch(() => ({}));
        const message =
          typeof data === "object" && data !== null && "message" in data
            ? String(
                (data as { message?: unknown }).message ?? copy.signupFailed,
              )
            : copy.signupFailed;
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
    "placeholder:text-white/60 focus:border-fuchsia-300 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/40";

  return (
    <main className="relative flex min-h-[calc(100vh-7rem)] items-center justify-center px-4 py-16 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[18%] top-[-10%] h-72 w-72 rounded-full bg-purple-500/40 blur-3xl" />
        <div className="absolute right-[10%] top-[25%] h-64 w-64 rounded-full bg-rose-500/30 blur-3xl" />
        <div className="absolute bottom-[-15%] left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-indigo-500/25 blur-[140px]" />
      </div>

      <div className="relative w-full max-w-xl">
        <div className="absolute inset-0 -z-10 rounded-[2.5rem] bg-gradient-to-br from-fuchsia-500/35 via-purple-400/30 to-indigo-500/30 blur-lg" />
        <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/10 shadow-[0_35px_80px_rgba(236,72,153,0.32)] backdrop-blur-xl">
          <div className="absolute left-[-25%] top-[-35%] h-52 w-52 rotate-6 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-[-30%] right-[-25%] h-60 w-60 -rotate-12 rounded-full bg-purple-400/25 blur-3xl" />

          <div className="relative z-10 px-8 py-10 sm:px-12 sm:py-14">
            <div className="mb-8 space-y-3 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.3em] text-rose-200/90">
                Join us
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
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-white/80">
                  {copy.passwordConfirmLabel}
                </label>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(event) => setPasswordConfirm(event.target.value)}
                  required
                  className={inputClass}
                  autoComplete="new-password"
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
                className="w-full rounded-xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-fuchsia-500/30 transition hover:shadow-xl hover:shadow-fuchsia-400/40 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? copy.signingUp : copy.createAccount}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-white/70">
              {copy.haveAccount}{" "}
              <Link
                href="/login"
                className="font-medium text-rose-200 transition hover:text-white"
              >
                {copy.goLogin}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
