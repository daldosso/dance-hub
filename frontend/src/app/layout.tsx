import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dance Hub - Gestione iscritti scuola di ballo",
  description:
    "Pannello Dance Hub per gestire iscritti, profili e foto degli utenti della scuola di ballo.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className="antialiased">{children}</body>
    </html>
  );
}

