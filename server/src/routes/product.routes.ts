import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import { ProductService } from "../services/product.service.js";
import { upload } from "../config/multer.js";

const router = Router();

// Browse all products (any authenticated user)
router.get("/", authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const products = await ProductService.getProducts();
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get my products (seller)
router.get("/mine", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const products = await ProductService.getSellerProducts(req.user!.id);
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get my purchases (buyer)
router.get("/my-purchases", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const purchases = await ProductService.getBuyerPurchases(req.user!.id);
    res.json(purchases);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get single product
router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const product = await ProductService.getProduct(req.params.id as string);
    res.json(product);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// Seller creates product
router.post(
  "/",
  authenticate,
  upload.single("image"),
  async (req: AuthRequest, res: Response) => {
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
      const image = req.file
        ? `/uploads/${req.file.filename}`
        : imageUrl || undefined;

      const product = await ProductService.createProduct(req.user!.id, {
        name,
        image,
        description,
        price: parseFloat(price),
        stock: parseInt(stock),
        currency,
      });
      res.status(201).json(product);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

// Seller updates product
router.patch(
  "/:id",
  authenticate,
  upload.single("image"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { name, description, price, stock, isActive, imageUrl } = req.body;
      const image = req.file
        ? `/uploads/${req.file.filename}`
        : imageUrl || undefined;

      const product = await ProductService.updateProduct(
        req.params.id as string,
        req.user!.id,
        {
          name,
          image,
          description,
          price: price ? parseFloat(price) : undefined,
          stock: stock !== undefined ? parseInt(stock) : undefined,
          isActive: isActive !== undefined ? isActive === "true" : undefined,
        }
      );
      res.json(product);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

// Get purchases for a product (seller)
router.get("/:id/purchases", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const purchases = await ProductService.getProductPurchases(
      req.params.id as string,
      req.user!.id
    );
    res.json(purchases);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Buyer requests purchase
router.post("/:id/buy", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const purchase = await ProductService.requestPurchase(
      req.params.id as string,
      req.user!.id
    );
    res.status(201).json(purchase);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Seller confirms purchase
router.patch("/purchases/:id/confirm", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const purchase = await ProductService.confirmPurchase(
      req.params.id as string,
      req.user!.id
    );
    res.json(purchase);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Seller cancels purchase
router.patch("/purchases/:id/cancel", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const purchase = await ProductService.cancelPurchase(
      req.params.id as string,
      req.user!.id
    );
    res.json(purchase);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
