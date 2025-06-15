import {Request, Response, NextFunction} from "express";

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string;
  keyGenerator?: (req: Request) => string;
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
// In production, use Redis or similar
const requestStore = new Map<string, RequestRecord>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestStore.entries()) {
    if (now > record.resetTime) {
      requestStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export const createRateLimit = (options: RateLimitOptions) => {
  const {
    windowMs,
    maxRequests,
    message = "Too many requests, please try again later",
    keyGenerator = (req: Request) => req.ip || "unknown"
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const now = Date.now();
    const windowStart = now;
    const windowEnd = windowStart + windowMs;

    let record = requestStore.get(key);

    if (!record || now > record.resetTime) {
      // Create new record or reset expired one
      record = {
        count: 1,
        resetTime: windowEnd
      };
      requestStore.set(key, record);
      next();
      return;
    }

    if (record.count >= maxRequests) {
      res.status(429).json({
        error: message,
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
      return;
    }

    // Increment count
    record.count++;
    requestStore.set(key, record);
    next();
  };
};

// Preset rate limiters
export const generalRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
});

export const participationRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5, // 5 participation attempts per minute
  message: "Too many participation attempts, please wait before trying again",
  keyGenerator: (req: Request) => {
    // Rate limit by wallet address if available
    const walletAddress = req.body?.walletAddress;
    return walletAddress || req.ip || "unknown";
  }
});

export const gameCreationRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10, // 10 game creations per hour
  message: "Too many game creation attempts, please wait before creating another game"
});