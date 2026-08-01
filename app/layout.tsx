import type { Metadata } from "next";
import { Archivo, Geist_Mono } from "next/font/google";
import "./globals.css";

// design.md: Archivo es el sustituto oficial de Roc Grotesk; la jerarquía va por
// peso (400 → 900), no por familia. Geist Mono para códigos, ids y montos.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "La LogIA · roast primero, entrada después",
  description:
    "Un agente que te roastea, te encuentra el show que te mereces en la cartelera real de FreeTicket, y se queda contigo para el próximo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${archivo.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
