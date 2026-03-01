import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { deriveAddress, deriveAddressSeed } from "@lightprotocol/stateless.js";
import { ADDRESS_TREE, KLIRA_PROGRAM_ID } from "./program";

export type Escrow = {
  maker: PublicKey;
  uniqueId: BN;
  tokens: {
    inputMint: PublicKey;
    outputMint: PublicKey;
    inputTokenProgram: PublicKey;
    outputTokenProgram: PublicKey;
  };
  amount: {
    oriMakingAmount: BN;
    oriTakingAmount: BN;
    makingAmount: BN;
    takingAmount: BN;
  };
  expiredAt: BN;
  createdAt: BN;
  updatedAt: BN;
  feeBps: number;
};

export function parseEscrowFromBuffer(buffer: Buffer): Escrow {
  if (buffer.byteLength < 226) {
    throw new Error("Buffer too short for Escrow");
  }

  return {
    maker: new PublicKey(buffer.subarray(0, 32)),
    uniqueId: new BN(buffer.readBigUInt64LE(32).toString()),
    tokens: {
      inputMint: new PublicKey(buffer.subarray(40, 72)),
      outputMint: new PublicKey(buffer.subarray(72, 104)),
      inputTokenProgram: new PublicKey(buffer.subarray(104, 136)),
      outputTokenProgram: new PublicKey(buffer.subarray(136, 168)),
    },
    amount: {
      oriMakingAmount: new BN(buffer.readBigUInt64LE(168).toString()),
      oriTakingAmount: new BN(buffer.readBigUInt64LE(176).toString()),
      makingAmount: new BN(buffer.readBigUInt64LE(184).toString()),
      takingAmount: new BN(buffer.readBigUInt64LE(192).toString()),
    },
    expiredAt: new BN(buffer.readBigInt64LE(200).toString()),
    createdAt: new BN(buffer.readBigInt64LE(208).toString()),
    updatedAt: new BN(buffer.readBigInt64LE(216).toString()),
    feeBps: buffer.readUInt16LE(224),
  };
}

export function deriveEscrowAddress(uniqueId: BN, maker: PublicKey): PublicKey {
  const seeds: Uint8Array[] = [
    Buffer.from("escrow"),
    uniqueId.toArrayLike(Buffer, "le", 8),
    maker.toBuffer(),
  ];
  const assetSeed = deriveAddressSeed(seeds, KLIRA_PROGRAM_ID);
  return deriveAddress(assetSeed, ADDRESS_TREE);
}
