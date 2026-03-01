"use client";

import { useMemo } from "react";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { createRpc } from "@lightprotocol/stateless.js";
import { IDL } from "@/lib/idl";
import { SOLANA_RPC_URL } from "@/lib/constants";

export function useKliraProgram() {
  const { connection } = useConnection();
  const anchorWallet = useAnchorWallet();
  const publicKeyStr = anchorWallet?.publicKey?.toBase58() ?? null;

  const program = useMemo(() => {
    if (!anchorWallet) return null;
    const provider = new AnchorProvider(connection, anchorWallet, {
      commitment: "confirmed",
    });
    return new Program(IDL, provider);
  }, [connection, publicKeyStr]);

  const rpc = useMemo(
    () => createRpc(SOLANA_RPC_URL, SOLANA_RPC_URL, SOLANA_RPC_URL),
    []
  );

  return { program, rpc, wallet: anchorWallet, connection };
}
