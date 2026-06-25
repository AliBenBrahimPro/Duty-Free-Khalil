import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import { RequestService } from "../services/request.service.js";
import { upload } from "../config/multer.js";

const router = Router();

// Get all sellers (buyer picks who to ask)
router.get("/sellers", authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const sellers = await RequestService.getSellers();
    res.json(sellers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// STEP 1: Buyer creates price request
router.post(
  "/",
  authenticate,
  upload.single("productImage"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { productName, description, sellerId, productImageUrl } = req.body;
      const productImage = req.file
        ? `/uploads/${req.file.filename}`
        : productImageUrl || undefined;

      if (!sellerId) {
        res.status(400).json({ error: "Seller is required" });
        return;
      }

      const request = await RequestService.createRequest(req.user!.id, sellerId, {
        productName,
        productImage,
        description,
      });
      res.status(201).json(request);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

// Get my requests
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const requests = await RequestService.getUserRequests(req.user!.id, req.user!.role);
    res.json(requests);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get single request
router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const request = await RequestService.getRequest(req.params.id as string, req.user!.id, req.user!.role);
    res.json(request);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// STEP 2A: Seller sets price
router.patch("/:id/price", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { price } = req.body;
    if (!price || price <= 0) {
      res.status(400).json({ error: "Valid price is required" });
      return;
    }
    const request = await RequestService.setPriceValue(req.params.id as string, req.user!.id, price);
    res.json(request);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// STEP 2B: Seller marks unavailable
router.patch("/:id/unavailable", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const request = await RequestService.markUnavailable(req.params.id as string, req.user!.id);
    res.json(request);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// STEP 3A: Buyer accepts
router.patch("/:id/accept", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await RequestService.acceptPrice(req.params.id as string, req.user!.id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// STEP 3B: Buyer rejects
router.patch("/:id/reject", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const request = await RequestService.rejectPrice(req.params.id as string, req.user!.id);
    res.json(request);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
