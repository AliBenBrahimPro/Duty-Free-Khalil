import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import { ProductService } from "../services/product.service.js";
import { upload } from "../config/multer.js";
import prisma from "../config/prisma.js";

const router = Router();

const getUserName = async (userId: string) => {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
  return u ? `${u.firstName} ${u.lastName}` : "Unknown";
};

// Browse all products
router.get("/", authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    res.json(await ProductService.getProducts());
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
    res.json(await ProductService.getBuyerPurchases(req.user!.id));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get single product
router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
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
    const image = req.file ? `/uploads/${req.file.filename}` : imageUrl || undefined;
    const userName = await getUserName(req.user!.id);
    const product = await ProductService.createProduct(req.user!.id, userName, {
      name, image, description,
      price: parseFloat(price),
      stock: parseInt(stock),
      currency,
    });
    res.status(201).json(product);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Seller updates product
router.patch("/:id", authenticate, upload.single("image"), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, price, stock, isActive, imageUrl } = req.body;
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
router.delete("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userName = await getUserName(req.user!.id);
    await ProductService.deleteProduct(req.params.id as string, req.user!.id, userName);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get purchases for a product (seller)
router.get("/:id/purchases", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    res.json(await ProductService.getProductPurchases(req.params.id as string, req.user!.id));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Buyer requests purchase
router.post("/:id/buy", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userName = await getUserName(req.user!.id);
    const purchase = await ProductService.requestPurchase(req.params.id as string, req.user!.id, userName);
    res.status(201).json(purchase);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Seller confirms purchase
router.patch("/purchases/:id/confirm", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userName = await getUserName(req.user!.id);
    res.json(await ProductService.confirmPurchase(req.params.id as string, req.user!.id, userName));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Seller cancels purchase
router.patch("/purchases/:id/cancel", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userName = await getUserName(req.user!.id);
    res.json(await ProductService.cancelPurchase(req.params.id as string, req.user!.id, userName));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
