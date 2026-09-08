"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

const AUTH_KEY = "dance-hub-auth";
const levels = ["Principiante", "Intermedio", "Avanzato"];
const statuses = ["Attivo", "In sospeso", "Arretrato"];

type UserForm = {
  nome: string;
  cognome: string;
  email: string;
  corso: string;
  livello: string;
  stato: string;
  dataNascita: string;
  luogoNascita: string;
  sesso: string;
  codiceFiscale: string;
  city: string;
  residenceAddress: string;
  residenceProvince: string;
  residencePostalCode: string;
  privacyImageConsent: boolean;
  privacyMarketingConsent: boolean;
  privacyMinorConsent: boolean;
};

const emptyForm: UserForm = {
  nome: "",
  cognome: "",
  email: "",
  corso: "",
  livello: "Principiante",
  stato: "Attivo",
  dataNascita: "",
  luogoNascita: "",
  sesso: "",
  codiceFiscale: "",
  city: "",
  residenceAddress: "",
  residenceProvince: "",
  residencePostalCode: "",
  privacyImageConsent: false,
  privacyMarketingConsent: false,
  privacyMinorConsent: false,
};

type ApiUser = {
  fullName?: string | null;
  email?: string | null;
  courses?: { title: string }[];
  skillLevel?: string | null;
  status?: string | null;
  dataNascita?: string | null;
  birthPlace?: string | null;
  codiceFiscale?: string | null;
  city?: string | null;
  residenceAddress?: string | null;
  residenceProvince?: string | null;
  residencePostalCode?: string | null;
  privacyImageConsent?: boolean | null;
  privacyMarketingConsent?: boolean | null;
  privacyMinorConsent?: boolean | null;
};

function getToken() {
  const raw = window.localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return (JSON.parse(raw) as { token?: string }).token ?? null;
  } catch {
    return null;
  }
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    nome: parts[0] ?? "",
    cognome: parts.slice(1).join(" "),
  };
}

