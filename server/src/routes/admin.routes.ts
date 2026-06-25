import { Router, Response } from "express";
import { authenticate, AuthRequest, requireRole } from "../middleware/auth.js";
import prisma from "../config/prisma.js";
import { AuditService } from "../services/audit.service.js";

const router = Router();

// All routes require SUPERADMIN
router.use(authenticate);
router.use(requireRole("SUPERADMIN"));

// Get all users
router.get("/users", async (_req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        profileImage: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            buyerRequests: true,
            sellerRequests: true,
            orders: true,
            sellerOrders: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Global stats
router.get("/stats", async (_req: AuthRequest, res: Response) => {
  try {
    const [totalUsers, totalBuyers, totalSellers, totalRequests, totalOrders] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: "BUYER" } }),
        prisma.user.count({ where: { role: "SELLER" } }),
        prisma.request.count(),
        prisma.order.count(),
      ]);

    const pendingRequests = await prisma.request.count({
      where: { status: "PENDING_PRICE" },
    });

    const revenue = await prisma.order.aggregate({
      where: { status: "CONFIRMED" },
      _sum: { price: true },
    });

    const statusCounts = await prisma.request.groupBy({
      by: ["status"],
      _count: true,
    });

    res.json({
      totalUsers,
      totalBuyers,
      totalSellers,
      totalRequests,
      totalOrders,
      pendingRequests,
      totalRevenue: revenue._sum.price || 0,
      statusCounts: Object.fromEntries(
        statusCounts.map((s: any) => [s.status, s._count])
      ),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Audit logs
router.get("/audit", async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const result = await AuditService.getLogs(limit, offset);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
