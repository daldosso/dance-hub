import type { Metadata } from "next";
import { VotingBallot } from "./VotingBallot";

export const metadata: Metadata = {
  title: "Voto scaletta saggio 2026",
  description:
    "Pagina pubblica per votare la scaletta del saggio 2026, senza autenticazione.",
};

export default function VotePage() {
  return <VotingBallot />;
}