function dateInputValue(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function normalizeLevel(value?: string | null) {
  const normalized = value?.toLowerCase() ?? "";
  if (normalized === "intermediate" || normalized === "intermedio") return "Intermedio";
  if (normalized === "advanced" || normalized === "avanzato") return "Avanzato";
  return "Principiante";
}

export default function EditUserPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const token = getToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const response = await fetch(`/api/users/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = (await response.json().catch(() => ({}))) as {
          user?: ApiUser;
          error?: string;
        };
        if (response.status === 403) {
          window.localStorage.removeItem(AUTH_KEY);
          router.replace("/login");
          return;
        }
        if (!response.ok || !body.user) {
          throw new Error(body.error ?? "Impossibile caricare l'utente");
        }

        const user = body.user;
        const name = splitName(user.fullName ?? "");
        setForm({
          ...emptyForm,
          ...name,
          email: user.email ?? "",
          corso: user.courses?.[0]?.title ?? "",
          livello: normalizeLevel(user.skillLevel),
          stato: user.status ?? "Attivo",
          dataNascita: dateInputValue(user.dataNascita),
          luogoNascita: user.birthPlace ?? "",
          codiceFiscale: user.codiceFiscale ?? "",
          city: user.city ?? "",
          residenceAddress: user.residenceAddress ?? "",
          residenceProvince: user.residenceProvince ?? "",
          residencePostalCode: user.residencePostalCode ?? "",
          privacyImageConsent: user.privacyImageConsent ?? false,
          privacyMarketingConsent: user.privacyMarketingConsent ?? false,
          privacyMinorConsent: user.privacyMinorConsent ?? false,
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Errore di caricamento");
      } finally {
        setLoading(false);
      }
    }

    void loadUser();
  }, [params.id, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      const response = await fetch(`/api/users/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          residenceCity: form.city,
          livello: form.livello,
          stato: form.stato,
          codiceFiscale: form.codiceFiscale.toUpperCase(),
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
        details?: string;
      };
      if (response.status === 403) {
        window.localStorage.removeItem(AUTH_KEY);
        router.replace("/login");
        return;
      }
      if (!response.ok) {
        throw new Error(body.details ?? body.error ?? "Errore durante il salvataggio");
      }
      setMessage(body.message ?? "Modifiche salvate correttamente");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 px-3 py-4 text-slate-100 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-4xl">
        <nav className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <Link href="/" className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">
            ← Iscritti
          </Link>
          <div className="flex gap-2 text-sm">
            <Link href="/payments" className="rounded-lg border border-white/10 px-3 py-2 hover:bg-white/5">
              Pagamenti
            </Link>
            <Link href="/iscrizione-26-27" className="rounded-lg border border-white/10 px-3 py-2 hover:bg-white/5">
              Nuova iscrizione
            </Link>
          </div>
        </nav>

        <section className="rounded-2xl border border-emerald-500/25 bg-slate-900/70 p-4 shadow-2xl backdrop-blur sm:p-7">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Gestione utente</p>
            <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Modifica iscritto</h1>
          </div>

          {loading ? (
            <p className="text-sm text-slate-400">Caricamento dati...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                {([
                  ["nome", "Nome", "text"],
                  ["cognome", "Cognome", "text"],
                  ["email", "Email", "email"],
                  ["corso", "Corso", "text"],
                  ["dataNascita", "Data di nascita", "date"],
                  ["luogoNascita", "Luogo di nascita", "text"],
                  ["sesso", "Sesso", "text"],
                  ["codiceFiscale", "Codice fiscale", "text"],
                ] as const).map(([key, label, type]) => (
                  <label key={key} className="text-sm text-slate-300">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide">{label}</span>
                    <input
                      required={key === "nome" || key === "cognome" || key === "corso"}
                      type={type}
                      value={form[key]}
                      onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                      className={inputClass}
                    />
                  </label>
                ))}
              </div>

              <div className="grid gap-4 rounded-2xl border border-white/10 bg-slate-950/30 p-4 sm:grid-cols-3">
                <label className="text-sm text-slate-300 sm:col-span-3">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide">Residenza</span>
                  <input value={form.residenceAddress} onChange={(event) => setForm((current) => ({ ...current, residenceAddress: event.target.value }))} placeholder="Indirizzo e numero civico" className={inputClass} />
                </label>
                <label className="text-sm text-slate-300"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide">Città</span><input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} className={inputClass} /></label>
                <label className="text-sm text-slate-300"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide">Provincia</span><input value={form.residenceProvince} onChange={(event) => setForm((current) => ({ ...current, residenceProvince: event.target.value.toUpperCase() }))} className={inputClass} /></label>
                <label className="text-sm text-slate-300"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide">CAP</span><input value={form.residencePostalCode} onChange={(event) => setForm((current) => ({ ...current, residencePostalCode: event.target.value }))} className={inputClass} /></label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm text-slate-300"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide">Livello</span><select value={form.livello} onChange={(event) => setForm((current) => ({ ...current, livello: event.target.value }))} className={inputClass}>{levels.map((level) => <option key={level}>{level}</option>)}</select></label>
                <label className="text-sm text-slate-300"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide">Stato</span><select value={form.stato} onChange={(event) => setForm((current) => ({ ...current, stato: event.target.value }))} className={inputClass}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
              </div>

              <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-sm text-slate-300">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">Consensi privacy</p>
                {(["privacyImageConsent", "privacyMarketingConsent", "privacyMinorConsent"] as const).map((key) => (
                  <label key={key} className="flex gap-3"><input type="checkbox" checked={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.checked }))} className="mt-1" /><span>{key === "privacyImageConsent" ? "Uso delle immagini" : key === "privacyMarketingConsent" ? "Comunicazioni marketing" : "Consenso per minori"}</span></label>
                ))}
              </div>

              {error && <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
              {message && <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{message}</p>}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Link href="/" className="rounded-xl border border-white/10 px-4 py-3 text-center text-sm hover:bg-white/5">Annulla</Link>
                <button type="submit" disabled={saving} className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Salvataggio..." : "Salva modifiche"}</button>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
