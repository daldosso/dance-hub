"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type StatoPagamento = "paid" | "unpaid" | "suspended";

type Iscritto = {
  id: number;
  nome: string;
  cognome: string;
  email: string;
  photoUrl?: string;
  courseIds?: number[];
};

type BackendUser = {
  id: number;
  fullName: string | null;
  email: string | null;
  profilePictureUrl?: string | null;
  courses?: { id: number; title: string }[];
};

type Corso = {
  id: number;
  title: string;
};

type Mese = {
  key: string; // es. "2026-01"
  label: string; // es. "Gen"
};

type PagamentoMese = {
  stato: StatoPagamento;
  importo?: number;
};

type MatrixPagamenti = Record<number, Record<string, PagamentoMese>>; // userId -> monthKey -> pagamento

const AUTH_KEY = "dance-hub-auth";

// Mesi da visualizzare: anno accademico Settembre -> Giugno
function generaMesiAnnoAccademico(): Mese[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-based

  // Se siamo da settembre in poi, l'anno accademico parte quest'anno,
  // altrimenti parte l'anno precedente.
  const startYear = currentMonth >= 8 ? currentYear : currentYear - 1;

  const labelMesi = [
    "Gen",
    "Feb",
    "Mar",
    "Apr",
    "Mag",
    "Giu",
    "Lug",
    "Ago",
    "Set",
    "Ott",
    "Nov",
    "Dic",
  ];

  const ordineMesi = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5]; // Set, Ott, Nov, Dic, Gen, Feb, Mar, Apr, Mag, Giu

  return ordineMesi.map((monthIndex) => {
    const year = monthIndex >= 8 ? startYear : startYear + 1;
    const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
    return {
      key,
      label: labelMesi[monthIndex],
    };
  });
}

const MESI: Mese[] = generaMesiAnnoAccademico();

