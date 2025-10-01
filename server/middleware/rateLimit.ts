import rateLimit from "express-rate-limit";

// Public endpoints: 100 requests per minute per IP
export const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

// Internal/keeper endpoints: 1000 requests per minute per IP
export const internalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests" },
});
