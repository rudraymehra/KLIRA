/**
 * Tests for escrow buffer parsing.
 * We mock @solana/web3.js and @lightprotocol/stateless.js to avoid
 * needing actual Solana connectivity.
 */

// Mock the Solana and Light Protocol dependencies before imports
jest.mock("@solana/web3.js", () => {
  class MockPublicKey {
    private _bytes: Uint8Array;

    constructor(input: string | Uint8Array | Buffer) {
      if (typeof input === "string") {
        this._bytes = new Uint8Array(32).fill(0);
      } else {
        this._bytes = new Uint8Array(input);
      }
    }

    toBytes() {
      return this._bytes;
    }

    toBase58() {
      return "MockBase58Address";
    }

    toBuffer() {
      return Buffer.from(this._bytes);
    }

    equals(other: MockPublicKey) {
      return (
        this._bytes.length === other._bytes.length &&
        this._bytes.every((v, i) => v === other._bytes[i])
      );
    }

    static findProgramAddressSync(_seeds: Buffer[], _programId: any) {
      return [new MockPublicKey(new Uint8Array(32)), 255];
    }
  }

  return {
    PublicKey: MockPublicKey,
  };
});

jest.mock("@lightprotocol/stateless.js", () => ({
  deriveAddressSeed: jest.fn(() => new Uint8Array(32)),
  deriveAddress: jest.fn(() => {
    const { PublicKey } = require("@solana/web3.js");
    return new PublicKey(new Uint8Array(32));
  }),
}));

import { parseEscrowFromBuffer } from "@/lib/escrow";

describe("parseEscrowFromBuffer", () => {
  function createTestBuffer(): Buffer {
    // Create a 226-byte buffer with test data
    const buf = Buffer.alloc(226, 0);

    // maker (32 bytes at offset 0)
    buf.fill(1, 0, 32);

    // uniqueId (u64 LE at offset 32)
    buf.writeBigUInt64LE(BigInt(1234567890), 32);

    // inputMint (32 bytes at offset 40)
    buf.fill(2, 40, 72);

    // outputMint (32 bytes at offset 72)
    buf.fill(3, 72, 104);

    // inputTokenProgram (32 bytes at offset 104)
    buf.fill(4, 104, 136);

    // outputTokenProgram (32 bytes at offset 136)
    buf.fill(5, 136, 168);

    // oriMakingAmount (u64 LE at offset 168)
    buf.writeBigUInt64LE(BigInt(1000000000), 168);

    // oriTakingAmount (u64 LE at offset 176)
    buf.writeBigUInt64LE(BigInt(150000000), 176);

    // makingAmount (u64 LE at offset 184)
    buf.writeBigUInt64LE(BigInt(500000000), 184);

    // takingAmount (u64 LE at offset 192)
    buf.writeBigUInt64LE(BigInt(75000000), 192);

    // expiredAt (i64 LE at offset 200)
    buf.writeBigInt64LE(BigInt(1700000000), 200);

    // createdAt (i64 LE at offset 208)
    buf.writeBigInt64LE(BigInt(1699000000), 208);

    // updatedAt (i64 LE at offset 216)
    buf.writeBigInt64LE(BigInt(1699500000), 216);

    // feeBps (u16 LE at offset 224)
    buf.writeUInt16LE(10, 224);

    return buf;
  }

  it("parses uniqueId correctly", () => {
    const buf = createTestBuffer();
    const escrow = parseEscrowFromBuffer(buf);
    expect(escrow.uniqueId.toNumber()).toBe(1234567890);
  });

  it("parses amounts correctly", () => {
    const buf = createTestBuffer();
    const escrow = parseEscrowFromBuffer(buf);
    expect(escrow.amount.oriMakingAmount.toNumber()).toBe(1000000000);
    expect(escrow.amount.oriTakingAmount.toNumber()).toBe(150000000);
    expect(escrow.amount.makingAmount.toNumber()).toBe(500000000);
    expect(escrow.amount.takingAmount.toNumber()).toBe(75000000);
  });

  it("parses timestamps correctly", () => {
    const buf = createTestBuffer();
    const escrow = parseEscrowFromBuffer(buf);
    expect(escrow.expiredAt.toNumber()).toBe(1700000000);
    expect(escrow.createdAt.toNumber()).toBe(1699000000);
    expect(escrow.updatedAt.toNumber()).toBe(1699500000);
  });

  it("parses feeBps correctly", () => {
    const buf = createTestBuffer();
    const escrow = parseEscrowFromBuffer(buf);
    expect(escrow.feeBps).toBe(10);
  });

  it("parses maker as PublicKey", () => {
    const buf = createTestBuffer();
    const escrow = parseEscrowFromBuffer(buf);
    expect(escrow.maker).toBeDefined();
  });

  it("parses token mints as PublicKeys", () => {
    const buf = createTestBuffer();
    const escrow = parseEscrowFromBuffer(buf);
    expect(escrow.tokens.inputMint).toBeDefined();
    expect(escrow.tokens.outputMint).toBeDefined();
    expect(escrow.tokens.inputTokenProgram).toBeDefined();
    expect(escrow.tokens.outputTokenProgram).toBeDefined();
  });

  it("throws for buffer too short", () => {
    const shortBuf = Buffer.alloc(100, 0);
    expect(() => parseEscrowFromBuffer(shortBuf)).toThrow(
      "Buffer too short for Escrow"
    );
  });

  it("throws for empty buffer", () => {
    const emptyBuf = Buffer.alloc(0);
    expect(() => parseEscrowFromBuffer(emptyBuf)).toThrow(
      "Buffer too short for Escrow"
    );
  });

  it("handles zero amounts", () => {
    const buf = createTestBuffer();
    buf.writeBigUInt64LE(BigInt(0), 184); // makingAmount = 0
    buf.writeBigUInt64LE(BigInt(0), 192); // takingAmount = 0
    const escrow = parseEscrowFromBuffer(buf);
    expect(escrow.amount.makingAmount.toNumber()).toBe(0);
    expect(escrow.amount.takingAmount.toNumber()).toBe(0);
  });

  it("handles zero feeBps", () => {
    const buf = createTestBuffer();
    buf.writeUInt16LE(0, 224);
    const escrow = parseEscrowFromBuffer(buf);
    expect(escrow.feeBps).toBe(0);
  });

  it("handles zero expiration", () => {
    const buf = createTestBuffer();
    buf.writeBigInt64LE(BigInt(0), 200);
    const escrow = parseEscrowFromBuffer(buf);
    expect(escrow.expiredAt.toNumber()).toBe(0);
  });

  it("handles exactly 226 byte buffer", () => {
    const buf = createTestBuffer();
    expect(buf.length).toBe(226);
    expect(() => parseEscrowFromBuffer(buf)).not.toThrow();
  });

  it("handles larger than minimum buffer", () => {
    const buf = Buffer.alloc(300, 0);
    buf.writeBigUInt64LE(BigInt(42), 32); // uniqueId
    buf.writeBigUInt64LE(BigInt(100), 168); // oriMakingAmount
    buf.writeUInt16LE(5, 224); // feeBps
    const escrow = parseEscrowFromBuffer(buf);
    expect(escrow.uniqueId.toNumber()).toBe(42);
    expect(escrow.feeBps).toBe(5);
  });
});