export default function PaymentsPage() {
  const router = useRouter();
  const [iscritti, setIscritti] = useState<Iscritto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matrix, setMatrix] = useState<MatrixPagamenti>({});
  const [corsi, setCorsi] = useState<Corso[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | "ALL">(
    "ALL",
  );

  // Protegge la pagina: solo utenti loggati
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(AUTH_KEY);
      if (!raw) {
        router.replace("/login");
      }
    } catch {
      router.replace("/login");
    }
  }, [router]);

  // Carica iscritti (utenti) dal backend
  useEffect(() => {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();

    async function loadUsers() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${apiBase}/api/users`);
        if (!res.ok) {
          throw new Error(`Errore ${res.status} nel caricamento utenti`);
        }

        const raw = (await res.json()) as { users?: BackendUser[] };
        const users = raw.users ?? [];

        const mapped: Iscritto[] = users.map((u, index) => {
          const fullName = u.fullName ?? "";
          const [nome, ...rest] = fullName.split(" ");

          const courseIds =
            Array.isArray(u.courses) && u.courses.length > 0
              ? u.courses
                  .map((c) => Number(c.id))
                  .filter((id) => Number.isFinite(id))
              : [];

          return {
            id: typeof u.id === "number" ? u.id : index + 1,
            nome: nome || "N/D",
            cognome: rest.join(" "),
            email: u.email ?? "",
            photoUrl:
              typeof u.profilePictureUrl === "string"
                ? u.profilePictureUrl
                : undefined,
            courseIds,
          };
        });

        setIscritti(mapped);
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "Errore imprevisto nel caricamento utenti.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadUsers();
  }, []);

  // Carica i pagamenti reali dal backend e popola la matrice
  useEffect(() => {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();
    if (typeof window === "undefined") return;

    async function loadPayments() {
      try {
        const rawAuth = window.localStorage.getItem(AUTH_KEY);
        if (!rawAuth) return;

        let token: string | undefined;
        try {
          const parsed = JSON.parse(rawAuth) as { token?: string };
          token = parsed.token;
        } catch {
          return;
        }

        if (!token) return;

        const res = await fetch(`${apiBase}/api/payments`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) return;

        const raw = (await res.json()) as {
          payments?: {
            userId: number;
            courseId: number | null;
            monthKey: string;
            status: StatoPagamento;
          }[];
        };

        const list = raw.payments ?? [];
        const next: MatrixPagamenti = {};

        for (const p of list) {
          if (!p || !p.userId || !p.monthKey || !p.status) continue;
          if (!next[p.userId]) next[p.userId] = {};
          next[p.userId][p.monthKey] = { stato: p.status };
        }

        setMatrix(next);
      } catch (err) {
        console.error("Errore nel caricamento pagamenti", err);
      }
    }

    void loadPayments();
  }, []);

  // Carica elenco corsi per la combo in header (solo desktop)
  useEffect(() => {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();

    async function loadCourses() {
      try {
        const res = await fetch(`${apiBase}/api/courses`);
        if (!res.ok) return;

        const raw = (await res.json()) as {
          courses?: { id: number; title: string }[];
        };
        if (Array.isArray(raw.courses)) {
          const mapped: Corso[] = raw.courses
            .filter(
              (c) => typeof c.title === "string" && c.title.trim().length > 0,
            )
            .map((c) => ({ id: Number(c.id), title: c.title.trim() }))
            .filter((c) => Number.isFinite(c.id));

          setCorsi(mapped);
        }
      } catch (err) {
        console.error("Errore nel caricamento corsi", err);
      }
    }

    void loadCourses();
  }, []);

  const hasData = useMemo(() => iscritti.length > 0, [iscritti]);

  const iscrittiOrdinati = useMemo(() => {
    const filtrati =
      selectedCourseId === "ALL"
        ? iscritti
        : iscritti.filter(
            (i) =>
              Array.isArray(i.courseIds) &&
              i.courseIds.includes(selectedCourseId),
          );

    const cloned = [...filtrati];
    return cloned.sort((a, b) => {
      const aHasPhoto = Boolean(a.photoUrl);
      const bHasPhoto = Boolean(b.photoUrl);

      if (aHasPhoto !== bHasPhoto) {
        return aHasPhoto ? -1 : 1;
      }

      const nameA = `${a.nome} ${a.cognome}`.toLowerCase();
      const nameB = `${b.nome} ${b.cognome}`.toLowerCase();

      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    });
  }, [iscritti, selectedCourseId]);

  function togglePagamento(userId: number, monthKey: string) {
    setMatrix((prev) => {
      const userRow = prev[userId] ?? {};
      const current = userRow[monthKey]?.stato ?? "unpaid";
      const nextStatus: StatoPagamento =
        current === "unpaid"
          ? "paid"
          : current === "paid"
            ? "suspended"
            : "unpaid";

      // Upsert sul backend: con corso specifico una PUT, con "Tutti i corsi" una PUT per ogni corso dell'iscritto
      if (selectedCourseId !== "ALL") {
        void persistPayment(userId, monthKey, nextStatus, selectedCourseId);
      } else {
        const iscritto = iscritti.find((u) => u.id === userId);
        const courseIds = iscritto?.courseIds ?? [];
        for (const courseId of courseIds) {
          void persistPayment(userId, monthKey, nextStatus, courseId);
        }
      }

      return {
        ...prev,
        [userId]: {
          ...userRow,
          [monthKey]: { ...(userRow[monthKey] ?? {}), stato: nextStatus },
        },
      };
    });
  }

  async function persistPayment(
    userId: number,
    monthKey: string,
    status: StatoPagamento,
    courseId: number,
  ) {
    try {
      const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();
      if (typeof window === "undefined") return;

      const rawAuth = window.localStorage.getItem(AUTH_KEY);
      if (!rawAuth) return;

      let token: string | undefined;
      try {
        const parsed = JSON.parse(rawAuth) as { token?: string };
        token = parsed.token;
      } catch {
        return;
      }

      if (!token) return;

      const body = {
        userId,
        courseId,
        monthKey,
        status,
      };

      const res = await fetch(`${apiBase}/api/payments`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Errore salvataggio pagamento", res.status, err);
      }
    } catch (err) {
      console.error("Errore nel salvataggio pagamento", err);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-slate-100">
      {/* Mobile: pagina non disponibile */}
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-sm text-slate-300 lg:hidden">
        <div>
          <h1 className="text-2xl font-semibold">Pagamenti</h1>
          <p className="mt-2 text-xs">
            La vista pagamenti è ottimizzata solo per schermi desktop. Accedi da
            un computer o un tablet in orizzontale.
          </p>
        </div>
      </div>

      {/* Desktop */}
      <div className="mx-auto hidden min-h-screen max-w-7xl flex-col px-6 py-8 lg:flex xl:px-10">
        <header className="mb-6 border-b border-white/10 pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight xl:text-4xl">
                <span>Pagamenti</span>
                {loading && (
                  <span className="inline-flex h-4 w-4 items-center justify-center">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                  </span>
                )}
              </h1>
              <p className="mt-1 text-sm text-slate-300">
                Stato pagamenti iscritti per gli ultimi mesi
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-end lg:w-auto lg:justify-end">
              <div className="flex-1 lg:w-[320px] xl:w-[420px]">
                <label className="mb-1 block text-xs font-semibold text-slate-100 sm:text-[13px]">
                  Corso
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedCourseId(
                      value === "ALL" ? "ALL" : Number(value),
                    );
                  }}
                  className="w-full rounded-lg border border-emerald-400/40 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 shadow-sm outline-none ring-1 ring-transparent transition focus:border-emerald-400 focus:ring-emerald-400/60 sm:text-sm"
                >
                  <option value="ALL">Tutti i corsi</option>
                  {corsi.map((corso) => (
                    <option key={corso.id} value={corso.id}>
                      {corso.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 rounded-xl border border-white/10 bg-slate-900/60 p-4 shadow-lg backdrop-blur">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-sm text-slate-300">
              Caricamento pagamenti…
            </div>
          ) : error ? (
            <div className="flex h-40 items-center justify-center text-sm text-rose-300">
              {error}
            </div>
          ) : !hasData ? (
            <div className="flex h-40 items-center justify-center text-sm text-slate-300">
              Nessun iscritto trovato.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-white/10 bg-slate-950/60">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-slate-900/80 text-slate-200">
                  <tr>
                    <th className="sticky left-0 z-10 bg-slate-900/95 px-3 py-2 text-left font-medium">
                      Iscritto
                    </th>
                    {MESI.map((m) => (
                      <th
                        key={m.key}
                        className="px-3 py-2 text-center text-xs font-medium text-slate-300"
                      >
                        {m.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {iscrittiOrdinati.map((i) => (
                    <tr
                      key={i.id}
                      className="border-t border-white/5 odd:bg-slate-950/40 hover:bg-slate-900/60"
                    >
                      <td className="sticky left-0 z-0 bg-slate-950/80 px-3 py-2 text-sm font-medium text-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold text-slate-200 ring-1 ring-slate-700/60">
                            {i.photoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={i.photoUrl}
                                alt={`${i.nome} ${i.cognome}`}
                                className="h-9 w-9 rounded-full object-cover"
                              />
                            ) : (
                              <span>
                                {`${i.nome?.[0] ?? ""}${i.cognome?.[0] ?? ""}`.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <div>
                              {i.nome} {i.cognome}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {i.email || "—"}
                            </div>
                          </div>
                        </div>
                      </td>
                      {MESI.map((m) => {
                        const cell = matrix[i.id]?.[m.key];
                        const stato: StatoPagamento = cell?.stato ?? "unpaid";

                        return (
                          <td
                            key={m.key}
                            className="px-3 py-2 text-center align-middle"
                            onClick={() => togglePagamento(i.id, m.key)}
                          >
                            <button
                              type="button"
                              className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-transparent transition hover:border-white/40 focus:outline-none"
                              title={
                                stato === "paid"
                                  ? "Segna come sospeso"
                                  : stato === "suspended"
                                    ? "Segna come non pagato"
                                    : "Segna come pagato"
                              }
                            >
                              <span
                                className={`h-3 w-3 rounded-full ${
                                  stato === "paid"
                                    ? "bg-emerald-400 shadow-[0_0_0_2px_rgba(16,185,129,0.35)]"
                                    : stato === "suspended"
                                      ? "bg-amber-300 shadow-[0_0_0_2px_rgba(252,211,77,0.5)]"
                                      : "bg-rose-500/80 shadow-[0_0_0_2px_rgba(248,113,113,0.35)]"
                                }`}
                              />
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
