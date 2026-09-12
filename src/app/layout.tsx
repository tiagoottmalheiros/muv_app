import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { AppProvider } from "@/components/app-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "APP MUV", template: "%s | APP MUV" },
  description: "Em até 2 horas, construa seu primeiro Filtro Anti-Curiosos com IA para identificar dor, urgência e perfil antes do próximo passo comercial.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};
export const viewport: Viewport = {
  themeColor: "#020617",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
        <body className="min-h-full">
          <ClerkProvider appearance={{ options: { logoImageUrl: "/logo-muv-email.png" } }}>
            <AppProvider>{children}</AppProvider>
          </ClerkProvider>
          <Script src="/meta-events.js" strategy="afterInteractive" />
        </body>
    </html>
  );
}
