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
  dataNascita?: string;
  luogoNascita?: string;
  codiceFiscale?: string;
  sesso?: string;
  numeroDocumento?: string;
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

type OcrBox = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

type OcrWord = {
  text: string;
  confidence: number;
  bbox: OcrBox;
};

type OcrLine = {
  words?: OcrWord[];
  text: string;
  confidence: number;
  bbox: OcrBox;
};

type OcrParagraph = {
  lines: OcrLine[];
};

type OcrBlock = {
  paragraphs: OcrParagraph[];
};

type OcrPage = {
  text: string;
  blocks: OcrBlock[] | null;
};

type IdentityDocumentData = {
  nome: string;
  cognome: string;
  luogoNascita: string;
  sesso: string;
  numeroDocumento: string;
  dataNascita: string;
  codiceFiscale: string;
};

type OcrRectangle = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type OcrPartialIdentity = Partial<Pick<IdentityDocumentData, "nome" | "cognome">>;

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
  const [documentScanFile, setDocumentScanFile] = useState<File | null>(null);
  const [documentScanPreview, setDocumentScanPreview] = useState<string | null>(
    null,
  );
  const [documentScanProcessing, setDocumentScanProcessing] = useState(false);
  const [documentScanProgress, setDocumentScanProgress] = useState<number | null>(
    null,
  );
  const [documentScanError, setDocumentScanError] = useState<string | null>(
    null,
  );
  const [documentScanSuccess, setDocumentScanSuccess] = useState<string | null>(
    null,
  );

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
    dataNascita: "",
    luogoNascita: "",
    codiceFiscale: "",
    sesso: "",
    numeroDocumento: "",
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

  useEffect(() => {
    return () => {
      if (documentScanPreview) {
        URL.revokeObjectURL(documentScanPreview);
      }
    };
  }, [documentScanPreview]);

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
    const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();

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

        const res = await fetch(`${apiBase}/api/users`, {
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
    const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();

    async function loadCourses() {
      try {
        const res = await fetch(`${apiBase}/api/courses`);
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

  function normalizeOcrText(text: string) {
    return text
      .replace(/\r/g, "\n")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();
  }

  function normalizeOcrLine(line: string) {
    return line
      .replace(/\u00A0/g, " ")
      .replace(/[^A-Z0-9À-ÿ\s:./'<>-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isLikelyLabel(line: string) {
    return /^(REPUBBLICA|ITALIANA|CARTA|IDENTITA|DOCUMENTO|COGNOME|NOME|NATO|NATA|SESSO|DATA|LUOGO|FISCALE|CODICE|SCADENZA|RILASCIO|COMUNE|PROVINCIA|NAZIONALITA|HEIGHT|SEX)\b/.test(
      line,
    );
  }

  function stripDocumentLabels(value: string) {
    return value
      .replace(
        /\b(COGNOME|SURNAME|NOME|NAME|LUOGO|PLACE|DATA|DATE|NASCITA|BIRTH|SESSO|SEX|CITTADINANZA|NATIONALITY|EMISSIONE|ISSUING|SCADENZA|EXPIRY|FIRMA|SIGNATURE|STATURA|HEIGHT|DOCUMENTO|DOC\.?|CODICE|FISCALE|IDENTITY|CARD|CARTA|DI|DEL|DELLA|DELL')\b/g,
        " ",
      )
      .replace(/[\/|]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function stripMrzPrefix(value: string) {
    return value.replace(/^(?:I<|I|ID|IT|ITA|CIE|P<|P)+/, "");
  }

  function collectOcrLines(page: OcrPage) {
    const blocks = Array.isArray(page.blocks) ? page.blocks : [];
    const lines = blocks
      .flatMap((block) => block.paragraphs)
      .flatMap((paragraph) => paragraph.lines)
      .filter((line) => line.text.trim().length > 0)
      .sort((a, b) => {
        const yDelta = a.bbox.y0 - b.bbox.y0;
        if (Math.abs(yDelta) > 12) return yDelta;
        return a.bbox.x0 - b.bbox.x0;
      });

    return lines;
  }

  function isCrediblePersonValue(value: string) {
    const normalized = stripDocumentLabels(value)
      .replace(/[’']/g, "'")
      .replace(/\s+/g, " ")
      .trim();

    if (!normalized) return false;
    if (/\d/.test(normalized)) return false;

    const words = normalized.split(" ").filter(Boolean);
    if (words.length === 0 || words.length > 4) return false;

    const alphaWords = words.filter((word) => /[A-ZÀ-ÿ]/.test(word));
    if (alphaWords.length === 0) return false;

    if (alphaWords.length === 1 && alphaWords[0].length === 1) return false;

    const lettersOnly = normalized.replace(/[^A-ZÀ-ÿ]/g, "");
    if (lettersOnly.length < 3) return false;
    if (!/[AEIOU]/.test(lettersOnly)) return false;

    return true;
  }

  function extractMrzIdentityData(text: string): OcrPartialIdentity {
    const lines = normalizeOcrText(text)
      .split("\n")
      .map(normalizeOcrLine)
      .filter(Boolean);

    for (const line of lines) {
      const compact = line.replace(/\s+/g, "");
      const mrzSplitIndex = compact.indexOf("<<");
      if (mrzSplitIndex < 0) continue;
      if ((compact.match(/</g) ?? []).length < 3) continue;

      const leftTokens = compact.slice(0, mrzSplitIndex).split("<").filter(Boolean);
      const rightTokens = compact.slice(mrzSplitIndex + 2).split("<").filter(Boolean);
      if (leftTokens.length === 0 || rightTokens.length === 0) continue;

      const surnameTokens = leftTokens.slice(-2);
      const surname = surnameTokens
        .map((token, index) => (index === 0 ? stripMrzPrefix(token) : token))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      const nome = rightTokens
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (surname || nome) {
        return {
          nome: isCrediblePersonValue(nome) ? nome : "",
          cognome: isCrediblePersonValue(surname) ? surname : "",
        };
      }
    }

    return {};
  }

  function extractLineAfterLabel(
    lines: OcrLine[],
    labelRegexes: RegExp[],
    validator?: (value: string) => boolean,
    stopRegexes: RegExp[] = [],
  ) {
    for (let index = 0; index < lines.length; index += 1) {
      const line = normalizeOcrLine(lines[index].text ?? "");
      if (!labelRegexes.some((regex) => regex.test(line))) continue;

      const inlineValue = stripDocumentLabels(line);
      if (
        inlineValue &&
        !isLikelyLabel(inlineValue) &&
        (!validator || validator(inlineValue))
      ) {
        return inlineValue;
      }

      const baseY = lines[index].bbox.y1;
      const baseX = lines[index].bbox.x0;

      for (let offset = 1; offset <= 4; offset += 1) {
        const candidateLine = lines[index + offset];
        if (!candidateLine) continue;

        const candidate = stripDocumentLabels(
          normalizeOcrLine(candidateLine.text ?? ""),
        );
        if (!candidate) continue;
        if (stopRegexes.some((regex) => regex.test(candidate))) break;

        const candidateY = candidateLine.bbox.y0;
        if (candidateY - baseY > 120) break;

        const candidateX = candidateLine.bbox.x0;
        if (Math.abs(candidateX - baseX) > 320) continue;

        if (isLikelyLabel(candidate)) continue;
        if (validator && !validator(candidate)) continue;
        return candidate;
      }
    }

    return null;
  }

  function formatDateForInput(rawDate: string | null) {
    if (!rawDate) return "";

    const match = rawDate.match(/^(\d{2})[./-](\d{2})[./-](\d{2,4})$/);
    if (!match) return "";

    const day = match[1];
    const month = match[2];
    const yearToken = match[3];
    const year =
      yearToken.length === 2
        ? Number(yearToken) > 30
          ? `19${yearToken}`
          : `20${yearToken}`
        : yearToken;

    return `${year}-${month}-${day}`;
  }

  async function prepareDocumentForOcr(file: File) {
    const bitmap = await createImageBitmap(file);
    const maxDimension = 2000;
    const scale = Math.min(2, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      bitmap.close();
      return canvas;
    }

    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const imageData = context.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    // Aumenta contrasto e converte in grigio per aiutare Tesseract sui documenti stampati.
    for (let index = 0; index < pixels.length; index += 4) {
      const gray =
        pixels[index] * 0.299 +
        pixels[index + 1] * 0.587 +
        pixels[index + 2] * 0.114;
      pixels[index] = gray;
      pixels[index + 1] = gray;
      pixels[index + 2] = gray;
    }

    context.putImageData(imageData, 0, 0);
    return canvas;
  }

  function extractIdentityDocumentData(page: OcrPage): IdentityDocumentData {
    const normalizedText = normalizeOcrText(page.text ?? "");
    const mrz = extractMrzIdentityData(normalizedText);
    const ocrLines = collectOcrLines(page);
    const lines =
      ocrLines.length > 0
        ? ocrLines
        : normalizedText
            .split("\n")
            .map((line) => ({
              text: normalizeOcrLine(line),
              confidence: 0,
              bbox: { x0: 0, y0: 0, x1: 0, y1: 0 },
            }))
            .filter((line) => line.text.length > 0);

    const nome =
      (mrz.nome ||
      extractLineAfterLabel(
        lines,
        [/\bNOME\b/, /\bNAME\b/],
        isCrediblePersonValue,
        [/\bLUOGO\b/, /\bPLACE\b/, /\bSESSO\b/, /\bSEX\b/, /\bCITTADINANZA\b/, /\bNATIONALITY\b/],
      )) ?? "";
    const cognome =
      (mrz.cognome ||
      extractLineAfterLabel(
        lines,
        [/\bCOGNOME\b/, /\bSURNAME\b/],
        isCrediblePersonValue,
        [/\bNOME\b/, /\bNAME\b/, /\bLUOGO\b/, /\bPLACE\b/, /\bSESSO\b/, /\bSEX\b/],
      )) ?? "";

    const birthLine =
      extractLineAfterLabel(
        lines,
        [
          /\bLUOGO E DATA DI NASCITA\b/,
          /\bPLACE AND DATE OF BIRTH\b/,
          /\bLUOGO DI NASCITA\b/,
          /\bNATO A\b/,
          /\bNATA A\b/,
        ],
        undefined,
        [/\bSESSO\b/, /\bSEX\b/, /\bCITTADINANZA\b/, /\bNATIONALITY\b/],
      ) ?? "";
    const luogoNascita =
      stripDocumentLabels(birthLine)
        .replace(/\b\d{2}[./-]\d{2}[./-]\d{2,4}\b.*/, "")
        .replace(/\b(?:ITALIANA|ITALIANO)\b/g, " ")
        .trim();

    const sessoLine =
      extractLineAfterLabel(lines, [/\bSESSO\b/, /\bSEX\b/]) ?? "";
    const sesso =
      stripDocumentLabels(sessoLine).match(/\b(M|F|X)\b/)?.[1] ?? "";

    const numeroDocumento =
      stripDocumentLabels(
        extractLineAfterLabel(lines, [/\bDOCUMENTO\b/, /\bDOC\.?\b/]) ?? "",
      );

    const dataNascitaMatch = normalizedText.match(
      /\b(\d{2}[./-]\d{2}[./-]\d{2,4})\b/,
    );
    const dataNascita = formatDateForInput(dataNascitaMatch?.[1] ?? null);

    const codiceFiscaleMatch = normalizedText.match(
      /\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/,
    );
    const codiceFiscale =
      codiceFiscaleMatch?.[0] ??
      stripDocumentLabels(
        extractLineAfterLabel(lines, [/\bCODICE FISCALE\b/, /\bFISCALE\b/]) ?? "",
      );

    return {
      nome,
      cognome,
      luogoNascita,
      sesso,
      numeroDocumento,
      dataNascita,
      codiceFiscale,
    };
  }

  function mergeIdentityDocumentData(
    primary: IdentityDocumentData,
    secondary: IdentityDocumentData,
  ): IdentityDocumentData {
    return {
      ...primary,
      nome: isCrediblePersonValue(secondary.nome) ? secondary.nome : primary.nome,
      cognome: isCrediblePersonValue(secondary.cognome)
        ? secondary.cognome
        : primary.cognome,
    };
  }

  function applyIdentityDocumentData(
    extracted: ReturnType<typeof extractIdentityDocumentData>,
  ) {
    setForm((prev) => ({
      ...prev,
      nome: extracted.nome || prev.nome,
      cognome: extracted.cognome || prev.cognome,
      dataNascita: extracted.dataNascita || prev.dataNascita || "",
      luogoNascita: extracted.luogoNascita || prev.luogoNascita || "",
      codiceFiscale: extracted.codiceFiscale || prev.codiceFiscale || "",
      sesso: extracted.sesso || prev.sesso || "",
      numeroDocumento: extracted.numeroDocumento || prev.numeroDocumento || "",
    }));
  }

  async function scanIdentityDocument() {
    if (!documentScanFile) {
      setDocumentScanError(
        "Seleziona prima una foto della carta d'identità.",
      );
      return;
    }

    setDocumentScanProcessing(true);
    setDocumentScanError(null);
    setDocumentScanSuccess(null);
    setDocumentScanProgress(0);

    try {
      const { createWorker } = await import("tesseract.js");
      const { PSM } = await import("tesseract.js");
      const worker = await createWorker("ita", 1, {
        logger: (message) => {
          if (typeof message.progress === "number") {
            setDocumentScanProgress(Math.round(message.progress * 100));
          }
        },
      });

      try {
        const preparedDocument = await prepareDocumentForOcr(documentScanFile);
        const headerRectangle: OcrRectangle = {
          left: 0,
          top: 0,
          width: preparedDocument.width,
          height: Math.max(1, Math.round(preparedDocument.height * 0.58)),
        };

        await worker.setParameters({
          tessedit_pageseg_mode: PSM.SPARSE_TEXT,
          preserve_interword_spaces: "1",
        });
        const fullResult = await worker.recognize(
          preparedDocument,
          { rotateAuto: true },
          { text: true, blocks: true },
        );
        await worker.setParameters({
          tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
          preserve_interword_spaces: "1",
        });
        const headerResult = await worker.recognize(
          preparedDocument,
          { rotateAuto: true, rectangle: headerRectangle },
          { text: true, blocks: true },
        );

        const extracted = mergeIdentityDocumentData(
          extractIdentityDocumentData(fullResult.data),
          extractIdentityDocumentData(headerResult.data),
        );
        applyIdentityDocumentData(extracted);

        const filledFields = [
          extracted.nome,
          extracted.cognome,
          extracted.dataNascita,
          extracted.luogoNascita,
          extracted.codiceFiscale,
          extracted.sesso,
          extracted.numeroDocumento,
        ].filter((value) => Boolean(value && value.trim())).length;

        setDocumentScanSuccess(
          filledFields > 0
            ? `Scansione completata: compilati ${filledFields} campi.`
            : "Scansione completata, ma non ho trovato dati affidabili.",
        );
      } finally {
        await worker.terminate();
      }
    } catch (error) {
      console.error("Errore OCR documento", error);
      setDocumentScanError(
        error instanceof Error
          ? error.message
          : "Errore imprevisto durante la scansione del documento.",
      );
    } finally {
      setDocumentScanProcessing(false);
      setDocumentScanProgress(null);
    }
  }

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
      dataNascita: "",
      luogoNascita: "",
      codiceFiscale: "",
      sesso: "",
      numeroDocumento: "",
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

    const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();

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
      const res = await fetch(`${apiBase}/api/users/profile-photo`, {
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
                <h2 className="hidden text-lg font-semibold sm:block">
                  Iscritti
                </h2>
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
                    className="hidden rounded-md border border-white/10 bg-slate-900/60 px-3 py-2 text-xs focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 sm:block sm:w-40"
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

              <div className="rounded-lg border border-white/10 bg-slate-950/30 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                  Dati documento
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-200">
                      Data nascita
                    </label>
                    <input
                      type="date"
                      value={form.dataNascita ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          dataNascita: e.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-xs focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-200">
                      Sesso
                    </label>
                    <input
                      type="text"
                      value={form.sesso ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          sesso: e.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="M / F"
                      className="w-full rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-xs focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-200">
                      Luogo nascita
                    </label>
                    <input
                      type="text"
                      value={form.luogoNascita ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          luogoNascita: e.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-xs focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-200">
                      Codice fiscale
                    </label>
                    <input
                      type="text"
                      value={form.codiceFiscale ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          codiceFiscale: e.target.value.toUpperCase(),
                        }))
                      }
                      className="w-full rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-xs uppercase tracking-[0.12em] focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-[11px] font-medium text-slate-200">
                      Numero documento
                    </label>
                    <input
                      type="text"
                      value={form.numeroDocumento ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          numeroDocumento: e.target.value.toUpperCase(),
                        }))
                      }
                      className="w-full rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-xs uppercase tracking-[0.12em] focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>
                </div>
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

              <div className="rounded-lg border border-sky-400/20 bg-slate-950/40 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[11px] font-semibold uppercase tracking-wide text-sky-200">
                      Scansione carta d&apos;identità
                    </h3>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Carica una foto leggibile del documento e proviamo a
                      compilare automaticamente i dati principali.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void scanIdentityDocument()}
                    disabled={documentScanProcessing || !documentScanFile}
                    className="inline-flex shrink-0 items-center justify-center rounded-md border border-sky-400/40 bg-sky-500/10 px-3 py-1.5 text-[11px] font-semibold text-sky-100 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {documentScanProcessing
                      ? "Scansione..."
                      : "Estrai dati"}
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setDocumentScanError(null);
                      setDocumentScanSuccess(null);

                      if (documentScanPreview) {
                        URL.revokeObjectURL(documentScanPreview);
                      }

                      setDocumentScanFile(file);
                      setDocumentScanPreview(
                        file ? URL.createObjectURL(file) : null,
                      );
                    }}
                    className="block w-full text-[11px] text-slate-200 file:mr-2 file:rounded-md file:border-0 file:bg-sky-500 file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:text-slate-950 hover:file:bg-sky-400"
                  />

                  {documentScanPreview && (
                    <div className="overflow-hidden rounded-lg border border-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={documentScanPreview}
                        alt="Anteprima documento"
                        className="h-36 w-full object-cover"
                      />
                    </div>
                  )}

                  {typeof documentScanProgress === "number" && (
                    <p className="text-[11px] text-sky-200">
                      Elaborazione OCR: {documentScanProgress}%
                    </p>
                  )}

                  {documentScanError && (
                    <p className="text-[11px] text-rose-300">
                      {documentScanError}
                    </p>
                  )}
                  {documentScanSuccess && (
                    <p className="text-[11px] text-emerald-300">
                      {documentScanSuccess}
                    </p>
                  )}
                </div>
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

