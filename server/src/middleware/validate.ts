import { Request, Response, NextFunction } from "express";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const WEAK_PINS = new Set([
  "000000", "111111", "222222", "333333", "444444",
  "555555", "666666", "777777", "888888", "999999",
  "123456", "654321", "123123", "112233",
]);

export function validateUUID(paramName = "id") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const val = req.params[paramName] as string;
    if (!val || !UUID_RE.test(val)) {
      res.status(400).json({ error: "INVALID_ID" });
      return;
    }
    next();
  };
}

export function validatePrice(fieldName = "price") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const val = parseFloat(req.body[fieldName]);
    if (isNaN(val) || val <= 0 || val > 1_000_000) {
      res.status(400).json({ error: "INVALID_PRICE" });
      return;
    }
    next();
  };
}

export function validateStock(fieldName = "stock") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const val = parseInt(req.body[fieldName]);
    if (isNaN(val) || val < 0 || val > 100_000) {
      res.status(400).json({ error: "INVALID_STOCK" });
      return;
    }
    next();
  };
}
