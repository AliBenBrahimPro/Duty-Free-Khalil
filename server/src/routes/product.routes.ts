import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import { ProductService } from "../services/product.service.js";
import { upload } from "../config/multer.js";
import prisma from "../config/prisma.js";
import { commentLimiter } from "../middleware/rate-limit.js";
import { validateUUID } from "../middleware/validate.js";

const router = Router();

const getUserName = async (userId: string) => {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
  return u ? `${u.firstName} ${u.lastName}` : "Unknown";
};

// Browse all products
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    res.json(await ProductService.getProducts({ cursor, limit }));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get my products (seller)
router.get("/mine", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    res.json(await ProductService.getSellerProducts(req.user!.id));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get my purchases (buyer)
router.get("/my-purchases", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    res.json(await ProductService.getBuyerPurchases(req.user!.id, { cursor, limit }));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get all purchase requests for seller
router.get("/seller-purchases", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    res.json(await ProductService.getSellerAllPurchases(req.user!.id, { cursor, limit }));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get single product
router.get("/:id", authenticate, validateUUID(), async (req: AuthRequest, res: Response) => {
  try {
    res.json(await ProductService.getProduct(req.params.id as string));
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// Seller creates product
router.post("/", authenticate, upload.single("image"), async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "SELLER" && req.user!.role !== "SUPERADMIN") {
      res.status(403).json({ error: "Only sellers can add products" });
      return;
    }
    const { name, description, price, stock, currency, imageUrl } = req.body;
    if (!name || !price || !stock) {
      res.status(400).json({ error: "Name, price, and stock are required" });
      return;
    }
    const parsedPrice = parseFloat(price);
    const parsedStock = parseInt(stock);
    if (isNaN(parsedPrice) || parsedPrice <= 0 || parsedPrice > 1_000_000) {
      res.status(400).json({ error: "INVALID_PRICE" }); return;
    }
    if (isNaN(parsedStock) || parsedStock < 0 || parsedStock > 100_000) {
      res.status(400).json({ error: "INVALID_STOCK" }); return;
    }
    const image = req.file ? `/uploads/${req.file.filename}` : imageUrl || undefined;
    const userName = await getUserName(req.user!.id);
    const product = await ProductService.createProduct(req.user!.id, userName, {
      name, image, description,
      price: parsedPrice,
      stock: parsedStock,
      currency,
    });
    res.status(201).json(product);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Seller updates product
router.patch("/:id", authenticate, validateUUID(), upload.single("image"), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, price, stock, isActive, imageUrl } = req.body;
    if (price !== undefined) {
      const p = parseFloat(price);
      if (isNaN(p) || p <= 0 || p > 1_000_000) {
        res.status(400).json({ error: "INVALID_PRICE" }); return;
      }
    }
    if (stock !== undefined) {
      const s = parseInt(stock);
      if (isNaN(s) || s < 0 || s > 100_000) {
        res.status(400).json({ error: "INVALID_STOCK" }); return;
      }
    }
    const image = req.file ? `/uploads/${req.file.filename}` : imageUrl || undefined;
    const userName = await getUserName(req.user!.id);
    const product = await ProductService.updateProduct(
      req.params.id as string, req.user!.id, userName,
      {
        name, image, description,
        price: price ? parseFloat(price) : undefined,
        stock: stock !== undefined ? parseInt(stock) : undefined,
        isActive: isActive !== undefined ? isActive === "true" : undefined,
      }
    );
    res.json(product);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Seller deletes product
router.delete("/:id", authenticate, validateUUID(), async (req: AuthRequest, res: Response) => {
  try {
    const userName = await getUserName(req.user!.id);
    await ProductService.deleteProduct(req.params.id as string, req.user!.id, userName);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get purchases for a product (seller)
router.get("/:id/purchases", authenticate, validateUUID(), async (req: AuthRequest, res: Response) => {
  try {
    res.json(await ProductService.getProductPurchases(req.params.id as string, req.user!.id));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Buyer requests purchase
router.post("/:id/buy", authenticate, validateUUID(), async (req: AuthRequest, res: Response) => {
  try {
    const userName = await getUserName(req.user!.id);
    const purchase = await ProductService.requestPurchase(req.params.id as string, req.user!.id, userName);
    res.status(201).json(purchase);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Seller confirms purchase
router.patch("/purchases/:id/confirm", authenticate, validateUUID(), async (req: AuthRequest, res: Response) => {
  try {
    const userName = await getUserName(req.user!.id);
    res.json(await ProductService.confirmPurchase(req.params.id as string, req.user!.id, userName));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Seller cancels purchase
router.patch("/purchases/:id/cancel", authenticate, validateUUID(), async (req: AuthRequest, res: Response) => {
  try {
    const userName = await getUserName(req.user!.id);
    res.json(await ProductService.cancelPurchase(req.params.id as string, req.user!.id, userName));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get comments for a product
router.get("/:id/comments", authenticate, validateUUID(), async (req: AuthRequest, res: Response) => {
  try { res.json(await ProductService.getComments(req.params.id as string)); }
  catch (err: any) { res.status(400).json({ error: err.message }); }
});

// Add comment to a product
router.post("/:id/comments", authenticate, validateUUID(), commentLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) { res.status(400).json({ error: "Comment text is required" }); return; }
    if (text.trim().length > 2000) { res.status(400).json({ error: "COMMENT_TOO_LONG" }); return; }
    const userName = await getUserName(req.user!.id);
    const comment = await ProductService.addComment(
      req.params.id as string, req.user!.id, userName, req.user!.role, text.trim()
    );
    res.status(201).json(comment);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;
