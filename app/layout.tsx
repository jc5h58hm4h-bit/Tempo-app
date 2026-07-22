import type { Metadata, Viewport } from "next";
import { Fredoka, Inter } from "next/font/google";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/constants";
import { RegisterServiceWorker } from "@/components/RegisterServiceWorker";
import "./globals.css";

const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
  weight: ["500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover", // nécessaire pour gérer l'encoche / Dynamic Island
  themeColor: "#152A6E",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${fredoka.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-cream font-sans text-ink antialiased">
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}
