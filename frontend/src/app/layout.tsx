import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Orbitron } from "next/font/google";
import WalletProvider from "@/providers/WalletProvider";
import OrdersProvider from "@/providers/OrdersProvider";
import { ToastProvider } from "@/components/ui/Toast";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Klira — Rent-Free Limit Orders on Solana",
  description:
    "Place limit orders on Solana without paying rent. Powered by ZK compression and Jupiter aggregator.",
  keywords: ["Solana", "DeFi", "limit orders", "ZK compression", "Jupiter", "DEX"],
  openGraph: {
    title: "Klira — Rent-Free Limit Orders on Solana",
    description:
      "Place limit orders on Solana without paying rent. Powered by ZK compression and Jupiter aggregator.",
    type: "website",
    siteName: "Klira",
  },
  twitter: {
    card: "summary_large_image",
    title: "Klira — Rent-Free Limit Orders on Solana",
    description:
      "Place limit orders on Solana without paying rent. Powered by ZK compression and Jupiter aggregator.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable} ${orbitron.variable}`}>
      <body className="scanline-overlay cyber-grid-bg min-h-screen flex flex-col">
        <ErrorBoundary>
          <WalletProvider>
            <ToastProvider>
              <OrdersProvider>
                <Navbar />
                <main className="flex-1 pt-16">{children}</main>
                <Footer />
              </OrdersProvider>
            </ToastProvider>
          </WalletProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
