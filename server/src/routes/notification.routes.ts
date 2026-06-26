import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import { NotificationService } from "../services/notification.service.js";
import { validateUUID } from "../middleware/validate.js";

const router = Router();

router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    res.json(await NotificationService.getForUser(req.user!.id, { cursor, limit }));
  }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/unread-count", authenticate, async (req: AuthRequest, res: Response) => {
  try { res.json({ count: await NotificationService.getUnreadCount(req.user!.id) }); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Summary endpoint: notifications + unreadCount + pendingPurchasesCount in one call
router.get("/summary", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    res.json(await NotificationService.getSummary(req.user!.id, req.user!.role));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id/read", authenticate, validateUUID(), async (req: AuthRequest, res: Response) => {
  try {
    await NotificationService.markAsRead(req.params.id as string, req.user!.id);
    res.json({ success: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.patch("/read-all", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await NotificationService.markAllAsRead(req.user!.id);
    res.json({ success: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;
