import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: "TOO_MANY_ATTEMPTS" },
  standardHeaders: true,
  legacyHeaders: false,
});

export const commentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: { error: "TOO_MANY_COMMENTS" },
  standardHeaders: true,
  legacyHeaders: false,
});
