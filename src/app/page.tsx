"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Livello = "Principiante" | "Intermedio" | "Avanzato";
type StatoIscrizione = "Attivo" | "In sospeso" | "Arretrato";

type Iscritto = {
  id: number;
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  corso: string;
  livello: Livello;
  stato: StatoIscrizione;
  note?: string;
};

const livelli: Livello[] = ["Principiante", "Intermedio", "Avanzato"];
const stati: StatoIscrizione[] = ["Attivo", "In sospeso", "Arretrato"];

const AUTH_KEY = "dance-hub-auth";

const corsiPredefiniti = [
  "Salsa Cubana",
  "Salsa Portoricana",
  "Bachata",
  "Kizomba",
  "Standard & Latini",
];

export default function Home() {
  const router = useRouter();
  const [iscritti, setIscritti] = useState<Iscritto[]>([]);
  const [selezionato, setSelezionato] = useState<Iscritto | null>(null);
  const [filtroTesto, setFiltroTesto] = useState("");
  const [filtroStato, setFiltroStato] = useState<StatoIscrizione | "Tutti">(
    "Tutti",
  );
   const [loadingIscritti, setLoadingIscritti] = useState(true);
   const [errorIscritti, setErrorIscritti] = useState<string | null>(null);

  const [form, setForm] = useState<Omit<Iscritto, "id">>({
    nome: "",
    cognome: "",
    email: "",
    telefono: "",
    corso: "",
    livello: "Principiante",
    stato: "Attivo",
    note: "",
  });

  const iscrittiFiltrati = useMemo(() => {
    return iscritti.filter((i) => {
      const matchTesto =
        filtroTesto.trim().length === 0 ||
        `${i.nome} ${i.cognome} ${i.email} ${i.corso}`
          .toLowerCase()
          .includes(filtroTesto.toLowerCase());

      const matchStato = filtroStato === "Tutti" ? true : i.stato === filtroStato;

      return matchTesto && matchStato;
    });
  }, [iscritti, filtroTesto, filtroStato]);

  const stats = useMemo(() => {
    const totali = iscritti.length;
    const attivi = iscritti.filter((i) => i.stato === "Attivo").length;
    const arretrati = iscritti.filter((i) => i.stato === "Arretrato").length;

    return { totali, attivi, arretrati };
  }, [iscritti]);

  // Protegge la pagina: se non c'è una "sessione" nel browser,
  // rimanda l'utente alla pagina di login.
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(AUTH_KEY);
      if (!raw) {
        router.replace("/login");
        return;
      }

      // Se in futuro vuoi fare controlli extra (es. scadenza), puoi farlo qui.
    } catch (err) {
      console.error(err);
      router.replace("/login");
    }
  }, [router]);

  // Carica gli iscritti dal backend
  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!baseUrl) {
      setErrorIscritti("NEXT_PUBLIC_API_URL non è configurata.");
      setLoadingIscritti(false);
      return;
    }

    async function loadUsers() {
      try {
        setLoadingIscritti(true);
        setErrorIscritti(null);

        let token: string | undefined;
        if (typeof window !== "undefined") {
          try {
            const raw = window.localStorage.getItem(AUTH_KEY);
            if (raw) {
              const parsed = JSON.parse(raw) as { token?: string };
              token = parsed.token;
            }
          } catch {
            // ignora, continueremo senza token
          }
        }

        const res = await fetch(`${baseUrl}/api/users`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!res.ok) {
          throw new Error(`Errore ${res.status} nel caricamento utenti`);
        }

        const raw = await res.json();

        const users: any[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.users)
            ? raw.users
            : [];

        if (!users.length) {
          setIscritti([]);
          return;
        }

        const mapped: Iscritto[] = users.map((u: any, index: number) => {
          const fullName: string = u.fullName ?? "";
          const [nomeFromName, ...restCognome] = fullName.split(" ");

          const skill: string | null =
            typeof u.skillLevel === "string" ? u.skillLevel : null;
          const livello: Livello =
            skill === "intermediate"
              ? "Intermedio"
              : skill === "advanced" || skill === "pro"
                ? "Avanzato"
                : "Principiante";

          const stato: StatoIscrizione = "Attivo";

          const danceStyles: string[] = Array.isArray(u.danceStyles)
            ? u.danceStyles
            : [];

          const primoStile =
            danceStyles[0] ??
            (typeof u.city === "string" ? u.city : "Non specificato");

          return {
            id: typeof u.id === "number" ? u.id : index + 1,
            nome: nomeFromName || "N/D",
            cognome: restCognome.length ? restCognome.join(" ") : "N/D",
            email: typeof u.email === "string" ? u.email : "",
            telefono: "",
            corso: primoStile,
            livello,
            stato,
            note: undefined,
          };
        });

        setIscritti(mapped);
      } catch (err) {
        console.error(err);
        setErrorIscritti(
          err instanceof Error
            ? err.message
            : "Errore imprevisto nel caricamento iscritti.",
        );
      } finally {
        setLoadingIscritti(false);
      }
    }

    void loadUsers();
  }, []);

  function resetForm() {
    setForm({
      nome: "",
      cognome: "",
      email: "",
      telefono: "",
      corso: "",
      livello: "Principiante",
      stato: "Attivo",
      note: "",
    });
    setSelezionato(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.nome.trim() || !form.cognome.trim() || !form.corso.trim()) {
      alert("Nome, cognome e corso sono obbligatori");
      return;
    }

    if (selezionato) {
      setIscritti((prev) =>
        prev.map((i) =>
          i.id === selezionato.id
            ? {
                ...i,
                ...form,
              }
            : i,
        ),
      );
    } else {
      setIscritti((prev) => [
        ...prev,
        {
          id: prev.length ? prev[prev.length - 1].id + 1 : 1,
          ...form,
        },
      ]);
    }

    resetForm();
  }

  function handleEdit(iscritto: Iscritto) {
    setSelezionato(iscritto);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...rest } = iscritto;
    setForm(rest);
  }

  function handleDelete(id: number) {
    if (!confirm("Sei sicuro di voler eliminare questo iscritto?")) return;
    setIscritti((prev) => prev.filter((i) => i.id !== id));
    if (selezionato?.id === id) {
      resetForm();
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <header className="mb-8 border-b border-white/10 pb-4">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Dance Hub
          </h1>
          <p className="mt-1 text-sm text-slate-300 sm:text-base">
            Gestione iscritti scuola di ballo
          </p>

          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-emerald-300">
                Totale iscritti
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {stats.totali}
              </p>
            </div>
            <div className="rounded-lg border border-sky-400/30 bg-sky-400/10 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-sky-300">
                Attivi
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {stats.attivi}
              </p>
            </div>
            <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-rose-300">
                Arretrati
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {stats.arretrati}
              </p>
            </div>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-6 pb-6 lg:flex-row">
          <section className="flex-1 rounded-xl border border-white/10 bg-slate-900/60 p-4 shadow-lg backdrop-blur">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">Iscritti</h2>
                <div className="flex flex-col gap-2 text-xs text-slate-300 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    placeholder="Cerca per nome, cognome, email o corso…"
                    value={filtroTesto}
                    onChange={(e) => setFiltroTesto(e.target.value)}
                    className="w-full rounded-md border border-white/10 bg-slate-900/60 px-3 py-2 text-xs placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 sm:w-64"
                  />
                  <select
                    value={filtroStato}
                    onChange={(e) =>
                      setFiltroStato(e.target.value as StatoIscrizione | "Tutti")
                    }
                    className="w-full rounded-md border border-white/10 bg-slate-900/60 px-3 py-2 text-xs focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 sm:w-40"
                  >
                    <option value="Tutti">Tutti gli stati</option>
                    {stati.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-white/10 bg-slate-950/60">
              <table className="min-w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-900/80 text-slate-300">
                  <tr>
                    <th className="px-3 py-2 font-medium sm:px-4">Nome</th>
                    <th className="px-3 py-2 font-medium sm:px-4">Corso</th>
                    <th className="hidden px-3 py-2 font-medium md:table-cell sm:px-4">
                      Livello
                    </th>
                    <th className="px-3 py-2 font-medium sm:px-4">Stato</th>
                    <th className="px-3 py-2 text-right font-medium sm:px-4">
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loadingIscritti ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-6 text-center text-xs text-slate-400"
                      >
                        Caricamento iscritti in corso…
                      </td>
                    </tr>
                  ) : errorIscritti ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-6 text-center text-xs text-rose-300"
                      >
                        {errorIscritti}
                      </td>
                    </tr>
                  ) : iscrittiFiltrati.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-6 text-center text-xs text-slate-400"
                      >
                        Nessun iscritto presente. Aggiungi il primo
                        utilizzando il modulo qui a fianco.
                      </td>
                    </tr>
                  ) : (
                    iscrittiFiltrati.map((i) => (
                      <tr
                        key={i.id}
                        className="border-t border-white/5 odd:bg-slate-950/40 hover:bg-slate-900/60"
                      >
                        <td className="px-3 py-2 sm:px-4">
                          <div className="font-medium">
                            {i.nome} {i.cognome}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {i.email || "—"}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs sm:px-4">
                          {i.corso}
                        </td>
                        <td className="hidden px-3 py-2 text-xs md:table-cell sm:px-4">
                          {i.livello}
                        </td>
                        <td className="px-3 py-2 sm:px-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              i.stato === "Attivo"
                                ? "bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-500/40"
                                : i.stato === "Arretrato"
                                  ? "bg-rose-400/15 text-rose-300 ring-1 ring-rose-500/40"
                                  : "bg-amber-400/10 text-amber-200 ring-1 ring-amber-400/40"
                            }`}
                          >
                            {i.stato}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-[11px] sm:px-4">
                          <button
                            onClick={() => handleEdit(i)}
                            className="rounded-md border border-sky-500/40 bg-sky-500/10 px-2 py-1 font-medium text-sky-100 hover:bg-sky-500/20"
                          >
                            Modifica
                          </button>
                          <button
                            onClick={() => handleDelete(i.id)}
                            className="ml-2 rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-1 font-medium text-rose-100 hover:bg-rose-500/20"
                          >
                            Elimina
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="w-full rounded-xl border border-emerald-500/30 bg-slate-900/60 p-4 shadow-lg backdrop-blur lg:w-80">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">
                {selezionato ? "Modifica iscritto" : "Nuovo iscritto"}
              </h2>
              {selezionato && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-emerald-300 hover:text-emerald-200"
                >
                  + Nuovo
                </button>
              )}
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-3 text-xs sm:text-sm"
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-200">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={form.nome}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, nome: e.target.value }))
                    }
                    className="w-full rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-xs focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-200">
                    Cognome *
                  </label>
                  <input
                    type="text"
                    value={form.cognome}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, cognome: e.target.value }))
                    }
                    className="w-full rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-xs focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-200">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  className="w-full rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-xs focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-200">
                  Telefono
                </label>
                <input
                  type="tel"
                  value={form.telefono}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, telefono: e.target.value }))
                  }
                  className="w-full rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-xs focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-200">
                  Corso *
                </label>
                <input
                  list="corsi"
                  value={form.corso}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, corso: e.target.value }))
                  }
                  placeholder="Es. Salsa, Bachata…"
                  className="w-full rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-xs focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
                <datalist id="corsi">
                  {corsiPredefiniti.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-200">
                    Livello
                  </label>
                  <select
                    value={form.livello}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        livello: e.target.value as Livello,
                      }))
                    }
                    className="w-full rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-xs focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  >
                    {livelli.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-200">
                    Stato
                  </label>
                  <select
                    value={form.stato}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        stato: e.target.value as StatoIscrizione,
                      }))
                    }
                    className="w-full rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-xs focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  >
                    {stati.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-200">
                  Note
                </label>
                <textarea
                  rows={3}
                  value={form.note}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, note: e.target.value }))
                  }
                  className="w-full resize-none rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-xs focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
              </div>

              <button
                type="submit"
                className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                {selezionato ? "Salva modifiche" : "Aggiungi iscritto"}
              </button>
            </form>

            <p className="mt-3 text-[11px] text-slate-400">
              I dati sono salvati solo in memoria per questa sessione. Per
              persistenza reale potrai collegare un database (es. SQLite,
              Postgres, Supabase).
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
