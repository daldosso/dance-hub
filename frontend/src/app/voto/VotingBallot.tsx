"use client";

import { useEffect, useMemo, useState } from "react";

type Section = {
  title: string;
  items: VoteItem[];
};

type VoteItem = {
  number: number;
  title: string;
};

const MAX_SELECTIONS = 5;
const STORAGE_KEY = "dance-hub-voto-scaletta-2026";

const sections: Section[] = [
  {
    title: "Prima parte",
    items: [
      { number: 1, title: "SIGLA" },
      { number: 2, title: "LISCIO" },
      { number: 3, title: "CARAIBICO Base Bachata" },
      { number: 4, title: "CARAIBICO Base Salsa" },
      { number: 5, title: "BALLI DI GRUPPO 1" },
      { number: 6, title: "KIZOMBA" },
      { number: 7, title: "MARGARETH" },
      { number: 8, title: "ZUMBA 1" },
      { number: 10, title: "3 FRATELLINI" },
      { number: 11, title: "CARAIBICO INTERMEDIO 1 BACHATA" },
      { number: 12, title: "CARAIBICO INTERMEDIO 1 SALSA" },
      { number: 13, title: "LADY CHARM" },
      { number: 14, title: "MINI CHARM" },
      { number: 15, title: "Zumba 2" },
      { number: 16, title: "JANETTE" },
      { number: 18, title: "DANZA MODERNA" },
      { number: 19, title: "BALLI DI GRUPPO 2" },
    ],
  },
  {
    title: "Premiazioni",
    items: [
      { number: 20, title: "SHINE BACHATA" },
      { number: 21, title: "SHINE SALSA" },
      { number: 22, title: "SHINE MERENGUE" },
      {
        number: 23,
        title:
          "AGONISTI SUL PALCO IN ABITO DA BALLO (LISA, GIULIA, LETY, MICHAEL, DANIELE, JANY, GINNY, RAMONA, NEIDES, DANY E FABIO, ANDREA, SVEVA, GAIA, GIULIA G., MARICLA)",
      },
    ],
  },
  {
    title: "Seconda parte",
    items: [
      { number: 24, title: "CARAIBICO INTERMEDIO/AVANZATO BACHATA" },
      { number: 25, title: "CARAIBICO INTERMEDIO/AVANZATO SALSA" },
      { number: 26, title: "HEELS" },
      { number: 27, title: "NICOLE E SVEVA" },
      { number: 28, title: "SQUINTERNATI" },
      { number: 29, title: "CREW CHARM" },
      { number: 30, title: "RICCARDO E PAMELA" },
      { number: 31, title: "BALLI DI GRUPPO 3" },
      { number: 32, title: "DANIELE E MARICLA" },
      { number: 33, title: "DUO BACHATA" },
      { number: 34, title: "DUO MERENGUE" },
      { number: 35, title: "ANNA E FRA" },
      { number: 36, title: "CLAUDIO E STEFY" },
      { number: 37, title: "COREOGRAFICO" },
      { number: 38, title: "DANY E FABIO BACHATA" },
      { number: 39, title: "DANY E FABIO MERENGUE" },
      { number: 40, title: "LISA" },
      { number: 41, title: "SUPERAVANZATO GRUPPO 1" },
      { number: 42, title: "SUPERAVANZATO GRUPPO 2" },
      { number: 43, title: "GIULIA" },
      { number: 44, title: "MARAGARETH" },
    ],
  },
];

