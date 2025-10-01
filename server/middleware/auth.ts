import { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "crypto";
import { logger } from "../utils";

// API key authentication for internal endpoints (/fill, /expired)
// The keeper service must include this key in the x-api-key header
export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers["x-api-key"];
  const expectedKey = process.env.KEEPER_API_KEY;

  if (!expectedKey) {
    logger.error(
      "KEEPER_API_KEY not set — blocking request to internal endpoint",
      {
        path: req.path,
        ip: req.ip,
      }
    );
    res
      .status(503)
      .json({ error: "Service unavailable: server misconfigured" });
    return;
  }

  if (
    !apiKey ||
    typeof apiKey !== "string" ||
    apiKey.length !== expectedKey.length ||
    !timingSafeEqual(Buffer.from(apiKey), Buffer.from(expectedKey))
  ) {
    logger.warn("Unauthorized request to internal endpoint", {
      path: req.path,
      ip: req.ip,
    });
    res.status(401).json({ error: "Unauthorized: invalid or missing API key" });
    return;
  }

  next();
}
