import type { Metadata, Viewport } from "next";
import { AppProvider } from "@/components/app-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Central MUV", template: "%s | Central MUV" },
  description: "Instalação guiada do primeiro Filtro Anti-Curiosos do seu negócio.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};
export const viewport: Viewport = { themeColor: "#020617", colorScheme: "dark", width: "device-width", initialScale: 1 };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full"><AppProvider>{children}</AppProvider></body>
    </html>
  );
}
