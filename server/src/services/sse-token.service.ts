import { randomBytes } from "crypto";

interface SseToken {
  userId: string;
  role: string;
  createdAt: number;
}

const tokens = new Map<string, SseToken>();
const TTL_MS = 30_000; // 30 seconds

// Cleanup expired tokens every 60s
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of tokens) {
    if (now - val.createdAt > TTL_MS) tokens.delete(key);
  }
}, 60_000);

export class SseTokenService {
  static create(userId: string, role: string): string {
    const token = randomBytes(32).toString("hex");
    tokens.set(token, { userId, role, createdAt: Date.now() });
    return token;
  }

  /** Consume a token (burn on use). Returns user info or null. */
  static consume(token: string): { userId: string; role: string } | null {
    const entry = tokens.get(token);
    if (!entry) return null;
    tokens.delete(token); // burn
    if (Date.now() - entry.createdAt > TTL_MS) return null;
    return { userId: entry.userId, role: entry.role };
  }
}
