"use client";

import { useState, useCallback } from "react";
import {
  PublicKey,
  ComputeBudgetProgram,
  TransactionMessage,
  VersionedTransaction,
  SystemProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  NATIVE_MINT,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
} from "@solana/spl-token";
import { bn } from "@lightprotocol/stateless.js";
import BN from "bn.js";
import { useKliraProgram } from "./useKliraProgram";
import { deriveEscrowAddress } from "@/lib/escrow";
import {
  ADDRESS_TREE,
  ADDRESS_QUEUE,
  INIT_REMAINING_ACCOUNTS,
} from "@/lib/program";
import { saveOrder, type StoredOrder } from "@/lib/order-store";

interface InitOrderInput {
  inputMint: PublicKey;
  outputMint: PublicKey;
  inputSymbol: string;
  outputSymbol: string;
  makingAmount: BN;
  takingAmount: BN;
  expiredAt: BN | null;
}

export function useInitOrder() {
  const { program, rpc, wallet, connection } = useKliraProgram();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initOrder = useCallback(
    async (input: InitOrderInput): Promise<string | null> => {
      if (!program || !wallet?.publicKey || !wallet?.signTransaction) {
        setError("Wallet not connected");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const randomBytes = new Uint8Array(8);
        crypto.getRandomValues(randomBytes);
        const uniqueId = new BN(randomBytes);
        const maker = wallet.publicKey;

        // Check wallet balance first
        const balance = await connection.getBalance(maker);
        if (balance === 0) {
          setError(
            "Your wallet has 0 SOL on devnet. Get free SOL at faucet.solana.com"
          );
          setLoading(false);
          return null;
        }

        // Detect token program for each mint (supports Token-2022)
        const [inputMintInfo, outputMintInfo] = await Promise.all([
          rpc.getAccountInfo(input.inputMint),
          rpc.getAccountInfo(input.outputMint),
        ]);
        const inputTokenProgram = inputMintInfo?.owner.equals(
          TOKEN_2022_PROGRAM_ID
        )
          ? TOKEN_2022_PROGRAM_ID
          : TOKEN_PROGRAM_ID;
        const outputTokenProgram = outputMintInfo?.owner.equals(
          TOKEN_2022_PROGRAM_ID
        )
          ? TOKEN_2022_PROGRAM_ID
          : TOKEN_PROGRAM_ID;

        // Derive escrow address
        const escrowAddress = deriveEscrowAddress(uniqueId, maker);

        // Get validity proof for new address
        const proof = await rpc.getValidityProofV0(undefined, [
          {
            address: bn(escrowAddress.toBytes()),
            tree: ADDRESS_TREE,
            queue: ADDRESS_QUEUE,
          },
        ]);

        if (!proof.compressedProof) throw new Error("Missing compressed proof");
        const validityProof = proof.compressedProof;

        // Build instruction
        const instruction = await program.methods
          .initializeOrder(
            {
              uniqueId,
              makingAmount: input.makingAmount,
              takingAmount: input.takingAmount,
              expiredAt: input.expiredAt,
            },
            {
              proof: {
                0: {
                  a: validityProof.a,
                  b: validityProof.b,
                  c: validityProof.c,
                },
              },
              addressTreeInfo: {
                addressMerkleTreePubkeyIndex: 0,
                addressQueuePubkeyIndex: 2,
                rootIndex: proof.rootIndices[0],
              },
              outputStateTreeIndex: 1,
            }
          )
          .accounts({
            payer: maker,
            maker: maker,
            inputMint: input.inputMint,
            outputMint: input.outputMint,
            inputTokenProgram,
            outputTokenProgram,
          })
          .remainingAccounts(INIT_REMAINING_ACCOUNTS)
          .instruction();

        // Build pre-instructions for WSOL wrapping if input is native SOL
        const preInstructions: any[] = [];
        const isInputSOL = input.inputMint.equals(NATIVE_MINT);
        let wsolAta: PublicKey | null = null;

        if (isInputSOL) {
          wsolAta = getAssociatedTokenAddressSync(NATIVE_MINT, maker);
          const ataInfo = await rpc.getAccountInfo(wsolAta);

          if (!ataInfo) {
            // Create WSOL ATA if it doesn't exist
            preInstructions.push(
              createAssociatedTokenAccountInstruction(
                maker,
                wsolAta,
                maker,
                NATIVE_MINT
              )
            );
          }

          // Transfer SOL to WSOL ATA (making_amount is in lamports for SOL)
          preInstructions.push(
            SystemProgram.transfer({
              fromPubkey: maker,
              toPubkey: wsolAta,
              lamports: BigInt(input.makingAmount.toString()),
            })
          );

          // Sync native balance so the token account reflects the SOL deposit
          preInstructions.push(createSyncNativeInstruction(wsolAta));
        }

        // Build versioned transaction
        const latestBlockhash = await rpc.getLatestBlockhash();
        const message = new TransactionMessage({
          payerKey: maker,
          recentBlockhash: latestBlockhash.blockhash,
          instructions: [
            ComputeBudgetProgram.setComputeUnitLimit({ units: 500_000 }),
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10_000 }),
            ...preInstructions,
            instruction,
          ],
        }).compileToV0Message();

        const tx = new VersionedTransaction(message);

        // Simulate transaction before requesting wallet signature
        const simulation = await connection.simulateTransaction(tx, {
          sigVerify: false,
          replaceRecentBlockhash: true,
        });
        if (simulation.value.err) {
          console.error(
            "Simulation failed:",
            simulation.value.err,
            simulation.value.logs
          );
          setError(`Transaction simulation failed. Please try again.`);
          setLoading(false);
          return null;
        }

        const signed = await wallet.signTransaction(tx);
        const sig = await rpc.sendRawTransaction(signed.serialize());

        // Wait for transaction confirmation before saving state
        await rpc.confirmTransaction({
          signature: sig,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        });

        // Save to localStorage
        const storedOrder: StoredOrder = {
          id: `kl_${uniqueId.toString().slice(-8)}`,
          escrowAddress: escrowAddress.toBase58(),
          uniqueId: uniqueId.toString(),
          maker: maker.toBase58(),
          inputMint: input.inputMint.toBase58(),
          outputMint: input.outputMint.toBase58(),
          inputSymbol: input.inputSymbol,
          outputSymbol: input.outputSymbol,
          makingAmount: input.makingAmount.toString(),
          takingAmount: input.takingAmount.toString(),
          expiredAt: input.expiredAt ? input.expiredAt.toNumber() * 1000 : 0,
          createdAt: Date.now(),
          status: "open",
          txSignature: sig,
        };
        saveOrder(storedOrder);

        // Register order with the keeper server
        try {
          const apiUrl =
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
          await fetch(`${apiUrl}/v1/orders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              escrowAddress: escrowAddress.toBase58(),
              uniqueId: uniqueId.toString(),
              maker: maker.toBase58(),
              inputMint: input.inputMint.toBase58(),
              outputMint: input.outputMint.toBase58(),
              inputSymbol: input.inputSymbol,
              outputSymbol: input.outputSymbol,
              makingAmount: input.makingAmount.toString(),
              takingAmount: input.takingAmount.toString(),
              expiredAt: input.expiredAt
                ? input.expiredAt.toNumber() * 1000
                : 0,
            }),
          });
        } catch {
          // Non-critical: order is on-chain regardless
          console.warn("Failed to register order with keeper server");
        }

        setLoading(false);
        return sig;
      } catch (err: any) {
        console.error("Init order error:", err);
        setError(err.message || "Transaction failed");
        setLoading(false);
        return null;
      }
    },
    [program, rpc, wallet]
  );

  return { initOrder, loading, error };
}
