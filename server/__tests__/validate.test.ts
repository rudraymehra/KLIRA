/**
 * Unit tests for server/middleware/validate.ts
 *
 * These tests cover the Zod validation schemas used to guard API inputs:
 *   - Solana address validation (base58, 32-44 chars)
 *   - makingAmount / takingAmount (positive numeric strings)
 *   - expiredAt (0 for no expiry, or a future ms timestamp)
 *   - validateBody middleware integration
 */

import { createOrderSchema, validateBody } from "../middleware/validate";
import type { Request, Response, NextFunction } from "express";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A well-known valid Solana address (Token Program). */
const VALID_ADDRESS = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const VALID_ADDRESS_2 = "So11111111111111111111111111111111111111112";

/** Build a minimal valid createOrder payload. */
function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    escrowAddress: VALID_ADDRESS,
    maker: VALID_ADDRESS_2,
    inputMint: VALID_ADDRESS,
    outputMint: VALID_ADDRESS_2,
    makingAmount: "1000000",
    takingAmount: "500000",
    expiredAt: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Schema-level tests (no HTTP layer involved)
// ---------------------------------------------------------------------------

describe("createOrderSchema - Solana address validation", () => {
  it("accepts a valid base58 Solana address", () => {
    const result = createOrderSchema.safeParse(validPayload());
    expect(result.success).toBe(true);
  });

  it("rejects an address that is too short", () => {
    const result = createOrderSchema.safeParse(
      validPayload({ escrowAddress: "abc123" })
    );
    expect(result.success).toBe(false);
  });

  it("rejects an address with invalid base58 characters (0, O, I, l)", () => {
    // '0' is not in the base58 alphabet
    const badAddr = "0" + VALID_ADDRESS.slice(1);
    const result = createOrderSchema.safeParse(
      validPayload({ escrowAddress: badAddr })
    );
    expect(result.success).toBe(false);
  });

  it("rejects a non-string address", () => {
    const result = createOrderSchema.safeParse(
      validPayload({ escrowAddress: 12345 })
    );
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// makingAmount / takingAmount
// ---------------------------------------------------------------------------

describe("createOrderSchema - makingAmount", () => {
  it("rejects makingAmount of '0' (must be > 0)", () => {
    const result = createOrderSchema.safeParse(
      validPayload({ makingAmount: "0" })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toEqual(
        expect.arrayContaining([expect.stringContaining("greater than 0")])
      );
    }
  });

  it("accepts makingAmount of '1000'", () => {
    const result = createOrderSchema.safeParse(
      validPayload({ makingAmount: "1000" })
    );
    expect(result.success).toBe(true);
  });

  it("rejects non-numeric makingAmount with clean validation failure", () => {
    // BigInt() is wrapped in try/catch inside the refine, so non-numeric
    // strings produce a clean validation failure instead of an uncaught
    // SyntaxError.
    const result = createOrderSchema.safeParse(
      validPayload({ makingAmount: "abc" })
    );
    expect(result.success).toBe(false);
  });

  it("rejects negative makingAmount", () => {
    // "-100" does not match /^\d+$/ so the regex fails. However, the BigInt
    // refine would also reject it. In Zod v4 this similarly throws because
    // BigInt("-100") is valid but the pattern still runs the refine.
    const result = createOrderSchema.safeParse(
      validPayload({ makingAmount: "-100" })
    );
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// expiredAt
// ---------------------------------------------------------------------------

describe("createOrderSchema - expiredAt", () => {
  it("accepts expiredAt: 0 (no expiry)", () => {
    const result = createOrderSchema.safeParse(validPayload({ expiredAt: 0 }));
    expect(result.success).toBe(true);
  });

  it("accepts expiredAt in the future", () => {
    const futureTs = Date.now() + 60 * 60 * 1000; // 1 hour from now
    const result = createOrderSchema.safeParse(
      validPayload({ expiredAt: futureTs })
    );
    expect(result.success).toBe(true);
  });

  it("rejects expiredAt in the past", () => {
    const pastTs = Date.now() - 60 * 60 * 1000; // 1 hour ago
    const result = createOrderSchema.safeParse(
      validPayload({ expiredAt: pastTs })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toEqual(
        expect.arrayContaining([expect.stringContaining("future timestamp")])
      );
    }
  });

  it("rejects negative expiredAt", () => {
    const result = createOrderSchema.safeParse(validPayload({ expiredAt: -1 }));
    expect(result.success).toBe(false);
  });

  it("defaults expiredAt to 0 when omitted", () => {
    const payload = validPayload();
    delete (payload as any).expiredAt;

    const result = createOrderSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expiredAt).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// validateBody middleware integration
// ---------------------------------------------------------------------------

describe("validateBody middleware", () => {
  function mockReqResNext(body: unknown) {
    const req = { body } as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;
    const next = jest.fn() as NextFunction;
    return { req, res, next };
  }

  it("calls next() for a valid payload", () => {
    const { req, res, next } = mockReqResNext(validPayload());

    const middleware = validateBody(createOrderSchema);
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status as jest.Mock).not.toHaveBeenCalled();
  });

  it("returns 400 with details for an invalid payload", () => {
    const { req, res, next } = mockReqResNext(
      validPayload({ makingAmount: "0" })
    );

    const middleware = validateBody(createOrderSchema);
    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Validation failed",
        details: expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining("greater than 0"),
          }),
        ]),
      })
    );
  });

  it("replaces req.body with parsed data on success", () => {
    // Pass a payload without optional fields so Zod fills defaults.
    const payload = validPayload();
    delete (payload as any).expiredAt;

    const { req, res, next } = mockReqResNext(payload);

    const middleware = validateBody(createOrderSchema);
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    // Zod should have filled the default expiredAt = 0
    expect(req.body.expiredAt).toBe(0);
  });
});
