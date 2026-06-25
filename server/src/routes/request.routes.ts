import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import { RequestService } from "../services/request.service.js";
import { upload } from "../config/multer.js";

const router = Router();

router.get("/sellers", authenticate, async (_req: AuthRequest, res: Response) => {
  try { res.json(await RequestService.getSellers()); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/", authenticate, upload.single("productImage"), async (req: AuthRequest, res: Response) => {
  try {
    const { productName, description, sellerId, productImageUrl } = req.body;
    const productImage = req.file ? `/uploads/${req.file.filename}` : productImageUrl || undefined;
    if (!sellerId) { res.status(400).json({ error: "Seller is required" }); return; }
    const request = await RequestService.createRequest(req.user!.id, sellerId, { productName, productImage, description });
    res.status(201).json(request);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try { res.json(await RequestService.getUserRequests(req.user!.id, req.user!.role)); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try { res.json(await RequestService.getRequest(req.params.id as string, req.user!.id, req.user!.role)); }
  catch (err: any) { res.status(404).json({ error: err.message }); }
});

router.patch("/:id/price", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { price } = req.body;
    if (!price || price <= 0) { res.status(400).json({ error: "Valid price is required" }); return; }
    res.json(await RequestService.setPriceValue(req.params.id as string, req.user!.id, req.user!.role, price));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.patch("/:id/unavailable", authenticate, async (req: AuthRequest, res: Response) => {
  try { res.json(await RequestService.markUnavailable(req.params.id as string, req.user!.id, req.user!.role)); }
  catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.patch("/:id/accept", authenticate, async (req: AuthRequest, res: Response) => {
  try { res.json(await RequestService.acceptPrice(req.params.id as string, req.user!.id, req.user!.role)); }
  catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.patch("/:id/reject", authenticate, async (req: AuthRequest, res: Response) => {
  try { res.json(await RequestService.rejectPrice(req.params.id as string, req.user!.id, req.user!.role)); }
  catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.delete("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await RequestService.deleteRequest(req.params.id as string, req.user!.id, req.user!.role);
    res.json({ success: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;
