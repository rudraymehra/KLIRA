import { z } from "zod";
import { Request, Response, NextFunction } from "express";

// Solana public key: base58, 32-44 chars
const solanaAddress = z
  .string()
  .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "Invalid Solana address");

// ── Schemas ──────────────────────────────────────────

export const createOrderSchema = z.object({
  escrowAddress: solanaAddress,
  uniqueId: z.string().optional().default(""),
  maker: solanaAddress,
  inputMint: solanaAddress,
  outputMint: solanaAddress,
  inputSymbol: z.string().max(20).optional().default(""),
  outputSymbol: z.string().max(20).optional().default(""),
  makingAmount: z
    .string()
    .regex(/^\d+$/, "makingAmount must be a numeric string")
    .refine((v) => {
      try { return BigInt(v) > 0n; } catch { return false; }
    }, "makingAmount must be greater than 0"),
  takingAmount: z
    .string()
    .regex(/^\d+$/, "takingAmount must be a numeric string")
    .refine((v) => {
      try { return BigInt(v) > 0n; } catch { return false; }
    }, "takingAmount must be greater than 0"),
  expiredAt: z
    .number()
    .int()
    .min(0)
    .optional()
    .default(0)
    .refine(
      (v) => v === 0 || v > Date.now(),
      "expiredAt must be 0 (no expiry) or a future timestamp in milliseconds"
    ),
}).refine(
  (data) => data.inputMint !== data.outputMint,
  { message: "inputMint and outputMint must be different", path: ["outputMint"] }
);

export const orderQuerySchema = z.object({
  wallet: solanaAddress.optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  offset: z.string().regex(/^\d+$/).optional(),
});

export const fillExpireBodySchema = z.object({
  order: solanaAddress,
});

// ── Middleware factory ──────────────────────────────────────────

export function validateBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      res.status(400).json({ error: "Validation failed", details: errors });
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const errors = result.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      res.status(400).json({ error: "Validation failed", details: errors });
      return;
    }
    // Store validated data in res.locals (req.query is read-only in newer Express)
    res.locals.validatedQuery = result.data;
    next();
  };
}
