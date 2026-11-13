import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Suscripta | Recordatorios Inteligentes por WhatsApp",
  description: "Reduce el churn y aumenta la retención con recordatorios automatizados de WhatsApp, usando tu propio número.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${inter.variable} antialiased selection:bg-emerald-500/30 selection:text-emerald-50`}
      >
        {children}
      </body>
    </html>
  );
}
