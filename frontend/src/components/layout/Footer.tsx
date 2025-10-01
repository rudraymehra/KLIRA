export default function Footer() {
  return (
    <footer className="border-t border-neon-cyan/10 bg-cyber-black/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-orbitron font-bold text-neon-cyan text-glow-cyan">
              KLIRA
            </span>
            <span className="text-xs text-white/30 font-jetbrains">
              {process.env.NEXT_PUBLIC_APP_VERSION || "v1.0.0"}
            </span>
          </div>

          <p className="text-xs text-white/20 font-jetbrains">
            Rent-free limit orders on Solana via ZK compression
          </p>

          <div className="flex items-center gap-4">
            <a
              href="https://github.com/klira-protocol"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-white/30 hover:text-neon-cyan transition-colors font-jetbrains"
            >
              GitHub
            </a>
            <a
              href="https://x.com/klira_protocol"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-white/30 hover:text-neon-cyan transition-colors font-jetbrains"
            >
              Twitter
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
