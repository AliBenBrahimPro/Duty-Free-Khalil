import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import { RequestService } from "../services/request.service.js";
import { upload, chatUpload } from "../config/multer.js";
import prisma from "../config/prisma.js";
import { SSEService } from "../services/sse.service.js";
import { SseTokenService } from "../services/sse-token.service.js";
import { commentLimiter } from "../middleware/rate-limit.js";
import { validateUUID } from "../middleware/validate.js";

const router = Router();

const getUserName = async (userId: string) => {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
  return u ? `${u.firstName} ${u.lastName}` : "Unknown";
};

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
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const search = req.query.search as string | undefined;
    res.json(await RequestService.getUserRequests(req.user!.id, req.user!.role, { cursor, limit, search }));
  }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/:id", authenticate, validateUUID(), async (req: AuthRequest, res: Response) => {
  try { res.json(await RequestService.getRequest(req.params.id as string, req.user!.id, req.user!.role)); }
  catch (err: any) { res.status(404).json({ error: err.message }); }
});

router.patch("/:id/price", authenticate, validateUUID(), async (req: AuthRequest, res: Response) => {
  try {
    const { price } = req.body;
    if (!price || price <= 0) { res.status(400).json({ error: "INVALID_PRICE" }); return; }
    res.json(await RequestService.setPriceValue(req.params.id as string, req.user!.id, req.user!.role, price));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.patch("/:id/unavailable", authenticate, validateUUID(), async (req: AuthRequest, res: Response) => {
  try { res.json(await RequestService.markUnavailable(req.params.id as string, req.user!.id, req.user!.role)); }
  catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.patch("/:id/accept", authenticate, validateUUID(), async (req: AuthRequest, res: Response) => {
  try { res.json(await RequestService.acceptPrice(req.params.id as string, req.user!.id, req.user!.role)); }
  catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.patch("/:id/reject", authenticate, validateUUID(), async (req: AuthRequest, res: Response) => {
  try { res.json(await RequestService.rejectPrice(req.params.id as string, req.user!.id, req.user!.role)); }
  catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.delete("/:id", authenticate, validateUUID(), async (req: AuthRequest, res: Response) => {
  try {
    await RequestService.deleteRequest(req.params.id as string, req.user!.id, req.user!.role);
    res.json({ success: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// SSE token exchange
router.post("/:id/chat/token", authenticate, validateUUID(), async (req: AuthRequest, res: Response) => {
  const requestId = req.params.id as string;
  try {
    await RequestService.getRequest(requestId, req.user!.id, req.user!.role);
  } catch {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  const sseToken = SseTokenService.create(req.user!.id, req.user!.role);
  res.json({ token: sseToken });
});

// SSE: Real-time chat stream (uses short-lived SSE token instead of JWT)
router.get("/:id/chat/stream", async (req: AuthRequest, res: Response) => {
  const requestId = req.params.id as string;
  const sseToken = req.query.token as string;

  if (!sseToken) {
    res.status(401).json({ error: "SSE_TOKEN_REQUIRED" });
    return;
  }

  const tokenData = SseTokenService.consume(sseToken);
  if (!tokenData) {
    res.status(401).json({ error: "SSE_TOKEN_INVALID" });
    return;
  }

  try {
    await RequestService.getRequest(requestId, tokenData.userId, tokenData.role);
  } catch {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const heartbeat = setInterval(() => {
    try { res.write(":heartbeat\n\n"); } catch { clearInterval(heartbeat); }
  }, 30000);

  SSEService.addClient(`request:${requestId}:${tokenData.userId}`, res);
  res.write(`event: connected\ndata: ${JSON.stringify({ requestId })}\n\n`);
  res.on("close", () => clearInterval(heartbeat));
});

// Get comments for a request
router.get("/:id/comments", authenticate, validateUUID(), async (req: AuthRequest, res: Response) => {
  try { res.json(await RequestService.getComments(req.params.id as string)); }
  catch (err: any) { res.status(400).json({ error: err.message }); }
});

// Add comment (text, image, or voice)
router.post("/:id/comments", authenticate, validateUUID(), commentLimiter, chatUpload.single("file"), async (req: AuthRequest, res: Response) => {
  try {
    const text = req.body.text?.trim() || "";
    const msgType = req.body.type || "text";
    const filePath = req.file ? `/uploads/${req.file.filename}` : undefined;

    if (!text && !filePath) { res.status(400).json({ error: "Message content is required" }); return; }
    if (text.length > 2000) { res.status(400).json({ error: "COMMENT_TOO_LONG" }); return; }

    const media = msgType === "image"
      ? { type: "image", image: filePath }
      : msgType === "voice"
        ? { type: "voice", audio: filePath }
        : { type: "text" };

    const userName = await getUserName(req.user!.id);
    const comment = await RequestService.addComment(
      req.params.id as string, req.user!.id, userName, req.user!.role,
      text || (msgType === "image" ? "📷" : "🎤"), media
    );

    const request = await prisma.request.findUnique({ where: { id: req.params.id as string } });
    if (request) {
      const participants = [request.buyerId, request.sellerId];
      for (const uid of participants) {
        SSEService.sendToUser(`request:${req.params.id}:${uid}`, "new_message", comment);
      }
    }

    res.status(201).json(comment);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// Typing indicator
router.post("/:id/chat/typing", authenticate, validateUUID(), async (req: AuthRequest, res: Response) => {
  const requestId = req.params.id as string;
  const request = await prisma.request.findUnique({ where: { id: requestId } });
  if (!request) { res.status(404).json({ error: "Not found" }); return; }

  const participants = [request.buyerId, request.sellerId];
  for (const uid of participants) {
    if (uid !== req.user!.id) {
      SSEService.sendToUser(`request:${requestId}:${uid}`, "typing", {
        userId: req.user!.id,
        userName: await getUserName(req.user!.id),
      });
    }
  }
  res.json({ ok: true });
});

export default router;
