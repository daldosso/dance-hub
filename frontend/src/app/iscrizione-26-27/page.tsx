"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type Course = {
  id: number;
  title: string;
};

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  birthDate: string;
  city: string;
  gender: string;
  skillLevel: string;
  courseId: string;
  courseTitle: string;
  notes: string;
  consent: boolean;
};

const initialForm: FormState = {
  fullName: "",
  email: "",
  phone: "",
  birthDate: "",
  city: "",
  gender: "",
  skillLevel: "Principiante",
  courseId: "",
  courseTitle: "",
  notes: "",
  consent: false,
};

const skillLevels = ["Principiante", "Intermedio", "Avanzato"];
const genders = ["Donna", "Uomo", "Altro", "Preferisco non dirlo"];

export default function EnrollmentPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Iscrizione 2026/2027 | Dance Hub";
  }, []);

  useEffect(() => {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();

    async function loadCourses() {
      try {
        setLoadingCourses(true);
        const res = await fetch(`${apiBase}/api/courses`);
        if (!res.ok) return;

        const raw = (await res.json()) as { courses?: Course[] };
        if (Array.isArray(raw.courses)) {
          setCourses(
            raw.courses
              .filter((course) => typeof course.title === "string")
              .map((course) => ({
                id: Number(course.id),
                title: course.title.trim(),
              }))
              .filter((course) => Number.isFinite(course.id) && course.title.length > 0),
          );
        }
      } catch (error) {
        console.error("Errore nel caricamento corsi", error);
      } finally {
        setLoadingCourses(false);
      }
    }

    void loadCourses();
  }, []);

  const selectedCourse = useMemo(() => {
    const courseId = Number(form.courseId);
    return courses.find((course) => course.id === courseId) ?? null;
  }, [courses, form.courseId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();
      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        birthDate: form.birthDate,
        city: form.city.trim(),
        gender: form.gender,
        skillLevel: form.skillLevel,
        courseId: form.courseId ? Number(form.courseId) : undefined,
        courseTitle: selectedCourse?.title ?? form.courseTitle.trim(),
        notes: form.notes.trim(),
        consent: form.consent,
      };

      const res = await fetch(`${apiBase}/api/public-enrollment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const body = (await res.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(body.error ?? "Errore durante l'iscrizione");
      }

      setSuccessMessage(
        body.message ??
          "Iscrizione salvata con successo. Puoi chiudere la pagina o inserire un'altra scheda.",
      );
      setForm(initialForm);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossibile completare l'iscrizione.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_28%),linear-gradient(180deg,#0f172a_0%,#020617_60%,#020617_100%)]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20 backdrop-blur md:flex-row md:items-start md:justify-between md:p-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
              Iscrizioni 2026/2027
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Compila l&apos;iscrizione in pochi minuti.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Questa pagina e&apos; pubblica e non richiede autenticazione. Inseriamo i
              dati dell&apos;allievo, selezioniamo il corso e salviamo tutto in modo
              ordinato per l&apos;anno accademico 26/27.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:w-[360px] md:grid-cols-1">
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                Anno
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">2026 / 2027</p>
              <p className="mt-1 text-sm text-slate-300">Iscrizione pubblica senza login</p>
            </div>
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-200">
                Staff
              </p>
              <p className="mt-2 text-sm text-slate-100">
                Se sei dello staff, puoi tornare alla{" "}
                <Link href="/login" className="font-semibold text-emerald-200 underline decoration-emerald-200/40 underline-offset-4">
                  pagina di accesso
                </Link>
                .
              </p>
            </div>
          </div>
        </header>

        <section className="mt-6 grid flex-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-6"
          >
            <div className="flex flex-col gap-2 border-b border-white/10 pb-4">
              <h2 className="text-xl font-semibold text-white sm:text-2xl">
                Dati anagrafici
              </h2>
              <p className="text-sm text-slate-400">
                Compila i campi richiesti per registrare la richiesta di iscrizione.
              </p>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-200">
                  Nome e cognome *
                </label>
                <input
                  required
                  value={form.fullName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, fullName: event.target.value }))
                  }
                  autoComplete="name"
                  placeholder="Es. Mario Rossi"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-200">
                  Email *
                </label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, email: event.target.value }))
                  }
                  autoComplete="email"
                  placeholder="nome@dominio.it"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-200">
                  Telefono *
                </label>
                <input
                  required
                  type="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, phone: event.target.value }))
                  }
                  autoComplete="tel"
                  placeholder="+39 ..."
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-200">
                  Data di nascita
                </label>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, birthDate: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-200">
                  Citta
                </label>
                <input
                  value={form.city}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, city: event.target.value }))
                  }
                  autoComplete="address-level2"
                  placeholder="Es. Milano"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-200">
                  Sesso / identita
                </label>
                <select
                  value={form.gender}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, gender: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                >
                  <option value="">Seleziona</option>
                  {genders.map((gender) => (
                    <option key={gender} value={gender}>
                      {gender}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-200">
                  Livello
                </label>
                <select
                  value={form.skillLevel}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      skillLevel: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                >
                  {skillLevels.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 rounded-3xl border border-white/10 bg-slate-950/50 p-4">
                <div className="flex flex-col gap-1">
                  <label className="block text-xs font-medium text-slate-200">
                    Corso desiderato
                  </label>
                  <p className="text-xs text-slate-400">
                    Seleziona un corso dall&apos;elenco, oppure scrivilo se non e&apos;
                    ancora presente.
                  </p>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <div>
                    <select
                      value={form.courseId}
                      onChange={(event) => {
                        const nextCourseId = event.target.value;
                        const match =
                          courses.find((course) => String(course.id) === nextCourseId) ??
                          null;

                        setForm((current) => ({
                          ...current,
                          courseId: nextCourseId,
                          courseTitle: match?.title ?? current.courseTitle,
                        }));
                      }}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                    >
                      <option value="">
                        {loadingCourses ? "Caricamento corsi..." : "Seleziona un corso"}
                      </option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <input
                      value={form.courseTitle}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          courseTitle: event.target.value,
                        }))
                      }
                      placeholder="Oppure inserisci il corso"
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-200">
                  Note
                </label>
                <textarea
                  rows={4}
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, notes: event.target.value }))
                  }
                  placeholder="Allenamenti precedenti, richieste particolari, preferenze..."
                  className="w-full resize-none rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                />
              </div>
            </div>

            <label className="mt-5 flex gap-3 rounded-2xl border border-white/10 bg-slate-950/55 p-4 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={form.consent}
                onChange={(event) =>
                  setForm((current) => ({ ...current, consent: event.target.checked }))
                }
                className="mt-1 h-4 w-4 rounded border-slate-500 bg-slate-900 text-emerald-500 focus:ring-emerald-400"
              />
              <span>
                Confermo di aver letto e accettato che i dati inseriti vengano
                utilizzati per gestire l&apos;iscrizione all&apos;anno 2026/2027.
              </span>
            </label>

            {errorMessage && (
              <p className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                {errorMessage}
              </p>
            )}

            {successMessage && (
              <p className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                {successMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Salvataggio in corso..." : "Salva iscrizione"}
            </button>
          </form>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-6">
              <h2 className="text-xl font-semibold text-white">Perche&apos; funziona bene</h2>
              <div className="mt-4 space-y-4 text-sm text-slate-300">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="font-medium text-white">Mobile first</p>
                  <p className="mt-1">
                    Campi grandi, spazi generosi e layout a colonna singola sui
                    telefoni.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="font-medium text-white">Desktop comodo</p>
                  <p className="mt-1">
                    La colonna laterale lascia subito visibili anno, accesso staff e
                    informazioni chiave.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="font-medium text-white">Dati salvati</p>
                  <p className="mt-1">
                    L&apos;invio passa a un endpoint dedicato che registra la scheda nel
                    database.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-6">
              <h3 className="text-lg font-semibold text-white">Suggerimento pratico</h3>
              <p className="mt-3 text-sm leading-6 text-emerald-50/90">
                Se vuoi raccogliere iscrizioni da telefono e da PC, puoi condividere
                direttamente questa pagina. Lo staff continua ad avere la sua area
                riservata su <span className="font-semibold">/login</span>.
              </p>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
