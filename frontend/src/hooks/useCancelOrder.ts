"use client";

import { useState, useCallback } from "react";
import {
  ComputeBudgetProgram,
  TransactionMessage,
  VersionedTransaction,
  PublicKey,
} from "@solana/web3.js";
import { bn } from "@lightprotocol/stateless.js";
import { useKliraProgram } from "./useKliraProgram";
import { parseEscrowFromBuffer } from "@/lib/escrow";
import { ADDRESS_TREE, ADDRESS_QUEUE, CLOSE_ACCOUNTS } from "@/lib/program";
import { updateOrderStatus } from "@/lib/order-store";

export function useCancelOrder() {
  const { program, rpc, wallet } = useKliraProgram();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancelOrder = useCallback(
    async (escrowAddress: string): Promise<string | null> => {
      if (!program || !wallet.publicKey || !wallet.signTransaction) {
        setError("Wallet not connected");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const address = new PublicKey(escrowAddress);

        // Fetch compressed account
        const compressedAccount = await rpc.getCompressedAccount(
          bn(address.toBytes())
        );

        if (!compressedAccount) {
          throw new Error("Order not found on-chain");
        }

        // Get proof
        const proof = await rpc.getValidityProofV0(
          [
            {
              hash: compressedAccount.hash,
              tree: ADDRESS_TREE,
              queue: ADDRESS_QUEUE,
            },
          ],
          []
        );

        if (!proof.compressedProof) throw new Error("Missing compressed proof");
        const validityProof = proof.compressedProof;

        if (!compressedAccount.data?.data) throw new Error("Missing escrow account data");
        const escrowData = parseEscrowFromBuffer(
          Buffer.from(compressedAccount.data.data)
        );

        // Verify the connected wallet is the order maker
        if (!escrowData.maker.equals(wallet.publicKey)) {
          setError("You can only cancel your own orders");
          setLoading(false);
          return null;
        }

        // Build cancel instruction
        const instruction = await program.methods
          .cancelOrder({
            escrowAccount: {
              uniqueId: escrowData.uniqueId,
              maker: wallet.publicKey,
              amount: {
                makingAmount: escrowData.amount.makingAmount,
                takingAmount: escrowData.amount.takingAmount,
                oriMakingAmount: escrowData.amount.oriMakingAmount,
                oriTakingAmount: escrowData.amount.oriTakingAmount,
              },
              expiredAt: escrowData.expiredAt,
              feeBps: escrowData.feeBps,
              createdAt: escrowData.createdAt,
              updatedAt: escrowData.updatedAt,
            },
            proof: {
              0: {
                a: validityProof.a,
                b: validityProof.b,
                c: validityProof.c,
              },
            },
            treeInfo: {
              rootIndex: proof.rootIndices[0],
              merkleTreePubkeyIndex: 0,
              queuePubkeyIndex: 1,
              proveByIndex: false,
              leafIndex: compressedAccount.leafIndex,
            },
            outputStateTreeIndex: 0,
          })
          .accounts({
            payer: wallet.publicKey,
            maker: wallet.publicKey,
            inputMint: escrowData.tokens.inputMint,
            outputMint: escrowData.tokens.outputMint,
            inputTokenProgram: escrowData.tokens.inputTokenProgram,
            outputTokenProgram: escrowData.tokens.outputTokenProgram,
          })
          .remainingAccounts(CLOSE_ACCOUNTS)
          .instruction();

        const latestBlockhash = await rpc.getLatestBlockhash();
        const message = new TransactionMessage({
          payerKey: wallet.publicKey,
          recentBlockhash: latestBlockhash.blockhash,
          instructions: [
            ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10_000 }),
            instruction,
          ],
        }).compileToV0Message();

        const tx = new VersionedTransaction(message);
        const signed = await wallet.signTransaction(tx);
        const sig = await rpc.sendRawTransaction(signed.serialize());

        // Wait for transaction confirmation before updating state
        await rpc.confirmTransaction(sig);

        // Update localStorage
        updateOrderStatus(escrowAddress, "cancelled");

        setLoading(false);
        return sig;
      } catch (err: any) {
        console.error("Cancel order error:", err);
        setError(err.message || "Cancel failed");
        setLoading(false);
        return null;
      }
    },
    [program, rpc, wallet]
  );

  return { cancelOrder, loading, error };
}
