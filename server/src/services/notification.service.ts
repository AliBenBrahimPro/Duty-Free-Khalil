import prisma from "../config/prisma.js";

export class NotificationService {
  static async create(userId: string, data: { type: string; title: string; message: string; link?: string }) {
    return prisma.notification.create({
      data: { userId, ...data },
    });
  }

  static async getForUser(userId: string, opts: { cursor?: string; limit?: number } = {}) {
    const { cursor, limit = 50 } = opts;
    const where: any = { userId };
    if (cursor) {
      where.createdAt = { lt: (await prisma.notification.findUnique({ where: { id: cursor } }))?.createdAt };
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
    });

    const hasMore = notifications.length > limit;
    if (hasMore) notifications.pop();

    return {
      data: notifications,
      nextCursor: hasMore ? notifications[notifications.length - 1]?.id : null,
    };
  }

  static async getUnreadCount(userId: string) {
    return prisma.notification.count({
      where: { userId, read: false },
    });
  }

  static async getSummary(userId: string, role: string) {
    const [notifResult, unreadCount, pendingPurchasesCount] = await Promise.all([
      this.getForUser(userId, { limit: 50 }),
      this.getUnreadCount(userId),
      role === "SELLER"
        ? prisma.purchase.count({ where: { sellerId: userId, status: "PENDING" } })
        : Promise.resolve(0),
    ]);

    return {
      notifications: notifResult.data,
      unreadCount,
      pendingPurchasesCount,
    };
  }

  static async markAsRead(notificationId: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
  }

  static async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  // --- Notification triggers for all key events ---

  static async onRequestCreated(request: any) {
    await this.create(request.sellerId, {
      type: "REQUEST_NEW",
      title: "New Price Request",
      message: `${request.buyer?.firstName || "A buyer"} is asking for a price on "${request.productName || "a product"}"`,
      link: `/requests/${request.id}`,
    });
  }

  static async onRequestPriced(request: any) {
    await this.create(request.buyerId, {
      type: "REQUEST_PRICED",
      title: "Price Received",
      message: `${request.seller?.firstName || "Seller"} set a price of ${request.price} ${request.currency} on "${request.productName || "your request"}"`,
      link: `/requests/${request.id}`,
    });
  }

  static async onRequestUnavailable(request: any) {
    await this.create(request.buyerId, {
      type: "REQUEST_UNAVAILABLE",
      title: "Product Unavailable",
      message: `"${request.productName || "Your request"}" has been marked as unavailable`,
      link: `/requests/${request.id}`,
    });
  }

  static async onRequestAccepted(request: any) {
    await this.create(request.sellerId, {
      type: "REQUEST_ACCEPTED",
      title: "Price Accepted",
      message: `${request.buyer?.firstName || "Buyer"} accepted the price for "${request.productName || "a product"}"`,
      link: `/requests/${request.id}`,
    });
  }

  static async onRequestRejected(request: any) {
    await this.create(request.sellerId, {
      type: "REQUEST_REJECTED",
      title: "Price Rejected",
      message: `${request.buyer?.firstName || "Buyer"} rejected the price for "${request.productName || "a product"}"`,
      link: `/requests/${request.id}`,
    });
  }

  static async onRequestComment(requestId: string, request: any, commentUserId: string, userName: string) {
    const targetId = request.buyerId === commentUserId ? request.sellerId : request.buyerId;
    await this.create(targetId, {
      type: "REQUEST_COMMENT",
      title: "New Comment",
      message: `${userName} commented on "${request.productName || "a request"}"`,
      link: `/requests/${requestId}`,
    });
  }

  static async onProductPurchase(purchase: any, product: any, buyerName: string) {
    await this.create(product.sellerId, {
      type: "PRODUCT_PURCHASE",
      title: "New Purchase",
      message: `${buyerName} wants to buy "${product.name}"`,
      link: `/browse/${product.id}`,
    });
  }

  static async onPurchaseConfirmed(purchase: any, product: any, buyerId: string) {
    await this.create(buyerId, {
      type: "PURCHASE_CONFIRMED",
      title: "Purchase Confirmed",
      message: `Your purchase of "${product.name}" has been confirmed`,
      link: `/browse/${product.id}`,
    });
  }

  static async onPurchaseCancelled(purchase: any, product: any, buyerId: string) {
    await this.create(buyerId, {
      type: "PURCHASE_CANCELLED",
      title: "Purchase Cancelled",
      message: `Your purchase of "${product.name}" has been cancelled`,
      link: `/browse/${product.id}`,
    });
  }

  static async onProductComment(productId: string, product: any, commentUserId: string, userName: string) {
    if (product.sellerId !== commentUserId) {
      await this.create(product.sellerId, {
        type: "PRODUCT_COMMENT",
        title: "New Comment",
        message: `${userName} commented on "${product.name}"`,
        link: `/browse/${productId}`,
      });
    }
  }

  // Notify buyers when their requests expire
  static async onRequestsExpired(requestIds: string[]) {
    if (!requestIds.length) return;
    const requests = await prisma.request.findMany({
      where: { id: { in: requestIds } },
      select: { id: true, buyerId: true, productName: true },
    });
    for (const req of requests) {
      await this.create(req.buyerId, {
        type: "REQUEST_EXPIRED",
        title: "Request Expired",
        message: `Your request for "${req.productName || "a product"}" has expired`,
        link: `/requests/${req.id}`,
      }).catch((err) => console.error("Failed to create expiry notification:", err));
    }
  }
}
