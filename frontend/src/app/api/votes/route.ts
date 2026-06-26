import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const voteSchema = z.object({
  ballotKey: z.string().min(8).max(64),
  selectedNumbers: z.array(z.number().int().positive()).max(5),
});

const allowedTitles = new Map<number, string>([
  [1, "SIGLA"],
  [2, "LISCIO"],
  [3, "CARAIBICO Base Bachata"],
  [4, "CARAIBICO Base Salsa"],
  [5, "BALLI DI GRUPPO 1"],
  [6, "KIZOMBA"],
  [7, "MARGARETH"],
  [8, "ZUMBA 1"],
  [10, "3 FRATELLINI"],
  [11, "CARAIBICO INTERMEDIO 1 BACHATA"],
  [12, "CARAIBICO INTERMEDIO 1 SALSA"],
  [13, "LADY CHARM"],
  [14, "MINI CHARM"],
  [15, "Zumba 2"],
  [16, "JANETTE"],
  [18, "DANZA MODERNA"],
  [19, "BALLI DI GRUPPO 2"],
  [20, "SHINE BACHATA"],
  [21, "SHINE SALSA"],
  [22, "SHINE MERENGUE"],
  [
    23,
    "AGONISTI SUL PALCO IN ABITO DA BALLO (LISA, GIULIA, LETY, MICHAEL, DANIELE, JANY, GINNY, RAMONA, NEIDES, DANY E FABIO, ANDREA, SVEVA, GAIA, GIULIA G., MARICLA)",
  ],
  [24, "CARAIBICO INTERMEDIO/AVANZATO BACHATA"],
  [25, "CARAIBICO INTERMEDIO/AVANZATO SALSA"],
  [26, "HEELS"],
  [27, "NICOLE E SVEVA"],
  [28, "SQUINTERNATI"],
  [29, "CREW CHARM"],
  [30, "RICCARDO E PAMELA"],
  [31, "BALLI DI GRUPPO 3"],
  [32, "DANIELE E MARICLA"],
  [33, "DUO BACHATA"],
  [34, "DUO MERENGUE"],
  [35, "ANNA E FRA"],
  [36, "CLAUDIO E STEFY"],
  [37, "COREOGRAFICO"],
  [38, "DANY E FABIO BACHATA"],
  [39, "DANY E FABIO MERENGUE"],
  [40, "LISA"],
  [41, "SUPERAVANZATO GRUPPO 1"],
  [42, "SUPERAVANZATO GRUPPO 2"],
  [43, "GIULIA"],
  [44, "MARAGARETH"],
]);

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = voteSchema.parse(raw);

    const uniqueNumbers = parsed.selectedNumbers.filter(
      (value, index, array) => array.indexOf(value) === index,
    );
    const selectedTitles = uniqueNumbers.map((number) => {
      const title = allowedTitles.get(number);
      if (!title) {
        throw new Error(`Numero non valido: ${number}`);
      }

      return title;
    });

    if (uniqueNumbers.length === 0) {
      return NextResponse.json(
        { error: "Seleziona almeno un elemento" },
        { status: 400 },
      );
    }

    const record = await prisma.vote_ballots.upsert({
      where: {
        ballot_key: parsed.ballotKey,
      },
      update: {
        selected_numbers: uniqueNumbers,
        selected_titles: selectedTitles,
        updated_at: new Date(),
      },
      create: {
        ballot_key: parsed.ballotKey,
        selected_numbers: uniqueNumbers,
        selected_titles: selectedTitles,
      },
    });

    return NextResponse.json({
      id: Number(record.id),
      ballotKey: record.ballot_key,
      selectedNumbers: record.selected_numbers,
      selectedTitles: record.selected_titles,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Errore nel salvataggio del voto";

    return NextResponse.json(
      {
        error: "Errore nel salvataggio del voto",
        details: message,
      },
      { status: 400 },
    );
  }
}
