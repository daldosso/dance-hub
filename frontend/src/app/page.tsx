"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
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
  photoUrl?: string;
  courseIds?: number[];
};

type Corso = {
  id: number;
  title: string;
};
type BackendUser = {
  id: number;
  email: string | null;
  username: string | null;
  fullName: string | null;
  city: string | null;
  danceStyles: string[] | null;
  skillLevel: string | null;
  isTeacher: boolean | null;
  isOrganizer: boolean | null;
  profilePictureUrl: string | null;
  courses?: { id: number; title: string }[];
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

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoSuccess, setPhotoSuccess] = useState<string | null>(null);
  const [uploadTarget, setUploadTarget] = useState<Iscritto | null>(null);
  const mobileFileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewIscritto, setPreviewIscritto] = useState<Iscritto | null>(null);
  const longPressTimeoutRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);

  const [corsi, setCorsi] = useState<Corso[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | "ALL">(
    "ALL",
  );

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
    const filtrati = iscritti.filter((i) => {
      const matchTesto =
        filtroTesto.trim().length === 0 ||
        `${i.nome} ${i.cognome} ${i.email} ${i.corso}`
          .toLowerCase()
          .includes(filtroTesto.toLowerCase());

      const matchStato =
        filtroStato === "Tutti" ? true : i.stato === filtroStato;

      const matchCorso =
        selectedCourseId === "ALL"
          ? true
          : Array.isArray(i.courseIds) &&
            i.courseIds.includes(selectedCourseId);

      return matchTesto && matchStato && matchCorso;
    });

    return [...filtrati].sort((a, b) => {
      const aHasPhoto = Boolean(a.photoUrl);
      const bHasPhoto = Boolean(b.photoUrl);

      if (aHasPhoto !== bHasPhoto) {
        // Quelli con foto prima
        return aHasPhoto ? -1 : 1;
      }

      const nameA = `${a.nome} ${a.cognome}`.toLowerCase();
      const nameB = `${b.nome} ${b.cognome}`.toLowerCase();

      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    });
  }, [iscritti, filtroTesto, filtroStato, selectedCourseId]);

  const stats = useMemo(() => {
    const totali = iscritti.length;
    const attivi = iscritti.filter((i) => i.stato === "Attivo").length;
    const arretrati = iscritti.filter((i) => i.stato === "Arretrato").length;

    return { totali, attivi, arretrati };
  }, [iscritti]);

  // Pulisce l'URL di anteprima quando cambia file o si smonta il componente
  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

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

        const raw: unknown = await res.json();

        const users: BackendUser[] = Array.isArray(raw)
          ? (raw as BackendUser[])
          : Array.isArray((raw as { users?: BackendUser[] | undefined })?.users)
            ? ((raw as { users?: BackendUser[] }).users ?? [])
            : [];

        if (!users.length) {
          setIscritti([]);
          return;
        }

        const mapped: Iscritto[] = users.map((u, index) => {
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

          const courseIds =
            Array.isArray(u.courses) && u.courses.length > 0
              ? u.courses.map((c) => Number(c.id))
              : [];

          const corsoDaCourses =
            Array.isArray(u.courses) && u.courses.length > 0
              ? u.courses[0]?.title ?? ""
              : "";

          const primoStileFallback =
            danceStyles[0] ??
            (typeof u.city === "string" ? u.city : "Non specificato");

          const corso = corsoDaCourses || primoStileFallback;

          return {
            id: typeof u.id === "number" ? u.id : index + 1,
            nome: nomeFromName || "N/D",
            cognome: restCognome.length ? restCognome.join(" ") : "N/D",
            email: typeof u.email === "string" ? u.email : "",
            telefono: "",
            corso,
            livello,
            stato,
            note: undefined,
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

  // Carica l'elenco corsi per la combo in header
  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!baseUrl) {
      return;
    }

    async function loadCourses() {
      try {
        const res = await fetch(`${baseUrl}/api/courses`);
        if (!res.ok) return;

        const raw = (await res.json()) as { courses?: { id: number; title: string }[] };
        if (Array.isArray(raw.courses)) {
          const mapped: Corso[] = raw.courses
            .filter((c) => typeof c.title === "string" && c.title.trim().length > 0)
            .map((c) => ({ id: Number(c.id), title: c.title.trim() }));

          setCorsi(mapped);
        }
      } catch (err) {
        console.error("Errore nel caricamento corsi", err);
      }
    }

    void loadCourses();
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

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhotoError(null);
    setPhotoSuccess(null);

    if (!file) {
      setPhotoFile(null);
      setPhotoPreview(null);
      return;
    }

    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  }

  async function uploadPhotoForUser(user: Iscritto, file: File) {
    setPhotoError(null);
    setPhotoSuccess(null);

    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);

    // Aggiorna subito l'avatar in lista (ottimismo UI)
    setIscritti((prev) =>
      prev.map((u) =>
        u.id === user.id
          ? {
              ...u,
              photoUrl: previewUrl,
            }
          : u,
      ),
    );
    setSelezionato((prev) =>
      prev && prev.id === user.id ? { ...prev, photoUrl: previewUrl } : prev,
    );

    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!baseUrl) {
      setPhotoError("NEXT_PUBLIC_API_URL non è configurata.");
      return;
    }

    if (typeof window === "undefined") {
      setPhotoError("Upload disponibile solo dal browser.");
      return;
    }

    const rawAuth = window.localStorage.getItem(AUTH_KEY);
    if (!rawAuth) {
      setPhotoError("Sessione non trovata. Esegui di nuovo il login.");
      return;
    }

    let token: string | undefined;
    try {
      const parsed = JSON.parse(rawAuth) as { token?: string };
      token = parsed.token;
    } catch {
      setPhotoError("Dati di sessione non validi. Esegui di nuovo il login.");
      return;
    }

    if (!token) {
      setPhotoError("Token mancante. Esegui di nuovo il login.");
      return;
    }

    const formData = new FormData();
    formData.append("profilePhoto", file);
    formData.append("userId", String(user.id));

    setPhotoUploading(true);
    try {
      const res = await fetch(`${baseUrl}/api/users/profile-photo`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("Upload photo error:", res.status, text);
        setPhotoError(
          res.status === 401
            ? "Non autorizzato. Esegui di nuovo il login."
            : "Errore durante il caricamento della foto.",
        );
        return;
      }

      setPhotoSuccess("Foto caricata con successo.");
      // refresh della lista utenti per aggiornare subito l'avatar (opzionale: qui è immediato solo se backend aggiorna)
      // Nota: per semplicità non refetchiamo; l'avatar si aggiornerà al prossimo refresh/caricamento.
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handlePhotoUpload() {
    try {
      setPhotoError(null);
      setPhotoSuccess(null);

      if (!selezionato) {
        setPhotoError("Seleziona prima un utente dalla griglia.");
        return;
      }

      if (!photoFile) {
        setPhotoError("Seleziona prima un file immagine.");
        return;
      }

      await uploadPhotoForUser(selezionato, photoFile);
    } catch (err) {
      console.error(err);
      setPhotoError("Errore imprevisto durante l'upload della foto.");
    } finally {
      // gestito in uploadPhotoForUser
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8 lg:px-10">
        <header className="mb-4 border-b border-white/10 pb-3 sm:mb-6 sm:pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
                  Dance Hub
                </h1>
                {loadingIscritti && (
                  <span
                    className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-400/60 border-t-transparent"
                    aria-label="Caricamento iscritti"
                  />
                )}

                {/* Statistiche compatte inline su mobile */}
                <div className="ml-1 flex items-center gap-2 sm:hidden">
                  <div className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-[11px] font-semibold text-emerald-200">
                    <span className="text-[10px] font-bold tracking-wide text-emerald-300">
                      TOT
                    </span>
                    <span>{stats.totali}</span>
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-full border border-rose-400/30 bg-rose-400/10 px-2 py-1 text-[11px] font-semibold text-rose-100">
                    <span className="text-[10px] font-bold tracking-wide text-rose-300">
                      ARR
                    </span>
                    <span>{stats.arretrati}</span>
                  </div>
                </div>
              </div>

              <p className="mt-0.5 hidden text-xs text-slate-300 sm:block sm:mt-1 sm:text-sm lg:text-base">
                Gestione iscritti scuola di ballo
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
                    setSelectedCourseId(value === "ALL" ? "ALL" : Number(value));
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

              <div className="hidden justify-end sm:flex">
                <Link
                  href="/payments"
                  className="inline-flex items-center justify-center rounded-lg border border-sky-400/40 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-100 shadow-sm transition hover:bg-sky-500/20 sm:text-sm"
                >
                  Pagamenti
                </Link>
              </div>
            </div>
          </div>

          {/* Statistiche desktop/tablet */}
          <div className="mt-4 hidden gap-3 text-sm sm:grid sm:grid-cols-3">
            <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-emerald-300">
                Totale iscritti
              </p>
              <p className="mt-1 text-2xl font-semibold">{stats.totali}</p>
            </div>
            <div className="rounded-lg border border-sky-400/30 bg-sky-400/10 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-sky-300">
                Attivi
              </p>
              <p className="mt-1 text-2xl font-semibold">{stats.attivi}</p>
            </div>
            <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-rose-300">
                Arretrati
              </p>
              <p className="mt-1 text-2xl font-semibold">{stats.arretrati}</p>
            </div>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-4 pb-4 sm:gap-6 sm:pb-6 lg:flex-row">
          <section className="flex-1 rounded-xl border border-white/10 bg-slate-900/60 p-3 shadow-lg backdrop-blur sm:p-4">
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

            {/* Lista mobile compatta */}
            <div className="sm:hidden">
              {loadingIscritti ? (
                <div className="rounded-lg border border-white/10 bg-slate-950/60 px-4 py-6 text-center text-sm text-slate-400">
                  Caricamento iscritti in corso…
                </div>
              ) : errorIscritti ? (
                <div className="rounded-lg border border-white/10 bg-slate-950/60 px-4 py-6 text-center text-sm text-rose-300">
                  {errorIscritti}
                </div>
              ) : iscrittiFiltrati.length === 0 ? (
                <div className="rounded-lg border border-white/10 bg-slate-950/60 px-4 py-6 text-center text-sm text-slate-400">
                  Nessun iscritto trovato.
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-white/10 bg-slate-950/60">
                  <ul className="divide-y divide-white/5">
                    {iscrittiFiltrati.map((i) => {
                      const isSelected = selezionato?.id === i.id;
                      return (
                        <li
                          key={i.id}
                          className={`flex items-center justify-between gap-3 px-3 py-2 ${
                            isSelected ? "bg-sky-700/30" : ""
                          }`}
                          onClick={() => {
                            if (longPressTriggeredRef.current) {
                              longPressTriggeredRef.current = false;
                              return;
                            }
                            handleEdit(i);
                          }}
                          onTouchStart={() => {
                            longPressTriggeredRef.current = false;
                            if (longPressTimeoutRef.current !== null) {
                              window.clearTimeout(longPressTimeoutRef.current);
                            }
                            longPressTimeoutRef.current = window.setTimeout(
                              () => {
                                longPressTriggeredRef.current = true;
                                setPreviewIscritto(i);
                              },
                              500,
                            );
                          }}
                          onTouchEnd={() => {
                            if (longPressTimeoutRef.current !== null) {
                              window.clearTimeout(longPressTimeoutRef.current);
                              longPressTimeoutRef.current = null;
                            }
                          }}
                          onTouchMove={() => {
                            if (longPressTimeoutRef.current !== null) {
                              window.clearTimeout(longPressTimeoutRef.current);
                              longPressTimeoutRef.current = null;
                            }
                          }}
                          onTouchCancel={() => {
                            if (longPressTimeoutRef.current !== null) {
                              window.clearTimeout(longPressTimeoutRef.current);
                              longPressTimeoutRef.current = null;
                            }
                          }}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-slate-200 ring-1 ring-slate-700/60">
                              {i.photoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={i.photoUrl}
                                  alt={`${i.nome} ${i.cognome}`}
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                              ) : (
                                <span>
                                  {`${i.nome?.[0] ?? ""}${i.cognome?.[0] ?? ""}`.toUpperCase()}
                                </span>
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-slate-100">
                                {i.nome} {i.cognome}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-shrink-0 items-center gap-3">
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${
                                i.stato === "Attivo"
                                  ? "bg-emerald-400"
                                  : i.stato === "Arretrato"
                                    ? "bg-rose-500"
                                    : "bg-amber-300"
                              }`}
                              title={i.stato}
                            />

                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 disabled:opacity-60"
                              onClick={(e) => {
                                e.stopPropagation();
                                setUploadTarget(i);
                                setSelezionato(i);
                                setPhotoFile(null);
                                setPhotoPreview(null);
                                setPhotoError(null);
                                setPhotoSuccess(null);
                                if (mobileFileInputRef.current) {
                                  mobileFileInputRef.current.value = "";
                                  mobileFileInputRef.current.click();
                                }
                              }}
                              disabled={photoUploading}
                              aria-label="Carica foto"
                            >
                              📷
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <input
                    ref={mobileFileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file || !uploadTarget) return;
                      void uploadPhotoForUser(uploadTarget, file);
                      // reset target dopo l'upload
                      setUploadTarget(null);
                      if (mobileFileInputRef.current) {
                        mobileFileInputRef.current.value = "";
                      }
                    }}
                  />
                </div>
              )}
            </div>

            {/* Tabella desktop */}
            <div className="hidden overflow-hidden rounded-lg border border-white/10 bg-slate-950/60 sm:block">
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
                        className="px-4 py-6 text-center text-sm text-slate-400"
                      >
                        Caricamento iscritti in corso…
                      </td>
                    </tr>
                  ) : errorIscritti ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-6 text-center text-sm text-rose-300"
                      >
                        {errorIscritti}
                      </td>
                    </tr>
                  ) : iscrittiFiltrati.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-6 text-center text-sm text-slate-400"
                      >
                        Nessun iscritto presente. Aggiungi il primo utilizzando
                        il modulo qui a fianco.
                      </td>
                    </tr>
                  ) : (
                    iscrittiFiltrati.map((i) => {
                      const isSelected = selezionato?.id === i.id;

                      return (
                        <tr
                          key={i.id}
                          onClick={() => handleEdit(i)}
                          className={`cursor-pointer border-t border-white/5 odd:bg-slate-950/40 hover:bg-slate-900/60 ${
                            isSelected ? "bg-sky-700/40" : ""
                          }`}
                        >
                          <td className="px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-slate-200 ring-1 ring-slate-700/60">
                                {i.photoUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={i.photoUrl}
                                    alt={`${i.nome} ${i.cognome}`}
                                    className="h-10 w-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <span>
                                    {`${i.nome?.[0] ?? ""}${i.cognome?.[0] ?? ""}`.toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div>
                                <div className="font-medium">
                                  {i.nome} {i.cognome}
                                </div>
                                <div className="text-slate-400 text-[12px] sm:text-sm">
                                  {i.email || "—"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base">
                            {i.corso}
                          </td>
                          <td className="hidden px-3 py-2 sm:py-3 md:table-cell sm:px-4 text-sm sm:text-base">
                            {i.livello}
                          </td>
                          <td className="px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base">
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
                          <td className="px-3 py-2 text-right text-sm sm:text-base sm:px-4 sm:py-3">
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
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Pannello dettaglio/modifica: solo desktop/tablet largo */}
          <section className="hidden w-full rounded-xl border border-emerald-500/30 bg-slate-900/60 p-4 shadow-lg backdrop-blur lg:block lg:w-80">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">
                {selezionato ? "Dettaglio iscritto" : "Nuovo iscritto"}
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

            {selezionato && (
              <div className="mb-4 flex flex-col items-center text-center">
                <div className="h-24 w-24 rounded-full border border-emerald-400/60 bg-slate-900/80 shadow-md flex items-center justify-center overflow-hidden">
                  {selezionato.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selezionato.photoUrl}
                      alt={`${selezionato.nome} ${selezionato.cognome}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-semibold text-emerald-200">
                      {`${selezionato.nome?.[0] ?? ""}${selezionato.cognome?.[0] ?? ""}`.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-100">
                  {selezionato.nome} {selezionato.cognome}
                </div>
                <div className="text-[11px] text-slate-400">
                  {selezionato.email || "—"}
                </div>
              </div>
            )}

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

            {/* Sezione upload foto: versione mobile, mostrata sotto la lista */}
            <div className="mt-4 border-t border-emerald-500/20 pt-3 text-[11px] text-slate-300 lg:hidden">
              <h3 className="text-xs font-semibold text-slate-100">
                Foto profilo (mobile)
              </h3>
              <p className="mt-1">
                Seleziona un iscritto dalla lista e carica la sua foto profilo.
              </p>

              {(photoPreview || selezionato?.photoUrl) && (
                <div className="mt-3 flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoPreview ?? selezionato?.photoUrl ?? ""}
                    alt={
                      selezionato
                        ? `Foto di ${selezionato.nome} ${selezionato.cognome}`
                        : "Anteprima foto profilo"
                    }
                    className="h-24 w-24 rounded-full border border-emerald-400/60 object-cover shadow-md"
                  />
                </div>
              )}

              <div className="mt-3 space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="block w-full text-[11px] text-slate-200 file:mr-2 file:rounded-md file:border-0 file:bg-emerald-500 file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:text-slate-950 hover:file:bg-emerald-400"
                />

                <button
                  type="button"
                  onClick={handlePhotoUpload}
                  disabled={photoUploading}
                  className="inline-flex w-full items-center justify-center rounded-md bg-emerald-500 px-3 py-2 text-[11px] font-semibold text-slate-950 shadow-md shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {photoUploading ? "Caricamento..." : "Carica foto profilo"}
                </button>

                {photoError && (
                  <p className="text-[11px] text-rose-300">{photoError}</p>
                )}
                {photoSuccess && (
                  <p className="text-[11px] text-emerald-300">{photoSuccess}</p>
                )}
              </div>
            </div>

            {/* Sezione upload foto: versione desktop nella sidebar */}
            <div className="mt-6 hidden border-t border-emerald-500/20 pt-4 lg:block">
              <h3 className="text-sm font-semibold text-slate-100">
                Foto profilo utente
              </h3>
              <p className="mt-1 text-[11px] text-slate-400">
                Carica la foto profilo collegata all&apos;utente attualmente
                autenticato.
              </p>

              {(photoPreview || selezionato?.photoUrl) && (
                <div className="mt-3 flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoPreview ?? selezionato?.photoUrl ?? ""}
                    alt={
                      selezionato
                        ? `Foto di ${selezionato.nome} ${selezionato.cognome}`
                        : "Anteprima foto profilo"
                    }
                    className="h-32 w-32 rounded-full border border-emerald-400/60 object-cover shadow-md"
                  />
                </div>
              )}

              <div className="mt-3 space-y-2 text-[11px]">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="block w-full text-[11px] text-slate-200 file:mr-2 file:rounded-md file:border-0 file:bg-emerald-500 file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:text-slate-950 hover:file:bg-emerald-400"
                />

                <button
                  type="button"
                  onClick={handlePhotoUpload}
                  disabled={photoUploading}
                  className="inline-flex w-full items-center justify-center rounded-md bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {photoUploading ? "Caricamento..." : "Carica foto profilo"}
                </button>

                {photoError && (
                  <p className="text-[11px] text-rose-300">{photoError}</p>
                )}
                {photoSuccess && (
                  <p className="text-[11px] text-emerald-300">{photoSuccess}</p>
                )}
              </div>
            </div>
          </section>
      </main>

      {/* Modale anteprima foto (mobile + desktop) */}
      {previewIscritto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6"
          onClick={() => setPreviewIscritto(null)}
        >
          <div
            className="max-w-sm w-full rounded-2xl bg-slate-900/95 p-4 text-center shadow-xl ring-1 ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 text-sm font-medium text-slate-100">
              {previewIscritto.nome} {previewIscritto.cognome}
            </div>
            <div className="mx-auto mb-4 flex h-64 w-64 items-center justify-center overflow-hidden rounded-2xl bg-slate-800 text-4xl font-semibold text-slate-200 ring-1 ring-slate-700/60">
              {previewIscritto.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewIscritto.photoUrl}
                  alt={`${previewIscritto.nome} ${previewIscritto.cognome}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>
                  {`${previewIscritto.nome?.[0] ?? ""}${
                    previewIscritto.cognome?.[0] ?? ""
                  }`.toUpperCase()}
                </span>
              )}
            </div>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-emerald-950 shadow hover:bg-emerald-400"
              onClick={() => setPreviewIscritto(null)}
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

