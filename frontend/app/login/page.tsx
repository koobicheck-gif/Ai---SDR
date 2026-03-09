"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Zap, Lock, Wifi, WifiOff } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const redirectTo = searchParams.get("from") || "/";
  const wasUnauthorized = searchParams.get("error") === "unauthorized";

  // If already authenticated, go straight through
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("dashboard_secret")) {
      router.replace(redirectTo);
    }
  }, [redirectTo, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!secret.trim()) return;
    setLoading(true);
    setError(null);

    try {
      // Probe the health endpoint with the entered secret
      await api.get("/health", {
        headers: { "X-Dashboard-Secret": secret },
      });
      // 200 → correct secret (or auth disabled)
      localStorage.setItem("dashboard_secret", secret);
      router.replace(redirectTo);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number }; message?: string };
      if (axiosErr?.response?.status === 401) {
        setError("Incorrect password. Check your DASHBOARD_SECRET setting.");
      } else {
        // Network error — backend unreachable. Store a demo marker so the
        // frontend falls back to mock data for read operations.
        localStorage.setItem("dashboard_secret", "__DEMO__");
        router.replace(redirectTo);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleDemoMode() {
    localStorage.setItem("dashboard_secret", "__DEMO__");
    router.replace(redirectTo);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-violet-600 flex items-center justify-center shadow-lg">
            <Zap size={28} className="text-white" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h1 className="text-xl font-bold text-slate-900 text-center mb-1">AI SDR Dashboard</h1>
          <p className="text-sm text-slate-500 text-center mb-7">Enter your dashboard password to continue</p>

          {wasUnauthorized && (
            <div className="flex items-center gap-2 p-3 mb-5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              <Lock size={14} className="shrink-0" />
              Session expired. Please sign in again.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Dashboard Password
              </label>
              <input
                type="password"
                value={secret}
                onChange={(e) => { setSecret(e.target.value); setError(null); }}
                placeholder="Your DASHBOARD_SECRET value"
                autoFocus
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
              />
              {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={loading || !secret.trim()}
              className="w-full py-2.5 px-4 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Wifi size={15} />
              )}
              {loading ? "Connecting…" : "Connect"}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 mb-3">No backend? Browse with sample data.</p>
            <button
              onClick={handleDemoMode}
              className="text-sm text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1.5 mx-auto"
            >
              <WifiOff size={14} />
              Continue in Demo Mode
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Set <code className="bg-slate-100 px-1 py-0.5 rounded">DASHBOARD_SECRET</code> in your{" "}
          <code className="bg-slate-100 px-1 py-0.5 rounded">.env</code> to enable password protection.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
