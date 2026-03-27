"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const AUTH_KEY = "dance-hub-auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();

      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const message =
          res.status === 401
            ? "Credenziali non valide."
            : "Errore durante il login.";
        throw new Error(message);
      }

      const data = (await res.json().catch(() => ({}))) as {
        token?: string;
      };

      // Salva una "sessione" minimale nel browser
      window.localStorage.setItem(
        AUTH_KEY,
        JSON.stringify({
          email,
          token: data.token,
          loggedInAt: new Date().toISOString(),
        }),
      );

      router.push("/");
    } catch (err) {
      console.error(err);
      setError("Impossibile effettuare il login. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Dance Hub
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Accedi per gestire gli iscritti
          </p>
        </header>

        <main className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-xl backdrop-blur">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-200">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                placeholder="nome@scuoladiballo.it"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-200">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                placeholder="La tua password"
              />
            </div>

            {error && <p className="text-xs text-rose-300">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Accesso in corso..." : "Accedi"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-slate-400">
            Solo utenti autorizzati possono accedere al pannello iscritti.
          </p>

          <p className="mt-3 text-center text-xs text-slate-400">
            Torna alla{" "}
            <Link
              href="/"
              className="font-medium text-emerald-300 hover:text-emerald-200"
            >
              dashboard iscritti
            </Link>
            .
          </p>
        </main>
      </div>
    </div>
  );
}
