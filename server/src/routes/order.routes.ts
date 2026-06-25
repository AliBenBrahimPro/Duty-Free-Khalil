import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import { OrderService } from "../services/order.service.js";

const router = Router();

router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const orders = await OrderService.getUserOrders(req.user!.id, req.user!.role);
    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/stats", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await OrderService.getStats(req.user!.id, req.user!.role);
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const order = await OrderService.getOrder(req.params.id as string, req.user!.id, req.user!.role);
    res.json(order);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

export default router;
