import type { Metadata, Viewport } from "next";
import { Righteous, Inter } from "next/font/google";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/constants";
import { RegisterServiceWorker } from "@/components/RegisterServiceWorker";
import "./globals.css";

// Righteous : police ronde "affiche des années 70", uniquement en graisse normale.
const righteous = Righteous({
  subsets: ["latin"],
  variable: "--font-righteous",
  weight: "400",
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
  // Couleur de la barre du navigateur : papier crème en clair, nuit en sombre.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5ECD7" },
    { media: "(prefers-color-scheme: dark)", color: "#0A1030" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${righteous.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-cream font-sans text-ink antialiased">
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}
