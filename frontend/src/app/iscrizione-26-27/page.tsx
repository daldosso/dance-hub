"use client";

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
    <div className="min-h-screen bg-[#F557BF] text-[#666666]">
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.14)]">
          <div className="flex flex-col items-center gap-4 px-5 py-5 text-center sm:px-8 sm:py-6">
            <img
              src="https://www.latincharm.eu/lc_content/image/header/testata841_1680_dim820_280.png"
              alt="Latin Charm"
              className="h-auto w-full max-w-[520px] object-contain"
            />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#F557BF]">
                Iscrizione 2026 / 2027
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#3d3d3d] sm:text-3xl">
                Iscrizione Latin Charm
              </h1>
            </div>
          </div>
        </header>

        <section className="mt-4 flex-1">
          <form
            onSubmit={handleSubmit}
            className="rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_20px_50px_rgba(0,0,0,0.12)] sm:p-6"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[#3d3d3d]">
                  Nome e cognome *
                </label>
                <input
                  required
                  value={form.fullName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, fullName: event.target.value }))
                  }
                  autoComplete="name"
                  placeholder="Mario Rossi"
                  className="w-full rounded-2xl border border-[#F557BF]/35 bg-white px-4 py-3 text-sm text-[#3d3d3d] outline-none transition placeholder:text-[#999999] focus:border-[#F557BF] focus:ring-2 focus:ring-[#F557BF]/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[#3d3d3d]">
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
                  className="w-full rounded-2xl border border-[#F557BF]/35 bg-white px-4 py-3 text-sm text-[#3d3d3d] outline-none transition placeholder:text-[#999999] focus:border-[#F557BF] focus:ring-2 focus:ring-[#F557BF]/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[#3d3d3d]">
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
                  className="w-full rounded-2xl border border-[#F557BF]/35 bg-white px-4 py-3 text-sm text-[#3d3d3d] outline-none transition placeholder:text-[#999999] focus:border-[#F557BF] focus:ring-2 focus:ring-[#F557BF]/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[#3d3d3d]">
                  Data di nascita
                </label>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, birthDate: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-[#F557BF]/35 bg-white px-4 py-3 text-sm text-[#3d3d3d] outline-none transition focus:border-[#F557BF] focus:ring-2 focus:ring-[#F557BF]/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[#3d3d3d]">
                  Città
                </label>
                <input
                  value={form.city}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, city: event.target.value }))
                  }
                  autoComplete="address-level2"
                  placeholder="Es. Milano"
                  className="w-full rounded-2xl border border-[#F557BF]/35 bg-white px-4 py-3 text-sm text-[#3d3d3d] outline-none transition placeholder:text-[#999999] focus:border-[#F557BF] focus:ring-2 focus:ring-[#F557BF]/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[#3d3d3d]">
                  Sesso
                </label>
                <select
                  value={form.gender}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, gender: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-[#F557BF]/35 bg-white px-4 py-3 text-sm text-[#3d3d3d] outline-none transition focus:border-[#F557BF] focus:ring-2 focus:ring-[#F557BF]/20"
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
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[#3d3d3d]">
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
                  className="w-full rounded-2xl border border-[#F557BF]/35 bg-white px-4 py-3 text-sm text-[#3d3d3d] outline-none transition focus:border-[#F557BF] focus:ring-2 focus:ring-[#F557BF]/20"
                >
                  {skillLevels.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 rounded-3xl border border-[#F557BF]/20 bg-[#F557BF]/5 p-4">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[#3d3d3d]">
                  Corso
                </label>
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
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
                    className="w-full rounded-2xl border border-[#F557BF]/35 bg-white px-4 py-3 text-sm text-[#3d3d3d] outline-none transition focus:border-[#F557BF] focus:ring-2 focus:ring-[#F557BF]/20"
                  >
                    <option value="">
                      {loadingCourses ? "Caricamento..." : "Seleziona"}
                    </option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>

                  <input
                    value={form.courseTitle}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        courseTitle: event.target.value,
                      }))
                    }
                    placeholder="Oppure scrivi il corso"
                    className="w-full rounded-2xl border border-[#F557BF]/35 bg-white px-4 py-3 text-sm text-[#3d3d3d] outline-none transition placeholder:text-[#999999] focus:border-[#F557BF] focus:ring-2 focus:ring-[#F557BF]/20"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[#3d3d3d]">
                  Note
                </label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, notes: event.target.value }))
                  }
                  placeholder="Note opzionali"
                  className="w-full resize-none rounded-2xl border border-[#F557BF]/35 bg-white px-4 py-3 text-sm text-[#3d3d3d] outline-none transition placeholder:text-[#999999] focus:border-[#F557BF] focus:ring-2 focus:ring-[#F557BF]/20"
                />
              </div>
            </div>

            <label className="mt-4 flex gap-3 rounded-2xl border border-[#F557BF]/20 bg-[#F557BF]/5 p-4 text-sm text-[#666666]">
              <input
                type="checkbox"
                checked={form.consent}
                onChange={(event) =>
                  setForm((current) => ({ ...current, consent: event.target.checked }))
                }
                className="mt-1 h-4 w-4 rounded border-[#F557BF]/40 bg-white text-[#F557BF] focus:ring-[#F557BF]"
              />
              <span>Autorizzo l&apos;uso dei dati per l&apos;iscrizione.</span>
            </label>

            {errorMessage && (
              <p className="mt-4 rounded-2xl border border-[#d94c9f] bg-[#d94c9f]/10 px-4 py-3 text-sm text-[#b33e82]">
                {errorMessage}
              </p>
            )}

            {successMessage && (
              <p className="mt-4 rounded-2xl border border-[#3d3d3d]/20 bg-[#3d3d3d]/5 px-4 py-3 text-sm text-[#3d3d3d]">
                {successMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-[#3d3d3d] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-black/15 transition hover:bg-[#585858] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F557BF] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Salvataggio..." : "Invia iscrizione"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