export function VotingBallot() {
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [ballotKey, setBallotKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showThanks, setShowThanks] = useState(false);

  const allItems = useMemo(() => sections.flatMap((section) => section.items), []);
  const filteredSections = sections;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const rawBallotKey = window.localStorage.getItem("dance-hub-voto-key");

      if (rawBallotKey && rawBallotKey.length >= 8) {
        setBallotKey(rawBallotKey);
      } else {
        const nextBallotKey = crypto.randomUUID();
        window.localStorage.setItem("dance-hub-voto-key", nextBallotKey);
        setBallotKey(nextBallotKey);
      }

      if (!raw) {
        setHydrated(true);
        return;
      }

      const parsed = JSON.parse(raw) as { selectedNumbers?: unknown };
      const next = Array.isArray(parsed.selectedNumbers)
        ? parsed.selectedNumbers
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value))
            .filter((value, index, array) => array.indexOf(value) === index)
            .filter((value) => allItems.some((item) => item.number === value))
        : [];

      setSelectedNumbers(next.slice(0, MAX_SELECTIONS));
    } catch {
      setSelectedNumbers([]);
    } finally {
      setHydrated(true);
    }
  }, [allItems]);

  useEffect(() => {
    if (!hydrated) return;

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ selectedNumbers }),
    );
  }, [hydrated, selectedNumbers]);

  function toggleSelection(number: number) {
    setSaveError(null);
    setShowThanks(false);

    setSelectedNumbers((current) => {
      if (current.includes(number)) {
        return current.filter((value) => value !== number);
      }

      if (current.length >= MAX_SELECTIONS) {
        return current;
      }

      return [...current, number];
    });
  }

  function clearSelection() {
    setSaveError(null);
    setShowThanks(false);
    setSelectedNumbers([]);
  }

  function confirmVote() {
    async function persistVote() {
      if (!ballotKey) {
        setSaveError("Chiave voto non disponibile. Ricarica la pagina.");
        return;
      }

      if (selectedNumbers.length === 0) {
        setSaveError("Seleziona almeno una preferenza.");
        return;
      }

      setIsSaving(true);
      setSaveError(null);

      try {
        const res = await fetch("/api/votes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ballotKey,
            selectedNumbers,
          }),
        });

        const payload = (await res.json().catch(() => null)) as
          | { error?: string; details?: string }
          | null;

        if (!res.ok) {
          throw new Error(
            payload?.details ?? payload?.error ?? "Errore nel salvataggio",
          );
        }

        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ selectedNumbers }),
        );
        setShowThanks(true);
      } catch (error) {
        setSaveError(
          error instanceof Error
            ? error.message
            : "Errore imprevisto nel salvataggio del voto.",
        );
      } finally {
        setIsSaving(false);
      }
    }

    void persistVote();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_34%),linear-gradient(180deg,_#09111f_0%,_#050814_100%)] text-slate-50">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-8 h-52 w-52 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="absolute -right-20 top-36 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-28 pt-5">
        <header className="space-y-4">
          <div className="rounded-[28px] border border-white/10 bg-slate-950/45 p-5 shadow-2xl shadow-black/25 backdrop-blur">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100/80">
              Saggio Latin Charm 25 Giugno 2026
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
              Vota la scaletta
            </h1>
          </div>
        </header>

        <section className="mt-5 space-y-4 pb-8">
          {filteredSections.map((section) => (
            <div
              key={section.title}
              className="rounded-[28px] border border-white/10 bg-slate-950/40 p-4 shadow-xl shadow-black/20 backdrop-blur"
            >
              <h2 className="mb-3 text-lg font-semibold text-white">
                {section.title}
              </h2>

              <div className="space-y-2">
                {section.items.map((item) => {
                  const active = selectedNumbers.includes(item.number);

                  return (
                    <button
                      key={item.number}
                      type="button"
                      onClick={() => toggleSelection(item.number)}
                      className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.99] ${
                        active
                          ? "border-cyan-300/40 bg-cyan-400/15 shadow-lg shadow-cyan-500/10"
                          : "border-white/8 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.06]"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                          active
                            ? "bg-cyan-300 text-slate-950"
                            : "bg-slate-800 text-slate-100"
                        }`}
                      >
                        {item.number}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium leading-5 text-white">
                          {item.title}
                        </span>
                      </span>

                      <span
                        className={`mt-1 inline-flex h-6 items-center rounded-full px-2 text-[11px] font-semibold ${
                          active
                            ? "bg-cyan-300 text-slate-950"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {active ? "OK" : "+"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredSections.length === 0 && (
            <div className="rounded-[28px] border border-white/10 bg-slate-950/40 p-6 text-center text-sm text-slate-300 backdrop-blur">
              Nessun risultato per questa ricerca.
            </div>
          )}
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-slate-950/85 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          <button
            type="button"
            onClick={clearSelection}
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-slate-100"
          >
            Svuota
          </button>

          <button
            type="button"
            onClick={confirmVote}
            disabled={selectedNumbers.length === 0 || isSaving}
            className="h-12 flex-1 rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Salvataggio..." : "Conferma voto"}
          </button>
      </div>
      {saveError && (
          <div className="mx-auto mt-2 w-full max-w-md rounded-2xl border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
            {saveError}
          </div>
        )}
      </div>

      {showThanks && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 px-4"
          onClick={() => setShowThanks(false)}
        >
          <div
            className="w-full max-w-sm rounded-[28px] border border-white/10 bg-slate-950 p-6 text-center shadow-2xl shadow-black/40"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-semibold text-white">
              Grazie per il voto
            </h2>
            <button
              type="button"
              onClick={() => setShowThanks(false)}
              className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl bg-white px-4 text-sm font-semibold text-slate-950"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
