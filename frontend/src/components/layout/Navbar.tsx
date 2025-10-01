"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { cn, shortenAddress } from "@/lib/utils";
import CyberButton from "@/components/ui/CyberButton";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/trade", label: "Trade" },
  { href: "/orders", label: "Orders" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { connected, publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-cyber-black/80 backdrop-blur-md border-b border-neon-cyan/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="font-orbitron font-bold text-xl text-neon-cyan text-glow-cyan group-hover:text-white transition-colors">
              KLIRA
            </span>
          </Link>

          {/* Navigation Links (desktop) */}
          <div className="hidden sm:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-4 py-2 text-sm font-jetbrains uppercase tracking-wider transition-all duration-300",
                  pathname === link.href
                    ? "text-neon-cyan text-glow-cyan"
                    : "text-white/50 hover:text-neon-cyan"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Wallet Button + Mobile Hamburger */}
          <div className="flex items-center gap-3">
            {connected && publicKey ? (
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline text-xs font-jetbrains text-neon-green">
                  {shortenAddress(publicKey.toBase58())}
                </span>
                <CyberButton
                  variant="ghost"
                  size="sm"
                  onClick={disconnect}
                >
                  Disconnect
                </CyberButton>
              </div>
            ) : (
              <CyberButton
                variant="primary"
                size="sm"
                onClick={() => setVisible(true)}
              >
                Connect Wallet
              </CyberButton>
            )}

            {/* Hamburger button (mobile only) */}
            <button
              type="button"
              className="sm:hidden flex items-center justify-center w-9 h-9 text-white/60 hover:text-neon-cyan transition-colors"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-neon-cyan/10 bg-cyber-black/95 backdrop-blur-md">
          <div className="px-4 py-3 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block px-3 py-2 text-sm font-jetbrains uppercase tracking-wider transition-all duration-200 rounded-sm",
                  pathname === link.href
                    ? "text-neon-cyan bg-neon-cyan/10"
                    : "text-white/50 hover:text-neon-cyan hover:bg-white/5"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
