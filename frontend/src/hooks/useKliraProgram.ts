"use client";

import { useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { createRpc } from "@lightprotocol/stateless.js";
import { IDL } from "@/lib/idl";
import { RPC_URL } from "@/lib/program";

export function useKliraProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const program = useMemo(() => {
    if (!wallet.publicKey) return null;
    const provider = new AnchorProvider(connection, wallet as any, {
      commitment: "confirmed",
    });
    return new Program(IDL, provider);
  }, [connection, wallet?.publicKey?.toString()]);

  const rpc = useMemo(() => createRpc(RPC_URL, RPC_URL, RPC_URL), []);

  return { program, rpc, wallet, connection };
}
