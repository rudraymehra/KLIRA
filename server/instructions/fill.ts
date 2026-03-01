import { bn } from "@lightprotocol/stateless.js";
import { payer, program, rpc } from "../app";
import {
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

let _protocolConfig: PublicKey;
function getProtocolConfig() {
  if (!_protocolConfig) {
    [_protocolConfig] = PublicKey.findProgramAddressSync(
      [Buffer.from("protocol_config")],
      program.programId
    );
  }
  return _protocolConfig;
}
import { ADDRESS_QUEUE, ADDRESS_TREE, CLOSE_ACCOUNTS } from "../lib/accounts";
import { parseEscrowFromBuffer } from "../lib/escrow";
import { getComputeUnitsUsed, logger, retryOperation } from "../utils";

function calculateTransactionSize(tx: VersionedTransaction): number {
  const signatureLength = tx.signatures.length * 64;
  const serializedMessage = tx.message.serialize();
  const messageLength = serializedMessage.length;
  return signatureLength + messageLength;
}

export async function fill(
  address: PublicKey,
  fill_type: "full" | "partial",
  instruction_data: any,
  accounts: any[],
  alt: any[]
) {
  const compressed_account = await retryOperation(
    () => rpc.getCompressedAccount(bn(address.toBytes())),
    3,
    1000,
    "getCompressedAccount"
  );

  let proof = await rpc.getValidityProofV0(
    [
      {
        hash: compressed_account.hash,
        tree: ADDRESS_TREE,
        queue: ADDRESS_QUEUE,
      },
    ],
    []
  );

  const validityProof = proof.compressedProof;

  const escrow_data = parseEscrowFromBuffer(compressed_account.data.data);

  const instruction = await program.methods
    .fillOrder({
      swapData: Buffer.from(instruction_data, "base64"),
      escrowAccount: {
        uniqueId: escrow_data.uniqueId,
        amount: {
          makingAmount: escrow_data.amount.makingAmount,
          takingAmount: escrow_data.amount.takingAmount,
          oriMakingAmount: escrow_data.amount.oriMakingAmount,
          oriTakingAmount: escrow_data.amount.oriTakingAmount,
        },
        expiredAt: escrow_data.expiredAt,
        feeBps: escrow_data.feeBps,
        createdAt: escrow_data.createdAt,
        updatedAt: escrow_data.updatedAt,
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
        leafIndex: compressed_account.leafIndex,
      },
      outputStateTreeIndex: 0,
      fillType: fill_type === "full" ? { full: {} } : { partial: {} },
    })
    .accounts({
      payer: payer.publicKey,
      maker: escrow_data.maker,
      inputMint: escrow_data.tokens.inputMint,
      outputMint: escrow_data.tokens.outputMint,
      inputTokenProgram: escrow_data.tokens.inputTokenProgram,
      outputTokenProgram: escrow_data.tokens.outputTokenProgram,
      protocolConfig: getProtocolConfig(),
    } as any)
    .remainingAccounts([...CLOSE_ACCOUNTS, ...accounts])
    .instruction();

  const altAddresses = ["9NYFyEqPkyXUhkerbGHXUXkvb4qpzeEdHuGpgbgpH1NJ", ...alt];

  const altLookups = await Promise.all(
    altAddresses.map(async (address: any) => {
      const alt = await rpc.getAddressLookupTable(new PublicKey(address));
      if (!alt.value) throw new Error(`ALT not found: ${address}`);
      return new AddressLookupTableAccount({
        key: new PublicKey(address),
        state: alt.value.state,
      });
    })
  );

  const tx_sim = new VersionedTransaction(
    new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: "DYFUNubBm23g4yaEhqd78HCnCVo4uiexgFiEKRhpw9EX",
      instructions: [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 1_390_000 }),
        instruction,
      ],
    }).compileToV0Message(altLookups)
  );

  const CU = await getComputeUnitsUsed(tx_sim);

  logger.info(`CU needed ${CU}`);

  const latestBlockhash = await rpc.getLatestBlockhash();
  const message = new TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: latestBlockhash.blockhash,
    instructions: [
      ComputeBudgetProgram.setComputeUnitLimit({ units: CU }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10000 }),
      instruction,
    ],
  }).compileToV0Message(altLookups);

  const tx = new VersionedTransaction(message);

  const size = calculateTransactionSize(tx);
  logger.debug(`Transaction size: ${size}, ALT count: ${alt.length}`);

  return tx;
}

export async function fill_wsol(
  address: PublicKey,
  fill_type: "full" | "partial",
  instruction_data: any,
  accounts: any[],
  alt: any[]
) {
  const compressed_account = await retryOperation(
    () => rpc.getCompressedAccount(bn(address.toBytes())),
    3,
    1000,
    "getCompressedAccount"
  );

  let proof = await rpc.getValidityProofV0(
    [
      {
        hash: compressed_account.hash,
        tree: ADDRESS_TREE,
        queue: ADDRESS_QUEUE,
      },
    ],
    []
  );

  const validityProof = proof.compressedProof;

  const escrow_data = parseEscrowFromBuffer(compressed_account.data.data);

  const instruction = await program.methods
    .fillWsolOrder({
      swapData: Buffer.from(instruction_data, "base64"),
      escrowAccount: {
        uniqueId: escrow_data.uniqueId,
        amount: {
          makingAmount: escrow_data.amount.makingAmount,
          takingAmount: escrow_data.amount.takingAmount,
          oriMakingAmount: escrow_data.amount.oriMakingAmount,
          oriTakingAmount: escrow_data.amount.oriTakingAmount,
        },
        expiredAt: escrow_data.expiredAt,
        feeBps: escrow_data.feeBps,
        createdAt: escrow_data.createdAt,
        updatedAt: escrow_data.updatedAt,
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
        leafIndex: compressed_account.leafIndex,
      },
      outputStateTreeIndex: 0,
      fillType: fill_type === "full" ? { full: {} } : { partial: {} },
    })
    .accounts({
      payer: payer.publicKey,
      maker: escrow_data.maker,
      inputMint: escrow_data.tokens.inputMint,
      inputTokenProgram: escrow_data.tokens.inputTokenProgram,
      protocolConfig: getProtocolConfig(),
    } as any)
    .remainingAccounts([...CLOSE_ACCOUNTS, ...accounts])
    .instruction();

  const altAddresses = ["9NYFyEqPkyXUhkerbGHXUXkvb4qpzeEdHuGpgbgpH1NJ", ...alt];

  const altLookups = await Promise.all(
    altAddresses.map(async (address: any) => {
      const alt = await rpc.getAddressLookupTable(new PublicKey(address));
      if (!alt.value) throw new Error(`ALT not found: ${address}`);
      return new AddressLookupTableAccount({
        key: new PublicKey(address),
        state: alt.value.state,
      });
    })
  );

  const tx_sim = new VersionedTransaction(
    new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: "DYFUNubBm23g4yaEhqd78HCnCVo4uiexgFiEKRhpw9EX",
      instructions: [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 1_390_000 }),
        instruction,
      ],
    }).compileToV0Message(altLookups)
  );

  const CU = await getComputeUnitsUsed(tx_sim);

  const latestBlockhash = await rpc.getLatestBlockhash();
  const message = new TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: latestBlockhash.blockhash,
    instructions: [
      ComputeBudgetProgram.setComputeUnitLimit({ units: CU }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10000 }),
      instruction,
    ],
  }).compileToV0Message(altLookups);

  const tx = new VersionedTransaction(message);
  const size = calculateTransactionSize(tx);
  logger.debug(`Transaction size: ${size}, ALT count: ${alt.length}`);

  return tx;
}
