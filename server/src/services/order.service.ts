import prisma from "../config/prisma.js";

const userSelect = { id: true, firstName: true, lastName: true, username: true, profileImage: true };

export class OrderService {
  static async getUserOrders(userId: string, role: string) {
    // SUPERADMIN sees all orders
    const where =
      role === "SUPERADMIN"
        ? {}
        : role === "SELLER"
          ? { sellerId: userId }
          : { buyerId: userId };

    return prisma.order.findMany({
      where,
      include: {
        request: true,
        buyer: { select: userSelect },
        seller: { select: userSelect },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getOrder(orderId: string, userId: string, role: string = "BUYER") {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        request: true,
        buyer: { select: userSelect },
        seller: { select: userSelect },
      },
    });
    if (!order) throw new Error("Order not found");
    if (role !== "SUPERADMIN" && order.buyerId !== userId && order.sellerId !== userId) {
      throw new Error("Access denied");
    }
    return order;
  }

  static async getStats(userId: string, role: string) {
    // SUPERADMIN gets global stats
    const where =
      role === "SUPERADMIN"
        ? {}
        : role === "SELLER"
          ? { sellerId: userId }
          : { buyerId: userId };

    const [total, confirmed] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.count({ where: { ...where, status: "CONFIRMED" } }),
    ]);
    const revenue = await prisma.order.aggregate({
      where: { ...where, status: "CONFIRMED" },
      _sum: { price: true },
    });
    return { total, confirmed, totalRevenue: revenue._sum.price || 0 };
  }
}
